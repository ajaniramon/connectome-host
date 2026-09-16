- WebUI live surgery, quiesce toggle, inline images, operator log
  (requires agent-framework with `rollbackToMessage`/`suppressMessages`;
  quiesce needs agent-framework #122 — every affordance is feature-detected
  from `welcome.features`, so the bundle is safe against older hosts):
  - **Roll back to a message** (hover ⏪ in Chat, "roll back to here" on raw
    boxes in the Context document): forks at that message and makes the fork
    the live branch; confirm dialog names what leaves the context.
  - **Suppress messages** (hover ⊘ enters multi-select, floating bar to
    confirm): fork at head, redact on the fork, switch. Parent keeps them.
  - **Quiesce/resume** header switch showing the host's serving state; a
    busy-agent refusal offers "quiesce, then retry".
  - **Images render** in Chat and Context views with a lightbox. Chat frames
    carry a `ref` and the browser fetches bytes lazily from
    `GET /media/<messageId>/<blockPath>` (observer scope `messages`,
    `?scope=` proxies to fleet children) — base64 never rides the WebSocket.
    Tool-result images (read_image, cameras) render too.
  - **Operator log** in the branch panel: the host's durable
    `operator-actions.jsonl`, live-refreshed on `operator:action` traces.
  - New WS frames: `rollback`, `suppress`, `host-quiesce`, `host-resume`,
    `request-host-mode`, `request-operator-log` → `surgery-result`,
    `host-mode`, `operator-log`; `welcome.features` + `welcome.hostMode`.
    Panel op `media`.
