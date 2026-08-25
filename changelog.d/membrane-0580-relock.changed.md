- **membrane `^0.5.80`** (was `^0.5.78`, lockfile-resolved 0.5.79). Two
  latent cache behaviors the host already configures become ACTIVE with this
  relock: the prompt-cache keepalive (`agent.cacheKeepalive`, on by default —
  previously passed to an adapter version with no such field and silently
  ignored, so idle gaps over the 1h TTL repaid a full cache write on wake)
  and the floating cache marker (incremental prompt caching inside the native
  tool loop, membrane's default-on). Both reduce cost; neither changes
  visible agent behavior. Also clears two of the four standing cross-package
  `tsc` errors (the membrane-typing pair).
