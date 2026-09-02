import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { format, startOfDay, subDays } from 'date-fns';
import { generateId } from '../lib/utils';

export type Macro = { calories: number; protein: number; carbs: number; fats: number; fiber: number };

export type FoodEntry = Macro & {
  id: string;
  time: string;
  description: string;
  simpleName: string;
  emoji?: string;
  quantity: string;
  baseQuantity: number;
  unit: string;
  macrosPerUnit: Macro;
  giIndex: string;
  satiety: string;
  isFavorite?: boolean;
  /** Logged without numbers: the meal happened, that is all we claim. */
  unmeasured?: boolean;
  repeat?: 'none' | 'daily' | 'weekly';
  sourceRepeatId?: string;
  repeatDayOfWeek?: number;
  sodium?: number;
  potassium?: number;
  iron?: number;
  calcium?: number;
  vitaminC?: number;
  vitaminD?: number;
  processingScore?: number;
  processingCategory?: string;
  ingredients?: string[];
  positives?: string[];
  negatives?: string[];
};

/**
 * A moment of looking at an urge before acting on it. The outcome is the only
 * interesting part: whether it passed on its own once it was seen.
 */
export type PauseRecord = {
  id: string;
  time: string;
  ts: number;
  kind: 'body' | 'mood' | 'habit' | 'boredom' | 'company' | 'unsure';
  outcome: 'ate' | 'passed';
  looked: boolean;
};

export const PAUSE_KINDS: { key: PauseRecord['kind']; label: string; hint: string }[] = [
  { key: 'body', label: 'Body hunger', hint: 'Emptiness, a real signal' },
  { key: 'mood', label: 'A mood', hint: 'Something wants soothing' },
  { key: 'habit', label: 'Habit', hint: 'This is when I always eat' },
  { key: 'boredom', label: 'Boredom', hint: 'Nothing else is happening' },
  { key: 'company', label: 'Company', hint: 'Others are eating' },
  { key: 'unsure', label: 'Not sure', hint: 'Cannot tell yet' },
];

type DayData = {
  entries: FoodEntry[];
  dayType: 'heavy' | 'light';
  burnedCalories: number;
  isSaved?: boolean;
  /** Water drunk that day, in millilitres. */
  water?: number;
  /** Urges looked at that day. */
  pauses?: PauseRecord[];
  /** The day has been closed out; nothing is carried into tomorrow. */
  released?: boolean;
};

const emptyDay = (): DayData => ({ entries: [], dayType: 'heavy', burnedCalories: 47, isSaved: false, water: 0, pauses: [], released: false });

export type TargetProfile = {
  id: string;
  name: string;
  macros: Macro;
};

type State = {
  theme: 'light' | 'dark';
  days: Record<string, DayData>;
  favorites: FoodEntry[];
  repeating: FoodEntry[];
  profiles: TargetProfile[];
  dayProfiles: Record<number, string>;
  /** Daily hydration goal in millilitres. */
  waterTarget: number;
  /** Offer the pause before an entry is logged. */
  pauseBeforeLogging: boolean;
};

export const STORAGE_KEY = 'nutrition_state_v5';

const defaultProfiles: TargetProfile[] = [
  { id: 'p1', name: 'Training Day', macros: { calories: 2500, protein: 160, carbs: 250, fats: 70, fiber: 30 } },
  { id: 'p2', name: 'Rest Day', macros: { calories: 2000, protein: 150, carbs: 150, fats: 60, fiber: 30 } }
];

const defaultDayProfiles: Record<number, string> = {
  0: 'p2', 1: 'p1', 2: 'p2', 3: 'p1', 4: 'p2', 5: 'p1', 6: 'p2'
};

const defaultFavorites: FoodEntry[] = [
  { id: 'f1', time: '', description: '', simpleName: 'Kiwi', emoji: '🥝', quantity: '1 medium', baseQuantity: 1, unit: 'medium', macrosPerUnit: { calories: 42, protein: 0.8, carbs: 10, fats: 0.4, fiber: 2.1 }, giIndex: 'Low', satiety: 'Medium', calories: 42, protein: 0.8, carbs: 10, fats: 0.4, fiber: 2.1 },
  { id: 'f2', time: '', description: '', simpleName: 'Cherries', emoji: '🍒', quantity: '1 cup', baseQuantity: 1, unit: 'cup', macrosPerUnit: { calories: 50, protein: 1, carbs: 12, fats: 0.3, fiber: 1.6 }, giIndex: 'Low', satiety: 'Low', calories: 50, protein: 1, carbs: 12, fats: 0.3, fiber: 1.6 },
  { id: 'f3', time: '', description: '', simpleName: 'Avocado', emoji: '🥑', quantity: '1/2 medium', baseQuantity: 0.5, unit: 'medium', macrosPerUnit: { calories: 234, protein: 2.9, carbs: 12, fats: 21, fiber: 9.2 }, giIndex: 'Low', satiety: 'High', calories: 117, protein: 1.45, carbs: 6, fats: 10.5, fiber: 4.6 },
  { id: 'f4', time: '', description: '', simpleName: 'Salmon', emoji: '🍣', quantity: '4 oz', baseQuantity: 4, unit: 'oz', macrosPerUnit: { calories: 236, protein: 22, carbs: 0, fats: 15, fiber: 0 }, giIndex: 'None', satiety: 'High', calories: 236, protein: 22, carbs: 0, fats: 15, fiber: 0 },
  { id: 'f5', time: '', description: '', simpleName: 'Rice', emoji: '🍚', quantity: '1 cup', baseQuantity: 1, unit: 'cup', macrosPerUnit: { calories: 205, protein: 4.3, carbs: 45, fats: 0.4, fiber: 0.6 }, giIndex: 'High', satiety: 'Medium', calories: 205, protein: 4.3, carbs: 45, fats: 0.4, fiber: 0.6 },
];

const initialState: State = {
  theme: 'dark',
  days: {},
  favorites: defaultFavorites,
  repeating: [],
  profiles: defaultProfiles,
  dayProfiles: defaultDayProfiles,
  waterTarget: 2500,
  pauseBeforeLogging: true
};

type StoreContextType = {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  state: State;
  currentDayData: DayData;
  addEntry: (entry: FoodEntry) => void;
  updateEntry: (id: string, updates: Partial<FoodEntry>) => void;
  deleteEntry: (id: string) => void;
  toggleFavorite: (entry: FoodEntry) => void;
  updateDayType: (type: 'heavy' | 'light') => void;
  setRepeating: (entry: FoodEntry, repeat: 'none' | 'daily' | 'weekly') => void;
  saveDay: () => void;
  toggleTheme: () => void;
  addProfile: () => void;
  updateProfile: (id: string, updates: Partial<TargetProfile>) => void;
  deleteProfile: (id: string) => void;
  assignDayToProfile: (dayOfWeek: number, profileId: string) => void;
  addWater: (ml: number) => void;
  setWaterTarget: (ml: number) => void;
  setPauseBeforeLogging: (on: boolean) => void;
  recordPause: (pause: Omit<PauseRecord, 'id' | 'ts' | 'time'>) => void;
  releaseDay: (released: boolean) => void;
  restoreEntry: (entry: FoodEntry, index: number) => void;
  exportData: () => string;
  importData: (json: string, mode: 'merge' | 'replace') => { days: number; entries: number };
  /** Set when localStorage refuses a write, so the UI can warn instead of silently losing data. */
  saveError: string;
};

export function estimateMicrosIfMissing(entry: FoodEntry): FoodEntry {
  // Check if we have non-zero values for any micronutrients
  const hasValues = 
    (entry.sodium !== undefined && entry.sodium > 0) ||
    (entry.potassium !== undefined && entry.potassium > 0) ||
    (entry.iron !== undefined && entry.iron > 0) ||
    (entry.calcium !== undefined && entry.calcium > 0) ||
    (entry.vitaminC !== undefined && entry.vitaminC > 0) ||
    (entry.vitaminD !== undefined && entry.vitaminD > 0);

  const calories = Number(entry.calories) || 0;
  const protein = Number(entry.protein) || 0;
  const carbs = Number(entry.carbs) || 0;
  const fats = Number(entry.fats) || 0;
  const name = (entry.simpleName || entry.description || '').toLowerCase();

  let sodium = Number(entry.sodium) || 0;
  let potassium = Number(entry.potassium) || 0;
  let iron = Number(entry.iron) || 0;
  let calcium = Number(entry.calcium) || 0;
  let vitaminC = Number(entry.vitaminC) || 0;
  let vitaminD = Number(entry.vitaminD) || 0;
  let processingScore = Number(entry.processingScore) || 0;
  let processingCategory = entry.processingCategory || '';

  if (!hasValues) {
    if (name.includes('chicken') || name.includes('turkey') || name.includes('poultry')) {
      sodium = sodium || Math.round(protein * 3.5);
      potassium = potassium || Math.round(protein * 12);
      iron = iron || Number((protein * 0.05).toFixed(1));
      calcium = calcium || Math.round(protein * 0.5);
      vitaminC = vitaminC || 0;
      vitaminD = vitaminD || Number((protein * 0.02).toFixed(1));
      processingScore = processingScore || 1;
      processingCategory = processingCategory || 'Minimally Processed';
    } 
    else if (name.includes('beef') || name.includes('steak') || name.includes('meat') || name.includes('pork') || name.includes('lamb')) {
      sodium = sodium || Math.round(protein * 4);
      potassium = potassium || Math.round(protein * 15);
      iron = iron || Number((protein * 0.12).toFixed(1));
      calcium = calcium || Math.round(protein * 0.6);
      vitaminC = vitaminC || 0;
      vitaminD = vitaminD || Number((protein * 0.03).toFixed(1));
      processingScore = processingScore || 1;
      processingCategory = processingCategory || 'Minimally Processed';
    }
    else if (name.includes('salmon') || name.includes('tuna') || name.includes('fish') || name.includes('shrimp') || name.includes('seafood')) {
      sodium = sodium || Math.round(protein * 5);
      potassium = potassium || Math.round(protein * 18);
      iron = iron || Number((protein * 0.04).toFixed(1));
      calcium = calcium || Math.round(protein * 1.2);
      vitaminC = vitaminC || 0;
      vitaminD = vitaminD || Number((protein * 0.4).toFixed(1));
      processingScore = processingScore || 1;
      processingCategory = processingCategory || 'Minimally Processed';
    }
    else if (name.includes('egg')) {
      sodium = sodium || Math.round(protein * 10);
      potassium = potassium || Math.round(protein * 11);
      iron = iron || Number((protein * 0.15).toFixed(1));
      calcium = calcium || Math.round(protein * 4);
      vitaminC = vitaminC || 0;
      vitaminD = vitaminD || Number((protein * 0.15).toFixed(1));
      processingScore = processingScore || 1;
      processingCategory = processingCategory || 'Minimally Processed';
    }
    else if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt') || name.includes('dairy') || name.includes('whey')) {
      sodium = sodium || Math.round(protein * 12);
      potassium = potassium || Math.round(protein * 15);
      iron = iron || Number((protein * 0.01).toFixed(1));
      calcium = calcium || Math.round(protein * 35);
      vitaminC = vitaminC || Math.round(calories * 0.01);
      vitaminD = vitaminD || Number((protein * 0.1).toFixed(1));
      processingScore = processingScore || (name.includes('whey') || name.includes('processed cheese') ? 4 : 2);
      processingCategory = processingCategory || (processingScore === 4 ? 'Ultra-Processed' : 'Processed');
    }
    else if (name.includes('spinach') || name.includes('broccoli') || name.includes('kale') || name.includes('salad') || name.includes('lettuce') || name.includes('vegetable') || name.includes('greens')) {
      sodium = sodium || Math.round(carbs * 8);
      potassium = potassium || Math.round(carbs * 55);
      iron = iron || Number((carbs * 0.25).toFixed(1));
      calcium = calcium || Math.round(carbs * 12);
      vitaminC = vitaminC || Math.round(carbs * 5);
      vitaminD = vitaminD || 0;
      processingScore = processingScore || 1;
      processingCategory = processingCategory || 'Minimally Processed';
    }
    else if (name.includes('banana') || name.includes('apple') || name.includes('berry') || name.includes('berries') || name.includes('orange') || name.includes('kiwi') || name.includes('fruit') || name.includes('grape')) {
      sodium = sodium || 2;
      potassium = potassium || Math.round(carbs * 15);
      iron = iron || Number((carbs * 0.02).toFixed(1));
      calcium = calcium || Math.round(carbs * 1.5);
      vitaminC = vitaminC || Math.round(carbs * 2.5);
      vitaminD = vitaminD || 0;
      processingScore = processingScore || 1;
      processingCategory = processingCategory || 'Minimally Processed';
    }
    else if (name.includes('rice') || name.includes('oat') || name.includes('bread') || name.includes('pasta') || name.includes('grain') || name.includes('cereal') || name.includes('flour') || name.includes('carb')) {
      sodium = sodium || (name.includes('bread') ? 150 : 5);
      potassium = potassium || Math.round(carbs * 3);
      iron = iron || Number((carbs * 0.04).toFixed(1));
      calcium = calcium || Math.round(carbs * 0.5);
      vitaminC = vitaminC || 0;
      vitaminD = vitaminD || 0;
      processingScore = processingScore || (name.includes('cereal') || name.includes('bread') ? 3 : 1);
      processingCategory = processingCategory || (processingScore === 3 ? 'Processed' : 'Minimally Processed');
    }
    else if (name.includes('oil') || name.includes('butter') || name.includes('margarine') || name.includes('fat') || name.includes('avocado') || name.includes('nuts') || name.includes('peanut')) {
      sodium = sodium || (name.includes('butter') || name.includes('nuts') ? 50 : 1);
      potassium = potassium || Math.round(fats * 4);
      iron = iron || Number((fats * 0.02).toFixed(1));
      calcium = calcium || Math.round(fats * 0.5);
      vitaminC = vitaminC || (name.includes('avocado') ? 5 : 0);
      vitaminD = vitaminD || 0;
      processingScore = processingScore || (name.includes('margarine') ? 4 : 2);
      processingCategory = processingCategory || (processingScore === 4 ? 'Ultra-Processed' : 'Processed Culinary Ingredient');
    }
    else {
      sodium = sodium || Math.round(protein * 5 + carbs * 2 + fats * 3);
      potassium = potassium || Math.round(protein * 8 + carbs * 6 + fats * 2);
      iron = iron || Number((protein * 0.05 + carbs * 0.02).toFixed(2)) || 0.1;
      calcium = calcium || Math.round(protein * 3 + carbs * 1);
      vitaminC = vitaminC || Math.round(carbs * 0.5);
      vitaminD = vitaminD || Number((protein * 0.01).toFixed(2));
      processingScore = processingScore || 3;
      processingCategory = processingCategory || 'Processed';
    }
  }

  const ingredients = entry.ingredients && entry.ingredients.length > 0 
    ? entry.ingredients 
    : [entry.simpleName || 'Standard Food Ingredients'];

  const positives = entry.positives && entry.positives.length > 0 
    ? entry.positives 
    : [
        protein > 15 ? 'Excellent lean amino acid composition' : 'Provides daily energy balance',
        carbs > 30 && entry.fiber > 4 ? 'Rich in dietary prebiotic fibers' : 'Provides essential fuel source',
        fats > 10 ? 'Contains structural lipid membranes' : 'Low lipid strain profile'
      ];

  const negatives = entry.negatives && entry.negatives.length > 0
    ? entry.negatives
    : (sodium > 800 ? ['Notable sodium/osmotic density level'] : []);

  return {
    ...entry,
    sodium,
    potassium,
    iron,
    calcium,
    vitaminC,
    vitaminD,
    processingScore: processingScore || 2,
    processingCategory: processingCategory || 'Processed',
    ingredients,
    positives,
    negatives
  };
}

const StoreContext = createContext<StoreContextType | null>(null);

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [saveError, setSaveError] = useState('');
  const [state, setState] = useState<State>(() => {
    try {
      const keys = ['nutrition_state_v5', 'nutrition_state_v4', 'nutrition_state_v3', 'nutrition_state_v2', 'nutrition_state_v1', 'nutrition_state'];

      for (const key of keys) {
        const saved = localStorage.getItem(key);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
              // We found the most recent valid state, use it immediately
              return {
                ...initialState,
                ...parsed,
                profiles: parsed.profiles || initialState.profiles,
                dayProfiles: parsed.dayProfiles || initialState.dayProfiles,
                days: parsed.days || initialState.days,
                favorites: parsed.favorites || initialState.favorites,
                repeating: parsed.repeating || initialState.repeating,
                waterTarget: Number(parsed.waterTarget) || initialState.waterTarget,
                pauseBeforeLogging: parsed.pauseBeforeLogging !== false,
              };
            }
          } catch (e) {
            console.warn(`Failed to parse ${key}:`, e);
          }
        }
      }
    } catch (e) {
      console.warn('localStorage is not available:', e);
    }
    return initialState;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
        setSaveError('Storage is full, so recent changes are not being saved. Export a backup, then remove some old days.');
      }
    }
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state]);

  const dateKey = format(currentDate, 'yyyy-MM-dd');

  const currentDayData = useMemo(() => {
    let data = state.days?.[dateKey];
    if (!data) {
      const dayOfWeek = currentDate.getDay();
      const repeatingEntries = state.repeating.filter(r => {
        if (r.repeat === 'daily') return true;
        if (r.repeat === 'weekly') {
          return r.repeatDayOfWeek === dayOfWeek;
        }
        return false;
      }).map(r => ({ ...r, id: generateId(), sourceRepeatId: r.id }));

      data = { ...emptyDay(), entries: repeatingEntries };
    }
    return data;
  }, [state.days, dateKey, state.repeating, currentDate]);

  useEffect(() => {
    if (state.days?.[dateKey]) return;
    if (!currentDayData.entries.length) return;
    setState(prev => (prev.days[dateKey] ? prev : { ...prev, days: { ...prev.days, [dateKey]: currentDayData } }));
  }, [dateKey, currentDayData, state.days]);

  const mutateDay = (updater: (data: DayData) => DayData) => {
    setState(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [dateKey]: updater(prev.days[dateKey] || emptyDay())
      }
    }));
  };

  const addEntry = (entry: FoodEntry) => {
    const enriched = estimateMicrosIfMissing(entry);
    mutateDay(data => ({ ...data, entries: [enriched, ...data.entries], isSaved: false }));
  };

  const updateEntry = (id: string, updates: Partial<FoodEntry>) => {
    mutateDay(data => ({
      ...data,
      entries: data.entries.map(e => {
        if (e.id === id) {
          const merged = { ...e, ...updates };
          // If calories changed, scale existing micronutrients proportionally!
          if (updates.calories !== undefined && e.calories && e.calories !== 0) {
            const ratio = updates.calories / e.calories;
            if (merged.sodium !== undefined) merged.sodium = Math.round(merged.sodium * ratio);
            if (merged.potassium !== undefined) merged.potassium = Math.round(merged.potassium * ratio);
            if (merged.iron !== undefined) merged.iron = Number((merged.iron * ratio).toFixed(1));
            if (merged.calcium !== undefined) merged.calcium = Math.round(merged.calcium * ratio);
            if (merged.vitaminC !== undefined) merged.vitaminC = Math.round(merged.vitaminC * ratio);
            if (merged.vitaminD !== undefined) merged.vitaminD = Number((merged.vitaminD * ratio).toFixed(1));
          }
          return estimateMicrosIfMissing(merged);
        }
        return e;
      }),
      isSaved: false
    }));
  };

  const deleteEntry = (id: string) => {
    mutateDay(data => ({
      ...data,
      entries: data.entries.filter(e => e.id !== id),
      isSaved: false
    }));
  };

  /** Puts a deleted entry back where it was, so a delete can be undone. */
  const restoreEntry = (entry: FoodEntry, index: number) => {
    mutateDay(data => {
      if (data.entries.some(e => e.id === entry.id)) return data;
      const entries = [...data.entries];
      entries.splice(Math.min(Math.max(index, 0), entries.length), 0, entry);
      return { ...data, entries, isSaved: false };
    });
  };

  const setPauseBeforeLogging = (on: boolean) => {
    setState(prev => ({ ...prev, pauseBeforeLogging: on }));
  };

  const recordPause = (pause: Omit<PauseRecord, 'id' | 'ts' | 'time'>) => {
    const now = new Date();
    const record: PauseRecord = { ...pause, id: generateId(), ts: now.getTime(), time: format(now, 'h:mm a') };
    mutateDay(data => ({ ...data, pauses: [record, ...(data.pauses || [])] }));
  };

  const releaseDay = (released: boolean) => {
    mutateDay(data => ({ ...data, released }));
  };

  const addWater = (ml: number) => {
    mutateDay(data => ({ ...data, water: Math.max(0, (data.water || 0) + ml) }));
  };

  const setWaterTarget = (ml: number) => {
    setState(prev => ({ ...prev, waterTarget: Math.max(0, ml) }));
  };

  const exportData = () => JSON.stringify({
    app: 'nutrition',
    version: 5,
    exportedAt: new Date().toISOString(),
    state,
  }, null, 2);

  /**
   * Restores a backup. 'merge' keeps existing days and only fills in ones the
   * backup has that the current data does not, so an import can never quietly
   * destroy a day you already logged.
   */
  const importData = (json: string, mode: 'merge' | 'replace') => {
    const parsed = JSON.parse(json);
    const incoming: Partial<State> = parsed?.state || parsed;
    if (!incoming || typeof incoming !== 'object' || !incoming.days || typeof incoming.days !== 'object') {
      throw new Error('That file does not look like a Nutrition backup.');
    }

    let dayCount = 0;
    let entryCount = 0;

    setState(prev => {
      const days = mode === 'replace' ? {} : { ...prev.days };
      Object.entries(incoming.days as Record<string, DayData>).forEach(([key, day]) => {
        if (!day || !Array.isArray(day.entries)) return;
        if (mode === 'merge' && days[key] && days[key].entries.length > 0) return;
        days[key] = { ...emptyDay(), ...day };
        dayCount++;
        entryCount += day.entries.length;
      });

      return {
        ...prev,
        days,
        favorites: Array.isArray(incoming.favorites) && incoming.favorites.length ? incoming.favorites : prev.favorites,
        repeating: Array.isArray(incoming.repeating) ? incoming.repeating : prev.repeating,
        profiles: Array.isArray(incoming.profiles) && incoming.profiles.length ? incoming.profiles : prev.profiles,
        dayProfiles: incoming.dayProfiles || prev.dayProfiles,
        waterTarget: Number(incoming.waterTarget) || prev.waterTarget,
        pauseBeforeLogging: incoming.pauseBeforeLogging !== false,
      };
    });

    return { days: dayCount, entries: entryCount };
  };

  const toggleFavorite = (entry: FoodEntry) => {
    setState(prev => {
      const isFav = prev.favorites.some(f => f.simpleName === entry.simpleName);
      if (isFav) {
        return { ...prev, favorites: prev.favorites.filter(f => f.simpleName !== entry.simpleName) };
      } else {
        return { ...prev, favorites: [...prev.favorites, { ...entry, id: generateId(), isFavorite: true }] };
      }
    });
  };

  const updateDayType = (type: 'heavy' | 'light') => {
    mutateDay(data => ({ ...data, dayType: type, isSaved: false }));
  };

  const setRepeating = (entry: FoodEntry, repeat: 'none' | 'daily' | 'weekly') => {
    setState(prev => {
      let newRepeating = prev.repeating.filter(r => r.id !== (entry.sourceRepeatId || entry.id));
      if (repeat !== 'none') {
        newRepeating.push({
          ...entry,
          id: entry.sourceRepeatId || entry.id,
          repeat,
          ...(repeat === 'weekly' ? { repeatDayOfWeek: currentDate.getDay() } : {})
        } as any);
      }
      return { ...prev, repeating: newRepeating };
    });
    updateEntry(entry.id, { repeat, sourceRepeatId: repeat !== 'none' ? (entry.sourceRepeatId || entry.id) : undefined });
  };

  const saveDay = () => {
    mutateDay(data => ({ ...data, isSaved: true }));
  };

  const toggleTheme = () => {
    setState(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  };

  const addProfile = () => {
    setState(prev => {
      const newId = generateId();
      return {
        ...prev,
        profiles: [...prev.profiles, { id: newId, name: 'New Profile', macros: { calories: 2000, protein: 150, carbs: 200, fats: 65, fiber: 30 } }]
      };
    });
  };

  const updateProfile = (id: string, updates: Partial<TargetProfile>) => {
    setState(prev => ({
      ...prev,
      profiles: prev.profiles.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const deleteProfile = (id: string) => {
    setState(prev => {
      const newProfiles = prev.profiles.filter(p => p.id !== id);
      const fallbackId = newProfiles[0]?.id || '';
      const newDayProfiles = { ...prev.dayProfiles };
      Object.keys(newDayProfiles).forEach(day => {
        if (newDayProfiles[parseInt(day)] === id) {
          newDayProfiles[parseInt(day)] = fallbackId;
        }
      });
      return { ...prev, profiles: newProfiles, dayProfiles: newDayProfiles };
    });
  };

  const assignDayToProfile = (dayOfWeek: number, profileId: string) => {
    setState(prev => ({
      ...prev,
      dayProfiles: { ...prev.dayProfiles, [dayOfWeek]: profileId }
    }));
  };

  return (
    <StoreContext.Provider value={{
      currentDate, setCurrentDate, state, currentDayData,
      addEntry, updateEntry, deleteEntry, toggleFavorite, updateDayType, setRepeating, saveDay,
      toggleTheme, addProfile, updateProfile, deleteProfile, assignDayToProfile,
      addWater, setWaterTarget, setPauseBeforeLogging, recordPause, releaseDay,
      restoreEntry, exportData, importData, saveError
    }}>
      {children}
    </StoreContext.Provider>
  );
};
