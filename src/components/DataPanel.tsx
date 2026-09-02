import React, { useRef, useState } from 'react';
import { useStore } from '../store/StoreContext';
import { Download, Upload, Database, Droplets, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from './ui/Toaster';
import { format } from 'date-fns';

export default function DataPanel() {
  const { state, exportData, importData, setWaterTarget, saveError } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<string | null>(null);

  const dayCount = Object.keys(state.days || {}).length;
  const entryCount = Object.values(state.days || {}).reduce(
    (sum: number, d: any) => sum + (d?.entries?.length || 0),
    0,
  );

  const handleExport = () => {
    try {
      const blob = new Blob([exportData()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nutrition-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast(`Exported ${dayCount} days`);
    } catch (e: any) {
      toast(e?.message || 'Export failed', { tone: 'error' });
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPendingFile(await file.text());
    } catch {
      toast('Could not read that file', { tone: 'error' });
    }
  };

  const runImport = (mode: 'merge' | 'replace') => {
    try {
      const result = importData(pendingFile!, mode);
      toast(`Restored ${result.days} days, ${result.entries} entries`);
      setPendingFile(null);
    } catch (err: any) {
      toast(err?.message || 'That file could not be imported', { tone: 'error' });
    }
  };

  return (
    <div className="space-y-4">
      {saveError && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-500 p-4 rounded-2xl flex gap-3 items-start">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold leading-relaxed">{saveError}</p>
        </div>
      )}

      {/* Hydration goal */}
      <div className="bg-[var(--color-surface)] p-5 rounded-3xl border border-[var(--color-outline)] shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Droplets size={14} className="text-sky-500" />
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
            Hydration goal
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step={250}
            value={state.waterTarget}
            onChange={e => setWaterTarget(parseInt(e.target.value) || 0)}
            className="flex-1 bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-4 py-2.5 outline-hidden focus:ring-1 focus:ring-[var(--color-on-surface)] font-bold text-sm"
          />
          <span className="text-xs font-bold text-[var(--color-on-surface-variant)]">ml / day</span>
        </div>
      </div>

      {/* Backup */}
      <div className="bg-[var(--color-surface)] p-5 rounded-3xl border border-[var(--color-outline)] shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-emerald-500" />
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
            Backup & restore
          </h3>
        </div>
        <p className="text-[11px] text-[var(--color-on-surface-variant)] leading-relaxed">
          Everything lives in this browser's storage — {dayCount} {dayCount === 1 ? 'day' : 'days'} and {entryCount}{' '}
          {entryCount === 1 ? 'entry' : 'entries'} right now. Clearing site data, switching browsers or using private
          mode loses it, so export before you do any of those.
        </p>

        {pendingFile ? (
          <div className="space-y-2 bg-[var(--color-surface-variant)] border border-[var(--color-outline)] p-3 rounded-2xl">
            <p className="text-[11px] font-bold text-[var(--color-on-surface)]">How should this backup be applied?</p>
            <div className="flex gap-2">
              <button
                onClick={() => runImport('merge')}
                className="flex-1 bg-[var(--color-on-surface)] text-[var(--color-bg-base)] py-2.5 rounded-xl font-black text-[11px] cursor-pointer active:scale-95 transition-transform"
              >
                Merge (keep my days)
              </button>
              <button
                onClick={() => runImport('replace')}
                className="flex-1 border border-rose-500/40 text-rose-500 py-2.5 rounded-xl font-black text-[11px] cursor-pointer active:scale-95 transition-transform"
              >
                Replace everything
              </button>
            </div>
            <button
              onClick={() => setPendingFile(null)}
              className="w-full text-[10px] font-bold text-[var(--color-on-surface-variant)] py-1 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[var(--color-surface-variant)] hover:bg-[var(--color-outline)] border border-[var(--color-outline)] text-[var(--color-on-surface)] py-2.5 rounded-xl font-black text-[11px] transition-all active:scale-95 cursor-pointer"
            >
              <Download size={12} />
              <span>Export backup</span>
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[var(--color-surface-variant)] hover:bg-[var(--color-outline)] border border-[var(--color-outline)] text-[var(--color-on-surface)] py-2.5 rounded-xl font-black text-[11px] transition-all active:scale-95 cursor-pointer"
            >
              <Upload size={12} />
              <span>Restore backup</span>
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />
          </div>
        )}
      </div>
    </div>
  );
}
