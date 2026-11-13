import React, { useState } from 'react';
import { 
  GitCommit, Play, RefreshCw, Cpu, Layers, Copy, Check, 
  ArrowRight, Sparkles, BookOpen, Clock
} from 'lucide-react';
import { MODULE4_RNN_SEQUENTIAL_CODE } from '../data/pythonCodeSnippets';

export const SequentialRnnView: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(14);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<'seq1' | 'seq2' | 'seq3'>('seq1');

  const sequences = {
    seq1: {
      label: 'Multi-digit Year "2 0 2 6"',
      digits: ['2', '0', '2', '6'],
      confidences: [0.98, 0.99, 0.97, 0.95],
      timesteps: 35
    },
    seq2: {
      label: 'Arithmetic Expression "3 + 7 = 10"',
      digits: ['3', '+', '7', '=', '1', '0'],
      confidences: [0.96, 0.98, 0.97, 0.99, 0.95, 0.98],
      timesteps: 45
    },
    seq3: {
      label: 'Security Token "9 4 1 8"',
      digits: ['9', '4', '1', '8'],
      confidences: [0.97, 0.96, 0.99, 0.94],
      timesteps: 35
    }
  };

  const currentSeq = sequences[selectedSequence];

  const runSequenceAnimation = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setActiveStep(0);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step <= currentSeq.timesteps) {
        setActiveStep(step);
      } else {
        clearInterval(interval);
        setIsAnimating(false);
      }
    }, 80);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(MODULE4_RNN_SEQUENTIAL_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Module IV Sequential Handwriting Architecture</span>
            <span aria-hidden="true">·</span>
            <span>Bidirectional LSTM</span>
            <span aria-hidden="true">·</span>
            <span>CRNN + CTC Loss</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Sequential Handwriting &amp; LSTM Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Module IV syllabus requirement: Processing multi-digit and sequential expressions using 
            Recurrent Neural Networks (RNN &amp; Bidirectional LSTM) in Keras across temporal horizontal scanlines.
          </p>
        </div>

        <button
          onClick={copyCode}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm shadow-indigo-600/30 whitespace-nowrap shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>Copy train_rnn_sequential.py</span>
        </button>
      </div>

      {/* Sequence Selector & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Expression Preset:</span>
          <div className="flex gap-2">
            {(['seq1', 'seq2', 'seq3'] as const).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedSequence(key);
                  setActiveStep(14);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedSequence === key
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {sequences[key].label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={runSequenceAnimation}
          disabled={isAnimating}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-white transition-all ${
            isAnimating
              ? 'bg-slate-800 opacity-75 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-600/20'
          }`}
        >
          {isAnimating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Scanning Timesteps...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Step-by-Step Scanline Scan</span>
            </>
          )}
        </button>
      </div>

      {/* Main Sequential Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Scanline Simulator & Hidden State (7 cols) */}
        <div className="lg:col-span-7 p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Temporal Scanline Slicing (Timestep t = {activeStep} / {currentSeq.timesteps})
            </h3>
            <span className="text-xs font-mono text-indigo-400">shape: (Batch, Timesteps, Features)</span>
          </div>

          {/* Sliced Sequence Canvas Representation */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="h-32 bg-[#090d16] border border-slate-800 rounded-lg relative overflow-hidden flex items-center justify-around px-8">
              {currentSeq.digits.map((digit, idx) => (
                <div
                  key={idx}
                  className="w-14 h-20 bg-slate-900/80 border border-slate-800 rounded flex flex-col items-center justify-center font-mono"
                >
                  <span className="text-3xl font-extrabold text-white">{digit}</span>
                  <span className="text-[9px] text-emerald-400 mt-1">
                    {(currentSeq.confidences[idx] * 100).toFixed(0)}%
                  </span>
                </div>
              ))}

              {/* Vertical scanning laser head */}
              <div
                style={{
                  left: `${Math.min(98, (activeStep / currentSeq.timesteps) * 100)}%`
                }}
                className="absolute top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_12px_#6366f1] transition-all duration-75"
              >
                <div className="absolute top-1 left-1.5 px-1 py-0.5 bg-indigo-900/90 border border-indigo-500/60 rounded text-[9px] font-mono text-indigo-200 whitespace-nowrap">
                  t = {activeStep}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Timestep Slider</span>
              <input
                type="range"
                min="0"
                max={currentSeq.timesteps}
                value={activeStep}
                onChange={(e) => setActiveStep(parseInt(e.target.value))}
                className="w-48 accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* LSTM Hidden State Memory Matrix */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              BiLSTM Cell State (c_t) &amp; Hidden Output (h_t) Vector
            </span>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 block">Forward LSTM Memory Vector (128 units)</span>
                <div className="grid grid-cols-16 gap-1">
                  {Array.from({ length: 32 }).map((_, i) => {
                    const activation = Math.abs(Math.sin((activeStep + i) * 0.3));
                    return (
                      <div
                        key={i}
                        style={{ opacity: Math.max(0.15, activation) }}
                        className="h-4 bg-indigo-500 rounded-xs"
                      />
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-900">
                <span className="text-[10px] font-mono text-slate-400 block">Backward LSTM Context Vector (128 units)</span>
                <div className="grid grid-cols-16 gap-1">
                  {Array.from({ length: 32 }).map((_, i) => {
                    const activation = Math.abs(Math.cos((activeStep - i) * 0.25));
                    return (
                      <div
                        key={i}
                        style={{ opacity: Math.max(0.15, activation) }}
                        className="h-4 bg-emerald-500 rounded-xs"
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Code & Architecture Specs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-indigo-400">KERAS RECURRENT MODEL</span>
              <button
                onClick={copyCode}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>

            <pre className="text-xs font-mono text-slate-300 p-4 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto leading-relaxed h-[360px]">
{`# Module IV: Bidirectional LSTM Sequence Model
model = Sequential([
    Input(shape=(28, 28)), # Timesteps x Features
    LayerNormalization(),
    
    # Bidirectional LSTM to capture stroke trajectories
    Bidirectional(
        LSTM(128, return_sequences=True, dropout=0.2)
    ),
    
    # Second recurrent layer
    LSTM(64, return_sequences=False, dropout=0.2),
    
    Dense(64, activation="relu"),
    Dropout(0.3),
    Dense(10, activation="softmax")
])`}
            </pre>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300">
            <span className="font-bold text-white block">Why BiLSTM for Sequential Handwriting?</span>
            <p className="leading-relaxed text-slate-400">
              Handwriting possesses bidirectional temporal structure: pen strokes move both left-to-right 
              and curve back upward. Bidirectional LSTM layers process both forward and reverse sequence directions, 
              giving the model full contextual awareness of adjacent digits without explicit bounding segmentation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
