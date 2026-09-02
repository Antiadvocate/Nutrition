import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, KeyRound, RefreshCw, Loader2, Check, Eye, EyeOff, ExternalLink, Cpu } from 'lucide-react';
import {
  getConfig,
  saveConfig,
  fetchModels,
  testConnection,
  FALLBACK_MODELS,
  type AIConfig,
  type ModelInfo,
} from '../lib/openrouter';
import { toast } from './ui/Toaster';

let openFn: (() => void) | null = null;

/** Opens the OpenRouter settings sheet from anywhere. */
export const openAISettings = () => openFn?.();

export function AISettings() {
  const [open, setOpen] = useState(false);
  const [config, setConfigState] = useState<AIConfig>(getConfig());
  const [models, setModels] = useState<ModelInfo[]>(FALLBACK_MODELS);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [visionFilter, setVisionFilter] = useState('');
  const [textFilter, setTextFilter] = useState('');

  useEffect(() => {
    openFn = () => setOpen(true);
    return () => { openFn = null; };
  }, []);

  // Nudge the user in on first run: nothing in the app works without a key.
  useEffect(() => {
    if (!getConfig().apiKey) setOpen(true);
  }, []);

  const loadModels = async (force = false) => {
    setLoadingModels(true);
    try {
      const list = await fetchModels(force);
      setModels(list);
      setModelsLoaded(true);
      if (force) toast(`Loaded ${list.length} models`);
    } catch (e: any) {
      setModels(FALLBACK_MODELS);
      setModelsLoaded(true);
      toast('Could not reach the OpenRouter catalogue, showing a short list');
      console.warn(e);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    if (open && !modelsLoaded && !loadingModels) loadModels(false);
  }, [open, modelsLoaded, loadingModels]);

  const update = (patch: Partial<AIConfig>) => {
    saveConfig(patch);
    setConfigState(getConfig());
  };

  const visionModels = useMemo(() => models.filter(m => m.vision), [models]);

  const handleTest = async () => {
    setTesting(true);
    try {
      await testConnection(config.visionModel);
      toast('OpenRouter is answering. You are set.');
    } catch (e: any) {
      toast(e?.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={e => e.stopPropagation()}
            className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-t-3xl sm:rounded-3xl p-6 space-y-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-light text-[var(--color-on-surface)] tracking-tight font-display flex items-center gap-2">
                  <Cpu size={20} className="text-purple-400" />
                  <span>AI Engine</span>
                </h2>
                <p className="text-[11px] text-[var(--color-on-surface-variant)] font-medium mt-1">
                  Every analysis in this app runs through OpenRouter with the models you choose here.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-full bg-[var(--color-surface-variant)] flex items-center justify-center text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors flex-shrink-0 cursor-pointer"
                aria-label="Close settings"
              >
                <X size={16} />
              </button>
            </div>

            {/* API key */}
            <section className="space-y-2">
              <label className="text-[9px] font-mono font-bold tracking-wide text-[var(--color-on-surface-variant)] flex items-center gap-1.5">
                <KeyRound size={11} className="text-amber-500" />
                <span>OpenRouter API Key</span>
              </label>
              <div className="flex gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={e => update({ apiKey: e.target.value.trim() })}
                  placeholder="sk-or-v1-..."
                  spellCheck={false}
                  autoComplete="off"
                  className="flex-1 min-w-0 bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-[var(--color-on-surface)] transition-all text-xs font-mono"
                />
                <button
                  onClick={() => setShowKey(v => !v)}
                  className="w-11 flex-shrink-0 rounded-xl bg-[var(--color-surface-variant)] border border-[var(--color-outline)] flex items-center justify-center text-[var(--color-on-surface-variant)] cursor-pointer"
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-bold text-blue-500 hover:underline flex items-center gap-1"
                >
                  Get a key <ExternalLink size={10} />
                </a>
                <button
                  onClick={handleTest}
                  disabled={testing || !config.apiKey}
                  className="text-[10px] font-medium tracking-wide bg-[var(--color-surface-variant)] border border-[var(--color-outline)] px-3 py-1.5 rounded-full text-[var(--color-on-surface)] disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                >
                  {testing ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} className="text-emerald-500" />}
                  <span>Test connection</span>
                </button>
              </div>
              <p className="text-[10px] text-[var(--color-on-surface-variant)] leading-relaxed">
                The key is stored in this browser only and is sent straight to openrouter.ai. It never touches a server of ours,
                so anyone opening your published link uses their own key.
              </p>
            </section>

            {/* Models */}
            <section className="space-y-4 pt-4 border-t border-[var(--color-outline)]">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold tracking-wide text-[var(--color-on-surface-variant)]">
                  Models
                </span>
                <button
                  onClick={() => loadModels(true)}
                  disabled={loadingModels}
                  className="text-[10px] font-bold text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] flex items-center gap-1.5 cursor-pointer"
                >
                  {loadingModels ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                  <span>{loadingModels ? 'Loading' : `Refresh (${models.length})`}</span>
                </button>
              </div>

              <ModelPicker
                label="Vision model"
                hint="Photo scans of your plate. Only image-capable models are listed."
                models={visionModels}
                value={config.visionModel}
                filter={visionFilter}
                onFilter={setVisionFilter}
                onChange={id => update({ visionModel: id })}
              />

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.useVisionForAll}
                  onChange={e => update({ useVisionForAll: e.target.checked })}
                  className="w-4 h-4 accent-[var(--color-accent-carbs)] cursor-pointer"
                />
                <span className="text-[11px] font-bold text-[var(--color-on-surface)]">
                  Use the vision model for everything else too
                </span>
              </label>

              {!config.useVisionForAll && (
                <ModelPicker
                  label="Text model"
                  hint="Search and AI logging, coach briefings, satiety notes, smart pre-fill."
                  models={models}
                  value={config.textModel}
                  filter={textFilter}
                  onFilter={setTextFilter}
                  onChange={id => update({ textModel: id })}
                />
              )}
            </section>

            <button
              onClick={() => setOpen(false)}
              className="w-full bg-[var(--color-on-surface)] text-[var(--color-bg-base)] py-3.5 rounded-xl font-medium text-xs transition-all active:scale-95 cursor-pointer"
            >
              Done
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ModelPicker({
  label, hint, models, value, filter, onFilter, onChange,
}: {
  label: string;
  hint: string;
  models: ModelInfo[];
  value: string;
  filter: string;
  onFilter: (v: string) => void;
  onChange: (id: string) => void;
}) {
  const list = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const matched = needle
      ? models.filter(m => `${m.id} ${m.name}${m.free ? ' free' : ''}`.toLowerCase().includes(needle))
      : models;
    // Keep the current choice visible even when it does not match the filter.
    if (value && !matched.some(m => m.id === value)) {
      const known = models.find(m => m.id === value);
      return [known || { id: value, name: value, vision: true, free: false, context: 0, promptPrice: 0 }, ...matched];
    }
    return matched;
  }, [models, filter, value]);

  const selected = models.find(m => m.id === value);

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium text-[var(--color-on-surface)]">{label}</label>
      <p className="text-[10px] text-[var(--color-on-surface-variant)] leading-relaxed">{hint}</p>
      <input
        type="search"
        value={filter}
        onChange={e => onFilter(e.target.value)}
        placeholder="Filter, e.g. gemini, claude, gpt, free"
        className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-4 py-2.5 outline-none focus:ring-1 focus:ring-[var(--color-on-surface)] transition-all text-xs font-medium"
      />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-3 py-3 outline-none focus:ring-1 focus:ring-[var(--color-on-surface)] transition-all text-xs font-bold cursor-pointer"
      >
        {list.slice(0, 400).map(m => (
          <option key={m.id} value={m.id}>
            {m.name}{m.free ? ' · free' : ''}{m.vision ? ' · vision' : ''}
          </option>
        ))}
      </select>
      <p className="text-[9px] font-mono text-[var(--color-on-surface-variant)] truncate">
        {value}{selected?.context ? ` · ${selected.context.toLocaleString()} ctx` : ''}
      </p>
    </div>
  );
}
