- The `frontdesk` strategy no longer adds its provenance header to a message
  whose server already rendered who, where, when and the id into the body
  (metadata `attributed: true`, as zulip-mcp now stamps); its question and
  mention salience scans the body with the server's `attributionHeader`
  prefix removed. Unstamped MCPL messages keep the header. Without this, a
  frontdesk agent on a current zulip-mcp reads two headers per message.
