/**
 * Subscription quota readout, polled only while someone is looking.
 *
 * On a subscription credential the host's dollar estimate is fiction; what
 * matters is how much of each utilization window is left. The server answers
 * `/quota` from a rate-floored meter, so this poll is what keeps the meter
 * warm: a hidden or unfocused tab asks for nothing.
 */

import { createSignal, onCleanup, onMount, type Accessor } from 'solid-js';
import type { QuotaSnapshotData } from '@conhost/web/protocol';

const POLL_MS = 60_000;

export function createQuotaPoll(): Accessor<QuotaSnapshotData | null> {
  const [quota, setQuota] = createSignal<QuotaSnapshotData | null>(null);
  let timer: number | undefined;
  let metered = false;

  const looking = (): boolean => document.visibilityState === 'visible' && document.hasFocus();

  const load = async (): Promise<void> => {
    try {
      const res = await fetch('/quota', { credentials: 'same-origin' });
      // 401/403 (observer without the health scope) and an older host's SPA
      // fallback both mean "no readout here" — stop asking.
      if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) {
        metered = true;
        return;
      }
      const data = (await res.json()) as QuotaSnapshotData;
      // A pay-per-token host never becomes a subscription host mid-session.
      if (!data.subscription) metered = true;
      setQuota(data);
    } catch {
      // Transient network failure: keep the last reading, try next tick.
    }
  };

  const sync = (): void => {
    const want = looking() && !metered;
    if (want && timer === undefined) {
      void load();
      timer = window.setInterval(() => {
        if (metered) sync(); else void load();
      }, POLL_MS);
    } else if (!want && timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };

  onMount(() => {
    sync();
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('blur', sync);
  });
  onCleanup(() => {
    document.removeEventListener('visibilitychange', sync);
    window.removeEventListener('focus', sync);
    window.removeEventListener('blur', sync);
    if (timer !== undefined) window.clearInterval(timer);
  });

  return quota;
}

/** `10% weekly | 99% 5h` */
export function quotaReadout(q: QuotaSnapshotData): string {
  return q.windows.map((w) => `${Math.floor(w.utilization)}% ${w.label}`).join(' | ');
}

/** Worst window drives the colour: amber from 75%, rose from 90%. */
export function quotaTone(q: QuotaSnapshotData): string {
  const worst = Math.max(0, ...q.windows.filter((w) => !w.advisory).map((w) => w.utilization));
  return worst >= 90 ? 'text-rose-400' : worst >= 75 ? 'text-amber-400' : 'text-emerald-300';
}

export function quotaTitle(q: QuotaSnapshotData): string {
  const lines = q.windows.map((w) =>
    `${w.label}: ${Math.floor(w.utilization)}% used`
    + (w.resetsAt ? ` · resets ${new Date(w.resetsAt).toLocaleString()}` : ''));
  if (q.blockedUntil) lines.push(`Inference parked until ${new Date(q.blockedUntil).toLocaleString()}`);
  if (q.error) lines.push(`Last refresh failed: ${q.error}`);
  return `Subscription quota (${q.provider ?? 'provider'})\n${lines.join('\n')}`;
}
