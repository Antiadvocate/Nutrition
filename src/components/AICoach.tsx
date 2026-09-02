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

type CoachSubTab = 'briefing' | 'chat';
type BriefingPeriod = 'daily' | 'weekly';

// Custom ElegantMarkdown wrapper to ensure stunning typography matching the application's clean design philosophy
function ElegantMarkdown({ children }: { children: string }) {
  return (
    <div className="text-[var(--color-on-surface)] text-sm text-left leading-relaxed font-sans w-full space-y-4">
      <Markdown
        components={{
          h1: ({ children }) => <span className="block text-2xl font-black mt-6 mb-3 text-[var(--color-on-surface)] tracking-tight font-display border-b border-[var(--color-outline)] pb-1">{children}</span>,
          h2: ({ children }) => <span className="block text-lg font-bold mt-5 mb-2 text-[var(--color-on-surface)] tracking-tight font-display">{children}</span>,
          h3: ({ children }) => <span className="block text-base font-semibold mt-4 mb-2 text-[var(--color-on-surface)] tracking-tight font-display">{children}</span>,
          p: ({ children }) => <div className="text-[13px] md:text-[14px] text-[var(--color-on-surface)] leading-relaxed mb-4 font-normal font-sans block opacity-95">{children}</div>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-2.5 mb-5 text-[13px] font-normal text-[var(--color-on-surface)] font-sans">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-2.5 mb-5 text-[13px] font-normal text-[var(--color-on-surface)] font-sans">{children}</ol>,
          li: ({ children }) => <li className="text-[var(--color-on-surface)] leading-relaxed font-sans pl-1">{children}</li>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-purple-500 pl-4 py-1 italic text-xs text-[var(--color-on-surface-variant)] mb-4 bg-purple-500/5 rounded-r-xl font-sans">{children}</blockquote>,
          strong: ({ children }) => <strong className="font-extrabold text-purple-600 dark:text-purple-300 font-sans">{children}</strong>,
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

  // Fetch or Load Cached Daily Briefing
  const loadDailyBriefing = async (forceInit = false) => {
    const cacheKey = `daily_brief_${currentDate.toISOString().split('T')[0]}_count_${entries.length}_cal_${Math.round(totals.calories)}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached && !forceInit) {
      setDailyBrief(cached);
      return;
    }

    setLoadingDaily(true);
    try {
      const result = await generateDailyBriefing(entries, targets.macros, totals);
      setDailyBrief(result);
      localStorage.setItem(cacheKey, result);
    } catch (e: any) {
      console.error(e);
      setDailyBrief(`The Void has experienced an obstruction.\n\n\`${e?.message || 'Unknown error'}\``);
    } finally {
      setLoadingDaily(false);
    }
  };

  // Fetch or Load Cached Weekly Briefing
  const loadWeeklyBriefing = async (forceInit = false) => {
    const dayCount = Object.keys(state.days || {}).length;
    const cacheKey = `weekly_brief_days_${dayCount}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached && !forceInit) {
      setWeeklyBrief(cached);
      return;
    }

    setLoadingWeekly(true);
    try {
      const result = await generateWeeklyBriefing(state.days || {}, state.profiles || [], state.dayProfiles || {});
      setWeeklyBrief(result);
      localStorage.setItem(cacheKey, result);
    } catch (e: any) {
      console.error(e);
      setWeeklyBrief(`Error formulating your weekly breakdown.\n\n\`${e?.message || 'Unknown error'}\``);
    } finally {
      setLoadingWeekly(false);
    }
  };

  // Auto trigger initial load
  useEffect(() => {
    if (activeTab === 'briefing') {
      if (period === 'daily') {
        loadDailyBriefing();
      } else {
        loadWeeklyBriefing();
      }
    }
  }, [activeTab, period, currentDate, entries.length]);

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
      setChatResponse(`The coaching intelligence is temporarily silent.\n\n\`${error?.message || 'Unknown error'}\``);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 pb-32 space-y-6 max-w-3xl mx-auto">
      {/* Header section */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-[var(--color-on-surface)] tracking-tight flex items-center gap-2">
          <BrainCircuit size={28} className="text-purple-400" />
          <span>AI Coach Console</span>
        </h1>
        <p className="text-xs text-[var(--color-on-surface-variant)]">Personalized expert behavioral feedback, conversational advice, and strategic summaries.</p>
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
          <span>Briefings</span>
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
          <span>Ask Advisor</span>
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
                Daily Review
              </button>
              <button
                onClick={() => setPeriod('weekly')}
                className={`px-4 py-1.5 rounded-lg transition-colors cursor-pointer ${period === 'weekly' ? 'bg-[var(--color-surface)] text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)]'}`}
              >
                Weekly Analysis
              </button>
            </div>

            <button
              onClick={() => period === 'daily' ? loadDailyBriefing(true) : loadWeeklyBriefing(true)}
              disabled={loadingDaily || loadingWeekly}
              className="p-2 bg-[var(--color-surface)] border border-[var(--color-outline)] hover:border-neutral-700 text-[var(--color-on-surface)] rounded-xl flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40"
              title="Refresh analysis"
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
                  <p className="text-xs text-[var(--color-on-surface-variant)] font-mono">Formulating smart daily review...</p>
                </div>
              ) : (
                <div className="bg-[var(--color-surface)] border border-[var(--color-outline)] p-6 rounded-3xl relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center gap-1.5 text-xs text-purple-400 font-bold mb-3">
                    <Sparkles size={14} />
                    <span>DAILY NUTRITIONAL DEBATE</span>
                  </div>
                  
                  {dailyBrief ? (
                    <ElegantMarkdown>{dailyBrief}</ElegantMarkdown>
                  ) : (
                    <div className="text-center py-6 text-sm text-[var(--color-on-surface-variant)]">
                      No feedback generated yet. Log some ingredients or tap the refresh circle above.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {loadingWeekly ? (
                <div className="bg-[var(--color-surface)] p-10 rounded-3xl border border-[var(--color-outline)] flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-emerald-400" size={28} />
                  <p className="text-xs text-[var(--color-on-surface-variant)] font-mono">Synthesizing weekly averages...</p>
                </div>
              ) : (
                <div className="bg-[var(--color-surface)] border border-[var(--color-outline)] p-6 rounded-3xl relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold mb-3">
                    <Calendar size={14} />
                    <span>WEEKLY STRATEGIC SCORECARD</span>
                  </div>
                  
                  {weeklyBrief ? (
                    <ElegantMarkdown>{weeklyBrief}</ElegantMarkdown>
                  ) : (
                    <div className="text-center py-6 text-sm text-[var(--color-on-surface-variant)]">
                      Record food details over multiple calendar days to retrieve a deep baseline scorecard.
                    </div>
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
              <span>Nutrition Consultations</span>
            </h3>
            <p className="text-xs text-[var(--color-on-surface-variant)] mb-4">Inquire regarding targets compliance, ingredient adjustments, or optimized macro balances.</p>

            <form onSubmit={handleAsk} className="space-y-3">
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="e.g., I have 40g protein and 200kcal remaining. What simple minimally processed snack works?"
                className="w-full bg-[var(--color-surface-variant)] border border-[var(--color-outline)] rounded-2xl p-4 text-xs font-medium text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)]/60 focus:outline-none focus:ring-1 focus:ring-purple-400 transition-shadow min-h-[90px] resize-none"
              />
              <button
                type="submit"
                disabled={chatLoading || !question}
                className="w-full flex items-center justify-center gap-1.5 bg-[var(--color-on-surface)] text-[var(--color-bg-base)] hover:opacity-90 disabled:opacity-50 py-3 rounded-2xl font-bold text-xs transition-transform active:scale-98 cursor-pointer"
              >
                {chatLoading ? <Loader2 className="animate-spin" size={14} /> : <Send size={12} />}
                <span>Transmit Inquiry</span>
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
