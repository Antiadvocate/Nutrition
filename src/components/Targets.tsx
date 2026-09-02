import React from 'react';
import { useStore, TargetProfile, Macro } from '../store/StoreContext';
import { 
  Target, 
  Check, 
  Plus, 
  Trash2, 
  Sparkles,
  Zap
} from 'lucide-react';
import { toast } from './ui/Toaster';
import DataPanel from './DataPanel';

const DAYS = [
  { label: 'Sun', index: 0 },
  { label: 'Mon', index: 1 },
  { label: 'Tue', index: 2 },
  { label: 'Wed', index: 3 },
  { label: 'Thu', index: 4 },
  { label: 'Fri', index: 5 },
  { label: 'Sat', index: 6 },
];

export default function Targets() {
  const { 
    state, 
    addProfile, 
    updateProfile, 
    deleteProfile, 
    assignDayToProfile 
  } = useStore();

  const handleMacroChange = (profileId: string, field: keyof Macro, value: string) => {
    const num = parseInt(value) || 0;
    const profile = state.profiles.find(p => p.id === profileId);
    if (profile) {
      updateProfile(profileId, {
        macros: { ...profile.macros, [field]: num }
      });
    }
  };

  const handleNameChange = (profileId: string, name: string) => {
    updateProfile(profileId, { name });
  };

  return (
    <div className="px-4 py-6 pb-32 space-y-6 max-w-3xl mx-auto">
      {/* Header section */}
      <div className="space-y-1">
        <h1 className="text-3xl font-light text-[var(--color-on-surface)] tracking-tight flex items-center gap-2">
          <Target size={28} className="text-rose-500" />
          <span>Reference points</span>
        </h1>
        <p className="text-xs text-[var(--color-on-surface-variant)]">Numbers to measure against, not standards to meet. Set them once and let them sit in the background.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          {state.profiles.map(profile => (
            <div key={profile.id} className="bg-[var(--color-surface)] p-5 rounded-3xl border border-[var(--color-outline)] shadow-xs space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-16 h-16 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={profile.name}
                    onChange={e => handleNameChange(profile.id, e.target.value)}
                    className="bg-transparent text-lg font-medium text-[var(--color-on-surface)] outline-hidden w-full border-b border-transparent focus:border-[var(--color-outline)] transition-colors py-1"
                    placeholder="Profile Name (e.g. Training Day)"
                  />
                </div>
                {state.profiles.length > 1 && (
                  <button 
                    onClick={() => {
                      deleteProfile(profile.id);
                      toast('Profile deleted');
                    }} 
                    className="text-red-500 hover:bg-red-500/20 p-2.5 bg-red-500/10 rounded-full flex-shrink-0 transition-transform active:scale-95 cursor-pointer"
                    title="Delete style profile"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Day Assignment */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-[var(--color-on-surface-variant)] tracking-wide flex items-center gap-1">
                  <Zap size={11} className="text-amber-500" />
                  <span>Assigned Calendar Days</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(day => {
                    const isActive = state.dayProfiles[day.index] === profile.id;
                    return (
                      <button
                        key={day.index}
                        onClick={() => assignDayToProfile(day.index, isActive ? '' : profile.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-[var(--color-on-surface)] text-[var(--color-bg-base)] shadow-xs' 
                            : 'bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-outline)]'
                        }`}
                      >
                        {isActive && <Check size={11} />}
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Macros */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t border-[var(--color-outline)]">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-[var(--color-on-surface-variant)] tracking-wide">Calories</span>
                  <input
                    type="number"
                    value={profile.macros.calories}
                    onChange={e => handleMacroChange(profile.id, 'calories', e.target.value)}
                    className="bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-3 py-2 outline-hidden focus:ring-1 focus:ring-[var(--color-on-surface)] transition-all font-bold text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-[var(--color-on-surface-variant)] tracking-wide">Protein (g)</span>
                  <input
                    type="number"
                    value={profile.macros.protein}
                    onChange={e => handleMacroChange(profile.id, 'protein', e.target.value)}
                    className="bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-3 py-2 outline-hidden focus:ring-1 focus:ring-[var(--color-on-surface)] transition-all font-bold text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-[var(--color-on-surface-variant)] tracking-wide">Carbs (g)</span>
                  <input
                    type="number"
                    value={profile.macros.carbs}
                    onChange={e => handleMacroChange(profile.id, 'carbs', e.target.value)}
                    className="bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-3 py-2 outline-hidden focus:ring-1 focus:ring-[var(--color-on-surface)] transition-all font-bold text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-[var(--color-on-surface-variant)] tracking-wide">Fats (g)</span>
                  <input
                    type="number"
                    value={profile.macros.fats}
                    onChange={e => handleMacroChange(profile.id, 'fats', e.target.value)}
                    className="bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-3 py-2 outline-hidden focus:ring-1 focus:ring-[var(--color-on-surface)] transition-all font-bold text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                  <span className="text-[10px] font-bold text-[var(--color-on-surface-variant)] tracking-wide">Fiber (g)</span>
                  <input
                    type="number"
                    value={profile.macros.fiber ?? 30}
                    onChange={e => handleMacroChange(profile.id, 'fiber', e.target.value)}
                    className="bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-3 py-2 outline-hidden focus:ring-1 focus:ring-[var(--color-on-surface)] transition-all font-bold text-xs"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => {
              addProfile();
              toast('Added');
            }}
            className="w-full flex items-center justify-center gap-1.5 bg-[var(--color-surface-variant)] hover:bg-[var(--color-outline)] text-[var(--color-on-surface)] py-3 rounded-2xl font-bold text-xs transition-transform active:scale-95 border border-dashed border-[var(--color-outline)] cursor-pointer"
          >
            <Plus size={14} />
            <span>Add another set</span>
          </button>
        </div>
      </div>

      <div className="space-y-1 pt-2">
        <h2 className="text-lg font-medium text-[var(--color-on-surface)] tracking-tight">Data</h2>
        <p className="text-xs text-[var(--color-on-surface-variant)]">Hydration goal, and getting your log in and out.</p>
      </div>
      <DataPanel />
    </div>
  );
}
