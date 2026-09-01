// Local persistence. Everything stays in the browser; nothing is sent anywhere
// except the OpenRouter calls the user triggers.

const SETTINGS_KEY = 'nutrition.settings.v1';
const ENTRIES_KEY = 'nutrition.entries.v1';
const MODELS_KEY = 'nutrition.models.v1';

export const DEFAULT_SETTINGS = {
  apiKey: '',
  visionModel: 'google/gemini-2.5-flash',
  textModel: 'google/gemini-2.5-flash',
  useSameModel: true,
  goals: { calories: 2000, protein: 150, carbs: 220, fat: 65 },
  notes: '',
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn('Could not save to local storage', err);
    return false;
  }
}

export function loadSettings() {
  const saved = read(SETTINGS_KEY, {});
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    goals: { ...DEFAULT_SETTINGS.goals, ...(saved.goals || {}) },
  };
}

export function saveSettings(settings) {
  return write(SETTINGS_KEY, settings);
}

export function loadEntries() {
  const list = read(ENTRIES_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function saveEntries(entries) {
  return write(ENTRIES_KEY, entries);
}

export function cacheModels(models) {
  write(MODELS_KEY, { at: Date.now(), models });
}

export function readCachedModels(maxAgeMs = 24 * 60 * 60 * 1000) {
  const hit = read(MODELS_KEY, null);
  if (!hit || !Array.isArray(hit.models) || Date.now() - hit.at > maxAgeMs) return null;
  return hit.models;
}

export function clearEntries() {
  localStorage.removeItem(ENTRIES_KEY);
}

export function newId() {
  return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())).slice(0, 18);
}
