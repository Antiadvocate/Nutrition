import React, { useState, useMemo } from 'react';
import { useStore, FoodEntry, estimateMicrosIfMissing } from '../store/StoreContext';
import { format, subDays } from 'date-fns';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Leaf, 
  ShieldAlert, 
  Info, 
  BrainCircuit, 
  TrendingUp, 
  Layers,
  Flame,
  XCircle,
  HelpCircle
} from 'lucide-react';

type TabView = 'daily' | 'weekly';

export default function Insights() {
  const { state, currentDayData, currentDate } = useStore();
  const [view, setView] = useState<TabView>('daily');

  // Daily Calculations (ensured we estimate if missing)
  const dailyEntries = useMemo(() => {
    const raw = currentDayData?.entries || [];
    return raw.map(e => estimateMicrosIfMissing(e));
  }, [currentDayData?.entries]);
  
  const dailyTotals = useMemo(() => {
    return dailyEntries.reduce((acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      sodium: acc.sodium + (e.sodium || 0),
      potassium: acc.potassium + (e.potassium || 0),
      iron: acc.iron + (e.iron || 0),
      calcium: acc.calcium + (e.calcium || 0),
      vitaminC: acc.vitaminC + (e.vitaminC || 0),
      vitaminD: acc.vitaminD + (e.vitaminD || 0),
      fiber: acc.fiber + (e.fiber || 0),
      upfCalories: acc.upfCalories + (e.processingScore === 4 ? (e.calories || 0) : 0),
      totalProcessedItems: acc.totalProcessedItems + (e.processingScore && e.processingScore >= 3 ? 1 : 0),
    }), {
      calories: 0, sodium: 0, potassium: 0, iron: 0, calcium: 0, vitaminC: 0, vitaminD: 0, fiber: 0, upfCalories: 0, totalProcessedItems: 0
    });
  }, [dailyEntries]);

  const dailyUpfPercent = dailyTotals.calories > 0 
    ? Math.round((dailyTotals.upfCalories / dailyTotals.calories) * 100) 
    : 0;

  // Weekly Calculations (Last 7 Days)
  const weeklyData = useMemo(() => {
    const daysArr = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(currentDate, i);
      const k = format(d, 'yyyy-MM-dd');
      return state.days?.[k] || { entries: [] as FoodEntry[] };
    });

    let totalCalories = 0;
    let totalSodium = 0;
    let totalPotassium = 0;
    let totalIron = 0;
    let totalCalcium = 0;
    let totalVitaminC = 0;
    let totalVitaminD = 0;
    let totalFiber = 0;
    let totalUpfCalories = 0;
    let totalDaysWithLogs = 0;
    const allWeeklyEntries: FoodEntry[] = [];

    daysArr.forEach(day => {
      if (day && day.entries && day.entries.length > 0) {
        totalDaysWithLogs++;
        day.entries.forEach(e => {
          const enriched = estimateMicrosIfMissing(e);
          allWeeklyEntries.push(enriched);
          totalCalories += enriched.calories || 0;
          totalSodium += enriched.sodium || 0;
          totalPotassium += enriched.potassium || 0;
          totalIron += enriched.iron || 0;
          totalCalcium += enriched.calcium || 0;
          totalVitaminC += enriched.vitaminC || 0;
          totalVitaminD += enriched.vitaminD || 0;
          totalFiber += enriched.fiber || 0;
          if (enriched.processingScore === 4) {
            totalUpfCalories += enriched.calories || 0;
          }
        });
      }
    });

    const divisor = totalDaysWithLogs || 1;

    return {
      avgCalories: Math.round(totalCalories / divisor),
      avgSodium: Math.round(totalSodium / divisor),
      avgPotassium: Math.round(totalPotassium / divisor),
      avgIron: Number((totalIron / divisor).toFixed(1)),
      avgCalcium: Math.round(totalCalcium / divisor),
      avgVitaminC: Math.round(totalVitaminC / divisor),
      avgVitaminD: Number((totalVitaminD / divisor).toFixed(1)),
      avgFiber: Math.round(totalFiber / divisor),
      upfPercent: totalCalories > 0 ? Math.round((totalUpfCalories / totalCalories) * 100) : 0,
      entriesCount: allWeeklyEntries.length,
      allEntries: allWeeklyEntries,
      daysWithLogs: totalDaysWithLogs
    };
  }, [state.days, currentDate]);

  // Guidelines levels
  const microTargets = {
    sodium: { label: 'Sodium', limit: 2300, unit: 'mg', color: 'text-amber-500', isMax: true, desc: 'Commonly kept below this' },
    potassium: { label: 'Potassium', limit: 3500, unit: 'mg', color: 'text-emerald-500', isMax: false, desc: 'Key electrolyte supporting cellular pump & muscle function' },
    calcium: { label: 'Calcium', limit: 1000, unit: 'mg', color: 'text-blue-500', isMax: false, desc: 'Essential for skeletal integrity, bone density & neural signaling' },
    iron: { label: 'Iron', limit: 18, unit: 'mg', color: 'text-rose-500', isMax: false, desc: 'Transports oxygen via hemoglobin & vital for mitochondria' },
    vitaminC: { label: 'Vitamin C', limit: 90, unit: 'mg', color: 'text-orange-500', isMax: false, desc: 'Potent antioxidant supporting synthesis of connective tissues' },
    vitaminD: { label: 'Vitamin D', limit: 15, unit: 'mcg', color: 'text-cyan-500', isMax: false, desc: 'Critical for immunological resilience & calcium absorption' },
  };

  // Where a number sits relative to a reference, said plainly. No alarms: a
  // reference point is a description of an intention, not a standard to pass.
  const neutral = 'text-[var(--color-on-surface-variant)] bg-[var(--color-surface-variant)]';
  const marked = 'text-[var(--color-on-surface)] bg-[var(--color-surface-variant)]';

  const getMicroStatus = (value: number, target: number, isMax: boolean) => {
    if (isMax) {
      if (value > target) return { label: 'above reference', style: marked };
      if (value > target * 0.8) return { label: 'near reference', style: neutral };
      return { label: 'under reference', style: neutral };
    }
    if (value >= target) return { label: 'at reference', style: marked };
    if (value >= target * 0.5) return { label: 'part way', style: neutral };
    return { label: 'well under', style: neutral };
  };

  const currentEntries = view === 'daily' ? dailyEntries : weeklyData.allEntries;
  const currentUpfPercent = view === 'daily' ? dailyUpfPercent : weeklyData.upfPercent;
  const currentSodium = Math.round(view === 'daily' ? dailyTotals.sodium : weeklyData.avgSodium);
  const currentPotassium = Math.round(view === 'daily' ? dailyTotals.potassium : weeklyData.avgPotassium);
  const currentCalcium = Math.round(view === 'daily' ? dailyTotals.calcium : weeklyData.avgCalcium);
  const currentIron = Number((view === 'daily' ? dailyTotals.iron : weeklyData.avgIron).toFixed(1));
  const currentVitaminC = Math.round(view === 'daily' ? dailyTotals.vitaminC : weeklyData.avgVitaminC);
  const currentVitaminD = Number((view === 'daily' ? dailyTotals.vitaminD : weeklyData.avgVitaminD).toFixed(1));
  const currentFiber = Math.round(view === 'daily' ? dailyTotals.fiber : weeklyData.avgFiber);

  const fiberTarget = useMemo(() => {
    const dayOfWeek = currentDate.getDay();
    const profileId = state.dayProfiles?.[dayOfWeek];
    const target = state.profiles?.find(p => p.id === profileId)?.macros;
    return target?.fiber || 30;
  }, [currentDate, state.dayProfiles, state.profiles]);

  const getFiberStatus = (value: number, target: number) => {
    if (value >= target) return { label: 'at reference', style: marked };
    if (value >= target * 0.6) return { label: 'part way', style: neutral };
    return { label: 'well under', style: neutral };
  };

  const currentIngredients = useMemo(() => {
    const list: string[] = [];
    currentEntries.forEach(e => {
      if (e.ingredients) {
        e.ingredients.forEach(i => {
          if (!list.includes(i)) list.push(i);
        });
      } else {
        if (!list.includes(e.simpleName)) list.push(e.simpleName);
      }
    });
    return list;
  }, [currentEntries]);

  // Combine highlights
  const advantages = useMemo(() => {
    const list: string[] = [];
    currentEntries.forEach(e => {
      if (e.positives) {
        e.positives.forEach(hl => {
          if (!list.includes(hl)) list.push(hl);
        });
      }
    });
    if (list.length === 0 && currentEntries.length > 0) {
      list.push("Includes natural elements with wholesome base nutrients");
    }
    return list;
  }, [currentEntries]);

  // Warning risks
  const watchouts = useMemo(() => {
    const list: string[] = [];
    currentEntries.forEach(e => {
      if (e.negatives) {
        e.negatives.forEach(w => {
          if (!list.includes(w)) list.push(w);
        });
      }
      if (e.processingScore && e.processingScore === 4) {
        const upfWarning = `${e.simpleName} is ultra-processed on the NOVA scale.`;
        if (!list.includes(upfWarning)) list.push(upfWarning);
      }
    });

    if (currentSodium > microTargets.sodium.limit) {
      list.push("High daily sodium footprint detected. Restricting extra seasoning is heavily advised.");
    }
    if (currentFiber < fiberTarget * 0.6) {
      list.push(`Fiber levels are low (${currentFiber}g / ${fiberTarget}g target). This triggers sugar assimilation waves and reduces colon speed.`);
    }
    return list;
  }, [currentEntries, currentSodium, currentFiber, fiberTarget]);

  const novaScoreDescription = (score: number) => {
    switch (score) {
      case 1: return { status: 'Group 1: Unprocessed / Minimally Processed', desc: 'Natural plants, animals or fungi raw extracts with unaltered nutrient densities.', color: 'text-emerald-500 bg-emerald-500/10' };
      case 2: return { status: 'Group 2: Processed Culinary Ingredients', desc: 'Oils, butter, sugar, salts extracted purely to prepare or enrich meals.', color: 'text-indigo-500 bg-indigo-500/10' };
      case 3: return { status: 'Group 3: Processed Foods', desc: 'Simple processed foods using preservation or canned canning. Balanced.', color: 'text-amber-500 bg-amber-500/10' };
      case 4: return { status: 'Group 4: Ultra-Processed Foods (UPFs)', desc: 'Industrial formulations containing emulsifiers, colorants, thickeners & sweeteners.', color: 'text-red-500 bg-red-500/10' };
      default: return { status: 'Unknown NOVA Classification', desc: 'Processed classification is currently missing.', color: 'text-gray-500 bg-gray-500/10' };
    }
  };

  return (
    <div className="px-4 py-6 pb-32 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-light tracking-tight flex items-center gap-2">
            Detail <Sparkles size={26} className="text-[var(--color-on-surface-variant)] opacity-40" />
          </h1>
          <p className="text-sm text-[var(--color-on-surface-variant)]">Micronutrients and how processed the food was. Information, not a report card.</p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex bg-[var(--color-surface-variant)] p-1 rounded-full text-sm font-semibold max-w-xs">
        <button 
          onClick={() => setView('daily')}
          className={`flex-1 py-2 text-center rounded-full transition-colors ${view === 'daily' ? 'bg-[var(--color-surface)] text-[var(--color-on-surface)] shadow-md' : 'text-[var(--color-on-surface-variant)]'}`}
        >
          Today's Intel
        </button>
        <button 
          onClick={() => setView('weekly')}
          className={`flex-1 py-2 text-center rounded-full transition-colors ${view === 'weekly' ? 'bg-[var(--color-surface)] text-[var(--color-on-surface)] shadow-md' : 'text-[var(--color-on-surface-variant)]'}`}
        >
          Weekly Trends
        </button>
      </div>

      {currentEntries.length === 0 ? (
        <div className="bg-[var(--color-surface)] p-8 rounded-3xl border border-[var(--color-outline)] text-center space-y-4">
          <BrainCircuit className="mx-auto text-[var(--color-on-surface-variant)] stroke-1" size={48} />
          <div>
            <h3 className="text-lg font-medium">Nothing logged for this stretch</h3>
            <p className="text-xs text-[var(--color-on-surface-variant)] max-w-sm mx-auto mt-1">
              {view === 'daily' 
                ? "Add your foods in the 'Food Log' tab using AI Search or Smart Scan to automatically compile chemical and industrial insights." 
                : "No weekly historical entries detected. Log entries over the course of several days to construct your health trend model."}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* NOVA processing Score Indicator */}
          <div className="bg-[var(--color-surface)] p-6 rounded-3xl border border-[var(--color-outline)] space-y-5">
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="text-xs font-bold text-[var(--color-on-surface-variant)] tracking-wide">Industrial Food footprint</span>
                <h3 className="text-xl font-medium mt-1">How processed the food was</h3>
              </div>
              <div className="text-right">
                <span className={`text-4xl font-light ${currentUpfPercent > 50 ? 'text-red-500' : currentUpfPercent > 20 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {currentUpfPercent}%
                </span>
                <p className="text-[10px] text-[var(--color-on-surface-variant)] font-bold mt-1">OF CALORIES</p>
              </div>
            </div>

            {/* Gauge Indicator */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-[var(--color-surface-variant)] rounded-full overflow-hidden flex">
                <div 
                  className={`h-full transition-all duration-500 ${currentUpfPercent > 50 ? 'bg-red-500' : currentUpfPercent > 20 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${currentUpfPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold text-[var(--color-on-surface-variant)]">
                <span>0% (PURE WHOLEFOODS)</span>
                <span>20% (MODERATE)</span>
                <span>50%+ (RISKY INDUSTRY RATIO)</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--color-outline)] flex items-start gap-3 text-xs text-[var(--color-on-surface-variant)] font-medium leading-relaxed">
              <Info size={16} className="text-[var(--color-accent-kcal)] flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-[var(--color-on-surface)]">About the NOVA scale: </span>
                NOVA sorts food by how much industrial processing it has been through, from whole ingredients up to formulations built from refined substances. It describes how a food was made, not whether eating it was a mistake.
              </div>
            </div>
          </div>

          {/* Micronutrient Dashboard */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium tracking-tight">Micronutrients</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dietary Fiber */}
              <div className="bg-[var(--color-surface)] p-5 rounded-3xl border border-[var(--color-outline)] flex flex-col justify-between gap-3 md:col-span-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-sm text-[var(--color-on-surface)] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Dietary Fiber
                    </h5>
                    <p className="text-[10px] text-[var(--color-on-surface-variant)] mt-1 font-medium">Supports microbiome diversity, nutrient transport, lipid balance, and glycemic pacing.</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${getFiberStatus(currentFiber, fiberTarget).style}`}>
                    {getFiberStatus(currentFiber, fiberTarget).label}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>{currentFiber} g</span>
                    <span className="text-[var(--color-on-surface-variant)]">Reference: &ge;{fiberTarget} g</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--color-surface-variant)] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${currentFiber >= fiberTarget ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, (currentFiber / fiberTarget) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Sodium */}
              <div className="bg-[var(--color-surface)] p-5 rounded-3xl border border-[var(--color-outline)] flex flex-col justify-between gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-sm text-[var(--color-on-surface)] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Sodium
                    </h5>
                    <p className="text-[10px] text-[var(--color-on-surface-variant)] mt-1 font-medium">{microTargets.sodium.desc}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${getMicroStatus(currentSodium, microTargets.sodium.limit, true).style}`}>
                    {getMicroStatus(currentSodium, microTargets.sodium.limit, true).label}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>{currentSodium} mg</span>
                    <span className="text-[var(--color-on-surface-variant)]">Commonly under: &lt;{microTargets.sodium.limit} mg</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--color-surface-variant)] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${currentSodium > microTargets.sodium.limit ? 'bg-red-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, (currentSodium / microTargets.sodium.limit) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Potassium */}
              <div className="bg-[var(--color-surface)] p-5 rounded-3xl border border-[var(--color-outline)] flex flex-col justify-between gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-sm text-[var(--color-on-surface)] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Potassium
                    </h5>
                    <p className="text-[10px] text-[var(--color-on-surface-variant)] mt-1 font-medium">{microTargets.potassium.desc}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${getMicroStatus(currentPotassium, microTargets.potassium.limit, false).style}`}>
                    {getMicroStatus(currentPotassium, microTargets.potassium.limit, false).label}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>{currentPotassium} mg</span>
                    <span className="text-[var(--color-on-surface-variant)]">Reference: {microTargets.potassium.limit} mg</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--color-surface-variant)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (currentPotassium / microTargets.potassium.limit) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Calcium */}
              <div className="bg-[var(--color-surface)] p-5 rounded-3xl border border-[var(--color-outline)] flex flex-col justify-between gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-sm text-[var(--color-on-surface)] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Calcium
                    </h5>
                    <p className="text-[10px] text-[var(--color-on-surface-variant)] mt-1 font-medium">{microTargets.calcium.desc}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${getMicroStatus(currentCalcium, microTargets.calcium.limit, false).style}`}>
                    {getMicroStatus(currentCalcium, microTargets.calcium.limit, false).label}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>{currentCalcium} mg</span>
                    <span className="text-[var(--color-on-surface-variant)]">Reference: {microTargets.calcium.limit} mg</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--color-surface-variant)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (currentCalcium / microTargets.calcium.limit) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Iron */}
              <div className="bg-[var(--color-surface)] p-5 rounded-3xl border border-[var(--color-outline)] flex flex-col justify-between gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-sm text-[var(--color-on-surface)] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      Iron
                    </h5>
                    <p className="text-[10px] text-[var(--color-on-surface-variant)] mt-1 font-medium">{microTargets.iron.desc}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${getMicroStatus(currentIron, microTargets.iron.limit, false).style}`}>
                    {getMicroStatus(currentIron, microTargets.iron.limit, false).label}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>{currentIron} mg</span>
                    <span className="text-[var(--color-on-surface-variant)]">Reference: {microTargets.iron.limit} mg</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--color-surface-variant)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (currentIron / microTargets.iron.limit) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Vitamin C */}
              <div className="bg-[var(--color-surface)] p-5 rounded-3xl border border-[var(--color-outline)] flex flex-col justify-between gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-sm text-[var(--color-on-surface)] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      Vitamin C
                    </h5>
                    <p className="text-[10px] text-[var(--color-on-surface-variant)] mt-1 font-medium">{microTargets.vitaminC.desc}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${getMicroStatus(currentVitaminC, microTargets.vitaminC.limit, false).style}`}>
                    {getMicroStatus(currentVitaminC, microTargets.vitaminC.limit, false).label}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>{currentVitaminC} mg</span>
                    <span className="text-[var(--color-on-surface-variant)]">Reference: {microTargets.vitaminC.limit} mg</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--color-surface-variant)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (currentVitaminC / microTargets.vitaminC.limit) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Vitamin D */}
              <div className="bg-[var(--color-surface)] p-5 rounded-3xl border border-[var(--color-outline)] flex flex-col justify-between gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-sm text-[var(--color-on-surface)] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                      Vitamin D
                    </h5>
                    <p className="text-[10px] text-[var(--color-on-surface-variant)] mt-1 font-medium">{microTargets.vitaminD.desc}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${getMicroStatus(currentVitaminD, microTargets.vitaminD.limit, false).style}`}>
                    {getMicroStatus(currentVitaminD, microTargets.vitaminD.limit, false).label}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>{currentVitaminD} mcg</span>
                    <span className="text-[var(--color-on-surface-variant)]">Reference: {microTargets.vitaminD.limit} mcg</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--color-surface-variant)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (currentVitaminD / microTargets.vitaminD.limit) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* NOVA Classification breakdown list of current logged items */}
          <div className="bg-[var(--color-surface)] p-6 rounded-3xl border border-[var(--color-outline)] space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Layers size={18} className="text-indigo-400" />
              Logged Food Processing Audit
            </h3>
            <div className="space-y-3">
              {currentEntries.map(e => {
                const score = e.processingScore || 1;
                const info = novaScoreDescription(score);
                return (
                  <div key={e.id} className="flex gap-4 p-3 rounded-2xl bg-[var(--color-surface-variant)]/40 hover:bg-[var(--color-surface-variant)]/60 transition-colors">
                    <span className="text-2xl mt-0.5">{e.emoji || '🍽️'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[var(--color-on-surface)] truncate">{e.simpleName}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${info.color}`}>
                          NOVA {score}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-[var(--color-on-surface-variant)] mt-1">{info.status}</p>
                      <p className="text-[10px] text-[var(--color-on-surface-variant)] leading-normal mt-0.5">{info.desc}</p>
                      
                      {e.ingredients && e.ingredients.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className="text-[9px] font-bold text-[var(--color-on-surface-variant)] mr-1">Ingredients:</span>
                          {e.ingredients.map((ing, idx) => (
                            <span key={idx} className="text-[9px] bg-[var(--color-surface)] px-1.5 py-0.5 rounded text-[var(--color-on-surface-variant)]">
                              {ing}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chemical Upsidest & Downsides of Ingredients */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upsides (Benefits) */}
            <div className="bg-[var(--color-surface)] p-6 rounded-3xl border border-[var(--color-outline)] space-y-4">
              <h4 className="font-medium text-base flex items-center gap-2 text-[var(--color-on-surface)]">
                <Leaf size={17} className="text-emerald-500/70" />
                What these foods bring
              </h4>
              <p className="text-xs text-[var(--color-on-surface-variant)]">Noted, not scored.</p>
              
              <ul className="space-y-2 pt-2">
                {advantages.map((adv, idx) => (
                  <li key={idx} className="flex gap-2.5 text-xs text-[var(--color-on-surface)] items-start">
                    <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="font-medium leading-relaxed">{adv}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Downsides (Warnings) */}
            <div className="bg-[var(--color-surface)] p-6 rounded-3xl border border-[var(--color-outline)] space-y-4">
              <h4 className="font-medium text-base flex items-center gap-2 text-[var(--color-on-surface)]">
                <ShieldAlert size={17} className="text-amber-500/70" />
                Worth knowing
              </h4>
              <p className="text-xs text-[var(--color-on-surface-variant)]">Things about these foods you might not have known. Nothing here is a mistake.</p>
              
              <ul className="space-y-2 pt-2">
                {watchouts.map((w, idx) => (
                  <li key={idx} className="flex gap-2.5 text-xs text-[var(--color-on-surface)] items-start">
                    <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="font-medium leading-relaxed">{w}</span>
                  </li>
                ))}
                {watchouts.length === 0 && (
                  <li className="text-xs text-[var(--color-on-surface-variant)] italic">
                    Nothing in particular to note about today's foods.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
