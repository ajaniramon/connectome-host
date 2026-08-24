/**
 * InstructionsModule — injects a shared, living instructions document into
 * every agent's context on every turn.
 *
 * The document is a CLAUDE.md analogue maintained in a workspace mount:
 * operators (or the agents themselves, on a read-write mount) edit one file,
 * and the current content reaches the resident agent AND every ephemeral
 * subagent via the framework's gatherContext hook before each inference.
 * Nothing is persisted to Chronicle — position 'system' injections are
 * per-turn overlays, so edits take effect on the next turn and stale copies
 * never accumulate in history.
 *
 * Fail-open by design: a missing mount, missing file, or any read error
 * yields no injection (never a blocked inference), with a warning logged
 * once per distinct error rather than every turn.
 *
 * Requires the workspace module: the configured path is a mount-prefixed
 * workspace path ("<mountName>/<relativePath>") resolved through
 * WorkspaceModule.resolveAbsolutePath, so mount scoping and the
 * path-traversal guard apply. validateRecipe enforces the pairing.
 */

import { promises as fs } from 'node:fs';
import type {
  Module,
  ModuleContext,
  ProcessEvent,
  ProcessState,
  EventResponse,
  ToolDefinition,
  ToolCall,
  ToolResult,
} from '@animalabs/agent-framework';
import type { ContextInjection } from '@animalabs/context-manager';

/**
 * The slice of WorkspaceModule this module depends on. Structural so tests
 * can substitute a stub resolver; production wiring passes the real
 * WorkspaceModule (which satisfies this shape).
 */
export interface WorkspacePathResolver {
  resolveAbsolutePath(mountPrefixedPath: string): string | null;
}

export interface InstructionsModuleConfig {
  /** Workspace path "<mountName>/<relativePath>". Default "instructions/AGENTS.md". */
  path?: string;
  /** Heading line prepended to the injected block. */
  header?: string;
  /** Truncate content beyond this many bytes (with an explicit marker). Default 32768. */
  maxBytes?: number;
  /** Where the block lands in the compiled context. Default 'system'. */
  position?: 'system' | 'beforeUser' | 'afterUser';
}

export const DEFAULT_INSTRUCTIONS_PATH = 'instructions/AGENTS.md';
export const DEFAULT_INSTRUCTIONS_HEADER =
  '# Shared operating instructions (live document)';
export const DEFAULT_INSTRUCTIONS_MAX_BYTES = 32768;

export class InstructionsModule implements Module {
  readonly name = 'instructions';

  // gatherContext is a stat + (on change) one file read — well under 2s.
  // A modest explicit budget keeps a wedged filesystem from eating the
  // registry-wide 15s default before inference proceeds without us.
  readonly contextTimeoutMs = 2000;

  private readonly path: string;
  private readonly header: string;
  private readonly maxBytes: number;
  private readonly position: 'system' | 'beforeUser' | 'afterUser';

  private workspace: WorkspacePathResolver | null = null;

  /** Cache keyed by (mtimeMs, size) — reread only when the file changes. */
  private cached: { mtimeMs: number; size: number; injections: ContextInjection[] } | null = null;

  /** Error messages already warned about — fail-open must not spam per turn. */
  private warned = new Set<string>();

  constructor(config: InstructionsModuleConfig = {}) {
    this.path = config.path ?? DEFAULT_INSTRUCTIONS_PATH;
    this.header = config.header ?? DEFAULT_INSTRUCTIONS_HEADER;
    this.maxBytes = config.maxBytes ?? DEFAULT_INSTRUCTIONS_MAX_BYTES;
    this.position = config.position ?? 'system';
  }

  /** Peer injection (same pattern as setFramework/setIdentity elsewhere). */
  setWorkspace(workspace: WorkspacePathResolver): void {
    this.workspace = workspace;
  }

  async start(_ctx: ModuleContext): Promise<void> {}

  async stop(): Promise<void> {
    this.cached = null;
  }

  getTools(): ToolDefinition[] {
    // Passive module — no tools, only gatherContext. The file itself is
    // read/edited through the workspace module's own tools.
    return [];
  }

  async handleToolCall(call: ToolCall): Promise<ToolResult> {
    return {
      success: false,
      error: `InstructionsModule has no tool "${call.name}"`,
      isError: true,
    };
  }

  async onProcess(_event: ProcessEvent, _state: ProcessState): Promise<EventResponse> {
    return {};
  }

  /**
   * Same injection for every agent — resident and ephemeral subagents alike
   * share the one living document (that is the point of the module).
   */
  async gatherContext(_agentName: string): Promise<ContextInjection[]> {
    if (!this.workspace) {
      this.warnOnce('workspace module not wired — no instructions injected');
      return [];
    }

    const absPath = this.workspace.resolveAbsolutePath(this.path);
    if (!absPath) {
      this.warnOnce(
        `cannot resolve "${this.path}" — unknown mount or path escapes it; no instructions injected`,
      );
      return [];
    }

    try {
      const stat = await fs.stat(absPath);
      if (
        this.cached &&
        this.cached.mtimeMs === stat.mtimeMs &&
        this.cached.size === stat.size
      ) {
        return this.cached.injections;
      }

      const buf = await fs.readFile(absPath);
      let content: string;
      if (buf.byteLength > this.maxBytes) {
        // Back the cut up to a UTF-8 sequence boundary so a multibyte
        // character split at maxBytes never decodes to U+FFFD right before
        // the marker. If the byte AT the cut is a continuation byte
        // (0b10xxxxxx), the sequence it belongs to straddles the cut: drop
        // its continuation bytes, then its lead byte.
        let cut = this.maxBytes;
        if ((buf[cut]! & 0xc0) === 0x80) {
          while (cut > 0 && (buf[cut - 1]! & 0xc0) === 0x80) cut--;
          if (cut > 0) cut--;
        }
        content =
          buf.subarray(0, cut).toString('utf-8') +
          `\n\n[truncated at ${this.maxBytes} bytes]`;
      } else {
        content = buf.toString('utf-8');
      }

      const injections: ContextInjection[] = [
        {
          namespace: 'instructions',
          position: this.position,
          content: [{ type: 'text', text: `${this.header}\n\n${content}` }],
        },
      ];
      this.cached = { mtimeMs: stat.mtimeMs, size: stat.size, injections };
      // Recovered — let a future recurrence of a previous error warn again.
      this.warned.clear();
      return injections;
    } catch (error) {
      // Fail open: missing file or any read error never blocks inference.
      this.cached = null;
      this.warnOnce(error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  private warnOnce(message: string): void {
    if (this.warned.has(message)) return;
    this.warned.add(message);
    console.error(`InstructionsModule: ${message}`);
  }
}
