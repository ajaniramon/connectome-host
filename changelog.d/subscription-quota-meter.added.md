- Subscription hosts (Claude OAuth token via `ANTHROPIC_AUTH_TOKEN`, Codex
  login via `openai-codex`) show quota windows instead of a dollar estimate:
  the TUI status line and the WebUI header read `10% weekly | 99% 5h`, one
  entry per window the provider reports (5-hour, weekly, per-model weekly),
  and the WebUI usage panel lists each window with its reset time.
  List-price dollars were fiction on a subscription. Pay-per-token hosts are
  unchanged.
  - The windows are polled out-of-band (no inference spend) by a new
    `QuotaMeter`: the TUI polls while it runs, the WebUI only while its tab
    is visible and focused (`GET /quota`, panel op `quota`, observer scope
    `health`), floored at one provider read per 30s however many viewers.
  - A 429 while a window is spent is now recognised as a quota, not a
    throttle: the agent parks until the window resets instead of retrying
    into it and recording a failed turn per attempt. Needs an
    agent-framework with `providerHold`; on older frameworks the option is
    inert and behaviour is as before.
  - Both provider surfaces are private to the vendors' own CLIs and may
    change; an unreadable answer shows no readout rather than a guess.
