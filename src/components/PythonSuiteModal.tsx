import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode } from 'lucide-react';
import {
  MODULE1_PYTHON_CODE,
  FIREBASE_WEB_CONFIG,
  FIRESTORE_RULES,
  MODULE2_3_4_TRAIN_CNN_CODE,
  MODULE4_RNN_SEQUENTIAL_CODE,
  FASTAPI_SERVER_CODE
} from '../data/pythonCodeSnippets';
import { TRAINED_NOTEBOOK_JSON, downloadTrainedNotebook } from '../data/trainedNotebook';

interface PythonSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonSuiteModal: React.FC<PythonSuiteModalProps> = ({ isOpen, onClose }) => {
  const [activeFile, setActiveFile] = useState<string>('ipynb_model');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const files = [
    {
      id: 'ipynb_model',
      name: 'Digit_AIpro_Trained_Model.ipynb',
      module: 'Full Trained Notebook',
      lang: 'ipynb',
      content: TRAINED_NOTEBOOK_JSON,
      description:
        'Download .ipynb then open in Google Colab via File -> Upload notebook (guaranteed valid nbformat 4 JSON).'
    },
    {
      id: 'train_cnn',
      name: 'train_cnn_module2_3_4.py',
      module: 'Modules II, III, IV',
      lang: 'python',
      content: MODULE2_3_4_TRAIN_CNN_CODE,
      description:
        'MNIST preprocessing, Conv2D + ReLU + MaxPool, L2 regularization, Dropout 0.3, Adam optimizer, TensorBoard timed logdir & EarlyStopping callbacks.'
    },
    {
      id: 'cloud_apis',
      name: 'module1_cloud_apis.py',
      module: 'Module I',
      lang: 'python',
      content: MODULE1_PYTHON_CODE,
      description:
        'Vision API OCR handwritten detection, Cloud Translation API localization, and Natural Language API sentiment feedback analysis.'
    },
    {
      id: 'train_rnn',
      name: 'train_rnn_sequential.py',
      module: 'Module IV',
      lang: 'python',
      content: MODULE4_RNN_SEQUENTIAL_CODE,
      description:
        'Sequential handwriting model using Bidirectional LSTM and CTC Loss for multi-digit and sequential expressions.'
    },
    {
      id: 'server_fastapi',
      name: 'server_fastapi.py',
      module: 'Cloud Deployment',
      lang: 'python',
      content: FASTAPI_SERVER_CODE,
      description:
        'Production FastAPI inference service with dual-pipeline fallback routing, Cloud Translation, and NLP sentiment evaluation.'
    },
    {
      id: 'firebase_web',
      name: 'firebase_config.js',
      module: 'Module I Integration',
      lang: 'javascript',
      content: `${FIREBASE_WEB_CONFIG}\n\n// --- FIRESTORE SECURITY RULES ---\n${FIRESTORE_RULES}`,
      description: 'Firebase Web SDK 10+ initialization, client authentication, and Firestore security rules.'
    }
  ];

  const currentFile = files.find((f) => f.id === activeFile) || files[0];

  const copyContent = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    if (currentFile.id === 'ipynb_model') {
      downloadTrainedNotebook();
      return;
    }

    const blob = new Blob([currentFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-5xl h-[85vh] bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex flex-wrap items-center gap-2">
                <span>Digit AIpro Trained Notebook &amp; Python Suite</span>
                <span className="text-xs font-mono text-indigo-400 font-normal">Python 3.10+ · TF 2.x · .ipynb</span>
              </h2>
              <p className="text-xs text-slate-400">
                Click Download .ipynb, then open in Google Colab using File → Upload notebook.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={downloadTrainedNotebook}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-700/60 rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .ipynb</span>
            </button>
            <button
              onClick={downloadFile}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Selected</span>
            </button>
            <button
              onClick={copyContent}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Sidebar + Editor */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="w-full md:w-72 border-r border-slate-800 bg-slate-950/80 p-3 space-y-1 overflow-y-auto shrink-0">
            <span className="text-[10px] font-mono text-slate-500 uppercase px-3 py-1.5 block">
              Deliverable Notebook &amp; Scripts
            </span>
            {files.map((file) => {
              const isSelected = activeFile === file.id;
              return (
                <button
                  key={file.id}
                  onClick={() => setActiveFile(file.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-indigo-950/80 border border-indigo-600/60 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                    <span className={isSelected ? 'text-indigo-400' : 'text-slate-500'}>{file.module}</span>
                    <span className="text-slate-500 uppercase">{file.lang}</span>
                  </div>
                  <span className="text-xs font-mono font-medium block truncate text-slate-200">
                    {file.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 flex flex-col bg-[#070b12] overflow-hidden">
            <div className="px-5 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between gap-4 text-xs">
              <span className="font-mono text-slate-300 font-semibold shrink-0">{currentFile.name}</span>
              <span className="text-slate-400 text-[11px] truncate">{currentFile.description}</span>
            </div>

            <div className="flex-1 overflow-auto p-5">
              <pre className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre font-normal selection:bg-indigo-600/40">
                {currentFile.content}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
