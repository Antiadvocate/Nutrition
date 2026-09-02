import React from 'react';
import { useStore } from '../store/StoreContext';
import { Droplets, Undo2 } from 'lucide-react';

const GLASS_ML = 250;

export default function WaterCard() {
  const { currentDayData, state, addWater } = useStore();

  const drunk = currentDayData?.water || 0;
  const target = state.waterTarget || 2500;
  const percent = target > 0 ? Math.min(100, (drunk / target) * 100) : 0;
  const glasses = Math.round(drunk / GLASS_ML);
  const targetGlasses = Math.max(1, Math.round(target / GLASS_ML));

  return (
    <div className="bg-[var(--color-surface)] p-5 rounded-3xl border border-[var(--color-outline)] shadow-3xs relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Droplets size={14} className="text-sky-500" />
          <span className="text-[10px] font-mono font-bold tracking-wide text-[var(--color-on-surface-variant)]">
            Hydration
          </span>
        </div>
        <span className="text-[11px] font-mono font-medium text-[var(--color-on-surface)]">
          {(drunk / 1000).toFixed(2)}
          <span className="text-[var(--color-on-surface-variant)] font-medium"> / {(target / 1000).toFixed(1)} L</span>
        </span>
      </div>

      {/* One pip per glass, so the day reads at a glance */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Array.from({ length: targetGlasses }).map((_, i) => (
          <span
            key={i}
            className={`h-6 flex-1 min-w-[10px] rounded-md transition-all duration-300 ${
              i < glasses ? 'bg-sky-500' : 'bg-[var(--color-surface-variant)] border border-[var(--color-outline)]'
            }`}
          />
        ))}
        {glasses > targetGlasses && (
          <span className="h-6 px-2 rounded-md bg-sky-500/20 border border-sky-500/40 text-[10px] font-medium text-sky-500 flex items-center">
            +{glasses - targetGlasses}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => addWater(GLASS_ML)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-sky-600 dark:text-sky-400 py-2.5 rounded-xl font-medium text-[11px] transition-all active:scale-95 cursor-pointer"
        >
          <Droplets size={12} />
          <span>Glass · 250 ml</span>
        </button>
        <button
          onClick={() => addWater(500)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-[var(--color-surface-variant)] hover:bg-[var(--color-outline)] border border-[var(--color-outline)] text-[var(--color-on-surface)] py-2.5 rounded-xl font-medium text-[11px] transition-all active:scale-95 cursor-pointer"
        >
          <span>Bottle · 500 ml</span>
        </button>
        <button
          onClick={() => addWater(-GLASS_ML)}
          disabled={drunk <= 0}
          className="w-10 h-10 flex items-center justify-center bg-[var(--color-surface-variant)] border border-[var(--color-outline)] text-[var(--color-on-surface-variant)] rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          title="Remove a glass"
          aria-label="Remove a glass"
        >
          <Undo2 size={13} />
        </button>
      </div>

      <p className="text-[10px] text-[var(--color-on-surface-variant)] mt-2.5">
        {percent >= 100
          ? 'Target met for today.'
          : `${Math.round((target - drunk) / GLASS_ML)} more glasses to hit your goal.`}
      </p>
    </div>
  );
}
