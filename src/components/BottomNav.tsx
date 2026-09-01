import React from 'react';
import { Home, History, Sparkles, Settings as SettingsIcon, Plus } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
      <nav className="md-card rounded-full px-6 py-3 flex justify-between items-center bg-[var(--color-surface)]">
        <NavItem icon={<Home />} label="Home" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavItem icon={<History />} label="History" isActive={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        
        {/* Central FAB */}
        <div className="relative -top-8">
          <button 
            onClick={() => setActiveTab('home')}
            className="w-16 h-16 bg-[var(--color-accent-kcal)] rounded-full flex items-center justify-center text-white shadow-lg border-4 border-[var(--color-bg-base)] transition-transform active:scale-95"
          >
            <Plus size={32} strokeWidth={3} />
          </button>
        </div>

        <NavItem icon={<Sparkles />} label="Coach" isActive={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
        <NavItem icon={<SettingsIcon />} label="Targets" isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-[var(--color-accent-carbs)]' : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'}`}
    >
      {React.cloneElement(icon, { size: 24, strokeWidth: isActive ? 2.5 : 2, className: isActive ? 'scale-110 transition-transform' : '' })}
      <span className="text-[10px] font-bold tracking-wide">{label}</span>
    </button>
  );
}
