import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '../store/StoreContext';
import { format, differenceInDays } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart
} from 'recharts';
import { 
  ChevronDown, 
  Calendar as CalendarIcon, 
  Sparkles, 
  ChefHat, 
  Layers, 
  Loader2, 
  CheckCircle2, 
  ArrowRight, 
  BrainCircuit, 
  Activity, 
  Lightbulb,
  XCircle,
  TrendingUp,
  Settings2,
  Moon,
  Sun,
  Plus
} from 'lucide-react';
import { autoCompleteDayMeals } from '../lib/ai';
import { generateId } from '../lib/utils';
import { toast } from './ui/Toaster';
import { openAISettings } from './AISettings';
import { hasKey } from '../lib/openrouter';
import WaterCard from './WaterCard';

type TimeWindow = '1W' | '1M' | '3M' | '6M' | 'Custom';

export default function Dashboard() {
  const { currentDayData, state, currentDate, setCurrentDate, addEntry, toggleTheme } = useStore();
  const profileId = state.dayProfiles?.[currentDate.getDay()];
  const targets = state.profiles?.find(p => p.id === profileId)?.macros || { calories: 2000, protein: 150, carbs: 200, fats: 65, fiber: 30 };
  
  const [viewMode, setViewMode] = useState<'consumed' | 'remaining'>('consumed');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('1W');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);

  // Smart Pre-fill Console States
  const [isGenerating, setIsGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState('');
  const generationRef = useRef<number>(0);

  const handleCancelGeneration = () => {
    generationRef.current += 1;
    setIsGenerating(false);
    setGenMessage('');
    toast("Pre-fill cancelled.");
  };

  // Collect history of entries to guide AI
  const historyFoods = useMemo(() => {
    const uniques = new Map<string, any>();
    // 1. Favorites
    (state.favorites || []).forEach((f: any) => uniques.set(f.simpleName, f));
    // 2. Days with logs
    Object.values(state.days || {}).forEach((day: any) => {
      (day?.entries || []).forEach((e: any) => uniques.set(e.simpleName, e));
    });
    return Array.from(uniques.values());
  }, [state.days, state.favorites]);

  const entries = currentDayData?.entries || [];
  const totals = entries.reduce((acc, entry) => ({
    calories: acc.calories + (entry.calories || 0),
    protein: acc.protein + (entry.protein || 0),
    carbs: acc.carbs + (entry.carbs || 0),
    fats: acc.fats + (entry.fats || 0),
    fiber: acc.fiber + (entry.fiber || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 });

  const remaining = {
    calories: Math.max(0, targets.calories - totals.calories),
    protein: Math.max(0, targets.protein - totals.protein),
    carbs: Math.max(0, targets.carbs - totals.carbs),
    fats: Math.max(0, targets.fats - totals.fats),
    fiber: Math.max(0, targets.fiber - (currentDayData?.entries || []).reduce((sum, e) => sum + (e.fiber || 0), 0))
  };

  const handleSmartComplete = async (isHealthy: boolean) => {
    if (!hasKey()) {
      toast('Add an OpenRouter key to use smart pre-fill.', {
        action: { label: 'Settings', onClick: openAISettings },
      });
      return;
    }
    if (remaining.calories < 50 && remaining.protein < 5 && remaining.carbs < 5 && remaining.fats < 5) {
      toast("You've already hit your targets today!");
      return;
    }
    const currentGenId = generationRef.current;
    setIsGenerating(true);
    setGenMessage(isHealthy ? "Designing a pristine healthy remix..." : "Scanning typical preferences...");
    
    try {
      const messages = isHealthy 
        ? ["Analyzing pantry basics...", "Filtering raw vegetables...", "Optimizing micronutrients..."]
        : ["Analyzing historic logs...", "Scaling regular portions...", "Assembling simple staples..."];
      
      let msgIdx = 0;
      const interval = setInterval(() => {
        if (msgIdx < messages.length) {
          if (currentGenId === generationRef.current) {
            setGenMessage(messages[msgIdx]);
          }
          msgIdx++;
        }
      }, 1000);

      const generated = await autoCompleteDayMeals(historyFoods, entries, remaining, isHealthy);
      clearInterval(interval);

      // Discard results if cancelled
      if (currentGenId !== generationRef.current) {
        return;
      }

      if (!generated || generated.length === 0) {
        toast("No additional meals needed! Targets are met.");
      } else {
        generated.forEach((meal: any) => {
          addEntry({
            ...meal,
            id: generateId(),
            macrosPerUnit: {
              calories: (meal.calories || 0) / (meal.baseQuantity || 1),
              protein: (meal.protein || 0) / (meal.baseQuantity || 1),
              carbs: (meal.carbs || 0) / (meal.baseQuantity || 1),
              fats: (meal.fats || 0) / (meal.baseQuantity || 1),
              fiber: (meal.fiber || 0) / (meal.baseQuantity || 1),
            }
          });
        });
        toast(`Populated ${generated.length} basic meals to hit targets perfectly!`);
      }
    } catch (e: any) {
      console.error(e);
      if (currentGenId === generationRef.current) {
        toast(e?.message || "Pre-fill failed. Check your AI settings and try again.");
      }
    } finally {
      if (currentGenId === generationRef.current) {
        setIsGenerating(false);
        setGenMessage('');
      }
    }
  };

  const displayData = viewMode === 'consumed' ? totals : remaining;

  // Circular progress calculation
  const caloriePercent = Math.min(100, (totals.calories / targets.calories) * 100);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (caloriePercent / 100) * circumference;

  // Linear progress calculation
  const getPercent = (consumed: number, target: number) => Math.min(100, (consumed / target) * 100);

  // Graph Data Calculation
  const chartData = useMemo(() => {
    let days = 7;
    if (timeWindow === '1M') days = 30;
    if (timeWindow === '3M') days = 90;
    if (timeWindow === '6M') days = 180;
    if (timeWindow === 'Custom' && customStartDate) {
      days = Math.max(1, differenceInDays(currentDate, customStartDate) + 1);
    }

    const data = Array.from({ length: days }).map((_, i) => {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = format(d, 'yyyy-MM-dd');
      
      const dayProfileId = state.dayProfiles?.[d.getDay()];
      const target = state.profiles?.find(p => p.id === dayProfileId)?.macros.calories || 2000;
      
      const historyDay = state.days?.[dateStr];
      let consumed = null;
      
      if (historyDay && historyDay.entries && historyDay.entries.length > 0) {
        consumed = historyDay.entries.reduce((sum, e) => sum + (e.calories || 0), 0);
      } else if (dateStr === format(currentDate, 'yyyy-MM-dd') && totals.calories > 0) {
        consumed = totals.calories;
      }

      return {
        name: days <= 7 ? format(d, 'EEE') : format(d, 'MMM d'),
        fullDate: dateStr,
        consumed: consumed !== null ? Math.round(consumed) : null,
        target: Math.round(target),
      };
    });

    return data;
  }, [timeWindow, currentDate, state.days, state.profiles, state.dayProfiles, totals.calories]);

  const validConsumedData = chartData.filter(d => d.consumed !== null);
  const avgConsumed = validConsumedData.length > 0 
    ? Math.round(validConsumedData.reduce((sum, d) => sum + (d.consumed || 0), 0) / validConsumedData.length)
    : 0;
  const avgDiff = Math.round(totals.calories - targets.calories);

  return (
    <div className="px-4 py-6 pb-32 space-y-8 max-w-4xl mx-auto">
      {/* Header with Date Picker */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="relative inline-block">
            <p className="text-[11px] font-mono font-bold text-[var(--color-on-surface-variant)] uppercase tracking-widest cursor-pointer hover:text-[var(--color-on-surface)] transition-all flex items-center gap-1.5 bg-[var(--color-surface-variant)] px-3 py-1.5 rounded-full border border-[var(--color-outline)] shadow-3xs hover:scale-[1.02] active:scale-95">
              <CalendarIcon size={12} className="text-blue-500" />
              <span>{format(currentDate, 'EEEE, MMMM d')}</span>
              <ChevronDown size={12} className="opacity-60" />
            </p>
            <input 
              type="date" 
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
              value={format(currentDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m, d] = e.target.value.split('-');
                  setCurrentDate(new Date(Number(y), Number(m) - 1, Number(d)));
                }
              }}
            />
          </div>
          <h1 className="text-4xl font-black text-[var(--color-on-surface)] tracking-tight font-display mt-1.5">
            Biometric Log
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full bg-[var(--color-surface)] border border-[var(--color-outline)] hover:bg-[var(--color-surface-variant)] flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-3xs"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {state.theme === 'dark'
              ? <Sun size={15} className="text-amber-400" />
              : <Moon size={15} className="text-zinc-600" />}
          </button>
          <button
            onClick={openAISettings}
            className="flex items-center gap-2 bg-[var(--color-surface)] border border-[var(--color-outline)] hover:bg-[var(--color-surface-variant)] px-3.5 py-2 rounded-full text-[10px] font-black uppercase tracking-wider text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-all active:scale-95 cursor-pointer shadow-3xs"
            title="AI engine & models"
          >
            <Settings2 size={13} className="text-purple-400" />
            <span>AI Engine</span>
          </button>
        </div>
      </div>

      {entries.length === 0 && (
        <div className="bg-[var(--color-surface)] border border-dashed border-[var(--color-outline)] rounded-3xl p-5 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[var(--color-on-surface)] text-[var(--color-bg-base)] flex items-center justify-center flex-shrink-0">
            <Plus size={18} strokeWidth={3} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-[var(--color-on-surface)]">Nothing logged for this day yet</p>
            <p className="text-[11px] text-[var(--color-on-surface-variant)] leading-relaxed mt-0.5">
              Tap the + button below to photograph a plate, describe a meal, or type the numbers in yourself.
            </p>
          </div>
        </div>
      )}

      {/* Main Focus: Daily Goals & Rings */}
      <div className="space-y-6">
        <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] flex items-center gap-2">
          <Activity size={14} className="text-blue-500" />
          <span>DAILY COMPLIANCE SCORE</span>
        </h2>
        
        {/* Core Calorie Pod with Ring */}
        <div className="bg-[var(--color-surface)] p-6 rounded-3xl border border-[var(--color-outline)] shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-around gap-8">
          <div className="absolute top-0 left-0 -ml-12 -mt-12 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          
          {/* Centered Ring Visualizer */}
          <div className="relative flex items-center justify-center filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
            <svg className="transform -rotate-90 w-44 h-44">
              <circle
                cx="88"
                cy="88"
                r={radius}
                stroke="currentColor"
                strokeWidth="10"
                fill="transparent"
                className="text-[var(--color-surface-variant)] opacity-60"
              />
              <circle
                cx="88"
                cy="88"
                r={radius}
                stroke="currentColor"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="text-[var(--color-accent-kcal)] glow-kcal transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-[var(--color-on-surface)] font-display tracking-tight leading-none">
                {Math.round(totals.calories)}
              </span>
              <span className="text-[9px] text-[var(--color-on-surface-variant)] font-bold uppercase tracking-wider mt-1">
                KCAL ACTIVE
              </span>
              <span className="text-[10px] font-mono mt-0.5 px-1.5 py-0.5 rounded-md bg-[var(--color-surface-variant)] text-blue-500 font-extrabold shadow-3xs">
                {Math.round(caloriePercent)}%
              </span>
            </div>
          </div>

          {/* Caloric Metrics Side-by-Side */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-6 w-full md:w-auto">
            <div className="text-left">
              <p className="text-[10px] font-mono font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Remaining</p>
              <p className="text-3xl font-black text-[var(--color-on-surface)] font-display tracking-tight mt-1">
                {Math.round(remaining.calories)}
                <span className="text-xs font-normal text-[var(--color-on-surface-variant)] font-sans ml-1">kcal</span>
              </p>
            </div>
            <div className="text-left">
              <p className="text-[10px] font-mono font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Daily Target</p>
              <p className="text-3xl font-black text-[var(--color-on-surface)] font-display tracking-tight mt-1">
                {Math.round(targets.calories)}
                <span className="text-xs font-normal text-[var(--color-on-surface-variant)] font-sans ml-1">kcal</span>
              </p>
            </div>
          </div>
        </div>

        {/* 4-Item Premium Macro Bento Grid (Protein, Fat, Carbs, Fiber) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Protein Bento Card */}
          <div className="bg-[var(--color-surface)] p-4 rounded-2xl border border-[var(--color-outline)] shadow-3xs flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-12 h-12 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Protein</span>
              <span className="text-[10px] font-mono font-extrabold text-red-500">
                {Math.round(getPercent(totals.protein, targets.protein))}%
              </span>
            </div>
            <div>
              <div className="h-1.5 w-full bg-[var(--color-surface-variant)] rounded-full overflow-hidden mb-2.5">
                <div 
                  className="h-full bg-[var(--color-accent-protein)] glow-protein rounded-full transition-all duration-500"
                  style={{ width: `${getPercent(totals.protein, targets.protein)}%` }}
                />
              </div>
              <p className="text-sm font-black text-[var(--color-on-surface)] font-display tracking-tight">
                {Math.round(displayData.protein)}
                <span className="text-xs font-medium text-[var(--color-on-surface-variant)] font-sans ml-1">
                  {viewMode === 'consumed' ? `/ ${Math.round(targets.protein)}g` : 'left of'}
                </span>
              </p>
            </div>
          </div>

          {/* Fat Bento Card */}
          <div className="bg-[var(--color-surface)] p-4 rounded-2xl border border-[var(--color-outline)] shadow-3xs flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-12 h-12 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Fats</span>
              <span className="text-[10px] font-mono font-extrabold text-amber-500">
                {Math.round(getPercent(totals.fats, targets.fats))}%
              </span>
            </div>
            <div>
              <div className="h-1.5 w-full bg-[var(--color-surface-variant)] rounded-full overflow-hidden mb-2.5">
                <div 
                  className="h-full bg-[var(--color-accent-fats)] glow-fats rounded-full transition-all duration-500"
                  style={{ width: `${getPercent(totals.fats, targets.fats)}%` }}
                />
              </div>
              <p className="text-sm font-black text-[var(--color-on-surface)] font-display tracking-tight">
                {Math.round(displayData.fats)}
                <span className="text-xs font-medium text-[var(--color-on-surface-variant)] font-sans ml-1">
                  {viewMode === 'consumed' ? `/ ${Math.round(targets.fats)}g` : 'left of'}
                </span>
              </p>
            </div>
          </div>

          {/* Carbs Bento Card */}
          <div className="bg-[var(--color-surface)] p-4 rounded-2xl border border-[var(--color-outline)] shadow-3xs flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-12 h-12 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Carbs</span>
              <span className="text-[10px] font-mono font-extrabold text-emerald-500">
                {Math.round(getPercent(totals.carbs, targets.carbs))}%
              </span>
            </div>
            <div>
              <div className="h-1.5 w-full bg-[var(--color-surface-variant)] rounded-full overflow-hidden mb-2.5">
                <div 
                  className="h-full bg-[var(--color-accent-carbs)] glow-carbs rounded-full transition-all duration-500"
                  style={{ width: `${getPercent(totals.carbs, targets.carbs)}%` }}
                />
              </div>
              <p className="text-sm font-black text-[var(--color-on-surface)] font-display tracking-tight">
                {Math.round(displayData.carbs)}
                <span className="text-xs font-medium text-[var(--color-on-surface-variant)] font-sans ml-1">
                  {viewMode === 'consumed' ? `/ ${Math.round(targets.carbs)}g` : 'left of'}
                </span>
              </p>
            </div>
          </div>

          {/* Fiber Bento Card (Added Fiber targets visualization!) */}
          <div className="bg-[var(--color-surface)] p-4 rounded-2xl border border-[var(--color-outline)] shadow-3xs flex flex-col justify-between h-32 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-12 h-12 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Diet Fiber</span>
              <span className="text-[10px] font-mono font-extrabold text-cyan-500">
                {Math.round(getPercent(totals.fiber, targets.fiber))}%
              </span>
            </div>
            <div>
              <div className="h-1.5 w-full bg-[var(--color-surface-variant)] rounded-full overflow-hidden mb-2.5">
                <div 
                  className="h-full bg-cyan-500 glow-fiber rounded-full transition-all duration-500"
                  style={{ width: `${getPercent(totals.fiber, targets.fiber)}%` }}
                />
              </div>
              <p className="text-sm font-black text-[var(--color-on-surface)] font-display tracking-tight">
                {Math.round(viewMode === 'consumed' ? totals.fiber : remaining.fiber)}
                <span className="text-xs font-medium text-[var(--color-on-surface-variant)] font-sans ml-1">
                  {viewMode === 'consumed' ? `/ ${Math.round(targets.fiber)}g` : 'left of'}
                </span>
              </p>
            </div>
          </div>

        </div>

        <WaterCard />

        {/* View Toggle Mode Selector & Auto-fill actions */}
        <div className="flex flex-col items-center gap-3 mt-6">
          <div className="bg-[var(--color-surface-variant)] border border-[var(--color-outline)] p-1 rounded-full flex text-xs font-bold shadow-3xs">
            <button 
              onClick={() => setViewMode('consumed')}
              className={`px-5 py-2 rounded-full transition-all cursor-pointer ${viewMode === 'consumed' ? 'bg-[var(--color-surface)] text-[var(--color-on-surface)] shadow-2xs' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}`}
            >
              Consumed
            </button>
            <button 
              onClick={() => setViewMode('remaining')}
              className={`px-5 py-2 rounded-full transition-all cursor-pointer ${viewMode === 'remaining' ? 'bg-[var(--color-surface)] text-[var(--color-on-surface)] shadow-2xs' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}`}
            >
              Remaining
            </button>
          </div>

          {/* Minimalist Smart Auto-complete Control bar */}
          <div className="flex flex-col items-center gap-1.5 w-full mt-2">
            {remaining.calories > 50 ? (
              <div className="flex items-center gap-3">
                {isGenerating ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface-variant)] border border-purple-500/20 rounded-full text-[10px] text-purple-400 font-mono animate-pulse">
                    <Loader2 size={12} className="animate-spin" />
                    <span>{genMessage || 'Generating...'}</span>
                    <button
                      onClick={handleCancelGeneration}
                      className="ml-1 text-red-500 hover:text-red-400 cursor-pointer focus:outline-none p-0.5 rounded-full hover:bg-red-500/10 transition-colors flex items-center justify-center"
                      title="Cancel Generation"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-[var(--color-surface-variant)]/60 border border-[var(--color-outline)] px-3 py-1 rounded-full text-[10px] text-[var(--color-on-surface-variant)]">
                    <span className="opacity-70 font-medium">Auto-fill:</span>
                    <button
                      onClick={() => handleSmartComplete(false)}
                      className="p-1.5 rounded-full text-purple-400 hover:text-purple-300 hover:bg-neutral-800 transition-all cursor-pointer flex items-center justify-center"
                      title="Pantry Basics Pre-fill"
                    >
                      <ChefHat size={14} />
                    </button>
                    <div className="h-3 w-px bg-[var(--color-outline)]" />
                    <button
                      onClick={() => handleSmartComplete(true)}
                      className="p-1.5 rounded-full text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20 transition-all cursor-pointer flex items-center justify-center"
                      title="Healthy Remix"
                    >
                      <Sparkles size={14} className="animate-pulse" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 size={12} />
                <span>Daily nutrition targets completed!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] flex items-center gap-2">
          <TrendingUp size={14} className="text-blue-500" />
          <span>WEEKLY TREND ASSESSMENT</span>
        </h2>
        
        <div className="bg-[var(--color-surface)] p-6 rounded-3xl border border-[var(--color-outline)] shadow-sm">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-[10px] font-mono font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Historical Average</p>
              <p className="text-3xl font-black text-[var(--color-on-surface)] font-display tracking-tight mt-1">
                {avgConsumed} <span className="text-xs font-normal text-[var(--color-on-surface-variant)] font-sans">kcal / day</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-mono font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Delta vs. Baseline</p>
              <p className={`text-3xl font-black font-display tracking-tight mt-1 ${avgDiff > 0 ? 'text-[var(--color-accent-protein)]' : 'text-[var(--color-accent-carbs)]'}`}>
                {avgDiff > 0 ? '+' : ''}{avgDiff} <span className="text-xs font-normal text-[var(--color-on-surface-variant)] font-sans">kcal</span>
              </p>
            </div>
          </div>
          
          <div className="h-56 w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConsumed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent-kcal)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-accent-kcal)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-outline)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: 'var(--color-on-surface-variant)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }} 
                  dy={10} 
                  minTickGap={timeWindow === '1W' ? 0 : 20}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--color-on-surface-variant)', fontFamily: 'var(--font-mono)' }} domain={['dataMin - 200', 'dataMax + 200']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-outline)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}
                  itemStyle={{ color: 'var(--color-on-surface)', fontWeight: 'bold', fontFamily: 'var(--font-sans)' }}
                  labelStyle={{ color: 'var(--color-on-surface-variant)', fontWeight: 'bold', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
                />
                <Line 
                  type="stepAfter" 
                  dataKey="target" 
                  stroke="var(--color-accent-protein)" 
                  strokeWidth={2} 
                  strokeDasharray="4 4" 
                  dot={false} 
                />
                <Line 
                  type="monotone" 
                  dataKey="consumed" 
                  stroke="var(--color-accent-kcal)" 
                  strokeWidth={3} 
                  connectNulls={false}
                  dot={{ r: 4, fill: 'var(--color-surface)', strokeWidth: 2, stroke: 'var(--color-accent-kcal)' }} 
                  activeDot={{ r: 6 }} 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex flex-col gap-4 mt-6 pt-4 border-t border-[var(--color-outline)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-kcal)]"></div>
                  <span className="text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider font-mono">Consumed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-protein)]"></div>
                  <span className="text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider font-mono">Target Limit</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between overflow-x-auto scrollbar-hide pb-2">
              <div className="flex bg-[var(--color-surface-variant)] border border-[var(--color-outline)] p-1 rounded-full text-[10px] font-bold text-[var(--color-on-surface-variant)] min-w-max shadow-3xs">
                {(['1W', '1M', '3M', '6M', 'Custom'] as TimeWindow[]).map(tw => (
                  <div key={tw} className="relative flex items-center">
                    <button
                      onClick={() => {
                        setTimeWindow(tw);
                        if (tw === 'Custom' && !customStartDate) {
                          setCustomStartDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
                        }
                      }}
                      className={`px-4 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 min-w-max uppercase font-mono tracking-wider ${timeWindow === tw ? 'bg-[var(--color-surface)] text-[var(--color-on-surface)] shadow-2xs' : 'hover:text-[var(--color-on-surface)]'}`}
                    >
                      {tw === 'Custom' ? (
                        <>
                          <CalendarIcon size={12} />
                          {timeWindow === 'Custom' && customStartDate ? format(customStartDate, 'MMM d') : 'Custom Range'}
                        </>
                      ) : (
                        tw
                      )}
                    </button>
                    {tw === 'Custom' && timeWindow === 'Custom' && (
                      <input 
                        type="date"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        value={customStartDate ? format(customStartDate, 'yyyy-MM-dd') : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            const [y, m, d] = e.target.value.split('-');
                            setCustomStartDate(new Date(Number(y), Number(m) - 1, Number(d)));
                          }
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
