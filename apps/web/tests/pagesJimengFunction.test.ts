import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Cloudflare Pages Jimeng function', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('does not generate random values during module import', async () => {
    vi.resetModules();
    const cryptoWithoutGlobalRandom = {
      getRandomValues: vi.fn(() => {
        throw new Error('global random values are disallowed');
      }),
      subtle: globalThis.crypto.subtle,
    };

    vi.stubGlobal('crypto', cryptoWithoutGlobalRandom);

    await expect(import('../functions/api/jimeng/redraw')).resolves.toHaveProperty('onRequest');
    expect(cryptoWithoutGlobalRandom.getRandomValues).not.toHaveBeenCalled();
  });

  it('delegates redraw preflight requests to the Worker handler', async () => {
    const { onRequest } = await import('../functions/api/jimeng/redraw');
    const request = new Request('https://pxlbeads.pages.dev/api/jimeng/redraw', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://pxlbeads.pages.dev',
        'access-control-request-method': 'POST',
      },
    });

    const response = await onRequest({
      request,
      env: { ASSETS: { fetch: vi.fn() } },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
  });

  it('delegates safe environment diagnostics to the Worker handler', async () => {
    const { onRequest } = await import('../functions/api/debug/env');
    const response = await onRequest({
      request: new Request('https://pxlbeads.pages.dev/api/debug/env'),
      env: {
        ASSETS: { fetch: vi.fn() },
        JIMENG_SESSION_IDS: 'session-a',
        JIMENG_ENV_TEST: 'ok',
      },
    });
    const body = await response.text();
    const json = JSON.parse(body);

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      hasJimengSessionIds: true,
      jimengSessionIdCount: 1,
      hasArkApiKey: false,
      hasArkImageModel: false,
    });
    expect(json.envKeys).toContain('JIMENG_SESSION_IDS');
    expect(json.envKeys).toContain('JIMENG_ENV_TEST');
    expect(body).not.toContain('session-a');
  });
});
