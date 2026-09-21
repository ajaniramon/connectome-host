- Subscription quota meter, review follow-up:
  - the meter no longer stops polling after consecutive failed reads (a
    timer tick suppressed by the error backoff left no timer armed — two
    failures froze the TUI readout for the life of the process);
  - the WebUI keeps asking after a transient `/quota` failure (401 before
    the observer session exists, 503 while the host binds, 5xx); only a
    definite answer ends the polling;
  - "inference parked" is shown only when the framework reports a host
    hold; a spent window otherwise reads "quota window spent — resets …";
  - the usage panel of a fleet child reads that child's own quota
    (`/quota?scope=`), so a pay-per-token child keeps its dollars;
  - the hold uses the failing agent's own model when the framework supplies
    it; a spent window with no reset time holds one slice on a fresh
    reading; numeric `resets_at` and Codex `rateLimitsByLimitId.codex` are
    parsed; per-agent dollars are hidden and call-ledger dollars labelled
    as list-price equivalents on a subscription; a TUI session switch no
    longer brings the dollar readout back.
