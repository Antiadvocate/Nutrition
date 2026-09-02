/**
 * Briefing results are cached so revisiting the Coach tab does not spend money
 * on an identical request. Only the newest result per kind is kept — the old
 * scheme wrote a new localStorage key for every food count and calorie total,
 * which grew without limit and competed with the food log for the storage quota.
 */

const CACHE_KEY = 'nutrition_briefing_cache_v2';

type Cached = { key: string; text: string };
type Cache = Partial<Record<'daily' | 'weekly', Cached>>;

function read(): Cache {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getBriefing(kind: 'daily' | 'weekly', key: string): string | null {
  const hit = read()[kind];
  return hit && hit.key === key ? hit.text : null;
}

export function setBriefing(kind: 'daily' | 'weekly', key: string, text: string) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...read(), [kind]: { key, text } }));
  } catch (e) {
    console.warn('Could not cache the briefing:', e);
  }
}

/** Clears the unbounded per-request keys written by earlier versions. */
export function pruneLegacyBriefingKeys() {
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('daily_brief_') || key.startsWith('weekly_brief_days_'))) stale.push(key);
    }
    stale.forEach(key => localStorage.removeItem(key));
  } catch (e) {
    console.warn('Could not prune old briefing keys:', e);
  }
}
