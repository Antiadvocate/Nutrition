import React, { Suspense, lazy, useRef, useState } from 'react';
import { StoreProvider } from './store/StoreContext';
import Header from './components/Header';
import AddFood from './components/AddFood';
import Favorites from './components/Favorites';
import EntryList from './components/EntryList';
import Dashboard from './components/Dashboard';

// Only the dashboard is needed at first paint. The coach pulls in the markdown
// renderer and insights is a large screen; loading them on demand keeps the
// initial download small on a phone.
const AICoach = lazy(() => import('./components/AICoach'));
const Targets = lazy(() => import('./components/Targets'));
const Insights = lazy(() => import('./components/Insights'));
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/Toaster';
import { AISettings } from './components/AISettings';
import { LayoutGrid, Plus, Target, BrainCircuit, Sparkles, Loader2 } from 'lucide-react';

function TabLoading() {
  return (
    <div className="flex items-center justify-center py-24 text-[var(--color-on-surface-variant)]">
      <Loader2 className="animate-spin" size={22} />
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const mainRef = useRef<HTMLElement>(null);

  // Land at the top of whatever you just opened, and give the error boundary a
  // fresh mount per tab so one broken screen cannot trap the whole app.
  const goToTab = (tab: string) => {
    setActiveTab(tab);
    mainRef.current?.scrollTo({ top: 0 });
  };

  return (
    <StoreProvider>
      <div className="flex flex-col h-screen bg-[var(--color-bg-base)] text-[var(--color-on-surface)] font-sans overflow-hidden transition-colors duration-300">
        {activeTab !== 'dashboard' && <Header />}
        
        <main ref={mainRef} className="flex-1 overflow-y-auto relative">
          <ErrorBoundary key={activeTab}>
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'foodlog' && (
              <>
                <AddFood />
                <Favorites />
                <EntryList />
              </>
            )}
            <Suspense fallback={<TabLoading />}>
              {activeTab === 'targets' && <Targets />}
              {activeTab === 'coach' && <AICoach />}
              {activeTab === 'insights' && <Insights />}
            </Suspense>
          </ErrorBoundary>
        </main>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-outline)] pb-safe pt-2 px-4 flex justify-between items-center z-50">
          <button 
            onClick={() => goToTab('dashboard')}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === 'dashboard' ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)]'}`}
          >
            <LayoutGrid size={24} />
            <span className="text-[10px] font-bold">Dashboard</span>
          </button>
          
          <button 
            onClick={() => goToTab('targets')}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === 'targets' ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)]'}`}
          >
            <Target size={24} />
            <span className="text-[10px] font-bold">Targets</span>
          </button>
          
          <button 
            onClick={() => goToTab('foodlog')}
            className="flex items-center justify-center w-12 h-12 bg-[var(--color-on-surface)] text-[var(--color-bg-base)] rounded-full shadow-lg transform -translate-y-4 transition-transform active:scale-95"
            title="Log Food"
          >
            <Plus size={24} />
          </button>

          <button 
            onClick={() => goToTab('coach')}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === 'coach' ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)]'}`}
          >
            <BrainCircuit size={24} />
            <span className="text-[10px] font-bold">Coach</span>
          </button>
          
          <button 
            onClick={() => goToTab('insights')}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${activeTab === 'insights' ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-on-surface-variant)]'}`}
          >
            <Sparkles size={24} />
            <span className="text-[10px] font-bold">Insights</span>
          </button>
        </div>

        <Toaster />
        <AISettings />
      </div>
    </StoreProvider>
  );
}
