import React, { useState, useMemo } from 'react';
import { 
  Sliders, Activity, AlertTriangle, CheckCircle2, TrendingDown, 
  BarChart3, RefreshCw, Cpu, Layers, GitBranch, Terminal, Copy, Check
} from 'lucide-react';

export const HyperparameterLab: React.FC = () => {
  // Hyperparameter state
  const [learningRate, setLearningRate] = useState<number>(0.001);
  const [l2Reg, setL2Reg] = useState<number>(0.001);
  const [dropout, setDropout] = useState<number>(0.3);
  const [batchSize, setBatchSize] = useState<number>(64);
  const [epochs, setEpochs] = useState<number>(15);
  const [optimizer, setOptimizer] = useState<'adam' | 'rmsprop' | 'sgd'>('adam');

  // TensorBoard tab state
  const [tbTab, setTbTab] = useState<'scalars' | 'graph' | 'histograms'>('scalars');
  const [copiedTb, setCopiedTb] = useState(false);

  // Compute realistic simulated training telemetry based on actual hyperparameter physics
  const simulationData = useMemo(() => {
    const trainLossArr: number[] = [];
    const valLossArr: number[] = [];
    const trainAccArr: number[] = [];
    const valAccArr: number[] = [];

    // Base physics:
    // If learningRate is too high (> 0.01) -> divergence/instability
    // If learningRate is too low (< 0.0003) -> underfitting / slow convergence
    // If dropout is 0 and L2 is 0 -> severe overfitting (train loss drops to near 0, val loss diverges upward after epoch 5)
    // If dropout > 0.5 and L2 > 0.02 -> severe underfitting (model cannot learn)
    // Optimal: LR ~ 0.001, Dropout ~ 0.25-0.35, L2 ~ 0.001

    const isOverfitting = dropout < 0.1 && l2Reg < 0.0005;
    const isUnderfitting = (dropout > 0.5 && l2Reg > 0.015) || learningRate < 0.0003;
    const isUnstable = learningRate > 0.01;

    let baseTrainLoss = 1.8;
    let baseValLoss = 1.85;
    let baseTrainAcc = 0.25;
    let baseValAcc = 0.23;

    for (let ep = 1; ep <= epochs; ep++) {
      const decay = Math.exp(-ep * (optimizer === 'adam' ? 0.35 : optimizer === 'rmsprop' ? 0.28 : 0.20) * (learningRate / 0.001));
      
      let tLoss: number;
      let vLoss: number;
      let tAcc: number;
      let vAcc: number;

      if (isUnstable) {
        // High learning rate causes oscillations
        tLoss = 0.8 + Math.sin(ep * 2) * 0.4;
        vLoss = 1.1 + Math.cos(ep * 1.5) * 0.5;
        tAcc = Math.min(0.75, Math.max(0.3, 0.5 + Math.sin(ep) * 0.2));
        vAcc = Math.min(0.70, Math.max(0.25, 0.45 + Math.cos(ep) * 0.2));
      } else if (isOverfitting) {
        // Train loss plummets, val loss bottoms at epoch 5 and then increases
        tLoss = 0.02 + 1.6 * Math.exp(-ep * 0.45);
        tAcc = Math.min(0.999, 0.5 + 0.5 * (1 - Math.exp(-ep * 0.5)));
        if (ep <= 5) {
          vLoss = 0.25 + 1.5 * Math.exp(-ep * 0.35);
          vAcc = 0.45 + 0.5 * (1 - Math.exp(-ep * 0.35));
        } else {
          vLoss = 0.15 + (ep - 5) * 0.07; // Divergence!
          vAcc = Math.max(0.85, 0.94 - (ep - 5) * 0.012);
        }
      } else if (isUnderfitting) {
        // High regularization penalty or small LR chokes model capacity
        tLoss = 0.65 + 1.0 * Math.exp(-ep * 0.12);
        vLoss = 0.68 + 1.05 * Math.exp(-ep * 0.11);
        tAcc = Math.min(0.84, 0.3 + 0.5 * (1 - Math.exp(-ep * 0.15)));
        vAcc = Math.min(0.82, 0.28 + 0.5 * (1 - Math.exp(-ep * 0.14)));
      } else {
        // Optimal convergence: both curves decrease gracefully and stay tightly coupled
        tLoss = 0.06 + 1.6 * Math.exp(-ep * 0.38) + l2Reg * 10;
        vLoss = 0.08 + 1.65 * Math.exp(-ep * 0.36) + l2Reg * 10 + dropout * 0.05;
        tAcc = Math.min(0.992, 0.4 + 0.59 * (1 - Math.exp(-ep * 0.4)));
        vAcc = Math.min(0.988, 0.38 + 0.60 * (1 - Math.exp(-ep * 0.38)));
      }

      trainLossArr.push(Math.round(tLoss * 1000) / 1000);
      valLossArr.push(Math.round(vLoss * 1000) / 1000);
      trainAccArr.push(Math.round(tAcc * 1000) / 1000);
      valAccArr.push(Math.round(vAcc * 1000) / 1000);
    }

    const finalValLoss = valLossArr[valLossArr.length - 1];
    const finalTrainLoss = trainLossArr[trainLossArr.length - 1];
    const finalValAcc = valAccArr[valAccArr.length - 1];
    const finalTrainAcc = trainAccArr[trainAccArr.length - 1];

    let diagnosis: 'OPTIMAL' | 'OVERFITTING' | 'UNDERFITTING' | 'UNSTABLE' = 'OPTIMAL';
    let diagnosisMessage = '';

    if (isUnstable) {
      diagnosis = 'UNSTABLE';
      diagnosisMessage = `Learning rate (${learningRate}) is too high, causing gradient oscillation and unstable loss. Lower lr to ~0.001.`;
    } else if (isOverfitting) {
      diagnosis = 'OVERFITTING';
      diagnosisMessage = `Training loss (${finalTrainLoss}) is near zero while validation loss diverges (${finalValLoss}). Increase Dropout to 0.3 and add L2 Regularization (0.001) to penalize excessive weight magnitudes.`;
    } else if (isUnderfitting) {
      diagnosis = 'UNDERFITTING';
      diagnosisMessage = `Validation accuracy is plateaued at ${(finalValAcc * 100).toFixed(1)}%. Model capacity is overly constrained by excessive regularization or insufficient learning rate. Reduce L2 weight decay and Dropout.`;
    } else {
      diagnosis = 'OPTIMAL';
      diagnosisMessage = `Balanced generalization! Training loss (${finalTrainLoss}) and validation loss (${finalValLoss}) converge harmoniously with ${(finalValAcc * 100).toFixed(1)}% test accuracy.`;
    }

    return {
      trainLoss: trainLossArr,
      valLoss: valLossArr,
      trainAcc: trainAccArr,
      valAcc: valAccArr,
      finalTrainLoss,
      finalValLoss,
      finalTrainAcc,
      finalValAcc,
      diagnosis,
      diagnosisMessage
    };
  }, [learningRate, l2Reg, dropout, batchSize, epochs, optimizer]);

  // Confusion matrix calculation for 10 classes
  const confusionMatrix = useMemo(() => {
    const acc = simulationData.finalValAcc;
    const matrix: number[][] = [];
    for (let r = 0; r < 10; r++) {
      const row: number[] = [];
      const totalSamples = 100;
      const correct = Math.round(totalSamples * (acc - 0.02 + (r % 3) * 0.01));
      const remaining = totalSamples - correct;

      for (let c = 0; c < 10; c++) {
        if (r === c) {
          row.push(correct);
        } else {
          // Off-diagonal confusions (e.g. 4 and 9, 3 and 8, 7 and 1)
          if ((r === 4 && c === 9) || (r === 9 && c === 4) || (r === 3 && c === 8) || (r === 7 && c === 1)) {
            row.push(Math.round(remaining * 0.4));
          } else {
            row.push(Math.round(remaining * 0.08));
          }
        }
      }
      matrix.push(row);
    }
    return matrix;
  }, [simulationData.finalValAcc]);

  const copyTensorboardCommand = () => {
    navigator.clipboard.writeText("tensorboard --logdir=logs/fit --port=6006 --bind_all");
    setCopiedTb(true);
    setTimeout(() => setCopiedTb(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Modules II &amp; III Optimization Lab</span>
            <span aria-hidden="true">·</span>
            <span>Vertex AI Hyperparameter Tuning</span>
            <span aria-hidden="true">·</span>
            <span>TensorBoard Callback</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Hyperparameter Tuning &amp; Diagnostics
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Tune L1/L2 weight regularization, Dropout rates, learning rate, and optimizers. 
            Inspect real-time loss divergence to diagnose and resolve Overfitting and Underfitting, 
            backed by TensorBoard metrics logging.
          </p>
        </div>

        {/* Copy command */}
        <button
          onClick={copyTensorboardCommand}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-all border border-slate-700 whitespace-nowrap shrink-0"
        >
          {copiedTb ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Terminal className="w-3.5 h-3.5 text-amber-400" />}
          <span>tensorboard --logdir=logs/fit</span>
        </button>
      </div>

      {/* Hyperparameter Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-900/60 border border-slate-800 rounded-2xl">
        {/* Dropout Slider (Module III) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Dropout Rate</span>
            <span className="font-mono text-indigo-400 font-bold">{dropout.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="0.7"
            step="0.05"
            value={dropout}
            onChange={(e) => setDropout(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 block">
            Module III: Deactivates neurons to eliminate co-adaptation.
          </span>
        </div>

        {/* L2 Weight Regularizer (Module III) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">L2 Regularization (&lambda;)</span>
            <span className="font-mono text-indigo-400 font-bold">{l2Reg.toFixed(4)}</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="0.03"
            step="0.0005"
            value={l2Reg}
            onChange={(e) => setL2Reg(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 block">
            Module III: <code className="font-mono">regularizers.l2(factor)</code> penalizes large weights.
          </span>
        </div>

        {/* Learning Rate (Module III) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Learning Rate (&eta;)</span>
            <span className="font-mono text-indigo-400 font-bold">{learningRate.toFixed(4)}</span>
          </div>
          <input
            type="range"
            min="0.0001"
            max="0.02"
            step="0.0005"
            value={learningRate}
            onChange={(e) => setLearningRate(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
          <span className="text-[10px] text-slate-500 block">
            Step size along negative gradient during backpropagation.
          </span>
        </div>

        {/* Optimizer & Batch Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Optimizer &amp; Batch</span>
            <span className="font-mono text-indigo-400 font-bold uppercase">{optimizer} / B{batchSize}</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(['adam', 'rmsprop', 'sgd'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setOptimizer(opt)}
                className={`py-1 text-[11px] font-mono rounded uppercase transition-colors ${
                  optimizer === opt
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
            <span>Batch Size:</span>
            <div className="flex gap-1.5">
              {[32, 64, 128].map((b) => (
                <button
                  key={b}
                  onClick={() => setBatchSize(b)}
                  className={`px-1.5 py-0.5 rounded font-mono ${batchSize === b ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Diagnostic Alert Card */}
      <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
        simulationData.diagnosis === 'OPTIMAL'
          ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
          : simulationData.diagnosis === 'OVERFITTING'
            ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
            : simulationData.diagnosis === 'UNDERFITTING'
              ? 'bg-sky-950/40 border-sky-800/60 text-sky-200'
              : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
      }`}>
        {simulationData.diagnosis === 'OPTIMAL' ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        )}
        <div className="text-xs space-y-1">
          <div className="font-bold flex items-center gap-2">
            <span>DIAGNOSTIC STATUS: {simulationData.diagnosis}</span>
            <span className="font-mono text-[11px] opacity-80">
              (Train Acc: {(simulationData.finalTrainAcc * 100).toFixed(1)}% · Val Acc: {(simulationData.finalValAcc * 100).toFixed(1)}%)
            </span>
          </div>
          <p className="leading-relaxed opacity-90">{simulationData.diagnosisMessage}</p>
        </div>
      </div>

      {/* Main Charts & Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Dynamic SVG Curves for Loss & Accuracy (7 cols) */}
        <div className="lg:col-span-7 p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-6">
          {/* Chart 1: Categorical Cross-Entropy Loss */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-indigo-400" />
                Cross-Entropy Loss (Train vs. Validation)
              </span>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-indigo-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-indigo-400 inline-block" />
                  Train: {simulationData.finalTrainLoss}
                </span>
                <span className="text-amber-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-amber-400 inline-block" />
                  Val: {simulationData.finalValLoss}
                </span>
              </div>
            </div>

            {/* SVG Loss Graph */}
            <div className="h-44 bg-slate-950 border border-slate-800/80 rounded-xl p-3 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
                {/* Horizontal reference grid lines */}
                <line x1="0" y1="30" x2="400" y2="30" stroke="#1e293b" strokeDasharray="4 4" />
                <line x1="0" y1="60" x2="400" y2="60" stroke="#1e293b" strokeDasharray="4 4" />
                <line x1="0" y1="90" x2="400" y2="90" stroke="#1e293b" strokeDasharray="4 4" />

                {/* Train Loss Line (Indigo) */}
                <polyline
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="2.5"
                  points={simulationData.trainLoss
                    .map((val, idx) => {
                      const x = (idx / (epochs - 1)) * 400;
                      const y = Math.min(115, Math.max(5, (val / 2.0) * 110));
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />

                {/* Val Loss Line (Amber) */}
                <polyline
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2.5"
                  strokeDasharray={simulationData.diagnosis === 'OVERFITTING' ? '4 2' : undefined}
                  points={simulationData.valLoss
                    .map((val, idx) => {
                      const x = (idx / (epochs - 1)) * 400;
                      const y = Math.min(115, Math.max(5, (val / 2.0) * 110));
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              </svg>

              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>Epoch 1</span>
                <span>Epoch {Math.round(epochs / 2)}</span>
                <span>Epoch {epochs}</span>
              </div>
            </div>
          </div>

          {/* Chart 2: Accuracy Curves */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Classification Accuracy Curves
              </span>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" />
                  Train: {(simulationData.finalTrainAcc * 100).toFixed(1)}%
                </span>
                <span className="text-sky-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-sky-400 inline-block" />
                  Val: {(simulationData.finalValAcc * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* SVG Accuracy Graph */}
            <div className="h-44 bg-slate-950 border border-slate-800/80 rounded-xl p-3 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
                <line x1="0" y1="30" x2="400" y2="30" stroke="#1e293b" strokeDasharray="4 4" />
                <line x1="0" y1="60" x2="400" y2="60" stroke="#1e293b" strokeDasharray="4 4" />
                <line x1="0" y1="90" x2="400" y2="90" stroke="#1e293b" strokeDasharray="4 4" />

                {/* Train Acc Line (Emerald) */}
                <polyline
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.5"
                  points={simulationData.trainAcc
                    .map((val, idx) => {
                      const x = (idx / (epochs - 1)) * 400;
                      const y = Math.min(115, Math.max(5, 120 - val * 115));
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />

                {/* Val Acc Line (Sky) */}
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  points={simulationData.valAcc
                    .map((val, idx) => {
                      const x = (idx / (epochs - 1)) * 400;
                      const y = Math.min(115, Math.max(5, 120 - val * 115));
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              </svg>

              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>0% Acc</span>
                <span>50% Acc</span>
                <span>100% Acc</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: TensorBoard Emulator & Confusion Matrix (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* TensorBoard Emulator Card */}
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">TensorBoard Emulator</span>
              </div>
              <span className="text-[10px] font-mono text-orange-400 bg-orange-950/60 border border-orange-800/40 px-2 py-0.5 rounded">
                Module II Telemetry
              </span>
            </div>

            {/* TB Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono">
              {(['scalars', 'graph', 'histograms'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTbTab(tab)}
                  className={`flex-1 py-1 rounded uppercase transition-colors ${
                    tbTab === tab
                      ? 'bg-orange-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* TB Content */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl min-h-[190px]">
              {tbTab === 'scalars' && (
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-400 border-b border-slate-800 pb-1">
                    <span>Tag</span>
                    <span>Smoothed</span>
                    <span>Step</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-orange-400">epoch_loss</span>
                    <span>{simulationData.finalTrainLoss}</span>
                    <span>{epochs}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-amber-400">val_loss</span>
                    <span>{simulationData.finalValLoss}</span>
                    <span>{epochs}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-emerald-400">epoch_accuracy</span>
                    <span>{(simulationData.finalTrainAcc * 100).toFixed(1)}%</span>
                    <span>{epochs}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-sky-400">val_accuracy</span>
                    <span>{(simulationData.finalValAcc * 100).toFixed(1)}%</span>
                    <span>{epochs}</span>
                  </div>
                </div>
              )}

              {tbTab === 'graph' && (
                <div className="space-y-2 text-xs font-mono text-slate-300">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Keras Computational Graph DAG</span>
                  </div>
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded text-[11px] space-y-1">
                    <div>1. Input: <code className="text-indigo-300">(None, 28, 28, 1)</code></div>
                    <div>2. Conv2D_1: <code className="text-indigo-300">32x(3x3) &rarr; (None, 28, 28, 32)</code></div>
                    <div>3. MaxPool_1: <code className="text-indigo-300">2x2 &rarr; (None, 14, 14, 32)</code></div>
                    <div>4. Conv2D_2: <code className="text-indigo-300">64x(3x3) &rarr; (None, 14, 14, 64)</code></div>
                    <div>5. Dense_128 + Dropout(0.3) + L2</div>
                    <div>6. Output: <code className="text-emerald-400">Softmax 10 classes</code></div>
                  </div>
                </div>
              )}

              {tbTab === 'histograms' && (
                <div className="space-y-2 text-xs font-mono">
                  <span className="text-slate-400 block mb-1">Weight &amp; Bias Distributions:</span>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded flex justify-between">
                      <span className="text-indigo-400">conv2d_1/kernel:0</span>
                      <span className="text-slate-300">&mu; = 0.002, &sigma; = 0.084</span>
                    </div>
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded flex justify-between">
                      <span className="text-indigo-400">dense_128/kernel:0</span>
                      <span className="text-slate-300">&mu; = -0.001, &sigma; = 0.042</span>
                    </div>
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded flex justify-between">
                      <span className="text-emerald-400">L2 Norm Penalty</span>
                      <span className="text-slate-300">{(l2Reg * 100).toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 10x10 Confusion Matrix Preview */}
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                10×10 Test Confusion Matrix
              </span>
              <span className="text-xs font-mono text-emerald-400">
                Overall: {(simulationData.finalValAcc * 100).toFixed(1)}%
              </span>
            </div>

            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80 overflow-x-auto">
              <div className="grid grid-cols-10 gap-0.5 min-w-[240px]">
                {confusionMatrix.map((row, r) =>
                  row.map((val, c) => {
                    const isDiag = r === c;
                    return (
                      <div
                        key={`${r}-${c}`}
                        title={`Actual ${r}, Predicted ${c}: ${val}`}
                        className={`aspect-square flex items-center justify-center text-[9px] font-mono rounded-xs transition-colors ${
                          isDiag
                            ? 'bg-emerald-600/80 text-white font-bold'
                            : val > 3
                              ? 'bg-amber-600/60 text-white'
                              : 'bg-slate-900 text-slate-600'
                        }`}
                      >
                        {val}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-2 px-1">
                <span>Actual Classes (0–9) &darr;</span>
                <span>&rarr; Predicted Classes (0–9)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backpropagation & Mathematical Formulation Card */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          Module II: Backpropagation &amp; Gradient Descent Chain Rule
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <span className="text-indigo-400 font-bold block text-[11px]">1. Forward Pass &amp; Loss</span>
            <p className="text-slate-300 leading-relaxed font-sans text-xs">
              Affine transform <code className="text-indigo-300 font-mono">z = W·a + b</code> followed by ReLU 
              activation <code className="text-indigo-300 font-mono">a = max(0, z)</code>. 
              Multiclass Cross-Entropy Loss with L2 Regularization:
            </p>
            <div className="p-2 bg-slate-900 rounded text-slate-200 text-[11px]">
              L = -&Sigma; y_k log(&#375;_k) + &lambda; &Sigma; ||W||&sup2;
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <span className="text-indigo-400 font-bold block text-[11px]">2. Backpropagation Chain Rule</span>
            <p className="text-slate-300 leading-relaxed font-sans text-xs">
              Error gradients propagate backward through layers using multivariate chain differentiation:
            </p>
            <div className="p-2 bg-slate-900 rounded text-slate-200 text-[11px]">
              &part;L/&part;W = (&part;L/&part;a) &middot; (&part;a/&part;z) &middot; (&part;z/&part;W) + 2&lambda;W
            </div>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <span className="text-indigo-400 font-bold block text-[11px]">3. Adam Optimizer Update</span>
            <p className="text-slate-300 leading-relaxed font-sans text-xs">
              Maintains exponential moving averages of first (<code className="text-indigo-300 font-mono">m_t</code>) 
              and second uncentered moments (<code className="text-indigo-300 font-mono">v_t</code>):
            </p>
            <div className="p-2 bg-slate-900 rounded text-slate-200 text-[11px]">
              W_t = W_(t-1) - &eta; &middot; m&#770;_t / (&radic;v&#770;_t + &epsilon;)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
