- Depends on `@animalabs/agent-framework` ^0.17.0, `@animalabs/context-manager`
  ^0.10.1 and `@animalabs/membrane` ^0.5.86. With AF 0.17 the quota meter's
  `providerHold` is live: a subscription 429 on a spent quota window parks the
  agent until the window resets instead of retrying into it (older AF ignored
  the option). CM 0.10.1 carries the kv-unified stale-receipt fix (CM #97);
  membrane 0.5.86 makes the ChatGPT-subscription prompt cache hit (stable
  `session_id` header). `package-lock.json` had drifted to AF 0.13 / CM 0.8 /
  chronicle 0.3 and is regenerated alongside `bun.lock`.
