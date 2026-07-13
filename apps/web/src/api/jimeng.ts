export interface JimengRedrawRequest {
  imageDataUrl: string;
  prompt: string;
  size?: string;
  model?: string;
  sessionId?: string;
}

export interface JimengRedrawResponse {
  imageDataUrl: string | null;
  imageUrl: string | null;
  model: string | null;
  size: string | null;
  usage?: unknown;
}

function getJimengEndpoint(): string {
  return import.meta.env.VITE_JIMENG_API_URL || '/api/jimeng/redraw';
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorMessageFromPayload(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim()) return error;
  }
  return fallback;
}

export async function redrawImageWithJimeng(
  request: JimengRedrawRequest,
  endpoint = getJimengEndpoint(),
): Promise<JimengRedrawResponse> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(errorMessageFromPayload(payload, `Jimeng redraw failed: ${response.status}`));
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Jimeng redraw returned an invalid response.');
  }

  const result = payload as Partial<JimengRedrawResponse>;
  if (!result.imageDataUrl && !result.imageUrl) {
    throw new Error('Jimeng redraw did not return an image.');
  }

  return {
    imageDataUrl: typeof result.imageDataUrl === 'string' ? result.imageDataUrl : null,
    imageUrl: typeof result.imageUrl === 'string' ? result.imageUrl : null,
    model: typeof result.model === 'string' ? result.model : null,
    size: typeof result.size === 'string' ? result.size : null,
    usage: result.usage,
  };
}
