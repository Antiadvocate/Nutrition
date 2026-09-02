/**
 * OpenRouter client. Everything runs in the browser: the key lives in
 * localStorage and requests go straight from the page to openrouter.ai.
 */

const BASE = 'https://openrouter.ai/api/v1';
const CONFIG_KEY = 'nutrition_openrouter_v1';
const MODELS_KEY = 'nutrition_openrouter_models_v1';
const MODELS_TTL = 24 * 60 * 60 * 1000;

export type AIConfig = {
  apiKey: string;
  visionModel: string;
  textModel: string;
  useVisionForAll: boolean;
};

export type ModelInfo = {
  id: string;
  name: string;
  vision: boolean;
  free: boolean;
  context: number;
  promptPrice: number;
};

const defaultConfig: AIConfig = {
  apiKey: '',
  visionModel: 'google/gemini-2.5-flash',
  textModel: 'google/gemini-2.5-flash',
  useVisionForAll: true,
};

/** Shown when the live catalogue can't be reached. */
export const FALLBACK_MODELS: ModelInfo[] = [
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', vision: true, free: false, context: 1048576, promptPrice: 0 },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', vision: true, free: false, context: 1048576, promptPrice: 0 },
  { id: 'openai/gpt-4o', name: 'GPT-4o', vision: true, free: false, context: 128000, promptPrice: 0 },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o mini', vision: true, free: false, context: 128000, promptPrice: 0 },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', vision: true, free: false, context: 200000, promptPrice: 0 },
  { id: 'qwen/qwen2.5-vl-72b-instruct', name: 'Qwen2.5 VL 72B', vision: true, free: false, context: 32000, promptPrice: 0 },
  { id: 'meta-llama/llama-3.2-90b-vision-instruct', name: 'Llama 3.2 90B Vision', vision: true, free: false, context: 131072, promptPrice: 0 },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', vision: false, free: false, context: 64000, promptPrice: 0 },
];

let config: AIConfig = load();
const listeners = new Set<(c: AIConfig) => void>();

function load(): AIConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...defaultConfig, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Could not read AI config:', e);
  }
  return { ...defaultConfig };
}

export function getConfig(): AIConfig {
  return config;
}

export function saveConfig(patch: Partial<AIConfig>) {
  config = { ...config, ...patch };
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Could not save AI config:', e);
  }
  listeners.forEach(fn => fn(config));
}

export function subscribeConfig(fn: (c: AIConfig) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function hasKey() {
  return Boolean(config.apiKey);
}

/** Model used for a given job. Vision jobs always use the vision model. */
export function modelFor(job: 'vision' | 'text') {
  if (job === 'vision') return config.visionModel;
  return config.useVisionForAll ? config.visionModel : config.textModel;
}

export async function fetchModels(force = false): Promise<ModelInfo[]> {
  if (!force) {
    try {
      const raw = localStorage.getItem(MODELS_KEY);
      if (raw) {
        const hit = JSON.parse(raw);
        if (hit && Date.now() - hit.at < MODELS_TTL && Array.isArray(hit.models) && hit.models.length) {
          return hit.models as ModelInfo[];
        }
      }
    } catch (e) {
      console.warn('Could not read cached models:', e);
    }
  }

  const res = await fetch(`${BASE}/models`);
  if (!res.ok) throw new Error(`Could not load the model list (${res.status})`);
  const body = await res.json();
  const models: ModelInfo[] = (Array.isArray(body.data) ? body.data : [])
    .map((m: any): ModelInfo => {
      const inputs: string[] = m?.architecture?.input_modalities || [];
      const promptPrice = Number(m?.pricing?.prompt ?? 0);
      return {
        id: m.id,
        name: m.name || m.id,
        vision: inputs.includes('image'),
        free: promptPrice === 0,
        context: Number(m.context_length) || 0,
        promptPrice: Number.isFinite(promptPrice) ? promptPrice : 0,
      };
    })
    .filter((m: ModelInfo) => Boolean(m.id))
    .sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));

  try {
    localStorage.setItem(MODELS_KEY, JSON.stringify({ at: Date.now(), models }));
  } catch (e) {
    console.warn('Could not cache models:', e);
  }
  return models;
}

export type ChatPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string | ChatPart[] };

type ChatOptions = {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  responseFormat?: any;
  signal?: AbortSignal;
};

// Models that rejected a structured-output request; we stop asking them.
const noStructuredOutput = new Set<string>();

async function request({ model, messages, maxTokens = 2048, temperature = 0.3, responseFormat, signal }: ChatOptions) {
  const { apiKey } = config;
  if (!apiKey) throw new Error('No OpenRouter API key yet. Open Settings and paste one in.');
  if (!model) throw new Error('No model selected. Pick one in Settings.');

  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': typeof location !== 'undefined' ? location.origin : 'https://localhost',
      'X-Title': 'Nutrition',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      ...(responseFormat ? { response_format: responseFormat } : {}),
    }),
  });

  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`OpenRouter returned an unreadable response: ${text.slice(0, 300)}`);
  }

  if (!res.ok || body.error) {
    const raw = body?.error?.message ?? body?.error ?? `${res.status} ${res.statusText}`;
    const message = typeof raw === 'string' ? raw : JSON.stringify(raw);
    const err = new Error(friendlyError(res.status, message, model)) as Error & { status?: number; raw?: string };
    err.status = res.status;
    err.raw = message;
    throw err;
  }

  const content = body?.choices?.[0]?.message?.content;
  const out = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.map((p: any) => p?.text || '').join('')
      : '';
  if (!out.trim()) throw new Error(`${model} returned an empty response. Try a different model.`);
  return out;
}

function friendlyError(status: number, message: string, model: string) {
  if (status === 401) return 'OpenRouter rejected the API key. Check it in Settings.';
  if (status === 402) return 'That model needs credits on your OpenRouter account. Pick a free model or top up.';
  if (status === 429) return 'Rate limited by OpenRouter. Wait a moment or switch models.';
  if (status === 404) return `${model} is not available on OpenRouter right now. Pick another model in Settings.`;
  return message;
}

export async function chatText(options: ChatOptions) {
  return request(options);
}

/**
 * Ask for JSON. Tries strict structured output first, then falls back for
 * models that do not support it, then parses leniently.
 */
export async function chatJson<T = any>(
  options: ChatOptions & { schema: { name: string; schema: any } },
): Promise<T> {
  const { schema, ...rest } = options;
  const structured = !noStructuredOutput.has(rest.model);

  let raw: string;
  try {
    raw = await request({
      ...rest,
      responseFormat: structured
        ? { type: 'json_schema', json_schema: { name: schema.name, strict: true, schema: schema.schema } }
        : { type: 'json_object' },
    });
  } catch (err: any) {
    const detail = String(err?.raw || err?.message || '').toLowerCase();
    const formatProblem =
      err?.status === 400 ||
      detail.includes('response_format') ||
      detail.includes('json_schema') ||
      detail.includes('structured output');
    if (!formatProblem) throw err;
    noStructuredOutput.add(rest.model);
    // Second attempt: no response_format at all, schema described in the prompt.
    raw = await request({
      ...rest,
      messages: [
        ...rest.messages,
        {
          role: 'system',
          content:
            'Reply with a single raw JSON value matching this JSON Schema. No prose, no markdown fences.\n' +
            JSON.stringify(schema.schema),
        },
      ],
    });
  }

  return parseJson<T>(raw);
}

/** Pulls the first JSON value out of a reply, tolerating fences and preamble. */
export function parseJson<T = any>(reply: string): T {
  let s = reply.trim();
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) s = fenced[1].trim();
  try {
    return JSON.parse(s) as T;
  } catch {
    /* keep going */
  }

  const start = s.search(/[[{]/);
  if (start === -1) throw new Error(`The model did not return JSON: ${s.slice(0, 200)}`);
  const open = s[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return JSON.parse(s.slice(start, i + 1)) as T;
    }
  }
  throw new Error(`Could not parse the model reply as JSON: ${s.slice(0, 200)}`);
}

/** Quick round trip to confirm the key works. */
export async function testConnection(model: string) {
  const reply = await request({
    model,
    messages: [{ role: 'user', content: 'Reply with the single word: ready' }],
    maxTokens: 16,
    temperature: 0,
  });
  return reply.trim();
}
