// Prompt building and reply normalisation for the food-estimation calls.

import { chat, parseJsonReply } from './openrouter.js';

const SCHEMA_HINT = `Reply with JSON only, in this exact shape:
{
  "items": [
    {
      "name": "short food name",
      "portion": "the portion you assumed, e.g. 150 g or 1 cup",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "note": "one short sentence about assumptions you made"
}
Macros are grams, calories are kcal, all numbers not strings. One entry per distinct food.
If you genuinely cannot tell what the food is, return an empty items array and say so in note.`;

function systemPrompt(settings) {
  const g = settings.goals || {};
  const lines = [
    'You are a careful nutrition estimator. You read meals and return macro estimates.',
    'Be realistic rather than cautious: give your best single estimate, never a range.',
    `The user targets roughly ${g.calories || 2000} kcal, ${g.protein || 0} g protein, ${g.carbs || 0} g carbs and ${g.fat || 0} g fat per day.`,
  ];
  if (settings.notes) lines.push('User notes: ' + settings.notes);
  return lines.join('\n');
}

export async function analyzePhoto({ settings, dataUrl, hint, signal }) {
  const model = settings.visionModel;
  const userText = [
    'Identify every food and drink in this photo and estimate the nutrition of the portion shown.',
    hint ? 'Extra context from the user: ' + hint : '',
    SCHEMA_HINT,
  ]
    .filter(Boolean)
    .join('\n\n');

  const raw = await chat({
    apiKey: settings.apiKey,
    model,
    signal,
    jsonMode: true,
    messages: [
      { role: 'system', content: systemPrompt(settings) },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  });
  return { model, ...normalize(parseJsonReply(raw)) };
}

export async function analyzeText({ settings, description, signal }) {
  const model = settings.useSameModel ? settings.visionModel : settings.textModel;
  const raw = await chat({
    apiKey: settings.apiKey,
    model,
    signal,
    jsonMode: true,
    messages: [
      { role: 'system', content: systemPrompt(settings) },
      {
        role: 'user',
        content:
          'Estimate the nutrition for this meal description:\n\n' +
          description +
          '\n\n' +
          SCHEMA_HINT,
      },
    ],
  });
  return { model, ...normalize(parseJsonReply(raw)) };
}

export async function dailyInsight({ settings, entries, totals, signal }) {
  const model = settings.useSameModel ? settings.visionModel : settings.textModel;
  const g = settings.goals || {};
  const foodList = entries.length
    ? entries
        .map((e) => `- ${e.name} (${e.portion || 'portion unknown'}): ${e.calories} kcal, ${e.protein}P ${e.carbs}C ${e.fat}F`)
        .join('\n')
    : '(nothing logged yet)';

  return chat({
    apiKey: settings.apiKey,
    model,
    signal,
    maxTokens: 400,
    messages: [
      {
        role: 'system',
        content:
          systemPrompt(settings) +
          '\nYou are talking to the user directly. Be concise, warm and specific. No bullet lists longer than three items, no preamble, no disclaimers about being an AI.',
      },
      {
        role: 'user',
        content:
          `Here is what I ate today:\n${foodList}\n\n` +
          `Totals so far: ${totals.calories} kcal, ${totals.protein} g protein, ${totals.carbs} g carbs, ${totals.fat} g fat.\n` +
          `Targets: ${g.calories} kcal, ${g.protein} g protein, ${g.carbs} g carbs, ${g.fat} g fat.\n\n` +
          'In about 60 words: how is the day tracking, and what would you put on the next plate?',
      },
    ],
  });
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0;
}

/** Accepts the loose shapes models actually return and squares them up. */
export function normalize(parsed) {
  const rawItems = Array.isArray(parsed)
    ? parsed
    : parsed.items || parsed.foods || parsed.entries || [];
  const items = (Array.isArray(rawItems) ? rawItems : []).map((it) => ({
    name: String(it.name || it.food || it.item || 'Unnamed item').slice(0, 80),
    portion: String(it.portion || it.serving || it.quantity || '').slice(0, 60),
    calories: num(it.calories ?? it.kcal ?? it.energy),
    protein: num(it.protein ?? it.protein_g),
    carbs: num(it.carbs ?? it.carbohydrates ?? it.carbs_g),
    fat: num(it.fat ?? it.fats ?? it.fat_g),
    confidence: ['high', 'medium', 'low'].includes(String(it.confidence).toLowerCase())
      ? String(it.confidence).toLowerCase()
      : '',
  }));
  return { items, note: String(parsed.note || parsed.notes || '').slice(0, 400) };
}

/** Shrink and re-encode a photo so uploads stay small and fast. */
export function fileToDataUrl(file, maxEdge = 1024, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not an image the browser can open.'));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/** Tiny square version kept alongside the log entry. */
export function makeThumb(dataUrl, edge = 96) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve('');
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = edge;
      canvas
        .getContext('2d')
        .drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, edge, edge);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = dataUrl;
  });
}
