import React, { useState } from 'react';
import { useStore, FoodEntry } from '../store/StoreContext';
import { Trash2, Heart, Edit2, Check, Scale, Clock, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function EntryList() {
  const { currentDayData } = useStore();

  const entries = currentDayData?.entries || [];
  if (entries.length === 0) return null;

  return (
    <div className="px-4 py-6 pb-32 max-w-2xl mx-auto">
      <h2 className="text-xs font-mono font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] flex items-center gap-2 mb-4">
        <span>Logged Dietary Items ({entries.length})</span>
      </h2>
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {entries.map((entry, idx) => (
            <EntryRow key={entry.id} entry={entry} index={idx} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

const getUpfMeta = (score?: number) => {
  switch (score) {
    case 1:
      return {
        labelText: 'UPF 1 (Natural)',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        dotColor: 'bg-emerald-500',
        badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25',
      };
    case 2:
      return {
        labelText: 'UPF 2 (Ingredient)',
        textColor: 'text-teal-600 dark:text-teal-400',
        dotColor: 'bg-teal-500',
        badgeBg: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/25',
      };
    case 3:
      return {
        labelText: 'UPF 3 (Processed)',
        textColor: 'text-amber-600 dark:text-amber-400',
        dotColor: 'bg-amber-500',
        badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25',
      };
    case 4:
      return {
        labelText: 'UPF 4 (Ultra-Processed)',
        textColor: 'text-rose-600 dark:text-rose-400',
        dotColor: 'bg-rose-500',
        badgeBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25',
      };
    default:
      return {
        labelText: 'Dietary Item',
        textColor: 'text-[var(--color-on-surface-variant)]',
        dotColor: 'bg-[var(--color-on-surface-variant)]',
        badgeBg: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border border-zinc-500/25',
      };
  }
};

const getFoodTypeTheme = (entry: FoodEntry, index: number) => {
  const label = (entry.simpleName + ' ' + (entry.description || '')).toLowerCase();
  const emoji = entry.emoji || '';

  // Proteins & Seafood: red/pink/coral
  const proteinEmojis = ['🥩', '🍗', '🍖', '🐟', '🍤', '🍳', '🥚', '🍣', '🥓', '🦪', '🦞', '🦀', '🍔', '🌭'];
  const proteinKeywords = ['salmon', 'steak', 'beef', 'chicken', 'pork', 'egg', 'fish', 'shrimp', 'protein', 'tuna', 'turkey', 'lamb', 'bacon', 'patty', 'cod', 'tilapia', 'breast', 'tofu', 'meat', 'ham', 'sausage', 'pepperoni', 'sardine', 'venison'];

  // Greens & Vegetables: forest/emerald
  const vegEmojis = ['🥦', '🥬', '🥒', '🥕', '🌶️', '🌽', '🍆', '🥗', '🫑', '🧅', '🧄', '🥔', '🍠', '🍄', '🫘', '🥑'];
  const vegKeywords = ['avocado', 'salad', 'broccoli', 'spinach', 'lettuce', 'veg', 'green', 'carrot', 'cucumber', 'tomato', 'potato', 'mushroom', 'bean', 'pepper', 'kale', 'asparagus', 'pea', 'onion', 'garlic', 'spinach', 'cabbage', 'celery', 'zucchini', 'brussel', 'greens'];

  // Fruits & Berries: gold/amber
  const fruitEmojis = ['🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🍇', '🍉', '🍌', '🍋', '🍊', '🍍', '🥭', '🥝', '🥥'];
  const fruitKeywords = ['apple', 'banana', 'berry', 'strawberry', 'blueberry', 'raspberry', 'blackberry', 'kiwi', 'cherry', 'grape', 'watermelon', 'mango', 'pineapple', 'lemon', 'orange', 'pear', 'peach', 'plum', 'fruit', 'citrus', 'grapefruit', 'melon'];

  // Carbs & Grains: gold/bronze/brown
  const carbEmojis = ['🍞', '🥖', '🥐', '🍚', '🍜', '🍝', '🥯', '🥞', '🧇', '🌮', '🌯', '🥪', '🌾', '🥣', '🌽'];
  const carbKeywords = ['rice', 'bread', 'pasta', 'noodle', 'cereal', 'flour', 'oats', 'oatmeal', 'toast', 'bagel', 'wrap', 'tortilla', 'quinoa', 'wheat', 'grain', 'sourdough', 'barley', 'rye', 'muffin', 'waffle', 'pancake'];

  // Dairy & Alternatives: cyan/sky-blue
  const dairyEmojis = ['🥛', '🧀', '🧈', '🍨', '🍦'];
  const dairyKeywords = ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'mozzarella', 'cheddar', 'parmesan', 'dairy', 'sour cream', 'whey', 'ghee'];

  // Treats, Snacks & Beverages: royal purple/lavender
  const treatsEmojis = ['🍫', '🍬', '🍭', '🍩', '🍪', '🍰', '🧁', '🥧', '🍿', '🥤', '🧋', '🍺', '🍷', '🥃', '🍸', '🍹', '☕', '🍵', '🍕', '🍟'];
  const treatsKeywords = ['coffee', 'tea', 'chocolate', 'cookie', 'cake', 'candy', 'soda', 'cola', 'juice', 'beverage', 'drink', 'beer', 'wine', 'whiskey', 'chips', 'popcorn', 'pretzel', 'donut', 'pizza', 'fries', 'chips', 'snack', 'sweet', 'sugar', 'dessert'];

  // Detect which category matches
  let category: 'protein' | 'veg' | 'fruit' | 'carb' | 'dairy' | 'treats' | 'default' = 'default';

  if (proteinEmojis.some(e => emoji.includes(e)) || proteinKeywords.some(k => label.includes(k))) {
    category = 'protein';
  } else if (vegEmojis.some(e => emoji.includes(e)) || vegKeywords.some(k => label.includes(k))) {
    category = 'veg';
  } else if (fruitEmojis.some(e => emoji.includes(e)) || fruitKeywords.some(k => label.includes(k))) {
    category = 'fruit';
  } else if (carbEmojis.some(e => emoji.includes(e)) || carbKeywords.some(k => label.includes(k))) {
    category = 'carb';
  } else if (dairyEmojis.some(e => emoji.includes(e)) || dairyKeywords.some(k => label.includes(k))) {
    category = 'dairy';
  } else if (treatsEmojis.some(e => emoji.includes(e)) || treatsKeywords.some(k => label.includes(k))) {
    category = 'treats';
  }

  // Fallback to alternating index if category is default
  if (category === 'default') {
    const fallbacks: ('protein' | 'veg' | 'fruit' | 'carb' | 'dairy' | 'treats')[] = ['veg', 'carb', 'protein', 'fruit', 'dairy', 'treats'];
    category = fallbacks[index % fallbacks.length];
  }

  switch (category) {
    case 'protein':
      return {
        labelText: 'Protein & Mains',
        textColor: 'text-rose-600 dark:text-rose-400',
        dotColor: 'bg-rose-500',
        borderLeft: 'border-l-rose-500 dark:border-l-rose-400',
        cardBg: 'bg-rose-500/5 dark:bg-gradient-to-br dark:from-[#2e0e14] dark:to-[#170508]/95',
        cardBorder: 'border-rose-500/25 dark:border-rose-500/20',
        hoverClass: 'hover:bg-rose-500/10 dark:hover:from-[#3a131b]/95 dark:hover:to-[#1a0609]/95',
      };
    case 'veg':
      return {
        labelText: 'Veggies & Greens',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        dotColor: 'bg-emerald-500',
        borderLeft: 'border-l-emerald-500 dark:border-l-emerald-400',
        cardBg: 'bg-emerald-500/5 dark:bg-gradient-to-br dark:from-[#082216] dark:to-[#041108]/95',
        cardBorder: 'border-emerald-500/25 dark:border-emerald-500/20',
        hoverClass: 'hover:bg-emerald-500/10 dark:hover:from-[#0d3020]/95 dark:hover:to-[#05170c]/95',
      };
    case 'fruit':
      return {
        labelText: 'Fruits & Sweets',
        textColor: 'text-amber-600 dark:text-amber-400',
        dotColor: 'bg-amber-500',
        borderLeft: 'border-l-amber-500 dark:border-l-amber-400',
        cardBg: 'bg-amber-500/5 dark:bg-gradient-to-br dark:from-[#352207] dark:to-[#191003]/95',
        cardBorder: 'border-amber-500/25 dark:border-amber-500/20',
        hoverClass: 'hover:bg-amber-500/10 dark:hover:from-[#432c0b]/95 dark:hover:to-[#221605]/95',
      };
    case 'carb':
      return {
        labelText: 'Carbs & Grains',
        textColor: 'text-orange-600 dark:text-orange-400',
        dotColor: 'bg-orange-500',
        borderLeft: 'border-l-orange-500 dark:border-l-orange-400',
        cardBg: 'bg-orange-500/5 dark:bg-gradient-to-br dark:from-[#3a1d0d] dark:to-[#1c0e06]/95',
        cardBorder: 'border-orange-500/25 dark:border-orange-500/20',
        hoverClass: 'hover:bg-orange-500/10 dark:hover:from-[#482512]/95 dark:hover:to-[#221108]/95',
      };
    case 'dairy':
      return {
        labelText: 'Dairy & Cream',
        textColor: 'text-sky-600 dark:text-sky-400',
        dotColor: 'bg-sky-500',
        borderLeft: 'border-l-sky-500 dark:border-l-sky-400',
        cardBg: 'bg-sky-500/5 dark:bg-gradient-to-br dark:from-[#0b2432] dark:to-[#04121b]/95',
        cardBorder: 'border-sky-500/25 dark:border-sky-500/20',
        hoverClass: 'hover:bg-sky-500/10 dark:hover:from-[#113143]/95 dark:hover:to-[#061825]/95',
      };
    case 'treats':
    default:
      return {
        labelText: 'Treats & Drinks',
        textColor: 'text-purple-600 dark:text-purple-400',
        dotColor: 'bg-purple-500',
        borderLeft: 'border-l-purple-500 dark:border-l-purple-400',
        cardBg: 'bg-purple-500/5 dark:bg-gradient-to-br dark:from-[#211532] dark:to-[#10081d]/95',
        cardBorder: 'border-purple-500/25 dark:border-purple-500/20',
        hoverClass: 'hover:bg-purple-500/10 dark:hover:from-[#2e1e44]/95 dark:hover:to-[#170c29]/95',
      };
  }
};

const EntryRow: React.FC<{ entry: FoodEntry; index: number }> = ({ entry, index }) => {
  const { deleteEntry, toggleFavorite, updateEntry, state } = useStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newWeight, setNewWeight] = useState(entry.baseQuantity.toString());
  const [newTime, setNewTime] = useState(entry.time || '');

  const isFav = state.favorites.some(f => f.simpleName === entry.simpleName);

  const handleSaveAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const weight = parseFloat(newWeight);
    const updatedFields: Partial<FoodEntry> = {
      time: newTime,
    };
    if (!isNaN(weight) && weight > 0) {
      updatedFields.baseQuantity = weight;
      updatedFields.quantity = `${weight} ${entry.unit}`;
      updatedFields.calories = entry.macrosPerUnit.calories * weight;
      updatedFields.protein = entry.macrosPerUnit.protein * weight;
      updatedFields.carbs = entry.macrosPerUnit.carbs * weight;
      updatedFields.fats = entry.macrosPerUnit.fats * weight;
      updatedFields.fiber = entry.macrosPerUnit.fiber * weight;
    }
    updateEntry(entry.id, updatedFields);
    setIsEditing(false);
  };

  const theme = getFoodTypeTheme(entry, index);
  const upf = getUpfMeta(entry.processingScore);

  // Active toggled details state
  const isExpandedActive = isExpanded || isEditing;

  // Toggle card expanded state (avoid expanding/collapsing when clicking layout if editing)
  const handleCardClick = () => {
    if (isEditing) return;
    setIsExpanded(!isExpanded);
  };

  return (
    <motion.div 
      layout
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      onClick={handleCardClick}
      className={`group relative overflow-hidden transition-all duration-300 border border-l-4 rounded-2xl select-none cursor-pointer
        ${theme.cardBg} ${theme.cardBorder} ${theme.borderLeft} ${theme.hoverClass}
        ${isExpandedActive 
          ? 'p-4 shadow-sm' 
          : 'p-3 px-4 shadow-3xs hover:shadow-2xs'
        }
      `}
    >
      {/* Top row: Emoji avatar, Title / Metadata, Calories metric, and Expand arrow */}
      <div className="flex items-center justify-between gap-3">
        
        {/* Left Side: Avatar, Title, Brand indicator */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar frame */}
          <div className="text-xl w-10 h-10 flex items-center justify-center bg-[var(--color-surface-variant)] border border-[var(--color-outline)]/40 rounded-xl flex-shrink-0 shadow-3xs group-hover:scale-105 transition-transform">
            {entry.emoji || '🍽️'}
          </div>

          {"description" in entry && entry.description && <span className="sr-only">{entry.description}</span>}

          {/* Description container */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-[var(--color-on-surface)] truncate text-sm sm:text-base tracking-tight leading-tight">
                {entry.simpleName}
              </h3>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(entry);
                }} 
                className="text-[var(--color-on-surface-variant)] hover:text-red-500 transition-all cursor-pointer p-0.5 flex-shrink-0 active:scale-90 animate-none"
                aria-label="Toggle Favorite"
              >
                <Heart size={12} fill={isFav ? 'currentColor' : 'none'} className={isFav ? 'text-red-500 scale-105 opacity-100' : 'opacity-30 group-hover:opacity-60 transition-opacity'} />
              </button>
            </div>

            {/* Collapsed state horizontal sub-text */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)] font-semibold mt-0.5">
              <span className="text-[var(--color-on-surface)] font-bold">{entry.quantity}</span>
              {entry.time && (
                <>
                  <span className="opacity-30">•</span>
                  <span className="font-mono text-[10px] font-black bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded border border-black/10 dark:border-white/10 text-[var(--color-on-surface)] leading-none">
                    {entry.time}
                  </span>
                </>
              )}
              {/* If collapsed, show extremely compact UPF pill as visual cue */}
              {!isExpandedActive && entry.processingScore && (
                <>
                  <span className="opacity-30">•</span>
                  <span className={`text-[10px] font-bold ${upf.textColor} flex items-center gap-1`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${upf.dotColor}`} />
                    <span>UPF {entry.processingScore}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Calories box + Chevron down */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className="font-mono font-black text-xs sm:text-sm bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-lg shadow-3xs leading-none">
            {Math.round(entry.calories)} kcal
          </span>
          <motion.div
            animate={{ rotate: isExpandedActive ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="text-[var(--color-on-surface-variant)] opacity-40 group-hover:opacity-80 transition-opacity p-0.5"
          >
            <ChevronDown size={14} className="stroke-[2.5px]" />
          </motion.div>
        </div>

      </div>

      {/* Expanded Section with height animation */}
      <AnimatePresence initial={false}>
        {isExpandedActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="overflow-hidden"
          >
            {/* Structured Full-width Macro Nutrition Strip */}
            <div className="mt-3.5 bg-black/5 dark:bg-black/30 border border-black/10 dark:border-white/5 px-3 py-2 rounded-xl flex justify-between items-center text-xs font-mono font-black text-[var(--color-on-surface-variant)] shadow-3xs">
              <div className="flex items-center gap-1">P: <strong className="text-[var(--color-on-surface)] font-black">{Math.round(entry.protein)}g</strong></div>
              <div className="text-[var(--color-outline)]/30">•</div>
              <div className="flex items-center gap-1">C: <strong className="text-[var(--color-on-surface)] font-black">{Math.round(entry.carbs)}g</strong></div>
              <div className="text-[var(--color-outline)]/30">•</div>
              <div className="flex items-center gap-1">F: <strong className="text-[var(--color-on-surface)] font-black">{Math.round(entry.fats)}g</strong></div>
              {entry.fiber !== undefined && entry.fiber > 0 && (
                <>
                  <div className="text-[var(--color-outline)]/30">•</div>
                  <div className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">Fib: <strong className="font-black">{Math.round(entry.fiber)}g</strong></div>
                </>
              )}
            </div>

            {/* Food Science Detail tags line */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5 pt-2 border-t border-[var(--color-outline)]/20">
              {/* Food Category Tag */}
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-on-surface-variant)]">
                <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor} flex-shrink-0`} />
                <span className="font-bold text-[var(--color-on-surface)]">{theme.labelText}</span>
              </div>

              {/* Processing Tag */}
              {entry.processingScore && (
                <>
                  <span className="text-[var(--color-outline)]/30 text-[10px] select-none">•</span>
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-on-surface-variant)]">
                    <span className={`w-1.5 h-1.5 rounded-full ${upf.dotColor} flex-shrink-0`} />
                    <span className="font-semibold">{upf.labelText}</span>
                  </div>
                </>
              )}
              
              {/* GI Index Tag */}
              {entry.giIndex && entry.giIndex !== 'Unknown' && entry.giIndex !== 'None' && (
                <>
                  <span className="text-[var(--color-outline)]/30 text-[10px] select-none">•</span>
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-on-surface-variant)]">
                    <span className={`w-1.5 h-1.5 rounded-full ${entry.giIndex === 'High' ? 'bg-rose-500' : 'bg-emerald-500'} flex-shrink-0`} />
                    <span className="font-semibold">GI: {entry.giIndex}</span>
                  </div>
                </>
              )}

              {/* Satiety Tag */}
              {entry.satiety && entry.satiety !== 'Medium' && (
                <>
                  <span className="text-[var(--color-outline)]/30 text-[10px] select-none">•</span>
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-on-surface-variant)]">
                    <span className={`w-1.5 h-1.5 rounded-full ${entry.satiety === 'Low' ? 'bg-amber-500' : 'bg-purple-500'} flex-shrink-0`} />
                    <span className="font-semibold">Satiety: {entry.satiety}</span>
                  </div>
                </>
              )}
            </div>

            {/* Operational Actions section (Editing Panel, Save/Cancel, Delete button) */}
            <div className="mt-4 pt-3.5 border-t border-[var(--color-outline)]/40 flex items-center justify-between gap-4">
              <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                {isEditing ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full max-w-sm">
                    <div className="flex items-center gap-2 flex-1">
                      {/* Weight Input Box */}
                      <div className="flex items-center gap-1.5 bg-[var(--color-surface-variant)] px-2 py-1.5 rounded-lg border border-[var(--color-outline)] flex-1">
                        <Scale size={11} className="text-[var(--color-on-surface-variant)] flex-shrink-0" />
                        <input 
                          type="number" 
                          value={newWeight}
                          onChange={e => setNewWeight(e.target.value)}
                          className="bg-transparent text-[var(--color-on-surface)] w-full text-xs outline-none font-bold"
                          placeholder="Quantity"
                          autoFocus
                        />
                        <span className="text-[10px] text-[var(--color-on-surface-variant)] font-bold flex-shrink-0 pr-0.5">{entry.unit}</span>
                      </div>

                      {/* Time Input Box */}
                      <div className="flex items-center gap-1.5 bg-[var(--color-surface-variant)] px-2 py-1.5 rounded-lg border border-[var(--color-outline)] flex-1">
                        <Clock size={11} className="text-[var(--color-on-surface-variant)] flex-shrink-0" />
                        <input 
                          type="text" 
                          value={newTime}
                          onChange={e => setNewTime(e.target.value)}
                          className="bg-transparent text-[var(--color-on-surface)] w-full text-xs outline-none font-semibold font-mono"
                          placeholder="Time"
                        />
                      </div>
                    </div>

                    {/* Confirm / Cancel Actions */}
                    <div className="flex items-center justify-end gap-1.5 flex-shrink-0 mt-1 sm:mt-0">
                      <button 
                        onClick={handleSaveAll} 
                        className="bg-[var(--color-on-surface)] text-[var(--color-bg-base)] p-1.5 px-3.5 sm:px-1.5 rounded-lg active:scale-95 transition-all cursor-pointer hover:opacity-90 flex items-center justify-center gap-1 text-xs font-bold sm:text-[inherit]"
                        title="Save changes"
                        aria-label="Save changes to logged item"
                      >
                        <Check size={12} className="stroke-[3px]" />
                        <span className="sm:hidden">Save</span>
                      </button>
                      <button 
                        onClick={() => {
                          setNewWeight(entry.baseQuantity.toString());
                          setNewTime(entry.time || '');
                          setIsEditing(false);
                        }} 
                        className="bg-[var(--color-surface-variant)] hover:bg-red-500/15 text-[var(--color-on-surface-variant)] hover:text-red-500 p-1.5 px-3 sm:px-1.5 rounded-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1 text-xs font-semibold sm:text-[inherit]"
                        title="Cancel edit"
                        aria-label="Cancel editing"
                      >
                        <X size={12} />
                        <span className="sm:hidden">Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                    className="text-[10px] font-mono font-black uppercase tracking-widest text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] bg-[var(--color-surface-variant)] hover:bg-[var(--color-surface-variant)]/80 px-2.5 py-1.5 rounded-lg border border-[var(--color-outline)]/40 hover:border-[var(--color-outline)] transition-all cursor-pointer flex items-center gap-1.5 shadow-3xs"
                    title="Adjust serving quantity or log time"
                  >
                    <Edit2 size={10} className="stroke-[2.5px]" />
                    <span>Adjust Details</span>
                  </button>
                )}
              </div>

              {/* Action Button: Delete Log */}
              {!isEditing && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteEntry(entry.id);
                  }}
                  className="w-8 h-8 rounded-lg bg-[var(--color-surface-variant)] hover:bg-rose-500/10 border border-[var(--color-outline)] hover:border-rose-500/25 text-[var(--color-on-surface-variant)] hover:text-rose-500 flex items-center justify-center transition-all flex-shrink-0 cursor-pointer"
                  title="Delete log"
                  aria-label="Delete entry"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
