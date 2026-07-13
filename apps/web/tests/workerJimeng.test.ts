import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../worker';

function makeEnv(overrides: Record<string, unknown> = {}) {
  return {
    ASSETS: { fetch: vi.fn() },
    ARK_API_KEY: 'server-secret',
    ARK_IMAGE_MODEL: 'doubao-seedream-test',
    ARK_BASE_URL: 'https://ark.cn-beijing.volces.com/api/v3',
    JIMENG_POLL_INTERVAL_MS: '0',
    JIMENG_MAX_POLL_RETRIES: '1',
    ...overrides,
  };
}

function mockSuccessfulJimengSessionFetch(expectedRootModel: string) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('/mweb/v1/get_upload_token')) {
      return new Response(
        JSON.stringify({
          ret: '0',
          data: {
            access_key_id: 'upload-ak',
            secret_access_key: 'upload-sk',
            session_token: 'upload-session-token',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    if (url.startsWith('https://imagex.bytedanceapi.com/?Action=ApplyImageUpload')) {
      return new Response(
        JSON.stringify({
          Result: {
            UploadAddress: {
              SessionKey: 'upload-session-key',
              UploadHosts: ['upload.example.test'],
              StoreInfos: [{ StoreUri: 'store-uri', Auth: 'store-auth' }],
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    if (url === 'https://upload.example.test/upload/v1/store-uri') {
      return new Response(JSON.stringify({ code: 2000 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (url.startsWith('https://imagex.bytedanceapi.com/?Action=CommitImageUpload')) {
      return new Response(
        JSON.stringify({ Result: { Results: [{ Uri: 'uploaded-image-uri' }] } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    if (url.includes('/mweb/v1/aigc_draft/generate')) {
      const body = JSON.parse(init?.body as string);
      expect(body.extend.root_model).toBe(expectedRootModel);
      expect(body.draft_content).toContain('uploaded-image-uri');
      return new Response(
        JSON.stringify({ ret: '0', data: { aigc_data: { history_record_id: 'history-1' } } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    if (url.includes('/mweb/v1/get_history_by_ids')) {
      return new Response(
        JSON.stringify({
          ret: '0',
          data: {
            'history-1': {
              status: 50,
              item_list: [
                { image: { large_images: [{ image_url: 'https://image.example/generated.webp' }] } },
              ],
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    if (url === 'https://image.example/generated.webp') {
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'image/webp' },
      });
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  });
}

describe('Jimeng Worker proxy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses Jimeng sessionid reverse proxy credentials when configured', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/mweb/v1/get_upload_token')) {
        return new Response(
          JSON.stringify({
            ret: '0',
            data: {
              access_key_id: 'upload-ak',
              secret_access_key: 'upload-sk',
              session_token: 'upload-session-token',
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (url.startsWith('https://imagex.bytedanceapi.com/?Action=ApplyImageUpload')) {
        return new Response(
          JSON.stringify({
            Result: {
              UploadAddress: {
                SessionKey: 'upload-session-key',
                UploadHosts: ['upload.example.test'],
                StoreInfos: [{ StoreUri: 'store-uri', Auth: 'store-auth' }],
              },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (url === 'https://upload.example.test/upload/v1/store-uri') {
        expect(new Headers(init?.headers).get('authorization')).toBe('store-auth');
        expect(new Headers(init?.headers).get('content-crc32')).toBeTruthy();
        return new Response(JSON.stringify({ code: 2000 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.startsWith('https://imagex.bytedanceapi.com/?Action=CommitImageUpload')) {
        return new Response(
          JSON.stringify({ Result: { Results: [{ Uri: 'uploaded-image-uri' }] } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (url.includes('/mweb/v1/aigc_draft/generate')) {
        const body = JSON.parse(init?.body as string);
        expect(body.extend.root_model).toBe('high_aes_general_v50');
        expect(body.draft_content).toContain('uploaded-image-uri');
        return new Response(
          JSON.stringify({ ret: '0', data: { aigc_data: { history_record_id: 'history-1' } } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (url.includes('/mweb/v1/get_history_by_ids')) {
        return new Response(
          JSON.stringify({
            ret: '0',
            data: {
              'history-1': {
                status: 50,
                item_list: [
                  { image: { large_images: [{ image_url: 'https://image.example/generated.webp' }] } },
                ],
              },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      if (url === 'https://image.example/generated.webp') {
        return new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'content-type': 'image/webp' },
        });
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    });

    const request = new Request('https://pxlbeads.test/api/jimeng/redraw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        imageDataUrl: 'data:image/png;base64,AQID',
        prompt: 'turn this into a bead-friendly reference',
        size: '2048x2048',
      }),
    });

    const response = await worker.fetch(
      request,
      makeEnv({
        ARK_API_KEY: '',
        ARK_IMAGE_MODEL: '',
        JIMENG_SESSION_IDS: 'session-a,session-b',
      }) as never,
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      imageDataUrl: 'data:image/webp;base64,AQID',
      imageUrl: 'https://image.example/generated.webp',
      model: 'jimeng-image-5.0-lite',
      size: '2048x2048',
      provider: 'jimeng-session',
    });

    const jimengCalls = fetchMock.mock.calls.filter(([input]) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      return url.startsWith('https://jimeng.jianying.com');
    });
    expect(jimengCalls.length).toBeGreaterThan(0);
    const firstJimengHeaders = new Headers((jimengCalls[0][1] as RequestInit).headers);
    const deviceTime = firstJimengHeaders.get('device-time');
    const expectedSign = createHash('md5')
      .update(`9e2c|${'/mweb/v1/get_upload_token?aid=513695&da_version=3.2.2&aigc_features=app_lip_sync'.slice(-7)}|7|5.8.0|${deviceTime}||11ac`)
      .digest('hex');
    expect(firstJimengHeaders.get('cookie')).toContain('sessionid=session-a');
    expect(firstJimengHeaders.get('sign')).toBe(expectedSign);
    expect(deviceTime).toBeTruthy();
  });

  it('uses request sessionid and selected Jimeng model when provided', async () => {
    const fetchMock = mockSuccessfulJimengSessionFetch('high_aes_general_v43');
    const request = new Request('https://pxlbeads.test/api/jimeng/redraw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        imageDataUrl: 'data:image/png;base64,AQID',
        prompt: 'turn this into a bead-friendly reference',
        size: '2048x2048',
        model: 'jimeng-image-4.7',
        sessionId: 'request-session-id',
      }),
    });

    const response = await worker.fetch(
      request,
      makeEnv({
        ARK_API_KEY: '',
        ARK_IMAGE_MODEL: '',
        JIMENG_SESSION_IDS: '',
      }) as never,
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      model: 'jimeng-image-4.7',
      provider: 'jimeng-session',
    });

    const jimengCalls = fetchMock.mock.calls.filter(([input]) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      return url.startsWith('https://jimeng.jianying.com');
    });
    const firstJimengHeaders = new Headers((jimengCalls[0][1] as RequestInit).headers);
    expect(firstJimengHeaders.get('cookie')).toContain('sessionid=request-session-id');
  });

  it('forwards redraw requests to Ark with server-side credentials', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          model: 'doubao-seedream-test',
          created: 1783521994,
          data: [{ b64_json: 'generated-base64', size: '2048x2048' }],
          usage: { generated_images: 1 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const request = new Request('https://pxlbeads.test/api/jimeng/redraw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        imageDataUrl: 'data:image/png;base64,source-base64',
        prompt: 'turn this into a bead-friendly reference',
        size: '2048x2048',
      }),
    });

    const response = await worker.fetch(request, makeEnv() as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      imageDataUrl: 'data:image/jpeg;base64,generated-base64',
      imageUrl: null,
      model: 'doubao-seedream-test',
      size: '2048x2048',
      usage: { generated_images: 1 },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://ark.cn-beijing.volces.com/api/v3/images/generations');
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer server-secret');
    expect(new Headers(init.headers).get('content-type')).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'doubao-seedream-test',
      prompt: 'turn this into a bead-friendly reference',
      image: 'data:image/png;base64,source-base64',
      size: '2048x2048',
      response_format: 'b64_json',
      watermark: false,
      stream: false,
    });
  });

  it('rejects redraw requests when the Worker is not configured', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const request = new Request('https://pxlbeads.test/api/jimeng/redraw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        imageDataUrl: 'data:image/png;base64,source-base64',
        prompt: 'turn this into a bead-friendly reference',
      }),
    });

    const response = await worker.fetch(
      request,
      makeEnv({ ARK_API_KEY: '', ARK_IMAGE_MODEL: '' }) as never,
    );
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.error).toContain('JIMENG_SESSION_IDS');
    expect(json.error).toContain('ARK_API_KEY');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports safe environment diagnostics without exposing secret values', async () => {
    const request = new Request('https://pxlbeads.test/api/debug/env');

    const response = await worker.fetch(
      request,
      makeEnv({
        JIMENG_SESSION_IDS: 'session-a,session-b',
        JIMENG_ENV_TEST: 'ok',
      }) as never,
    );
    const body = await response.text();
    const json = JSON.parse(body);

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      hasJimengSessionIds: true,
      jimengSessionIdCount: 2,
      hasArkApiKey: true,
      hasArkImageModel: true,
    });
    expect(json.envKeys).toContain('JIMENG_SESSION_IDS');
    expect(json.envKeys).toContain('JIMENG_ENV_TEST');
    expect(body).not.toContain('session-a');
    expect(body).not.toContain('session-b');
    expect(body).not.toContain('server-secret');
  });
});
