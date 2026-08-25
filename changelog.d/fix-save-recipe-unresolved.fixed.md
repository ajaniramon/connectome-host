- **Saved recipe snapshots no longer contain resolved secrets.** `loadRecipe`
  substitutes every `${VAR}` — API tokens included — and the host then wrote
  that fully resolved recipe to `$DATA_DIR/.recipe.json` at default file mode:
  plaintext credentials in the exact directory deployments bind-mount and back
  up (found by an external recipe review that verified live tokens in a backed
  up `data/` directory on a production VM). The snapshot now keeps the
  pre-substitution form — `${VAR}` references literal, a URL `systemPrompt`
  kept as the URL — and a resumed session re-runs substitution, validation,
  and the prompt fetch against the *current* environment, so secret rotation
  and remote prompt updates take effect on restart without re-cooking. The
  file is written 0600 and re-chmod'd 0600 on every save. Legacy resolved
  snapshots (no `$unresolved` marker) still load verbatim, with no
  substitution, so a literal `${...}` surviving in prose cannot fail them;
  resuming an unresolved snapshot whose required env var has since disappeared
  fails loudly naming the variable instead of silently starting the default
  recipe.
