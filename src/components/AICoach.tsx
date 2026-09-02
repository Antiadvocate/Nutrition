import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/StoreContext';
import { generateDailyBriefing, generateWeeklyBriefing, askCoach } from '../lib/ai';
import { 
  Loader2, 
  Send, 
  Gauge, 
  Calendar, 
  HelpCircle, 
  Sparkles, 
  RefreshCw,
  BrainCircuit
} from 'lucide-react';
import Markdown from 'react-markdown';
import { format } from 'date-fns';
import { getBriefing, setBriefing, pruneLegacyBriefingKeys } from '../lib/briefingCache';
import { hasKey } from '../lib/openrouter';
import { openAISettings } from './AISettings';

type CoachSubTab = 'briefing' | 'chat';
type BriefingPeriod = 'daily' | 'weekly';

// Custom ElegantMarkdown wrapper to ensure stunning typography matching the application's clean design philosophy
function ElegantMarkdown({ children }: { children: string }) {
  return (
    <div className="text-[var(--color-on-surface)] text-sm text-left leading-relaxed font-sans w-full space-y-4">
      <Markdown
        components={{
          h1: ({ children }) => <span className="block text-2xl font-light mt-6 mb-3 text-[var(--color-on-surface)] tracking-tight font-display border-b border-[var(--color-outline)] pb-1">{children}</span>,
          h2: ({ children }) => <span className="block text-lg font-bold mt-5 mb-2 text-[var(--color-on-surface)] tracking-tight font-display">{children}</span>,
          h3: ({ children }) => <span className="block text-base font-semibold mt-4 mb-2 text-[var(--color-on-surface)] tracking-tight font-display">{children}</span>,
          p: ({ children }) => <div className="text-[13px] md:text-[14px] text-[var(--color-on-surface)] leading-relaxed mb-4 font-normal font-sans block opacity-95">{children}</div>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-2.5 mb-5 text-[13px] font-normal text-[var(--color-on-surface)] font-sans">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-2.5 mb-5 text-[13px] font-normal text-[var(--color-on-surface)] font-sans">{children}</ol>,
          li: ({ children }) => <li className="text-[var(--color-on-surface)] leading-relaxed font-sans pl-1">{children}</li>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-purple-500 pl-4 py-1 italic text-xs text-[var(--color-on-surface-variant)] mb-4 bg-purple-500/5 rounded-r-xl font-sans">{children}</blockquote>,
          strong: ({ children }) => <strong className="font-medium text-purple-600 dark:text-purple-300 font-sans">{children}</strong>,
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}

export default function AICoach() {
  const { 
    currentDayData, 
    state, 
    currentDate
  } = useStore();

  const [activeTab, setActiveTab] = useState<CoachSubTab>('briefing');
  const [period, setPeriod] = useState<BriefingPeriod>('daily');

  // Daily briefing states
  const [dailyBrief, setDailyBrief] = useState<string>('');
  const [loadingDaily, setLoadingDaily] = useState<boolean>(false);

  // Weekly briefing states
  const [weeklyBrief, setWeeklyBrief] = useState<string>('');
  const [loadingWeekly, setLoadingWeekly] = useState<boolean>(false);

  // Q&A / Chat states
  const [question, setQuestion] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const entries = currentDayData?.entries || [];
  const totals = useMemo(() => {
    return entries.reduce((acc, entry) => ({
      calories: acc.calories + (entry.calories || 0),
      protein: acc.protein + (entry.protein || 0),
      carbs: acc.carbs + (entry.carbs || 0),
      fats: acc.fats + (entry.fats || 0),
    }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }, [entries]);

  const profileId = state.dayProfiles?.[currentDate.getDay()];
  const targets = state.profiles?.find(p => p.id === profileId) || { macros: { calories: 2000, protein: 150, carbs: 200, fats: 65, fiber: 30 } };

  const dailyCacheKey = `${format(currentDate, 'yyyy-MM-dd')}_${entries.length}_${Math.round(totals.calories)}`;
  const weeklyCacheKey = String(Object.keys(state.days || {}).length);

  // Fetch or Load Cached Daily Briefing
  const loadDailyBriefing = async (forceInit = false) => {
    const cached = getBriefing('daily', dailyCacheKey);

    if (cached && !forceInit) {
      setDailyBrief(cached);
      return;
    }
    if (!hasKey()) return;

    setLoadingDaily(true);
    try {
      const result = await generateDailyBriefing(entries, targets.macros, totals);
      setDailyBrief(result);
      setBriefing('daily', dailyCacheKey, result);
    } catch (e: any) {
      console.error(e);
      setDailyBrief(`That did not come back.\n\n\`${e?.message || 'Unknown error'}\``);
    } finally {
      setLoadingDaily(false);
    }
  };

  // Fetch or Load Cached Weekly Briefing
  const loadWeeklyBriefing = async (forceInit = false) => {
    const cached = getBriefing('weekly', weeklyCacheKey);

    if (cached && !forceInit) {
      setWeeklyBrief(cached);
      return;
    }
    if (!hasKey()) return;

    setLoadingWeekly(true);
    try {
      const result = await generateWeeklyBriefing(state.days || {}, state.profiles || [], state.dayProfiles || {});
      setWeeklyBrief(result);
      setBriefing('weekly', weeklyCacheKey, result);
    } catch (e: any) {
      console.error(e);
      setWeeklyBrief(`That did not come back.\n\n\`${e?.message || 'Unknown error'}\``);
    } finally {
      setLoadingWeekly(false);
    }
  };

  useEffect(() => {
    pruneLegacyBriefingKeys();
  }, []);

  // Show a cached briefing straight away, but never fire a paid request without
  // an explicit tap — the old effect re-ran on every log edit.
  useEffect(() => {
    if (activeTab !== 'briefing') return;
    if (period === 'daily') {
      setDailyBrief(getBriefing('daily', dailyCacheKey) || '');
    } else {
      setWeeklyBrief(getBriefing('weekly', weeklyCacheKey) || '');
    }
  }, [activeTab, period, dailyCacheKey, weeklyCacheKey]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question) return;

    setChatLoading(true);
    try {
      const answer = await askCoach(question, {
        targets: targets.macros,
        totals,
        entries,
      });

      setChatResponse(answer);
    } catch (error: any) {
      console.error(error);
      setChatResponse(`That did not come back.\n\n\`${error?.message || 'Unknown error'}\``);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 pb-32 space-y-6 max-w-3xl mx-auto">
      {/* Header section */}
      <div className="space-y-1">
        <h1 className="text-3xl font-light text-[var(--color-on-surface)] tracking-tight flex items-center gap-2">
          <BrainCircuit size={28} className="text-purple-400" />
          <span>Reflection</span>
        </h1>
        <p className="text-xs text-[var(--color-on-surface-variant)]">A reading of what has been eaten, and somewhere to think out loud. No verdicts.</p>
      </div>

      {/* Main Mode Toggles (Briefing | Chat) */}
      <div className="flex bg-[var(--color-surface)] border border-[var(--color-outline)] p-1 rounded-2xl w-full text-xs font-bold shadow-xs">
        <button
          onClick={() => setActiveTab('briefing')}
          className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'briefing' 
              ? 'bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] shadow-xs' 
              : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
          }`}
        >
          <Gauge size={14} />
          <span>The day</span>
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'chat' 
              ? 'bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] shadow-xs' 
              : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
          }`}
        >
          <HelpCircle size={14} />
          <span>Ask</span>
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}

      {/* 1. BRIEFING PERIOD */}
      {activeTab === 'briefing' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Sub period selectors */}
          <div className="flex items-center justify-between">
            <div className="bg-[var(--color-surface-variant)] p-1 rounded-xl flex text-[11px] font-bold">
              <button
                onClick={() => setPeriod('daily')}
                className={`px-4 py-1.5 rounded-lg transition-colors cursor-pointer ${period === 'daily' ? 'bg-[var(--color-surface)] text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)]'}`}
              >
                Today
              </button>
              <button
                onClick={() => setPeriod('weekly')}
                className={`px-4 py-1.5 rounded-lg transition-colors cursor-pointer ${period === 'weekly' ? 'bg-[var(--color-surface)] text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)]'}`}
              >
                Recent days
              </button>
            </div>

            <button
              onClick={() => period === 'daily' ? loadDailyBriefing(true) : loadWeeklyBriefing(true)}
              disabled={loadingDaily || loadingWeekly}
              className="p-2 bg-[var(--color-surface)] border border-[var(--color-outline)] hover:border-neutral-700 text-[var(--color-on-surface)] rounded-xl flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40"
              title="Read it again"
            >
              <RefreshCw size={14} className={(loadingDaily || loadingWeekly) ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Rendering the loaded brief */}
          {period === 'daily' ? (
            <div className="space-y-4">
              {loadingDaily ? (
                <div className="bg-[var(--color-surface)] p-10 rounded-3xl border border-[var(--color-outline)] flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-purple-400" size={28} />
                  <p className="text-xs text-[var(--color-on-surface-variant)] font-mono">Reading the day</p>
                </div>
              ) : (
                <div className="bg-[var(--color-surface)] border border-[var(--color-outline)] p-6 rounded-3xl relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center gap-1.5 text-xs text-purple-400 font-bold mb-3">
                    <Sparkles size={14} />
                    <span>Today</span>
                  </div>
                  
                  {dailyBrief ? (
                    <ElegantMarkdown>{dailyBrief}</ElegantMarkdown>
                  ) : (
                    <BriefingPrompt
                      label="Reflect on today"
                      hint={entries.length ? 'One request to your text model, kept until the day changes.' : 'Nothing logged yet. There is nothing to reflect on, which is its own kind of answer.'}
                      disabled={!entries.length}
                      onGenerate={() => loadDailyBriefing(true)}
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {loadingWeekly ? (
                <div className="bg-[var(--color-surface)] p-10 rounded-3xl border border-[var(--color-outline)] flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-emerald-400" size={28} />
                  <p className="text-xs text-[var(--color-on-surface-variant)] font-mono">Looking across the days</p>
                </div>
              ) : (
                <div className="bg-[var(--color-surface)] border border-[var(--color-outline)] p-6 rounded-3xl relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold mb-3">
                    <Calendar size={14} />
                    <span>Recent days</span>
                  </div>
                  
                  {weeklyBrief ? (
                    <ElegantMarkdown>{weeklyBrief}</ElegantMarkdown>
                  ) : (
                    <BriefingPrompt
                      label="Look across the days"
                      hint={Object.keys(state.days || {}).length ? 'Reads across every day you have logged.' : 'A few days of history first, then this has something to look at.'}
                      disabled={!Object.keys(state.days || {}).length}
                      onGenerate={() => loadWeeklyBriefing(true)}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. CHAT WITH ADVISOR */}
      {activeTab === 'chat' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="bg-[var(--color-surface)] border border-[var(--color-outline)] p-5 rounded-3xl shadow-sm">
            <h3 className="font-bold text-base text-[var(--color-on-surface)] flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-purple-400" />
              <span>Ask</span>
            </h3>
            <p className="text-xs text-[var(--color-on-surface-variant)] mb-4">Anything you are wondering about. It answers from what you logged, not from a rulebook.</p>

            <form onSubmit={handleAsk} className="space-y-3">
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAsk(e as any);
                }}
                placeholder="e.g., I have 40g protein and 200kcal remaining. What simple minimally processed snack works?"
                className="w-full bg-[var(--color-surface-variant)] border border-[var(--color-outline)] rounded-2xl p-4 text-xs font-medium text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)]/60 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-shadow min-h-[90px] resize-none"
              />
              <button
                type="submit"
                disabled={chatLoading || !question}
                className="w-full flex items-center justify-center gap-1.5 bg-[var(--color-on-surface)] text-[var(--color-bg-base)] hover:opacity-90 disabled:opacity-50 py-3 rounded-2xl font-bold text-xs transition-transform active:scale-98 cursor-pointer"
              >
                {chatLoading ? <Loader2 className="animate-spin" size={14} /> : <Send size={12} />}
                <span>Ask</span>
              </button>
            </form>
          </div>

          {chatResponse && (
            <div className="bg-[var(--color-surface)] border border-[var(--color-outline)] p-5 rounded-3xl relative overflow-hidden transition-all animate-in slide-in-from-bottom-2 duration-300">
              <ElegantMarkdown>{chatResponse}</ElegantMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BriefingPrompt({
  label, hint, disabled, onGenerate,
}: {
  label: string;
  hint: string;
  disabled?: boolean;
  onGenerate: () => void;
}) {
  const keySet = hasKey();
  return (
    <div className="text-center py-5 space-y-3">
      <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed max-w-xs mx-auto">{hint}</p>
      {keySet ? (
        <button
          onClick={onGenerate}
          disabled={disabled}
          className="inline-flex items-center gap-2 bg-[var(--color-on-surface)] text-[var(--color-bg-base)] px-5 py-2.5 rounded-xl font-medium text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 transition-transform"
        >
          <Sparkles size={13} />
          <span>{label}</span>
        </button>
      ) : (
        <button
          onClick={openAISettings}
          className="inline-flex items-center gap-2 border border-[var(--color-outline)] bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] px-5 py-2.5 rounded-xl font-medium text-xs cursor-pointer"
        >
          <Sparkles size={13} className="text-purple-400" />
          <span>Add an OpenRouter key first</span>
        </button>
      )}
    </div>
  );
}
