# Subscription transport ownership

`CodexSubscriptionAdapter` is a host lifecycle wrapper around Membrane's
`OpenAIResponsesAPIAdapter` in subscription mode. `CodexAppServerAuth` retains
Codex CLI startup, device login, credential-file reading, refresh-token rotation
via app-server, and disposal. The wrapper passes a fresh token/account snapshot
to Membrane and forwards Fast mode fallback warnings to the host console.

Recipes continue to select `openai-codex`; Fast controls and `CODEX_BASE_URL`
retain their existing behavior. The host adapter retains the `openai-codex`
label. Its logging decorator forwards both `usageCacheConvention` and
`requiresNativeResponsesInput`, so Membrane normalizes usage and honors the
participant-aware formatter used by auxiliary calls. Direct provider usage is
cache-inclusive; Membrane supplies disjoint fresh/cached usage to the host.
Logs preserve raw provider counts with an explicit `cacheConvention` marker.

The transport's endpoint, filtering of unsupported parameters, SSE parsing,
error classification, output reconstruction, and provider usage convention now
have one implementation in Membrane. Authentication retries happen there only
for HTTP 401, once per request, before any streamed output. A 403 is surfaced
without forcing a token refresh.

## Companion dependency

This PR pins Membrane commit `18a86e9eda277378acd982b07c7fe7c187721119`
([Membrane #74](https://github.com/antra-tess/membrane/pull/74)) so reviewers and
CI install the actual shared transport. Both npm and Bun locks are included. An
override keeps agent-framework and context-manager on the same Membrane copy;
otherwise Bun can retain an older transitive copy with separate error classes.
The pin uses the public GitHub repository over HTTPS.

Merge gate: merge and release Membrane #74 to npm first. Before merging this
host PR, replace the direct dependency and override with that published version
(or remove the override when both package managers deduplicate correctly),
regenerate both lockfiles, and rerun the host tests. The git pin is for review
only and must not reach a host npm release. It requires GitHub/git at install
time; Bun also skips the git dependency's prepare build, leaving Node/TypeScript
entrypoints unavailable unless built separately. This PR does not publish a
release or predict a future version number.

[Membrane #75](https://github.com/antra-tess/membrane/pull/75) separately adds
Anthropic's rotating-credential seam for issue #69. This OpenAI host migration
does not require it and does not change Anthropic credential acquisition.

## Remaining authentication integration

- Anthropic host integration remains tracked alongside Membrane issue #69: the
  host must supply a live credential source instead of its startup environment
  string. That source must define storage, refresh serialization and login UI;
  merely re-reading the environment does not rotate expired credentials.
- Codex acquisition currently shares one app-server login across callers.
  Aborting inference stops waiting and prevents HTTP, but does not stop that
  shared login ceremony. Cancellation must be coordinated across all callers
  before terminating it, so one aborted request cannot cancel another's login.
  Explicit host disposal still stops app-server and clears pending RPCs.

Co-authored by GPT-6 via OpenAI Codex.
