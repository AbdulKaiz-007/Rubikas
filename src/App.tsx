import React, { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { DigitStudio } from './components/DigitStudio';
import { SavedScansView } from './components/SavedScansView';
import { CloudApisView } from './components/CloudApisView';
import { ModelLabView } from './components/ModelLabView';
import { PythonSuiteModal } from './components/PythonSuiteModal';
import { downloadTrainedNotebook } from './data/trainedNotebook';

function AppShell() {
  const [activeTab, setActiveTab] = useState<string>('studio');
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {activeTab === 'studio' && (
          <DigitStudio onNavigateToSaved={() => setActiveTab('history')} />
        )}

        {activeTab === 'history' && (
          <SavedScansView onNavigateToScanner={() => setActiveTab('studio')} />
        )}

        {activeTab === 'cloud-apis' && <CloudApisView />}

        {activeTab === 'lab' && (
          <ModelLabView
            onNavigateToScanner={() => setActiveTab('studio')}
            onNavigateToAPIs={() => setActiveTab('cloud-apis')}
            onOpenCodeModal={() => setIsCodeModalOpen(true)}
          />
        )}
      </main>

      <PythonSuiteModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
      />

      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-6 mt-16 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Digit AIpro</span>
            <span aria-hidden="true">·</span>
            <span>Cloud Vision Fallback &amp; Firebase Cloud Library</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <button
              onClick={downloadTrainedNotebook}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Download .ipynb
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsCodeModalOpen(true)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Python Suite
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
