- **Ephemeral subagents inherit the caller's `proseRouting` mode.** They
  previously always ran AF's `'locus'` default regardless of the recipe, so a
  resident running `proseRouting: "disabled"` still spawned subagents whose
  between-tool-calls prose published live into its open channel as parent
  speech (field-confirmed on a deployed resident, 2026-08-26 — including
  after the recipe adopted `"disabled"`, which reached only the resident).
