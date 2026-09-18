- Recipes can set **`modules.history: true`** to attach agent-framework's
  `HistoryModule` (agent-framework 0.16.0): `history--stats` / `history--extract`
  / `history--search` / `history--overview` tools for querying an agent's own
  uncompressed chronicle via native secondary indexes, and for browsing
  already-compressed spans via existing compression summaries (no new LLM
  calls). `bind()` is wired post-creation with the agent's live
  `ContextManager` and the framework's `ChannelRegistry` (when MCPL is
  configured), so channel-filter arguments on all four tools accept a live or
  historical channel label/address, not just the raw internal channel id.
  Bumps `@animalabs/agent-framework` to `^0.16.0` and
  `@animalabs/context-manager` to `^0.10.0` (both required for `HistoryModule`
  and its summary-overview support) and `@animalabs/chronicle` to `^0.4.0`
  (native secondary-index support the history tools depend on).
