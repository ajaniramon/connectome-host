# Subscription transport ownership

`CodexSubscriptionAdapter` is a host lifecycle wrapper around Membrane's
`OpenAIResponsesAPIAdapter` in subscription mode. `CodexAppServerAuth` retains
Codex CLI startup, device login, credential-file reading, refresh-token rotation
via app-server, and disposal. The wrapper passes a fresh token/account snapshot
to Membrane and forwards Fast mode fallback warnings to the host console.

Recipes continue to select `openai-codex`; Fast controls and `CODEX_BASE_URL`
retain their existing behavior. The underlying adapter now identifies itself as
`openai-responses-api`, which also enables Membrane's existing provider-native
formatter guard for auxiliary calls. Direct provider usage is cache-inclusive;
Membrane supplies the disjoint fresh/cached usage consumed by the host.

The transport's endpoint, filtering of unsupported parameters, SSE parsing,
error classification, output reconstruction, and provider usage convention now
have one implementation in Membrane. Authentication retries happen there only
for HTTP 401, once per request, before any streamed output. A 403 is surfaced
without forcing a token refresh.

## Companion dependency

This PR pins Membrane commit `28ea9ffde04758963742e76ad2338592df59e463`
([Membrane #74](https://github.com/antra-tess/membrane/pull/74)) so reviewers and
CI install the actual shared transport. Both npm and Bun locks are included. An
override keeps agent-framework and context-manager on the same Membrane copy;
otherwise Bun can retain an older transitive copy with separate error classes.
The pin uses the public GitHub repository over HTTPS.

Merge Membrane #74 before this change. Once the transport is released to npm,
replace the direct dependency and override with the released version (or remove
the override when both package managers deduplicate correctly), regenerate both
lockfiles, and rerun the host tests. This PR does not publish an npm release or
predict a future version number.

[Membrane #75](https://github.com/antra-tess/membrane/pull/75) separately adds
Anthropic's rotating-credential seam for issue #69. This OpenAI host migration
does not require it and does not change Anthropic credential acquisition.

Co-authored by GPT-6 via OpenAI Codex.
