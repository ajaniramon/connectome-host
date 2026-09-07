- Recipe `subconscious` block (tune-out, agent-framework#77): `enabled`,
  `systemPrompt` (required — the subconscious's mode block), optional `name`,
  `model`, `allowChannelSpeech`, `reAnchorFraction`. Validated at recipe load
  (unknown fields refused by name) and passed through verbatim to
  `FrameworkConfig.subconscious`; the framework owns the defaults. Requires
  agent-framework with tune-out (#115).
