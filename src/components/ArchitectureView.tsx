import React, { useState } from 'react';
import { 
  ArrowRight, CheckCircle2, RefreshCw, Zap, Server, ShieldCheck, 
  BarChart3, Globe2, MessageSquare, Play, Sparkles, Layers, Cpu
} from 'lucide-react';

interface ArchitectureViewProps {
  onNavigateToStudio: () => void;
  onNavigateToAPIs: () => void;
}

export const ArchitectureView: React.FC<ArchitectureViewProps> = ({ 
  onNavigateToStudio, 
  onNavigateToAPIs 
}) => {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<'high_conf' | 'low_conf'>('high_conf');

  const runSimulation = () => {
    if (simulating) return;
    setSimulating(true);
    setActiveStep(1);

    const steps = [1, 2, 3, selectedRoute === 'high_conf' ? 4 : 5, 6, 7];
    let idx = 0;

    const interval = setInterval(() => {
      idx++;
      if (idx < steps.length) {
        setActiveStep(steps[idx]);
      } else {
        clearInterval(interval);
        setSimulating(false);
      }
    }, 1100);
  };

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Module I–IV Unified Architecture</span>
            <span aria-hidden="true">·</span>
            <span>Google Cloud Platform</span>
            <span aria-hidden="true">·</span>
            <span>TensorFlow 2.x &amp; Firebase</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            End-to-End Pipeline &amp; Routing Topology
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Architectural schematic illustrating ingestion from Firebase Web/Mobile frontend, 
            28×28 Center-of-Mass normalization, dual-pipeline inference routing with Cloud Vision API fallback, 
            and real-time diagnostics via TensorBoard.
          </p>
        </div>

        {/* Simulation Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setSelectedRoute('high_conf')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedRoute === 'high_conf'
                  ? 'bg-indigo-600 text-white font-medium shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              High Confidence (CNN)
            </button>
            <button
              onClick={() => setSelectedRoute('low_conf')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedRoute === 'low_conf'
                  ? 'bg-amber-600 text-white font-medium shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Low Confidence (Vision API)
            </button>
          </div>

          <button
            onClick={runSimulation}
            disabled={simulating}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-white transition-all ${
              simulating
                ? 'bg-slate-800 cursor-not-allowed opacity-75'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-600/20'
            }`}
          >
            {simulating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Tracing Packet...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Simulate Request Flow</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Interactive Diagram Canvas */}
      <div className="p-6 md:p-8 bg-slate-900/60 border border-slate-800 rounded-2xl relative overflow-hidden">
        {/* Subtle grid background */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#6366f1 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        <div className="relative z-10 space-y-8">
          {/* Top Row: Client & Preprocessing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1: Client Ingestion */}
            <div 
              onClick={() => setActiveStep(1)}
              className={`p-5 rounded-xl border transition-all cursor-pointer ${
                activeStep === 1
                  ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-indigo-400">STAGE 01</span>
                <span className="text-xs text-slate-500">Module I</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-400" />
                Firebase Web Client
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                HTML5 Canvas captures strokes at 280×280. Firebase Auth provides anonymous user JWT; 
                image is staged for REST/WebSocket transit to backend API.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Payload: base64/PNG</span>
                <span className="text-indigo-300">Auth: JWT Token</span>
              </div>
            </div>

            {/* Step 2: Preprocessing */}
            <div 
              onClick={() => setActiveStep(2)}
              className={`p-5 rounded-xl border transition-all cursor-pointer ${
                activeStep === 2
                  ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-indigo-400">STAGE 02</span>
                <span className="text-xs text-slate-500">Modules II &amp; IV</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                28×28 Tensor Normalizer
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                B-Box extraction, 20×20 aspect-preserving scale, Center-of-Mass centroid alignment, 
                and pixel normalization: values in range [0.0, 1.0].
              </p>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Shape: (1, 28, 28, 1)</span>
                <span className="text-emerald-400">dtype: float32</span>
              </div>
            </div>

            {/* Step 3: Dual-Pipeline Confidence Gate */}
            <div 
              onClick={() => setActiveStep(3)}
              className={`p-5 rounded-xl border transition-all cursor-pointer ${
                activeStep === 3
                  ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-indigo-400">STAGE 03</span>
                <span className="text-xs text-slate-500">Routing Gate</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Confidence Router
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Checks initial model prediction confidence. If confidence &ge; 0.85, accepts CNN result. 
                If confidence &lt; 0.85 (ambiguous or damaged stroke), triggers Cloud Vision OCR.
              </p>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Threshold: 0.85</span>
                <span className={selectedRoute === 'high_conf' ? 'text-indigo-400' : 'text-amber-400'}>
                  Route: {selectedRoute === 'high_conf' ? 'Custom CNN' : 'Vision OCR Fallback'}
                </span>
              </div>
            </div>
          </div>

          {/* Middle Row: The Dual Execution Engines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Step 4: Custom TensorFlow CNN / RNN */}
            <div 
              onClick={() => setActiveStep(4)}
              className={`p-6 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                activeStep === 4
                  ? 'bg-indigo-950/90 border-indigo-400 ring-2 ring-indigo-400/30 shadow-xl'
                  : selectedRoute === 'high_conf'
                    ? 'bg-slate-950/90 border-indigo-900/60 hover:border-indigo-700'
                    : 'bg-slate-950/40 border-slate-900 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-emerald-400 font-semibold">PRIMARY PATH (Confidence &ge; 0.85)</span>
                <span className="text-xs text-slate-500">Modules II, III, IV</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                Custom TensorFlow CNN &amp; RNN Engine
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Executes locally trained deep network on Google Cloud Run:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-4">
                <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded">
                  <span className="text-slate-400 block text-[11px]">Feature Extraction</span>
                  <span className="text-slate-200">Conv2D (32, 64, 128) + ReLU</span>
                </div>
                <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded">
                  <span className="text-slate-400 block text-[11px]">Spatial Invariance</span>
                  <span className="text-slate-200">MaxPooling2D (2×2)</span>
                </div>
                <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded">
                  <span className="text-slate-400 block text-[11px]">Regularization (Mod III)</span>
                  <span className="text-indigo-300">L2 Reg + Dropout(0.3)</span>
                </div>
                <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded">
                  <span className="text-slate-400 block text-[11px]">Sequential Expressions</span>
                  <span className="text-emerald-300">BiLSTM Scanlines</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <span>Latency: ~12ms (Cloud Run)</span>
                <span className="text-indigo-400 font-medium">Softmax Logits (0–9)</span>
              </div>
            </div>

            {/* Step 5: Google Cloud Vision API OCR Fallback */}
            <div 
              onClick={() => setActiveStep(5)}
              className={`p-6 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                activeStep === 5
                  ? 'bg-amber-950/90 border-amber-400 ring-2 ring-amber-400/30 shadow-xl'
                  : selectedRoute === 'low_conf'
                    ? 'bg-slate-950/90 border-amber-900/60 hover:border-amber-700'
                    : 'bg-slate-950/40 border-slate-900 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-amber-400 font-semibold">FALLBACK PATH (Confidence &lt; 0.85)</span>
                <span className="text-xs text-slate-500">Module I</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                Google Cloud Vision API Fallback
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Fires <code className="text-amber-300 font-mono">document_text_detection</code> to inspect ambiguous glyphs, complex equations, or degraded strokes:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-4">
                <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded">
                  <span className="text-slate-400 block text-[11px]">OCR Engine</span>
                  <span className="text-slate-200">Vision API v1 Document</span>
                </div>
                <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded">
                  <span className="text-slate-400 block text-[11px]">Symbol Granularity</span>
                  <span className="text-slate-200">Character Bounding Vertices</span>
                </div>
                <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded">
                  <span className="text-slate-400 block text-[11px]">Robustness</span>
                  <span className="text-amber-300">Multi-stroke / Noise resilient</span>
                </div>
                <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded">
                  <span className="text-slate-400 block text-[11px]">Handwriting Support</span>
                  <span className="text-emerald-300">Full Latin &amp; Digits</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <span>Latency: ~140ms (GCP API)</span>
                <span className="text-amber-400 font-medium">Text Annotation Tokens</span>
              </div>
            </div>
          </div>

          {/* Bottom Row: Post-Processing, Localization & Diagnostics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Step 6: Google ML Services (Translation & NLP Sentiment) */}
            <div 
              onClick={() => setActiveStep(6)}
              className={`p-5 rounded-xl border transition-all cursor-pointer ${
                activeStep === 6
                  ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-indigo-400">STAGE 04</span>
                <span className="text-xs text-slate-500">Module I Localization &amp; NLP</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-sky-400" />
                Cloud Translation &amp; Natural Language API
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Translates output diagnostic notes and student feedback to target languages (Spanish, French, Japanese) 
                and evaluates sentiment polarity &amp; emotional magnitude.
              </p>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="text-sky-300">Translate: target_lang=es</span>
                <span aria-hidden="true">·</span>
                <span className="text-purple-300">Sentiment: [-1.0, +1.0]</span>
              </div>
            </div>

            {/* Step 7: Observability & TensorBoard */}
            <div 
              onClick={() => setActiveStep(7)}
              className={`p-5 rounded-xl border transition-all cursor-pointer ${
                activeStep === 7
                  ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-indigo-400">STAGE 05</span>
                <span className="text-xs text-slate-500">Modules II &amp; III Observability</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                TensorBoard Telemetry &amp; Firestore Audit
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Model weights, learning curves, histograms, and early-stopping metrics stream to timed 
                directory <code className="text-slate-300 font-mono">logs/fit/YYYYMMDD-HHMMSS</code>. 
                Prediction records append to Firestore under security rules.
              </p>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="text-emerald-300">TensorBoard: port 6006</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300">Firestore: digit_predictions</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Syllabus Alignment & Component Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs font-mono text-indigo-400 mb-1">MODULE I</div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Cloud APIs &amp; Firebase</h4>
          <ul className="text-xs text-slate-400 space-y-1.5">
            <li>• Vision API OCR Text Detection</li>
            <li>• Speech-to-Text Audio Input</li>
            <li>• Cloud Translation v2 API</li>
            <li>• Natural Language Sentiment</li>
            <li>• Firebase Auth &amp; Firestore</li>
          </ul>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs font-mono text-indigo-400 mb-1">MODULE II</div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Neural Nets &amp; TensorBoard</h4>
          <ul className="text-xs text-slate-400 space-y-1.5">
            <li>• Backpropagation &amp; Chain Rule</li>
            <li>• Vertex AI &amp; Cloud Datalab</li>
            <li>• Keras Sequential Modeling</li>
            <li>• Timed TensorBoard LogDir</li>
            <li>• EarlyStopping Callbacks</li>
          </ul>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs font-mono text-indigo-400 mb-1">MODULE III</div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Hyperparams &amp; Regularization</h4>
          <ul className="text-xs text-slate-400 space-y-1.5">
            <li>• L1 &amp; L2 Weight Decay</li>
            <li>• Dropout(0.3) Regularization</li>
            <li>• Adam Learning Rate Tuning</li>
            <li>• Overfitting vs Underfitting</li>
            <li>• Batch Size Optimization</li>
          </ul>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-xs font-mono text-indigo-400 mb-1">MODULE IV</div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">CNN, RNN &amp; Cloud Shell</h4>
          <ul className="text-xs text-slate-400 space-y-1.5">
            <li>• Conv2D (3×3) + ReLU</li>
            <li>• MaxPooling2D (2×2)</li>
            <li>• Dense Softmax Classifier</li>
            <li>• LSTM Scanline Sequences</li>
            <li>• Cloud Shell Execution</li>
          </ul>
        </div>
      </div>

      {/* Quick Access Action Bar */}
      <div className="p-4 bg-indigo-950/30 border border-indigo-900/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
          <p className="text-xs text-indigo-200">
            Ready to test live digit classification or explore the layer activations?
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToStudio}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap"
          >
            Launch Digit Studio
          </button>
          <button
            onClick={onNavigateToAPIs}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
          >
            Explore Cloud APIs
          </button>
        </div>
      </div>
    </div>
  );
};
