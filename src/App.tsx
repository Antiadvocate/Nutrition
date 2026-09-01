import React, { useState } from 'react';
import { StoreProvider } from './store/StoreContext';
import Header from './components/Header';
import AddFood from './components/AddFood';
import Favorites from './components/Favorites';
import EntryList from './components/EntryList';
import Dashboard from './components/Dashboard';
import AICoach from './components/AICoach';
import Targets from './components/Targets';
import Insights from './components/Insights';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/Toaster';
import { LayoutGrid, Plus, Target, BrainCircuit, Sparkles } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <StoreProvider>
      <div className="flex flex-col h-screen bg-[var(--color-bg-base)] text-[var(--color-on-surface)] font-sans overflow-hidden transition-colors duration-300">
        {activeTab !== 'dashboard' && <Header />}
        
        <main className="flex-1 overflow-y-auto relative">
          <ErrorBoundary>
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'foodlog' && (
              <>
                <AddFood />
                <Favorites />
                <EntryList />
              </>
            )}
            {activeTab === 'targets' && <Targets />}
            {activeTab === 'coach' && <AICoach />}
            {activeTab === 'insights' && <Insights />}
          </ErrorBoundary>
        </main>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-outline)] pb-safe pt-2 px-4 flex justify-between items-center z-50">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === 'dashboard' ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)]'}`}
          >
            <LayoutGrid size={24} />
            <span className="text-[10px] font-bold">Dashboard</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('targets')}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === 'targets' ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)]'}`}
          >
            <Target size={24} />
            <span className="text-[10px] font-bold">Targets</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('foodlog')}
            className="flex items-center justify-center w-12 h-12 bg-[var(--color-on-surface)] text-[var(--color-bg-base)] rounded-full shadow-lg transform -translate-y-4 transition-transform active:scale-95"
            title="Log Food"
          >
            <Plus size={24} />
          </button>

          <button 
            onClick={() => setActiveTab('coach')}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === 'coach' ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)]'}`}
          >
            <BrainCircuit size={24} />
            <span className="text-[10px] font-bold">Coach</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('insights')}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === 'insights' ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)]'}`}
          >
            <Sparkles size={24} />
            <span className="text-[10px] font-bold">Insights</span>
          </button>
        </div>

        <Toaster />
      </div>
    </StoreProvider>
  );
}
