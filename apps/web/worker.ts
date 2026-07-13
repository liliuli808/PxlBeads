interface Env {
  ASSETS: Fetcher;
  ARK_API_KEY?: string;
  ARK_IMAGE_MODEL?: string;
  ARK_BASE_URL?: string;
  JIMENG_SESSION_IDS?: string;
  JIMENG_WEB_BASE_URL?: string;
  JIMENG_IMAGE_MODEL?: string;
  JIMENG_POLL_INTERVAL_MS?: string;
  JIMENG_MAX_POLL_RETRIES?: string;
}

interface JimengRedrawRequestBody {
  imageDataUrl?: unknown;
  imageUrl?: unknown;
  image?: unknown;
  prompt?: unknown;
  size?: unknown;
  model?: unknown;
  sessionId?: unknown;
  ratio?: unknown;
  resolution?: unknown;
  sampleStrength?: unknown;
  negativePrompt?: unknown;
}

interface ArkImageResult {
  b64_json?: unknown;
  url?: unknown;
  size?: unknown;
  output_format?: unknown;
  error?: {
    code?: unknown;
    message?: unknown;
  };
}

interface ArkImageResponse {
  model?: unknown;
  created?: unknown;
  data?: unknown;
  usage?: unknown;
  error?: {
    code?: unknown;
    message?: unknown;
  };
}

type JsonObject = Record<string, unknown>;

interface JimengImageModelConfig {
  id: string;
  modelReqKey: string;
  defaultResolution: '1k' | '2k' | '4k';
  supportedResolutions: Array<'1k' | '2k' | '4k'>;
  benefitCountByResolution: Record<string, number>;
}

interface JimengImageOptions {
  modelName: string;
  modelReqKey: string;
  ratio: string;
  imageRatio: number;
  resolution: '1k' | '2k' | '4k';
  width: number;
  height: number;
  sampleStrength: number;
  negativePrompt: string;
}

interface UploadedImage {
  imageUri: string;
}

interface ImageInputBytes {
  bytes: Uint8Array;
  mimeType: string;
}

interface WorkerIdentity {
  webId: string;
  userId: string;
}

const JIMENG_REDRAW_PATH = '/api/jimeng/redraw';
const DEBUG_ENV_PATH = '/api/debug/env';

const DEFAULT_ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
const DEFAULT_JIMENG_WEB_BASE_URL = 'https://jimeng.jianying.com';
const DEFAULT_SIZE = '2048x2048';
const DEFAULT_PROMPT = [
  '基于参考图重绘为适合后续转拼豆图纸的正方形插画参考图。',
  '保留主体姿态、毛色比例、主要明暗关系和可识别特征。',
  '简化背景为浅暖色平面，减少细碎纹理，使用清晰边界和较大的色块。',
  '不要画出拼豆网格、像素格、文字、水印或边框。',
].join('');

const DEFAULT_ASSISTANT_ID = 513695;
const VERSION_CODE = '5.8.0';
const PLATFORM_CODE = '7';
const DRAFT_VERSION = '3.3.20';
const WEB_VERSION = '7.5.0';
const MIN_VERSION = '3.0.2';
const DEFAULT_SESSION_IMAGE_MODEL = 'jimeng-image-5.0-lite';
const MAX_IMAGE_INPUT_BYTES = 100 * 1024 * 1024;

const IMAGE_MODEL_CONFIGS: Record<string, JimengImageModelConfig> = {
  'jimeng-image-5.0-lite': {
    id: 'jimeng-image-5.0-lite',
    modelReqKey: 'high_aes_general_v50',
    defaultResolution: '2k',
    supportedResolutions: ['4k', '2k'],
    benefitCountByResolution: { '2k': 3, '4k': 1 },
  },
  'jimeng-image-4.7': {
    id: 'jimeng-image-4.7',
    modelReqKey: 'high_aes_general_v43',
    defaultResolution: '2k',
    supportedResolutions: ['4k', '2k'],
    benefitCountByResolution: { '2k': 4, '4k': 1 },
  },
  'jimeng-image-4.6': {
    id: 'jimeng-image-4.6',
    modelReqKey: 'high_aes_general_v42',
    defaultResolution: '2k',
    supportedResolutions: ['4k', '2k'],
    benefitCountByResolution: { '2k': 4, '4k': 1 },
  },
  'jimeng-image-4.5': {
    id: 'jimeng-image-4.5',
    modelReqKey: 'high_aes_general_v40l',
    defaultResolution: '2k',
    supportedResolutions: ['4k', '2k'],
    benefitCountByResolution: { '2k': 4, '4k': 1 },
  },
  'jimeng-image-4.1': {
    id: 'jimeng-image-4.1',
    modelReqKey: 'high_aes_general_v41',
    defaultResolution: '2k',
    supportedResolutions: ['4k', '2k'],
    benefitCountByResolution: { '2k': 4, '4k': 1 },
  },
  'jimeng-image-4.0': {
    id: 'jimeng-image-4.0',
    modelReqKey: 'high_aes_general_v40',
    defaultResolution: '2k',
    supportedResolutions: ['4k', '2k'],
    benefitCountByResolution: { '2k': 4, '4k': 1 },
  },
  'jimeng-image-3.1': {
    id: 'jimeng-image-3.1',
    modelReqKey: 'high_aes_general_v30l_art_fangzhou:general_v3.0_18b',
    defaultResolution: '1k',
    supportedResolutions: ['1k'],
    benefitCountByResolution: { '1k': 1 },
  },
  'jimeng-image-3.0': {
    id: 'jimeng-image-3.0',
    modelReqKey: 'high_aes_general_v30l:general_v3.0_18b',
    defaultResolution: '1k',
    supportedResolutions: ['1k'],
    benefitCountByResolution: { '1k': 1 },
  },
  'jimeng-image-2.0-pro': {
    id: 'jimeng-image-2.0-pro',
    modelReqKey: 'high_aes_general_v20_L:general_v2.0_L',
    defaultResolution: '1k',
    supportedResolutions: ['1k'],
    benefitCountByResolution: { '1k': 1 },
  },
};

const RATIO_VALUES: Record<string, number> = {
  '21:9': 0,
  '16:9': 1,
  '3:2': 2,
  '4:3': 3,
  '1:1': 8,
  '3:4': 4,
  '2:3': 5,
  '9:16': 6,
};

const DIMENSIONS_1K: Record<string, { width: number; height: number }> = {
  '21:9': { width: 2016, height: 846 },
  '16:9': { width: 1664, height: 936 },
  '3:2': { width: 1584, height: 1056 },
  '4:3': { width: 1472, height: 1104 },
  '1:1': { width: 1328, height: 1328 },
  '3:4': { width: 1104, height: 1472 },
  '2:3': { width: 1056, height: 1584 },
  '9:16': { width: 936, height: 1664 },
};

const DIMENSIONS_2K: Record<string, { width: number; height: number }> = {
  '21:9': { width: 3024, height: 1296 },
  '16:9': { width: 2560, height: 1440 },
  '3:2': { width: 2496, height: 1664 },
  '4:3': { width: 2304, height: 1728 },
  '1:1': { width: 2048, height: 2048 },
  '3:4': { width: 1728, height: 2304 },
  '2:3': { width: 1664, height: 2496 },
  '9:16': { width: 1440, height: 2560 },
};

const DIMENSIONS_4K: Record<string, { width: number; height: number }> = {
  '21:9': { width: 6197, height: 2656 },
  '16:9': { width: 5404, height: 3040 },
  '3:2': { width: 4992, height: 3328 },
  '4:3': { width: 4693, height: 3520 },
  '1:1': { width: 4096, height: 4096 },
  '3:4': { width: 3520, height: 4693 },
  '2:3': { width: 3328, height: 4992 },
  '9:16': { width: 3040, height: 5404 },
};

const POLL_IMAGE_SCENES = [
  { scene: 'smart_crop', width: 360, height: 360, uniq_key: 'smart_crop-w:360-h:360', format: 'webp' },
  { scene: 'smart_crop', width: 480, height: 480, uniq_key: 'smart_crop-w:480-h:480', format: 'webp' },
  { scene: 'smart_crop', width: 720, height: 720, uniq_key: 'smart_crop-w:720-h:720', format: 'webp' },
  { scene: 'smart_crop', width: 720, height: 480, uniq_key: 'smart_crop-w:720-h:480', format: 'webp' },
  { scene: 'smart_crop', width: 360, height: 240, uniq_key: 'smart_crop-w:360-h:240', format: 'webp' },
  { scene: 'smart_crop', width: 240, height: 320, uniq_key: 'smart_crop-w:240-h:320', format: 'webp' },
  { scene: 'smart_crop', width: 480, height: 640, uniq_key: 'smart_crop-w:480-h:640', format: 'webp' },
  { scene: 'normal', width: 2400, height: 2400, uniq_key: '2400', format: 'webp' },
  { scene: 'normal', width: 1080, height: 1080, uniq_key: '1080', format: 'webp' },
  { scene: 'normal', width: 720, height: 720, uniq_key: '720', format: 'webp' },
  { scene: 'normal', width: 480, height: 480, uniq_key: '480', format: 'webp' },
  { scene: 'normal', width: 360, height: 360, uniq_key: '360', format: 'webp' },
];

const textEncoder = new TextEncoder();
let workerIdentity: WorkerIdentity | null = null;
let sessionCursor = 0;

function getWorkerIdentity(): WorkerIdentity {
  if (!workerIdentity) {
    workerIdentity = {
      webId: randomLargeId(),
      userId: uuid(false),
    };
  }
  return workerIdentity;
}

function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders(request),
    },
  });
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin') || '*';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'origin',
  };
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeBaseUrl(baseUrl: string | undefined, fallback: string): string {
  return (baseUrl || fallback).replace(/\/+$/, '');
}

function isSupportedImageInput(value: string): boolean {
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(value) || /^https?:\/\//i.test(value);
}

function normalizeImageFormat(format: unknown): string {
  const normalized = asString(format)?.toLowerCase();
  if (normalized === 'png') return 'png';
  if (normalized === 'jpg') return 'jpeg';
  if (normalized === 'webp') return 'webp';
  return 'jpeg';
}

function getArkErrorMessage(data: ArkImageResponse): string | null {
  const topLevel = asString(data.error?.message);
  if (topLevel) return topLevel;

  const first = Array.isArray(data.data) ? data.data[0] as ArkImageResult | undefined : undefined;
  return asString(first?.error?.message);
}

async function parseJsonRequest(request: Request): Promise<JimengRedrawRequestBody | null> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body as JimengRedrawRequestBody : null;
  } catch {
    return null;
  }
}

function parseSessionIds(value: string | undefined): string[] {
  const normalized = (value || '').trim().replace(/^Bearer\s+/i, '');
  if (!normalized) return [];

  const cookieSessionId = normalized.match(/(?:^|[;\s])sessionid=([^;\s,]+)/i)?.[1];
  if (cookieSessionId) return [cookieSessionId];

  return normalized
    .split(',')
    .map((token) => token.trim().replace(/^sessionid=/i, '').replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

function pickSessionId(sessionIds: string[]): string {
  const picked = sessionIds[sessionCursor % sessionIds.length];
  sessionCursor = (sessionCursor + 1) % sessionIds.length;
  return picked;
}

async function handleJimengRedraw(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== 'POST') {
    return jsonResponse(request, { error: 'Method not allowed' }, 405);
  }

  const body = await parseJsonRequest(request);
  if (!body) {
    return jsonResponse(request, { error: 'Request body must be JSON.' }, 400);
  }

  const image = asString(body.imageDataUrl) || asString(body.imageUrl) || asString(body.image);
  if (!image || !isSupportedImageInput(image)) {
    return jsonResponse(
      request,
      { error: 'imageDataUrl must be an image URL or data:image/...;base64,... string.' },
      400,
    );
  }

  const prompt = asString(body.prompt) || DEFAULT_PROMPT;
  const size = asString(body.size) || DEFAULT_SIZE;
  const requestSessionIds = parseSessionIds(asString(body.sessionId) || undefined);
  const configuredSessionIds = parseSessionIds(env.JIMENG_SESSION_IDS);
  const sessionIds = requestSessionIds.length > 0 ? requestSessionIds : configuredSessionIds;

  if (sessionIds.length > 0) {
    return handleSessionRedraw(request, env, body, image, prompt, size, sessionIds);
  }

  if (env.ARK_API_KEY && env.ARK_IMAGE_MODEL) {
    return handleArkRedraw(request, env, image, prompt, size);
  }

  return jsonResponse(
    request,
    {
      error:
        'Jimeng image generation is not configured. Set JIMENG_SESSION_IDS for the lightweight sessionid reverse proxy, or set ARK_API_KEY and ARK_IMAGE_MODEL for Ark fallback.',
    },
    503,
  );
}

function handleDebugEnv(request: Request, env: Env): Response {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== 'GET') {
    return jsonResponse(request, { error: 'Method not allowed' }, 405);
  }

  const envRecord = env as unknown as Record<string, unknown>;
  const envKeys = Object.keys(envRecord)
    .filter((key) => key !== 'ASSETS')
    .sort();
  const sessionIdCount = parseSessionIds(env.JIMENG_SESSION_IDS).length;

  return jsonResponse(request, {
    hasJimengSessionIds: sessionIdCount > 0,
    jimengSessionIdCount: sessionIdCount,
    hasArkApiKey: Boolean(asString(env.ARK_API_KEY)),
    hasArkImageModel: Boolean(asString(env.ARK_IMAGE_MODEL)),
    hasJimengImageModel: Boolean(asString(env.JIMENG_IMAGE_MODEL)),
    envKeys,
  });
}

async function handleArkRedraw(
  request: Request,
  env: Env,
  image: string,
  prompt: string,
  size: string,
): Promise<Response> {
  const upstreamBody = {
    model: env.ARK_IMAGE_MODEL,
    prompt,
    image,
    size,
    response_format: 'b64_json',
    watermark: false,
    stream: false,
  };

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${normalizeBaseUrl(env.ARK_BASE_URL, DEFAULT_ARK_BASE_URL)}/images/generations`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.ARK_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(upstreamBody),
    });
  } catch {
    return jsonResponse(request, { error: 'Failed to reach Ark image generation API.' }, 502);
  }

  const upstreamJson = await upstreamResponse.json().catch(() => null) as ArkImageResponse | null;
  if (!upstreamJson || typeof upstreamJson !== 'object') {
    return jsonResponse(request, { error: 'Ark image generation returned an invalid response.' }, 502);
  }

  const upstreamError = getArkErrorMessage(upstreamJson);
  if (!upstreamResponse.ok || upstreamError) {
    return jsonResponse(
      request,
      { error: upstreamError || `Ark image generation failed with status ${upstreamResponse.status}.` },
      502,
    );
  }

  const firstImage = Array.isArray(upstreamJson.data)
    ? upstreamJson.data.find((item) => {
      const result = item as ArkImageResult;
      return asString(result.b64_json) || asString(result.url);
    }) as ArkImageResult | undefined
    : undefined;

  if (!firstImage) {
    return jsonResponse(request, { error: 'Ark image generation did not return an image.' }, 502);
  }

  const b64 = asString(firstImage.b64_json);
  const format = normalizeImageFormat(firstImage.output_format);
  return jsonResponse(request, {
    imageDataUrl: b64 ? `data:image/${format};base64,${b64}` : null,
    imageUrl: asString(firstImage.url),
    model: asString(upstreamJson.model),
    size: asString(firstImage.size),
    usage: upstreamJson.usage ?? null,
    provider: 'ark',
  });
}

async function handleSessionRedraw(
  request: Request,
  env: Env,
  body: JimengRedrawRequestBody,
  image: string,
  prompt: string,
  size: string,
  sessionIds: string[],
): Promise<Response> {
  const baseUrl = normalizeBaseUrl(env.JIMENG_WEB_BASE_URL, DEFAULT_JIMENG_WEB_BASE_URL);
  const sessionId = pickSessionId(sessionIds);

  try {
    const options = resolveJimengImageOptions(body, env, size);
    const generatedUrls = await generateJimengImages(baseUrl, sessionId, image, prompt, options, env);
    const imageUrl = generatedUrls.find(Boolean) || null;
    if (!imageUrl) {
      return jsonResponse(request, { error: 'Jimeng session reverse proxy did not return an image.' }, 502);
    }

    const imageDataUrl = await imageUrlToDataUrl(imageUrl).catch(() => null);
    return jsonResponse(request, {
      imageDataUrl,
      imageUrl,
      model: options.modelName,
      size: `${options.width}x${options.height}`,
      usage: null,
      provider: 'jimeng-session',
    });
  } catch (error) {
    return jsonResponse(
      request,
      { error: error instanceof Error ? error.message : 'Jimeng session reverse proxy failed.' },
      502,
    );
  }
}

function resolveJimengImageOptions(
  body: JimengRedrawRequestBody,
  env: Env,
  size: string,
): JimengImageOptions {
  const modelName = asString(body.model) || env.JIMENG_IMAGE_MODEL || DEFAULT_SESSION_IMAGE_MODEL;
  const modelConfig = IMAGE_MODEL_CONFIGS[modelName] || IMAGE_MODEL_CONFIGS[DEFAULT_SESSION_IMAGE_MODEL];
  const requestedResolution = asString(body.resolution) as '1k' | '2k' | '4k' | null;
  const inferredResolution = inferResolution(size);
  const resolution = modelConfig.supportedResolutions.includes(requestedResolution || inferredResolution)
    ? requestedResolution || inferredResolution
    : modelConfig.defaultResolution;
  const ratio = normalizeRatio(asString(body.ratio) || inferRatio(size));
  const dimensions = getDimensionMap(resolution)[ratio];
  const sampleStrength = clamp(asNumber(body.sampleStrength) ?? 0.5, 0, 1);

  return {
    modelName: modelConfig.id,
    modelReqKey: modelConfig.modelReqKey,
    ratio,
    imageRatio: RATIO_VALUES[ratio],
    resolution,
    width: dimensions.width,
    height: dimensions.height,
    sampleStrength,
    negativePrompt: asString(body.negativePrompt) || '',
  };
}

function inferResolution(size: string): '1k' | '2k' | '4k' {
  const parsed = parseSize(size);
  if (!parsed) return '2k';
  const maxSide = Math.max(parsed.width, parsed.height);
  if (maxSide >= 3500) return '4k';
  if (maxSide >= 1800) return '2k';
  return '1k';
}

function inferRatio(size: string): string {
  const parsed = parseSize(size);
  if (!parsed) return '1:1';
  const ratio = parsed.width / parsed.height;
  const candidates = Object.keys(RATIO_VALUES)
    .map((key) => {
      const [width, height] = key.split(':').map(Number);
      return { key, distance: Math.abs(ratio - width / height) };
    })
    .sort((a, b) => a.distance - b.distance);
  return candidates[0]?.key || '1:1';
}

function parseSize(size: string): { width: number; height: number } | null {
  const match = /^(\d{2,5})x(\d{2,5})$/i.exec(size.trim());
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

function normalizeRatio(ratio: string): string {
  return Object.prototype.hasOwnProperty.call(RATIO_VALUES, ratio) ? ratio : '1:1';
}

function getDimensionMap(resolution: '1k' | '2k' | '4k'): Record<string, { width: number; height: number }> {
  if (resolution === '4k') return DIMENSIONS_4K;
  if (resolution === '2k') return DIMENSIONS_2K;
  return DIMENSIONS_1K;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

async function generateJimengImages(
  baseUrl: string,
  sessionId: string,
  image: string,
  prompt: string,
  options: JimengImageOptions,
  env: Env,
): Promise<string[]> {
  const uploaded = await uploadJimengReferenceImage(baseUrl, sessionId, image);
  const componentId = uuid();
  const submitId = uuid();
  const blendId = uuid();

  const abilities = {
    type: '',
    id: uuid(),
    blend: {
      type: '',
      id: blendId,
      min_features: [],
      core_param: {
        type: '',
        id: uuid(),
        model: options.modelReqKey,
        prompt: `${prompt}##`,
        sample_strength: options.sampleStrength,
        image_ratio: options.imageRatio,
        large_image_info: {
          type: '',
          id: uuid(),
          height: options.height,
          width: options.width,
          resolution_type: options.resolution,
        },
      },
      ability_list: [
        {
          type: '',
          id: uuid(),
          name: 'byte_edit',
          image_uri_list: [uploaded.imageUri],
          image_list: [
            {
              type: 'image',
              id: uuid(),
              source_from: 'upload',
              platform_type: 1,
              name: '',
              image_uri: uploaded.imageUri,
              width: 0,
              height: 0,
              format: '',
              uri: uploaded.imageUri,
            },
          ],
          strength: 0.5,
        },
      ],
      history_option: { type: '', id: uuid() },
      prompt_placeholder_info_list: [{ type: '', id: uuid(), ability_index: 0 }],
      postedit_param: { type: '', id: uuid(), generate_type: 0 },
    },
  };

  const requestData = {
    extend: { root_model: options.modelReqKey },
    submit_id: submitId,
    draft_content: JSON.stringify({
      type: 'draft',
      id: uuid(),
      min_version: MIN_VERSION,
      min_features: [],
      is_from_tsn: true,
      version: DRAFT_VERSION,
      main_component_id: componentId,
      component_list: [
        {
          type: 'image_base_component',
          id: componentId,
          min_version: MIN_VERSION,
          metadata: {
            type: '',
            id: uuid(),
            created_platform: 3,
            created_platform_version: '',
            created_time_in_ms: String(Date.now()),
            created_did: '',
          },
          generate_type: 'blend',
          aigc_mode: 'workbench',
          abilities,
        },
      ],
    }),
    http_common_info: { aid: DEFAULT_ASSISTANT_ID },
  };

  const generateResult = await requestJimeng(baseUrl, 'POST', '/mweb/v1/aigc_draft/generate', sessionId, {
    params: {
      da_version: DRAFT_VERSION,
      web_component_open_flag: 1,
      web_version: WEB_VERSION,
    },
    data: requestData,
  });
  const historyId = asString(getPath(generateResult, ['aigc_data', 'history_record_id']));
  if (!historyId) throw new Error('Jimeng generation did not return a history id.');

  return pollJimengImages(baseUrl, sessionId, historyId, env);
}

async function pollJimengImages(
  baseUrl: string,
  sessionId: string,
  historyId: string,
  env: Env,
): Promise<string[]> {
  const maxRetries = Math.max(1, Number(env.JIMENG_MAX_POLL_RETRIES || 120));
  const intervalMs = Math.max(0, Number(env.JIMENG_POLL_INTERVAL_MS || 1000));
  const processingStates = new Set([20, 42, 45]);
  let lastStatus = 20;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    if (intervalMs > 0) await sleep(intervalMs);
    const result = await requestJimeng(baseUrl, 'POST', '/mweb/v1/get_history_by_ids', sessionId, {
      data: {
        history_ids: [historyId],
        image_info: {
          width: 2048,
          height: 2048,
          format: 'webp',
          image_scene_list: POLL_IMAGE_SCENES,
        },
        http_common_info: { aid: DEFAULT_ASSISTANT_ID },
      },
    });

    const record = getPath(result, [historyId]) as JsonObject | null;
    if (!record || typeof record !== 'object') {
      throw new Error('Jimeng history record was not found.');
    }

    lastStatus = Number(record.status);
    const itemList = Array.isArray(record.item_list) ? record.item_list : [];
    const urls = itemList.map(extractGeneratedImageUrl).filter(Boolean);
    if (urls.length > 0) return urls;

    const failCode = asString(record.fail_code);
    if (lastStatus === 30) {
      if (failCode === '2038') throw new Error('Jimeng rejected the prompt because it hit content safety filters.');
      throw new Error(`Jimeng image generation failed${failCode ? ` with code ${failCode}` : ''}.`);
    }

    if (!processingStates.has(lastStatus)) break;
  }

  throw new Error(`Jimeng image generation timed out or returned no image. Last status: ${lastStatus}.`);
}

function extractGeneratedImageUrl(item: unknown): string | null {
  const largeImageUrl = asString(getPath(item, ['image', 'large_images', 0, 'image_url']));
  if (largeImageUrl) return largeImageUrl;
  return asString(getPath(item, ['common_attr', 'cover_url']));
}

async function uploadJimengReferenceImage(
  baseUrl: string,
  sessionId: string,
  image: string,
): Promise<UploadedImage> {
  const input = await readImageInput(image);
  const uploadAuth = await requestJimeng(baseUrl, 'POST', '/mweb/v1/get_upload_token?aid=513695&da_version=3.2.2&aigc_features=app_lip_sync', sessionId, {
    data: { scene: 2 },
  }) as JsonObject;

  const accessKeyId = asString(uploadAuth.access_key_id);
  const secretAccessKey = asString(uploadAuth.secret_access_key);
  const sessionToken = asString(uploadAuth.session_token);
  if (!accessKeyId || !secretAccessKey || !sessionToken) {
    throw new Error('Jimeng did not return ImageX upload credentials. The sessionid may be expired.');
  }

  const applyParams = {
    Action: 'ApplyImageUpload',
    FileSize: input.bytes.byteLength,
    ServiceId: 'tb4s082cfz',
    Version: '2018-08-01',
    s: randomString(11),
  };
  const applyHeaders = await generateAwsAuthorizationHeaders(
    accessKeyId,
    secretAccessKey,
    sessionToken,
    'cn-north-1',
    'imagex',
    'GET',
    applyParams,
  );
  const applyJson = await fetchJson(`https://imagex.bytedanceapi.com/?${toQueryString(applyParams)}`, {
    method: 'GET',
    headers: applyHeaders,
  });
  assertImageXOk(applyJson, 'Failed to apply for ImageX upload.');

  const uploadAddress = getPath(applyJson, ['Result', 'UploadAddress']) as JsonObject | null;
  const uploadHosts = getPath(uploadAddress, ['UploadHosts']) as unknown[];
  const storeInfos = getPath(uploadAddress, ['StoreInfos']) as unknown[];
  const uploadHost = Array.isArray(uploadHosts) ? asString(uploadHosts[0]) : null;
  const storeInfo = Array.isArray(storeInfos) && storeInfos[0] && typeof storeInfos[0] === 'object'
    ? storeInfos[0] as JsonObject
    : null;
  const storeUri = asString(storeInfo?.StoreUri);
  const storeAuth = asString(storeInfo?.Auth);
  const sessionKey = asString(uploadAddress?.SessionKey);

  if (!uploadHost || !storeUri || !storeAuth || !sessionKey) {
    throw new Error('ImageX upload address is incomplete.');
  }

  const uploadResponse = await fetch(`https://${uploadHost}/upload/v1/${storeUri}`, {
    method: 'POST',
    headers: {
      authorization: storeAuth,
      'content-crc32': crc32Hex(input.bytes),
      'content-type': 'application/octet-stream',
    },
    body: uint8ArrayToArrayBuffer(input.bytes),
  });
  const uploadJson = await uploadResponse.json().catch(() => null) as JsonObject | null;
  if (!uploadResponse.ok || uploadJson?.code !== 2000) {
    throw new Error(asString(uploadJson?.message) || `ImageX binary upload failed with status ${uploadResponse.status}.`);
  }

  const commitParams = {
    Action: 'CommitImageUpload',
    FileSize: input.bytes.byteLength,
    ServiceId: 'tb4s082cfz',
    Version: '2018-08-01',
  };
  const commitBody = { SessionKey: sessionKey };
  const commitHeaders = await generateAwsAuthorizationHeaders(
    accessKeyId,
    secretAccessKey,
    sessionToken,
    'cn-north-1',
    'imagex',
    'POST',
    commitParams,
    commitBody,
  );
  const commitJson = await fetchJson(`https://imagex.bytedanceapi.com/?${toQueryString(commitParams)}`, {
    method: 'POST',
    headers: {
      ...commitHeaders,
      'content-type': 'application/json',
    },
    body: JSON.stringify(commitBody),
  });
  assertImageXOk(commitJson, 'Failed to commit ImageX upload.');

  const imageUri = asString(getPath(commitJson, ['Result', 'Results', 0, 'Uri']));
  if (!imageUri) throw new Error('ImageX commit did not return an image URI.');
  return { imageUri };
}

async function requestJimeng(
  baseUrl: string,
  method: string,
  uri: string,
  sessionId: string,
  options: { params?: Record<string, string | number | boolean>; data?: unknown; headers?: Record<string, string> } = {},
): Promise<unknown> {
  const identity = getWorkerIdentity();
  const deviceTime = unixTimestamp();
  const sign = md5(`9e2c|${uri.slice(-7)}|${PLATFORM_CODE}|${VERSION_CODE}|${deviceTime}||11ac`);
  const url = new URL(uri, baseUrl);
  const requestParams = {
    aid: DEFAULT_ASSISTANT_ID,
    device_platform: 'web',
    region: 'CN',
    webId: identity.webId,
    ...(options.params || {}),
  };
  appendSearchParams(url, requestParams);

  const headers = {
    accept: 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh;q=0.9',
    appid: String(DEFAULT_ASSISTANT_ID),
    appvr: VERSION_CODE,
    origin: baseUrl,
    referer: baseUrl,
    pf: PLATFORM_CODE,
    'sec-ch-ua': '"Google Chrome";v="142", "Chromium";v="142", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    cookie: generateJimengCookie(sessionId, identity),
    'device-time': String(deviceTime),
    sign,
    'sign-ver': '1',
    ...(options.headers || {}),
  };

  const init: RequestInit = {
    method,
    headers: {
      ...headers,
      ...(options.data === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: options.data === undefined ? undefined : JSON.stringify(options.data),
  };
  const response = await fetch(url.toString(), init);
  const payload = await response.json().catch(() => null) as JsonObject | null;
  if (!response.ok) {
    throw new Error(`Jimeng request failed with status ${response.status}.`);
  }
  if (!payload || typeof payload !== 'object') {
    throw new Error('Jimeng returned an invalid JSON response.');
  }

  return checkJimengResult(payload);
}

function checkJimengResult(payload: JsonObject): unknown {
  const ret = payload.ret;
  if (ret === undefined || ret === null || Number.isNaN(Number(ret))) return payload;
  if (String(ret) === '0') return payload.data;

  const message = asString(payload.errmsg) || asString(payload.message) || 'request failed';
  if (String(ret) === '5000' || String(ret) === '1006') {
    throw new Error(`Jimeng credits are insufficient: ${message} (code ${String(ret)}).`);
  }
  throw new Error(`Jimeng request failed: ${message} (code ${String(ret)}).`);
}

function generateJimengCookie(sessionId: string, identity: WorkerIdentity): string {
  const now = unixTimestamp();
  const expires = new Date((now + 60 * 24 * 60 * 60) * 1000).toUTCString();
  const encodedExpires = encodeURIComponent(expires).replace(/%20/g, '+');
  return [
    `_tea_web_id=${identity.webId}`,
    'is_staff_user=false',
    'store-region=cn-gd',
    'store-region-src=uid',
    `sid_guard=${sessionId}%7C${now}%7C5184000%7C${encodedExpires}`,
    `uid_tt=${identity.userId}`,
    `uid_tt_ss=${identity.userId}`,
    `sid_tt=${sessionId}`,
    `sessionid=${sessionId}`,
    `sessionid_ss=${sessionId}`,
  ].join('; ');
}

async function fetchJson(url: string, init: RequestInit): Promise<JsonObject> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null) as JsonObject | null;
  if (!response.ok || !payload || typeof payload !== 'object') {
    throw new Error(`Request failed with status ${response.status}.`);
  }
  return payload;
}

function assertImageXOk(payload: JsonObject, fallback: string): void {
  const responseError = getPath(payload, ['Response ', 'Error', 'Message']) || getPath(payload, ['Response', 'Error', 'Message']);
  const message = asString(responseError);
  if (message) throw new Error(message);
  if (!payload.Result) throw new Error(fallback);
}

async function readImageInput(image: string): Promise<ImageInputBytes> {
  if (image.startsWith('data:')) return dataUrlToBytes(image);

  const response = await fetch(image);
  if (!response.ok) throw new Error(`Failed to fetch reference image: ${response.status}.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_INPUT_BYTES) throw new Error('Reference image is too large.');
  return {
    bytes,
    mimeType: response.headers.get('content-type') || 'image/jpeg',
  };
}

function dataUrlToBytes(dataUrl: string): ImageInputBytes {
  const match = /^data:([^;,]+);base64,(.*)$/i.exec(dataUrl);
  if (!match) throw new Error('Invalid image data URL.');
  const mimeType = match[1] || 'image/png';
  const binary = atob(match[2].replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  if (bytes.byteLength > MAX_IMAGE_INPUT_BYTES) throw new Error('Reference image is too large.');
  return { bytes, mimeType };
}

async function imageUrlToDataUrl(imageUrl: string): Promise<string | null> {
  if (imageUrl.startsWith('data:image/')) return imageUrl;
  const response = await fetch(imageUrl);
  if (!response.ok) return null;
  const mimeType = response.headers.get('content-type') || 'image/webp';
  const bytes = new Uint8Array(await response.arrayBuffer());
  return `data:${mimeType};base64,${arrayBufferToBase64(bytes)}`;
}

function arrayBufferToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function uint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function getPath(value: unknown, path: Array<string | number>): unknown {
  let cursor = value;
  for (const key of path) {
    if (cursor === null || cursor === undefined) return null;
    if (typeof key === 'number') {
      if (!Array.isArray(cursor)) return null;
      cursor = cursor[key];
    } else {
      if (typeof cursor !== 'object') return null;
      cursor = (cursor as Record<string, unknown>)[key];
    }
  }
  return cursor;
}

function appendSearchParams(url: URL, params: Record<string, string | number | boolean>): void {
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
}

function toQueryString(params: Record<string, string | number | boolean>): string {
  const query = new URLSearchParams();
  appendSearchParams({ searchParams: query } as URL, params);
  return query.toString();
}

async function generateAwsAuthorizationHeaders(
  accessKeyId: string,
  secretAccessKey: string,
  sessionToken: string,
  region: string,
  service: string,
  requestMethod: string,
  requestParams: Record<string, string | number | boolean>,
  requestBody: Record<string, unknown> = {},
): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const amzDay = amzDate.slice(0, 8);
  const requestHeaders: Record<string, string> = {
    'X-Amz-Date': amzDate,
    'X-Amz-Security-Token': sessionToken,
  };
  const hasBody = Object.keys(requestBody).length > 0;
  if (hasBody) {
    requestHeaders['X-Amz-Content-Sha256'] = await sha256Hex(JSON.stringify(requestBody));
  }

  const sortedHeaderKeys = Object.keys(requestHeaders).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  const signedHeaders = sortedHeaderKeys.map((key) => key.toLowerCase()).join(';');
  const canonicalHeaders = sortedHeaderKeys
    .map((key) => `${key.toLowerCase()}:${requestHeaders[key]}`)
    .join('\n') + '\n';
  const bodyHash = hasBody ? await sha256Hex(JSON.stringify(requestBody)) : await sha256Hex('');
  const canonicalRequest = [
    requestMethod.toUpperCase(),
    '/',
    toQueryString(requestParams),
    canonicalHeaders,
    signedHeaders,
    bodyHash,
  ].join('\n');

  const credentialString = `${amzDay}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialString,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = await hmacSha256(textEncoder.encode(`AWS4${secretAccessKey}`), amzDay);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const signingKey = await hmacSha256(kService, 'aws4_request');
  const signature = toHex(new Uint8Array(await hmacSha256(signingKey, stringToSign)));

  return {
    ...requestHeaders,
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialString}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

async function sha256Hex(value: string | Uint8Array): Promise<string> {
  const data = typeof value === 'string' ? textEncoder.encode(value) : value;
  const hash = await crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(hash));
}

async function hmacSha256(key: Uint8Array | ArrayBuffer, value: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key instanceof Uint8Array ? key : new Uint8Array(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, textEncoder.encode(value));
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function crc32Hex(bytes: Uint8Array): string {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16);
}

function md5(input: string): string {
  const bytes = textEncoder.encode(input);
  const paddedLength = (((bytes.length + 8) >> 6) + 1) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  const bitLength = bytes.length * 8;
  view.setUint32(paddedLength - 8, bitLength >>> 0, true);
  view.setUint32(paddedLength - 4, Math.floor(bitLength / 0x100000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  const shifts = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const table = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;
    const words = Array.from({ length: 16 }, (_, index) => view.getUint32(offset + index * 4, true));

    for (let index = 0; index < 64; index += 1) {
      let f: number;
      let g: number;
      if (index < 16) {
        f = (b & c) | (~b & d);
        g = index;
      } else if (index < 32) {
        f = (d & b) | (~d & c);
        g = (5 * index + 1) % 16;
      } else if (index < 48) {
        f = b ^ c ^ d;
        g = (3 * index + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * index) % 16;
      }
      const nextD = d;
      d = c;
      c = b;
      b = (b + leftRotate((a + f + table[index] + words[g]) >>> 0, shifts[index])) >>> 0;
      a = nextD;
    }

    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  return [a0, b0, c0, d0].map(wordToLittleEndianHex).join('');
}

function leftRotate(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function wordToLittleEndianHex(word: number): string {
  return [
    word & 0xff,
    (word >>> 8) & 0xff,
    (word >>> 16) & 0xff,
    (word >>> 24) & 0xff,
  ].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function uuid(withHyphens = true): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = toHex(bytes);
  if (!withHyphens) return hex;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function randomString(length: number): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => chars[byte % chars.length]).join('');
}

function randomLargeId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const view = new DataView(bytes.buffer);
  const value = view.getBigUint64(0, false) % 999999999999999999n + 7000000000000000000n;
  return value.toString();
}

function unixTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === JIMENG_REDRAW_PATH) {
      return handleJimengRedraw(request, env);
    }
    if (url.pathname === DEBUG_ENV_PATH) {
      return handleDebugEnv(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
