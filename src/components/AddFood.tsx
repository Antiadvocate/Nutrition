import React, { useState, useRef } from 'react';
import { Scan, Search, Sparkles, Zap, BookOpen, Loader2, Camera, X, Plus } from 'lucide-react';
import { useStore } from '../store/StoreContext';
import { analyzeFood } from '../lib/ai';
import { format } from 'date-fns';
import { generateId, readImageDownscaled } from '../lib/utils';
import { toast } from './ui/Toaster';
import { hasKey } from '../lib/openrouter';
import { openAISettings } from './AISettings';

export default function AddFood() {
  const [activeTab, setActiveTab] = useState('search');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const { addEntry, state } = useStore();

  // Scan State
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Add State
  const [manualName, setManualName] = useState('');
  const [manualCals, setManualCals] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFats, setManualFats] = useState('');

  // AI State
  const [aiPrompt, setAiPrompt] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files: File[] = Array.from(e.target.files);
    for (const file of files) {
      try {
        const dataUrl = await readImageDownscaled(file);
        setImages(prev => [...prev, dataUrl]);
      } catch (err: any) {
        console.error(err);
        toast(err?.message || 'Could not read that image.');
      }
    }
    e.target.value = '';
  };

  const handleLog = async (isScan = false, isAi = false) => {
    const textQuery = isScan ? (query || "Analyze the food in this image.") : (isAi ? aiPrompt : query);
    if (!textQuery && !isScan) return;
    if (isScan && images.length === 0) return;
    // Fail before the request rather than after, and send them somewhere useful.
    if (!hasKey()) {
      toast('Add an OpenRouter key to use AI logging.', {
        action: { label: 'Settings', onClick: openAISettings },
      });
      return;
    }

    setLoading(true);
    try {
      const nutrition = await analyzeFood(textQuery, isScan ? images : []);
      const macrosPerUnit = {
        calories: nutrition.calories / nutrition.baseQuantity,
        protein: nutrition.protein / nutrition.baseQuantity,
        carbs: nutrition.carbs / nutrition.baseQuantity,
        fats: nutrition.fats / nutrition.baseQuantity,
        fiber: nutrition.fiber / nutrition.baseQuantity,
      };
      addEntry({
        ...nutrition,
        id: generateId(),
        time: format(new Date(), 'h:mm a'),
        description: textQuery,
        macrosPerUnit
      });
      setQuery('');
      setAiPrompt('');
      setImages([]);
      toast(`Logged ${nutrition.simpleName}`);
      setActiveTab('search');
    } catch (e: any) {
      console.error(e);
      toast(e?.message || "Analysis failed. Check your AI settings or use 'Quick Add'.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName || !manualCals) return;

    const cals = parseFloat(manualCals) || 0;
    const p = parseFloat(manualProtein) || 0;
    const c = parseFloat(manualCarbs) || 0;
    const f = parseFloat(manualFats) || 0;

    addEntry({
      id: generateId(),
      time: format(new Date(), 'h:mm a'),
      description: manualName,
      simpleName: manualName,
      emoji: '🍽️',
      quantity: '1 serving',
      baseQuantity: 1,
      unit: 'serving',
      calories: cals,
      protein: p,
      carbs: c,
      fats: f,
      fiber: 0,
      giIndex: 'Unknown',
      satiety: 'Medium',
      sodium: 0,
      potassium: 0,
      iron: 0,
      calcium: 0,
      vitaminC: 0,
      vitaminD: 0,
      processingScore: 1,
      processingCategory: 'Minimally Processed',
      ingredients: [manualName],
      positives: ['Freshly logged'],
      negatives: [],
      macrosPerUnit: { calories: cals, protein: p, carbs: c, fats: f, fiber: 0 }
    });

    setManualName('');
    setManualCals('');
    setManualProtein('');
    setManualCarbs('');
    setManualFats('');
    toast(`Manually logged ${manualName}`);
    setActiveTab('search');
  };

  // Get unique foods from history for library
  const libraryFoods = Array.from(new Map(
    Object.values(state.days || {}).flatMap((d: any) => d?.entries || []).map((e: any) => [e.simpleName, e])
  ).values()).slice(0, 20); // Last 20 unique foods

  const handleLibraryAdd = (food: any) => {
    addEntry({ ...food, id: generateId(), time: format(new Date(), 'h:mm a') });
    toast(`Added ${food.simpleName}`);
  };

  return (
    <>
      {/* Top Floating Tab Capsule Menu */}
      <div className="px-4 pt-6 pb-2 max-w-2xl mx-auto">
        <div className="flex items-center gap-1.5 p-1 bg-[var(--color-surface)] border border-[var(--color-outline)] rounded-2xl overflow-x-auto scrollbar-hide shadow-3xs">
          <Tab icon={<Search size={14}/>} label="Quick Log" active={activeTab === 'search'} onClick={() => setActiveTab('search')} />
          <Tab icon={<Scan size={14}/>} label="Scan Camera" active={activeTab === 'scan'} onClick={() => setActiveTab('scan')} />
          <Tab icon={<Sparkles size={14}/>} label="AI Log" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
          <Tab icon={<Zap size={14}/>} label="Quick Add" active={activeTab === 'quick_add'} onClick={() => setActiveTab('quick_add')} />
          <Tab icon={<BookOpen size={14}/>} label="Library" active={activeTab === 'library'} onClick={() => setActiveTab('library')} />
        </div>
      </div>

      {/* Content based on tab */}
      {activeTab === 'search' && (
        <div className="px-4 py-4 max-w-2xl mx-auto">
          <p className="text-[11px] text-[var(--color-on-surface-variant)] font-medium mb-3 leading-relaxed">
            One line in, full macros out. This is an AI estimate, not a database lookup — include the portion for a
            closer number. Free of charge only if your chosen model is.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-[var(--color-surface)] rounded-2xl flex items-center px-4 shadow-3xs border border-[var(--color-outline)] focus-within:border-[var(--color-on-surface)] transition-colors">
              <Search size={18} className="text-[var(--color-on-surface-variant)]" />
              <input 
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLog(false, false)}
                placeholder="Name a food and portion (e.g., '1 poached egg')"
                className="w-full bg-transparent border-none outline-none px-3 py-3.5 text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)] text-xs font-bold"
              />
            </div>
            <button 
              onClick={() => handleLog(false, false)}
              disabled={loading || !query}
              className="bg-[var(--color-on-surface)] text-[var(--color-bg-base)] px-6 py-3.5 rounded-2xl font-black text-xs shadow-xs disabled:opacity-50 flex items-center justify-center min-w-[130px] transition-transform active:scale-95 cursor-pointer"
            >
              {loading ? <Loader2 size={16} className="animate-spin text-purple-400" /> : 'Log Foods'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'scan' && (
        <div className="px-4 py-4 max-w-2xl mx-auto">
          <div className="bg-[var(--color-surface)] p-6 rounded-3xl border border-[var(--color-outline)] shadow-xs space-y-4">
            <h3 className="font-black text-lg text-[var(--color-on-surface)] font-display tracking-tight">Computer Vision Cam</h3>
            <p className="text-[11px] text-[var(--color-on-surface-variant)] font-medium leading-relaxed">Upload a plate snapshot. The AI parses the portions and calculates macros instantly.</p>
            
            {images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
                {images.map((img, i) => (
                  <div key={i} className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border border-[var(--color-outline)] shadow-3xs">
                    <img src={img} alt="food" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                      className="absolute top-1.5 right-1.5 bg-black/80 backdrop-blur-md text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-xs cursor-pointer hover:bg-black"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 bg-[var(--color-surface-variant)] border border-[var(--color-outline)] hover:bg-[var(--color-outline)] text-[var(--color-on-surface)] py-3 hover:scale-[1.01] active:scale-95 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                <Camera size={16} className="text-blue-500" />
                <span>{images.length > 0 ? 'Inject More Photos' : 'Camera Snapshot / Upload'}</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                multiple
                className="hidden"
              />
            </div>

            <input 
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Context note: 'sautéed in grass-fed butter'"
              className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-[var(--color-on-surface)] transition-all text-xs font-medium"
            />

            <button 
              onClick={() => handleLog(true, false)}
              disabled={loading || images.length === 0}
              className="w-full bg-[var(--color-on-surface)] text-[var(--color-bg-base)] py-3.5 rounded-xl font-black text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 size={16} className="animate-spin text-purple-400" /> : <Sparkles size={15} className="text-blue-400" />}
              <span>Initiate Vision Extraction</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="px-4 py-4 max-w-2xl mx-auto">
          <div className="bg-[var(--color-surface)] p-6 rounded-3xl border border-[var(--color-outline)] shadow-xs space-y-4">
            <h3 className="font-black text-lg text-[var(--color-on-surface)] font-display tracking-tight flex items-center gap-2">
              <Sparkles size={18} className="text-purple-400 animate-pulse" />
              <span>Surgical AI Analyzer</span>
            </h3>
            <p className="text-[11px] text-[var(--color-on-surface-variant)] font-medium leading-relaxed">Type what you had in conversational terms. Our pipeline computes precise, ingredient-level targets.</p>
            
            <textarea 
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleLog(false, true);
              }}
              placeholder="e.g. 'Stir-fried tofu, 150g jasmine rice and 2 tbsp peanut dressing after training...'"
              className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl p-4 outline-none focus:ring-1 focus:ring-[var(--color-on-surface)] transition-all min-h-[110px] resize-none text-xs font-medium leading-relaxed"
            />

            <button 
              onClick={() => handleLog(false, true)}
              disabled={loading || !aiPrompt}
              className="w-full bg-[var(--color-on-surface)] text-[var(--color-bg-base)] py-3.5 rounded-xl font-black text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 size={16} className="animate-spin text-purple-400" /> : <Sparkles size={15} className="text-blue-400" />}
              <span>Execute Semantic Parsing</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'quick_add' && (
        <div className="px-4 py-4 max-w-2xl mx-auto">
          <form onSubmit={handleQuickAdd} className="space-y-4 bg-[var(--color-surface)] p-6 rounded-3xl border border-[var(--color-outline)] shadow-xs">
            <h3 className="font-black text-lg text-[var(--color-on-surface)] font-display tracking-tight">Direct Manual Logging</h3>
            <p className="text-[11px] text-[var(--color-on-surface-variant)] font-medium">Instantly log known figures skipping any machine inference.</p>
            
            <input 
              type="text" 
              placeholder="E.g. Whey Shake" 
              value={manualName} 
              onChange={e => setManualName(e.target.value)}
              className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-[var(--color-on-surface)] transition-all text-xs font-bold" 
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Calories (kcal)</label>
                <input type="number" placeholder="240" value={manualCals} onChange={e => setManualCals(e.target.value)} className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-4 py-3 outline-none text-xs font-bold" required />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Protein (g)</label>
                <input type="number" placeholder="25" value={manualProtein} onChange={e => setManualProtein(e.target.value)} className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-4 py-3 outline-none text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Carbohydrates (g)</label>
                <input type="number" placeholder="5" value={manualCarbs} onChange={e => setManualCarbs(e.target.value)} className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-4 py-3 outline-none text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Lipids/Fats (g)</label>
                <input type="number" placeholder="2" value={manualFats} onChange={e => setManualFats(e.target.value)} className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-4 py-3 outline-none text-xs font-bold" />
              </div>
            </div>
            <button type="submit" className="w-full bg-[var(--color-on-surface)] text-[var(--color-bg-base)] py-3.5 rounded-xl font-black text-xs mt-4 transition-all active:scale-95 cursor-pointer">
              Log Raw Metrics
            </button>
          </form>
        </div>
      )}

      {activeTab === 'library' && (
        <div className="px-4 py-4 max-w-2xl mx-auto pb-32">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-base text-[var(--color-on-surface)] font-display tracking-tight">Logged Items Index</h3>
            <span className="text-[10px] font-mono bg-[var(--color-surface-variant)] border border-[var(--color-outline)] px-2.5 py-1 rounded-full text-[var(--color-on-surface-variant)] font-bold">
              {libraryFoods.length} Items Preserved
            </span>
          </div>
          {libraryFoods.length === 0 ? (
            <p className="text-xs text-[var(--color-on-surface-variant)] font-medium bg-[var(--color-surface)] p-6 rounded-2xl border border-[var(--color-outline)] text-center">Your historic library will build automatically as you log meals.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {libraryFoods.map((food, idx) => (
                <div key={idx} className="flex items-center justify-between bg-[var(--color-surface)] p-3 rounded-2xl border border-[var(--color-outline)] shadow-3xs hover:shadow-2xs transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-[var(--color-surface-variant)] border border-[var(--color-outline)] rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                      {food.emoji || '🍽️'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs text-[var(--color-on-surface)] truncate">{food.simpleName}</p>
                      <p className="text-[10px] font-mono text-[var(--color-on-surface-variant)] mt-0.5">{Math.round(food.calories)} kcal • {food.quantity}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleLibraryAdd(food)}
                    className="w-8 h-8 bg-[var(--color-on-surface)] text-[var(--color-bg-base)] rounded-xl flex items-center justify-center hover:scale-[1.05] active:scale-[0.95] transition-all cursor-pointer flex-shrink-0 shadow-3xs"
                    title="Log again"
                  >
                    <Plus size={14} className="stroke-[3px]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Tab({ icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex-1 min-w-max ${active ? 'bg-[var(--color-on-surface)] text-[var(--color-bg-base)] shadow-2xs scale-105' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
