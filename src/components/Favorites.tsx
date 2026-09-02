import React from 'react';
import { useStore } from '../store/StoreContext';
import { Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { generateId } from '../lib/utils';
import { toast } from './ui/Toaster';
import { openPause } from './PauseSheet';

export default function Favorites() {
  const { state, addEntry, toggleFavorite } = useStore();

  if (state.favorites.length === 0) return null;

  const handleAdd = (fav: any) => {
    const log = () => {
      addEntry({ ...fav, id: generateId(), time: format(new Date(), 'h:mm a') });
      toast(`Added ${fav.simpleName}`);
    };
    if (!state.pauseBeforeLogging) return log();
    openPause(({ outcome }) => { if (outcome === 'ate') log(); });
  };

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto">
      <h2 className="text-[11px] font-medium tracking-wide text-[var(--color-on-surface-variant)] flex items-center gap-2 mb-4">
        <span>Things you eat often</span>
      </h2>
      <div className="flex gap-4 overflow-x-auto pt-3.5 pb-4 px-2 -mx-2 scrollbar-hide">
        {state.favorites.map(fav => (
          <div key={fav.id} className="flex flex-col items-center gap-2 w-16 flex-shrink-0 relative">
            {/* Quick add container */}
            <div className="relative">
              {/* Remove button: always visible, positioned relative to the card item, enlarged touch target for iOS */}
              <button 
                onClick={() => toggleFavorite(fav)}
                className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-75 transition-all z-20 cursor-pointer border border-white dark:border-[var(--color-surface)]"
                title="Remove from favorites"
                aria-label="Remove from favorites"
              >
                <X size={11} strokeWidth={3} />
              </button>

              <button 
                onClick={() => handleAdd(fav)}
                className="w-16 h-16 rounded-2xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-variant)] flex items-center justify-center text-3xl shadow-3xs border border-[var(--color-outline)] active:scale-95 transition-all cursor-pointer"
                aria-label={`Log ${fav.simpleName}`}
              >
                {fav.emoji || '🍽️'}
              </button>
              
              {/* Decorative indicator badge showing that pressing logs the item */}
              <div className="absolute -bottom-1 -right-1 w-5.5 h-5.5 bg-[var(--color-on-surface)] text-[var(--color-bg-base)] rounded-full flex items-center justify-center shadow-md pointer-events-none border-2 border-[var(--color-surface)]">
                <Plus size={11} strokeWidth={3} />
              </div>
            </div>
            
            <span className="text-[10px] font-bold text-center leading-tight text-[var(--color-on-surface)] line-clamp-1 truncate w-16 px-0.5">
              {fav.simpleName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
