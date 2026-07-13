import { afterEach, describe, expect, it, vi } from 'vitest';
import { redrawImageWithJimeng } from '../../src/api/jimeng';

describe('jimeng API client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts redraw requests to the app proxy endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          imageDataUrl: 'data:image/jpeg;base64,generated',
          imageUrl: null,
          model: 'doubao-seedream-test',
          size: '2048x2048',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const result = await redrawImageWithJimeng(
      {
        imageDataUrl: 'data:image/png;base64,source',
        prompt: 'make a bead-friendly reference',
        size: '2048x2048',
        model: 'jimeng-image-4.7',
        sessionId: 'browser-session-id',
      },
      '/api/jimeng/redraw',
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/jimeng/redraw', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        imageDataUrl: 'data:image/png;base64,source',
        prompt: 'make a bead-friendly reference',
        size: '2048x2048',
        model: 'jimeng-image-4.7',
        sessionId: 'browser-session-id',
      }),
    });
    expect(result.imageDataUrl).toBe('data:image/jpeg;base64,generated');
  });

  it('surfaces proxy error messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'ARK_IMAGE_MODEL is missing' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(
      redrawImageWithJimeng(
        {
          imageDataUrl: 'data:image/png;base64,source',
          prompt: 'make a bead-friendly reference',
        },
        '/api/jimeng/redraw',
      ),
    ).rejects.toThrow('ARK_IMAGE_MODEL is missing');
  });
});
