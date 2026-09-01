import React, { useState } from 'react';
import { useStore, TargetProfile, Macro } from '../store/StoreContext';
import { Save, Plus, Trash2 } from 'lucide-react';
import { toast } from './ui/Toaster';

const DAYS = [
  { label: 'S', index: 0 },
  { label: 'M', index: 1 },
  { label: 'T', index: 2 },
  { label: 'W', index: 3 },
  { label: 'T', index: 4 },
  { label: 'F', index: 5 },
  { label: 'S', index: 6 },
];

export default function Settings() {
  const { state, addProfile, updateProfile, deleteProfile, assignDayToProfile } = useStore();
  const [activeProfileId, setActiveProfileId] = useState<string>(state.profiles[0]?.id);

  const activeProfile = state.profiles.find(p => p.id === activeProfileId) || state.profiles[0];

  if (!activeProfile) return null;

  const handleMacroChange = (field: keyof Macro, value: string) => {
    const num = parseInt(value) || 0;
    updateProfile(activeProfile.id, {
      macros: { ...activeProfile.macros, [field]: num }
    });
  };

  const handleNameChange = (name: string) => {
    updateProfile(activeProfile.id, { name });
  };

  return (
    <div className="space-y-6 px-4 py-6 pb-32">
      <h2 className="text-2xl font-bold tracking-tight text-[var(--color-on-surface)]">Target Profiles</h2>
      
      {/* Profile Selector */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        {state.profiles.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveProfileId(p.id)}
            className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-colors ${activeProfileId === p.id ? 'bg-[var(--color-on-surface)] text-[var(--color-bg-base)]' : 'bg-[var(--color-surface)] border border-[var(--color-outline)] text-[var(--color-on-surface-variant)]'}`}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => {
            addProfile();
            toast('New profile added');
          }}
          className="px-4 py-2 rounded-full font-bold whitespace-nowrap bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] flex items-center gap-1"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {/* Active Profile Editor */}
      <div className="bg-[var(--color-surface)] p-6 rounded-3xl border border-[var(--color-outline)] shadow-sm space-y-6">
        <div className="flex items-center justify-between gap-4">
          <input
            type="text"
            value={activeProfile.name}
            onChange={e => handleNameChange(e.target.value)}
            className="bg-transparent text-xl font-bold text-[var(--color-on-surface)] outline-none w-full border-b border-transparent focus:border-[var(--color-outline)] transition-colors"
          />
          {state.profiles.length > 1 && (
            <button onClick={() => {
              deleteProfile(activeProfile.id);
              setActiveProfileId(state.profiles[0].id);
              toast('Profile deleted');
            }} className="text-red-500 p-2 bg-red-500/10 rounded-full flex-shrink-0">
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Day Assignment */}
        <div>
          <label className="text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-2 block">Active Days</label>
          <div className="flex justify-between gap-1">
            {DAYS.map(day => {
              const isActive = state.dayProfiles[day.index] === activeProfile.id;
              return (
                <button
                  key={day.index}
                  onClick={() => assignDayToProfile(day.index, activeProfile.id)}
                  className={`w-10 h-10 rounded-full font-bold flex items-center justify-center transition-all ${isActive ? 'bg-[var(--color-accent-carbs)] text-white shadow-md scale-110' : 'bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-outline)]'}`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Macros */}
        <div className="space-y-4 pt-4 border-t border-[var(--color-outline)]">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--color-on-surface-variant)]">Calories (kcal)</label>
            <input
              type="number"
              value={activeProfile.macros.calories}
              onChange={e => handleMacroChange('calories', e.target.value)}
              className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--color-on-surface)] transition-all font-bold text-lg"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--color-on-surface-variant)]">Protein (g)</label>
              <input
                type="number"
                value={activeProfile.macros.protein}
                onChange={e => handleMacroChange('protein', e.target.value)}
                className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--color-on-surface)] transition-all font-bold text-center"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--color-on-surface-variant)]">Carbs (g)</label>
              <input
                type="number"
                value={activeProfile.macros.carbs}
                onChange={e => handleMacroChange('carbs', e.target.value)}
                className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--color-on-surface)] transition-all font-bold text-center"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--color-on-surface-variant)]">Fats (g)</label>
              <input
                type="number"
                value={activeProfile.macros.fats}
                onChange={e => handleMacroChange('fats', e.target.value)}
                className="w-full bg-[var(--color-surface-variant)] text-[var(--color-on-surface)] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[var(--color-on-surface)] transition-all font-bold text-center"
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => toast('Targets saved automatically')}
          className="mt-8 w-full flex items-center justify-center gap-2 bg-[var(--color-on-surface)] text-[var(--color-bg-base)] py-4 rounded-xl font-bold transition-transform active:scale-95"
        >
          <Save size={20} />
          <span>Save Targets</span>
        </button>
      </div>
    </div>
  );
}
