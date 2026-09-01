// Thin OpenRouter client. Calls go straight from the browser to
// https://openrouter.ai/api/v1 using the key stored in local storage.

const BASE = 'https://openrouter.ai/api/v1';

// Used when the live model list can't be fetched (offline, blocked, rate limited).
export const FALLBACK_MODELS = [
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', vision: true },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', vision: true },
  { id: 'openai/gpt-4o', name: 'GPT-4o', vision: true },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o mini', vision: true },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', vision: true },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', vision: false },
  { id: 'meta-llama/llama-3.2-90b-vision-instruct', name: 'Llama 3.2 90B Vision', vision: true },
  { id: 'qwen/qwen2.5-vl-72b-instruct', name: 'Qwen2.5 VL 72B', vision: true },
  { id: 'mistralai/mistral-small-3.2-24b-instruct', name: 'Mistral Small 3.2', vision: true },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', vision: false },
];

/** Fetch every model OpenRouter currently serves. No API key required. */
export async function fetchModels() {
  const res = await fetch(BASE + '/models');
  if (!res.ok) throw new Error('Model list request failed (' + res.status + ')');
  const body = await res.json();
  const rows = Array.isArray(body.data) ? body.data : [];
  return rows
    .map((m) => {
      const inputs = (m.architecture && m.architecture.input_modalities) || [];
      const promptPrice = Number((m.pricing && m.pricing.prompt) || 0);
      return {
        id: m.id,
        name: m.name || m.id,
        vision: inputs.includes('image'),
        free: promptPrice === 0,
        context: m.context_length || 0,
        pricing: m.pricing || null,
      };
    })
    .filter((m) => m.id)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** One chat completion. `messages` is OpenAI-shaped. */
export async function chat({ apiKey, model, messages, jsonMode = false, maxTokens = 1200, signal }) {
  if (!apiKey) throw new Error('No OpenRouter API key set. Add one in Settings.');
  if (!model) throw new Error('No model selected. Pick one in Settings.');

  const payload = { model, messages, max_tokens: maxTokens, temperature: 0.2 };
  if (jsonMode) payload.response_format = { type: 'json_object' };

  const res = await fetch(BASE + '/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'HTTP-Referer': location.origin,
      'X-Title': 'Nutrition',
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error('OpenRouter returned something unreadable:\n' + text.slice(0, 400));
  }
  if (!res.ok || body.error) {
    const msg = (body.error && (body.error.message || body.error)) || res.status + ' ' + res.statusText;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  const choice = body.choices && body.choices[0];
  const content = choice && choice.message && choice.message.content;
  if (!content) throw new Error('The model returned an empty response.');
  return typeof content === 'string'
    ? content
    : content.map((part) => part.text || '').join('');
}

/** Pull the first JSON object out of a reply, code fences and preamble included. */
export function parseJsonReply(raw) {
  let s = String(raw).trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  try {
    return JSON.parse(s);
  } catch {
    /* fall through to brace scanning */
  }
  const start = s.search(/[{[]/);
  if (start === -1) throw new Error('No JSON found in the reply:\n' + s.slice(0, 300));
  const open = s[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return JSON.parse(s.slice(start, i + 1));
    }
  }
  throw new Error('Could not parse the model reply as JSON:\n' + s.slice(0, 300));
}
