import React from 'react';
import { useStore } from '../store/StoreContext';
import { openPause } from './PauseSheet';
import { Wind, Check } from 'lucide-react';

export default function PausePanel() {
  const { currentDayData, releaseDay } = useStore();

  const pauses = currentDayData?.pauses || [];
  const passed = pauses.filter(p => p.outcome === 'passed').length;
  const released = currentDayData?.released;

  return (
    <div className="space-y-3">
      <div className="bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-3xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-[11px] font-medium tracking-wide text-[var(--color-on-surface-variant)] flex items-center gap-2">
              <Wind size={13} className="opacity-50" />
              <span>Before eating</span>
            </h3>
            <p className="text-[11px] text-[var(--color-on-surface-variant)] leading-relaxed mt-2">
              An urge that gets looked at often unties itself. Nothing to resist — just see what is actually there
              first.
            </p>
          </div>
        </div>

        <button
          onClick={() => openPause(() => {})}
          className="w-full py-3 rounded-2xl border border-[var(--color-outline)] text-[13px] font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-surface-variant)] transition-colors cursor-pointer"
        >
          Something wants eating
        </button>

        {pauses.length > 0 && (
          <div className="flex items-center gap-4 pt-1 text-[11px] text-[var(--color-on-surface-variant)]">
            <span>
              <span className="text-[var(--color-on-surface)] font-medium">{pauses.length}</span> looked at
            </span>
            <span className="opacity-30">·</span>
            <span>
              <span className="text-[var(--color-on-surface)] font-medium">{passed}</span> passed on their own
            </span>
          </div>
        )}
      </div>

      <button
        onClick={() => releaseDay(!released)}
        className={`w-full py-3.5 rounded-2xl border text-[13px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 ${
          released
            ? 'border-[var(--color-outline)] text-[var(--color-on-surface-variant)]'
            : 'border-[var(--color-outline)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface)]'
        }`}
      >
        {released && <Check size={14} className="opacity-60" />}
        <span>{released ? 'This day is done' : 'Let the day go'}</span>
      </button>
      <p className="text-[10px] text-[var(--color-on-surface-variant)] text-center leading-relaxed px-4">
        {released
          ? 'Nothing carries into tomorrow.'
          : 'Closes the day out. There is no score to settle and no deficit to make up.'}
      </p>
    </div>
  );
}
