import React, { useState, useEffect } from 'react';
import { useStore } from '../store/StoreContext';
import { Moon, Sun, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export default function Header() {
  const { currentDayData, state, toggleTheme, currentDate } = useStore();
  const profileId = state.dayProfiles?.[currentDate.getDay()];
  const targets = state.profiles?.find(p => p.id === profileId)?.macros || { calories: 2000, protein: 150, carbs: 200, fats: 65, fiber: 30 };
  
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const entries = currentDayData?.entries || [];
  const totals = entries.reduce((acc, entry) => ({
    calories: acc.calories + (entry.calories || 0),
    protein: acc.protein + (entry.protein || 0),
    carbs: acc.carbs + (entry.carbs || 0),
    fats: acc.fats + (entry.fats || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

  return (
    <header className="px-4 pt-10 pb-4 flex items-center justify-between glass-card border-b border-[var(--color-outline)] sticky top-0 z-50 transition-all duration-300">
      <button 
        onClick={toggleTheme} 
        className="w-10 h-10 rounded-full bg-[var(--color-surface-variant)] hover:bg-[var(--color-outline)] flex items-center justify-center text-[var(--color-on-surface)] transition-all active:scale-90 shadow-2xs cursor-pointer"
        aria-label="Toggle Theme"
      >
        {state.theme === 'dark' ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-zinc-600" />}
      </button>
      
      <div className="px-3.5 py-1.5 rounded-full bg-[var(--color-surface-variant)] font-mono text-[11px] font-bold text-[var(--color-on-surface)] tracking-tight">
        {format(now, 'h:mm a')}
      </div>

      <div className="flex items-center gap-2.5 bg-[var(--color-surface-variant)] rounded-full px-3.5 py-1.5 text-[11px] font-mono font-extrabold text-[var(--color-on-surface)] border border-[var(--color-outline)] shadow-3xs">
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-blue-500 font-bold font-sans">KCAL</span>
          <span className="font-semibold">{Math.round(totals.calories)}</span>
        </div>
        <div className="w-px h-5 bg-[var(--color-outline)]"></div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-[var(--color-accent-protein)] font-bold font-sans">P</span>
          <span className="font-semibold">{Math.round(totals.protein)}g</span>
        </div>
        <div className="w-px h-5 bg-[var(--color-outline)]"></div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-[var(--color-accent-carbs)] font-bold font-sans">C</span>
          <span className="font-semibold">{Math.round(totals.carbs)}g</span>
        </div>
        <div className="w-px h-5 bg-[var(--color-outline)]"></div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-[var(--color-accent-fats)] font-bold font-sans">F</span>
          <span className="font-semibold">{Math.round(totals.fats)}g</span>
        </div>
      </div>
    </header>
  );
}
