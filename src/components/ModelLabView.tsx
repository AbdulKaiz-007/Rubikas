import React, { useState } from 'react';
import { Layers, Sliders, Cpu, Terminal, BookOpen, Download } from 'lucide-react';
import { ArchitectureView } from './ArchitectureView';
import { HyperparameterLab } from './HyperparameterLab';
import { SequentialRnnView } from './SequentialRnnView';
import { DeploymentGuide } from './DeploymentGuide';
import { downloadTrainedNotebook } from '../data/trainedNotebook';

interface ModelLabViewProps {
  onNavigateToScanner: () => void;
  onNavigateToAPIs: () => void;
  onOpenCodeModal: () => void;
}

export const ModelLabView: React.FC<ModelLabViewProps> = ({
  onNavigateToScanner,
  onNavigateToAPIs,
  onOpenCodeModal,
}) => {
  const [subTab, setSubTab] = useState<'architecture' | 'hyperparams' | 'rnn' | 'deploy'>('architecture');

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar inside Model Lab */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'architecture', label: 'Architecture', icon: Layers },
            { id: 'hyperparams', label: 'Hyperparams & TensorBoard', icon: Sliders },
            { id: 'rnn', label: 'Sequential RNN', icon: Cpu },
            { id: 'deploy', label: 'Cloud Shell & Deploy', icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  subTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 px-2 shrink-0">
          <button
            onClick={downloadTrainedNotebook}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-700/60 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.ipynb Model</span>
          </button>
          <button
            onClick={onOpenCodeModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Python Suite</span>
          </button>
        </div>
      </div>

      {subTab === 'architecture' && (
        <ArchitectureView
          onNavigateToStudio={onNavigateToScanner}
          onNavigateToAPIs={onNavigateToAPIs}
        />
      )}
      {subTab === 'hyperparams' && <HyperparameterLab />}
      {subTab === 'rnn' && <SequentialRnnView />}
      {subTab === 'deploy' && <DeploymentGuide />}
    </div>
  );
};
