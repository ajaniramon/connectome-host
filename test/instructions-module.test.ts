import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  DEFAULT_INSTRUCTIONS_HEADER,
  DEFAULT_INSTRUCTIONS_PATH,
  InstructionsModule,
  type WorkspacePathResolver,
} from '../src/modules/instructions-module.js';

/**
 * Minimal stand-in for WorkspaceModule.resolveAbsolutePath: one mount named
 * `mountName` rooted at `root`, unknown mounts resolve to null (the real
 * module's fail-open contract).
 */
function makeResolver(mountName: string, root: string): WorkspacePathResolver {
  return {
    resolveAbsolutePath(mountPrefixedPath: string): string | null {
      const slashIdx = mountPrefixedPath.indexOf('/');
      if (slashIdx <= 0) return null;
      if (mountPrefixedPath.slice(0, slashIdx) !== mountName) return null;
      return resolve(root, mountPrefixedPath.slice(slashIdx + 1));
    },
  };
}

describe('InstructionsModule', () => {
  let dir: string;
  let warnSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'instructions-module-'));
    warnSpy = spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    rmSync(dir, { recursive: true, force: true });
  });

  test('injects file content under the default header at the default path', async () => {
    writeFileSync(join(dir, 'AGENTS.md'), 'Always be excellent.\n');
    const mod = new InstructionsModule();
    mod.setWorkspace(makeResolver('instructions', dir));

    const injections = await mod.gatherContext('resident');
    expect(injections).toHaveLength(1);
    expect(injections[0].namespace).toBe('instructions');
    expect(injections[0].position).toBe('system');
    expect(injections[0].content).toEqual([{
      type: 'text',
      text: `${DEFAULT_INSTRUCTIONS_HEADER}\n\nAlways be excellent.\n`,
    }]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('exposes the shared-contract defaults', () => {
    expect(DEFAULT_INSTRUCTIONS_PATH).toBe('instructions/AGENTS.md');
    expect(new InstructionsModule().contextTimeoutMs).toBe(2000);
  });

  test('honors custom path, header, and position', async () => {
    writeFileSync(join(dir, 'HOUSE-RULES.md'), 'No shouting.');
    const mod = new InstructionsModule({
      path: 'shared/HOUSE-RULES.md',
      header: '## House rules',
      position: 'afterUser',
    });
    mod.setWorkspace(makeResolver('shared', dir));

    const injections = await mod.gatherContext('ephemeral-worker-1');
    expect(injections).toHaveLength(1);
    expect(injections[0].position).toBe('afterUser');
    expect(injections[0].content).toEqual([{ type: 'text', text: '## House rules\n\nNo shouting.' }]);
  });

  test('supports position beforeUser', async () => {
    writeFileSync(join(dir, 'AGENTS.md'), 'x');
    const mod = new InstructionsModule({ position: 'beforeUser' });
    mod.setWorkspace(makeResolver('instructions', dir));
    expect((await mod.gatherContext('a'))[0].position).toBe('beforeUser');
  });

  test('returns the same injection for every agent name', async () => {
    writeFileSync(join(dir, 'AGENTS.md'), 'shared doc');
    const mod = new InstructionsModule();
    mod.setWorkspace(makeResolver('instructions', dir));

    const forResident = await mod.gatherContext('resident');
    const forEphemeral = await mod.gatherContext('resident_fork_3');
    expect(forEphemeral).toEqual(forResident);
  });

  test('missing file fails open with a single warning across turns', async () => {
    const mod = new InstructionsModule();
    mod.setWorkspace(makeResolver('instructions', dir));

    expect(await mod.gatherContext('a')).toEqual([]);
    expect(await mod.gatherContext('a')).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  test('unknown mount fails open with a single warning', async () => {
    const mod = new InstructionsModule({ path: 'nonexistent/AGENTS.md' });
    mod.setWorkspace(makeResolver('instructions', dir));

    expect(await mod.gatherContext('a')).toEqual([]);
    expect(await mod.gatherContext('a')).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  test('no workspace wired fails open', async () => {
    const mod = new InstructionsModule();
    expect(await mod.gatherContext('a')).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  test('recovers (and injects) once the file appears', async () => {
    const mod = new InstructionsModule();
    mod.setWorkspace(makeResolver('instructions', dir));

    expect(await mod.gatherContext('a')).toEqual([]);
    writeFileSync(join(dir, 'AGENTS.md'), 'now I exist');
    const injections = await mod.gatherContext('a');
    expect(injections).toHaveLength(1);
    expect((injections[0].content[0] as { text: string }).text).toContain('now I exist');
  });

  test('caches by (mtime, size) and rereads when the file changes', async () => {
    const file = join(dir, 'AGENTS.md');
    writeFileSync(file, 'version one');
    const mod = new InstructionsModule();
    mod.setWorkspace(makeResolver('instructions', dir));

    const first = await mod.gatherContext('a');
    const second = await mod.gatherContext('a');
    // Unchanged stat → cache hit → identical array, no reread.
    expect(second).toBe(first);

    // Content change (different size) → cache miss → new content.
    writeFileSync(file, 'version two, longer');
    const third = await mod.gatherContext('a');
    expect(third).not.toBe(first);
    expect((third[0].content[0] as { text: string }).text).toContain('version two, longer');

    // mtime bump alone (same size, same content) also invalidates.
    utimesSync(file, new Date(), new Date(Date.now() + 5000));
    const fourth = await mod.gatherContext('a');
    expect(fourth).not.toBe(third);
    expect(fourth).toEqual(third);
  });

  test('truncates at maxBytes with an explicit marker', async () => {
    writeFileSync(join(dir, 'AGENTS.md'), 'a'.repeat(100));
    const mod = new InstructionsModule({ maxBytes: 10 });
    mod.setWorkspace(makeResolver('instructions', dir));

    const injections = await mod.gatherContext('a');
    const text = (injections[0].content[0] as { text: string }).text;
    expect(text).toBe(`${DEFAULT_INSTRUCTIONS_HEADER}\n\n${'a'.repeat(10)}\n\n[truncated at 10 bytes]`);
  });

  test('truncation never splits a multibyte character (no U+FFFD)', async () => {
    // '€' is 3 bytes in UTF-8; maxBytes: 4 cuts mid-character in the second
    // '€'. The cut must back up to the sequence boundary (1 full '€').
    writeFileSync(join(dir, 'AGENTS.md'), '€€€€');
    const mod = new InstructionsModule({ maxBytes: 4 });
    mod.setWorkspace(makeResolver('instructions', dir));

    const text = ((await mod.gatherContext('a'))[0].content[0] as { text: string }).text;
    expect(text).toBe(`${DEFAULT_INSTRUCTIONS_HEADER}\n\n€\n\n[truncated at 4 bytes]`);
    expect(text).not.toContain('�');
  });

  test('does not truncate a file exactly at maxBytes', async () => {
    writeFileSync(join(dir, 'AGENTS.md'), 'a'.repeat(10));
    const mod = new InstructionsModule({ maxBytes: 10 });
    mod.setWorkspace(makeResolver('instructions', dir));

    const text = ((await mod.gatherContext('a'))[0].content[0] as { text: string }).text;
    expect(text).toBe(`${DEFAULT_INSTRUCTIONS_HEADER}\n\n${'a'.repeat(10)}`);
  });
});
