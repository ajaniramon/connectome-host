- **agent-framework `^0.11.0`** (was `^0.10.0`). Activates `proseRouting:
  "disabled"` for recipes that set it (#100 accepted the key; the runtime now
  implements it — generated prose is never published externally, only explicit
  tools speak), plus AF 0.11's Windows workspace-mount fix and the
  org-acceleration 429 cooldown. Clears the last two standing cross-package
  `tsc` errors — the typecheck is fully clean at this lock.
