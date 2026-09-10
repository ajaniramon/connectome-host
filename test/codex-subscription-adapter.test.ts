import { afterEach, describe, expect, test } from 'bun:test';
import { OpenAIResponsesAPIAdapter, type ProviderRequest } from '@animalabs/membrane';
import { CodexSubscriptionAdapter } from '../src/codex-subscription-adapter.js';

const originalFetch = globalThis.fetch;
const originalBaseURL = process.env.CODEX_BASE_URL;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalBaseURL === undefined) delete process.env.CODEX_BASE_URL;
  else process.env.CODEX_BASE_URL = originalBaseURL;
});
const request: ProviderRequest = { model: 'gpt-5.4', messages: [], maxTokens: 100 };
const completed = () => new Response('data: {"type":"response.completed","response":{"status":"completed","output":[]}}\n\n');

describe('Codex host integration', () => {
  test('bridges token refresh and the refreshed account ID to Membrane', async () => {
    const flags: boolean[] = [];
    const headers: Headers[] = [];
    let account = 'old-account';
    globalThis.fetch = async (_url, init) => {
      headers.push(new Headers(init?.headers));
      return headers.length === 1 ? new Response('expired', { status: 401 }) : completed();
    };
    const adapter = new CodexSubscriptionAdapter({ authProvider: {
      getAccessToken: async (forceRefresh = false) => {
        flags.push(forceRefresh);
        if (forceRefresh) account = 'new-account';
        return forceRefresh ? 'fresh' : 'expired';
      },
      getAccountId: () => account,
    } });
    expect(adapter).toBeInstanceOf(OpenAIResponsesAPIAdapter);
    expect(adapter.usageCacheConvention).toBe('cache-inclusive');
    await adapter.complete(request);
    expect(flags).toEqual([false, true]);
    expect(headers[1]?.get('authorization')).toBe('Bearer fresh');
    expect(headers[1]?.get('chatgpt-account-id')).toBe('new-account');
  });

  test('preserves CODEX_BASE_URL, Fast controls and auth disposal', async () => {
    process.env.CODEX_BASE_URL = 'https://example.test/codex/';
    const calls: Array<{ url: string; body: any }> = [];
    let disposed = false;
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
      return completed();
    };
    const adapter = new CodexSubscriptionAdapter({ fastMode: true, authProvider: {
      getAccessToken: async () => 'token', dispose: () => { disposed = true; },
    } });
    expect(adapter.isFastMode()).toBe(true);
    await adapter.complete(request);
    adapter.setFastMode(false);
    await adapter.complete(request);
    expect(calls[0]?.url).toBe('https://example.test/codex/responses');
    expect(calls[0]?.body.service_tier).toBe('priority');
    expect(calls[1]?.body.service_tier).toBeUndefined();
    adapter.dispose();
    expect(disposed).toBe(true);
  });

  test('passes explicit endpoint configuration through the host wrapper', async () => {
    process.env.CODEX_BASE_URL = 'https://unused.test';
    let endpoint: string | undefined;
    globalThis.fetch = async url => { endpoint = String(url); return completed(); };
    await new CodexSubscriptionAdapter({ baseURL: 'https://explicit.test', authProvider: { getAccessToken: async () => 'token' } }).complete(request);
    expect(endpoint).toBe('https://explicit.test/responses');
  });
});
