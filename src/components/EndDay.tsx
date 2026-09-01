import React, { useState, useEffect } from 'react';
import { useStore } from '../store/StoreContext';
import { generateCommentary, generateSatietyAnalysis } from '../lib/ai';
import { Loader2, Check } from 'lucide-react';
import { toast } from './ui/Toaster';

export default function EndDay() {
  const { currentDayData, state, saveDay, currentDate } = useStore();
  const [commentary, setCommentary] = useState('');
  const [satiety, setSatiety] = useState('');
  const [loading, setLoading] = useState(true);

  const entries = currentDayData?.entries || [];
  const totals = entries.reduce((acc, entry) => ({
    calories: acc.calories + (entry.calories || 0),
    protein: acc.protein + (entry.protein || 0),
    carbs: acc.carbs + (entry.carbs || 0),
    fats: acc.fats + (entry.fats || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const profileId = state.dayProfiles?.[currentDate.getDay()];
  const targets = state.profiles?.find(p => p.id === profileId)?.macros || { calories: 2000, protein: 150, carbs: 200, fats: 65, fiber: 30 };

  useEffect(() => {
    async function fetchAnalysis() {
      setLoading(true);
      try {
        const [comm, sat] = await Promise.all([
          generateCommentary(entries, totals, targets, true),
          generateSatietyAnalysis(entries)
        ]);
        setCommentary(comm);
        setSatiety(sat);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalysis();
  }, [entries, totals, targets]);

  const handleSave = () => {
    saveDay();
    toast("Day saved to history.");
  };

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--color-on-surface-variant)]">
        You haven't eaten anything today.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black tracking-tight">End of Day Summary</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="md-card p-5">
          <div className="text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-1">Calories</div>
          <div className="text-2xl font-black text-[var(--color-accent-kcal)]">{Math.round(totals.calories)}</div>
          <div className="text-xs font-semibold text-[var(--color-on-surface-variant)] mt-1">Target: {targets.calories}</div>
        </div>
        <div className="md-card p-5">
          <div className="text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-1">Protein</div>
          <div className="text-2xl font-black text-[var(--color-accent-protein)]">{Math.round(totals.protein)}g</div>
          <div className="text-xs font-semibold text-[var(--color-on-surface-variant)] mt-1">Target: {targets.protein}g</div>
        </div>
      </div>

      <div className="md-card p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-accent-carbs)]"></div>
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4">The Void's Judgment</h3>
        {loading ? (
          <div className="flex items-center gap-3 text-[var(--color-on-surface-variant)]">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-sm font-medium">Consulting the cosmos...</span>
          </div>
        ) : (
          <p className="text-[var(--color-on-surface)] leading-relaxed italic text-sm">{commentary}</p>
        )}
      </div>

      <div className="md-card p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-accent-fats)]"></div>
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Satiety & Habit Analysis</h3>
        {loading ? (
          <div className="flex items-center gap-3 text-[var(--color-on-surface-variant)]">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-sm font-medium">Analyzing patterns...</span>
          </div>
        ) : (
          <p className="text-[var(--color-on-surface)] leading-relaxed italic text-sm">{satiety}</p>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={currentDayData.isSaved}
        className="w-full flex items-center justify-center gap-2 bg-[var(--color-accent-kcal)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-lg transition-colors"
      >
        {currentDayData.isSaved ? <Check size={24} /> : null}
        <span>{currentDayData.isSaved ? 'Day Saved' : 'Save & End Day'}</span>
      </button>
    </div>
  );
}
