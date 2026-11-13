import React, { useState } from 'react';
import { 
  Terminal, Copy, Check, Server, Cloud, Cpu, 
  ExternalLink, CheckCircle2, ChevronRight, Download
} from 'lucide-react';
import { 
  FASTAPI_SERVER_CODE, 
  MODULE2_3_4_TRAIN_CNN_CODE,
  MODULE1_PYTHON_CODE,
  MODULE4_RNN_SEQUENTIAL_CODE 
} from '../data/pythonCodeSnippets';

export const DeploymentGuide: React.FC = () => {
  const [activeStep, setActiveStep] = useState<'shell' | 'tensorboard' | 'cloudrun' | 'fastapi' | 'docker'>('shell');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const DOCKERFILE_CONTENT = `# Production Multi-Stage Container for Digit AIpro
FROM python:3.10-slim AS builder

WORKDIR /app
COPY requirements.txt .

RUN apt-get update && apt-get install -y --no-install-recommends gcc libgl1 libglib2.0-0 \\
    && pip install --no-cache-dir --user -r requirements.txt

# Final Runtime Image
FROM python:3.10-slim

WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .

ENV PATH=/root/.local/bin:$PATH
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

EXPOSE 8080
CMD ["uvicorn", "server_fastapi:app", "--host", "0.0.0.0", "--port", "8080"]
`;

  const REQUIREMENTS_TXT = `tensorflow>=2.15.0
fastapi>=0.110.0
uvicorn>=0.28.0
google-cloud-vision>=3.7.0
google-cloud-translate>=3.15.0
google-cloud-language>=2.13.0
google-cloud-storage>=2.14.0
firebase-admin>=6.5.0
pillow>=10.2.0
pydantic>=2.6.0
numpy>=1.26.0
`;

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Module IV Cloud Shell &amp; Deployment</span>
            <span aria-hidden="true">·</span>
            <span>Vertex AI Notebooks</span>
            <span aria-hidden="true">·</span>
            <span>Google Cloud Run</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Execution &amp; Cloud Deployment Guide
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Step-by-step terminal commands for initializing Google Cloud Shell, launching TensorBoard 
            for model loss diagnostics, and serving the dual-pipeline FastAPI inference backend on Cloud Run.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => copyToClipboard(FASTAPI_SERVER_CODE, 'fastapi_full')}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm shadow-indigo-600/30 whitespace-nowrap"
          >
            {copiedKey === 'fastapi_full' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy FastAPI Server</span>
          </button>
        </div>
      </div>

      {/* Segmented Step Selector */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { id: 'shell', label: '1. Cloud Shell Setup', icon: Terminal },
          { id: 'tensorboard', label: '2. TensorBoard Diagnostics', icon: Cpu },
          { id: 'cloudrun', label: '3. Cloud Run Deployment', icon: Cloud },
          { id: 'fastapi', label: '4. FastAPI Backend', icon: Server },
          { id: 'docker', label: '5. Docker & Deps', icon: ExternalLink },
        ].map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id as any)}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeStep === step.id
                  ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-xs'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4 mb-2 text-indigo-400" />
              <span className="text-xs font-semibold block">{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* Detailed Step Content */}
      {activeStep === 'shell' && (
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              1. Google Cloud Shell &amp; Vertex AI Environment Setup
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Initialize gcloud CLI, select project, create virtual environment, and install TensorFlow 2.x and Google Cloud APIs.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                title: "1.1 Set GCP Project & Region",
                cmd: "gcloud config set project $(gcloud config get-value project)\ngcloud config set compute/region us-central1"
              },
              {
                title: "1.2 Enable Required Google Cloud APIs (Module I)",
                cmd: "gcloud services enable vision.googleapis.com \\\n  translate.googleapis.com \\\n  language.googleapis.com \\\n  run.googleapis.com \\\n  firestore.googleapis.com"
              },
              {
                title: "1.3 Create Python 3.10 Virtual Environment & Install TensorFlow",
                cmd: "python3 -m venv venv\nsource venv/bin/activate\npip install --upgrade pip\npip install tensorflow google-cloud-vision google-cloud-translate google-cloud-language fastapi uvicorn"
              }
            ].map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">{item.title}</span>
                  <button
                    onClick={() => copyToClipboard(item.cmd, `shell_${idx}`)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
                  >
                    {copiedKey === `shell_${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy Command</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-300 overflow-x-auto">
                  {item.cmd}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeStep === 'tensorboard' && (
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-orange-400" />
              2. Model Training &amp; TensorBoard Diagnostics (Module II)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute Keras training with timed logdir callback and launch TensorBoard web dashboard on port 6006.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">2.1 Run Training Script with Hyperparameters</span>
                <button
                  onClick={() => copyToClipboard("python train_cnn_module2_3_4.py --epochs=15 --l2=0.001 --dropout=0.3 --lr=0.001", "train_cmd")}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
                >
                  {copiedKey === 'train_cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-orange-300 overflow-x-auto">
                python train_cnn_module2_3_4.py --epochs=15 --l2=0.001 --dropout=0.3 --lr=0.001
              </pre>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">2.2 Launch TensorBoard Server in Cloud Shell</span>
                <button
                  onClick={() => copyToClipboard("tensorboard --logdir=logs/fit --port=6006 --bind_all", "tb_cmd")}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
                >
                  {copiedKey === 'tb_cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-amber-300 overflow-x-auto">
                tensorboard --logdir=logs/fit --port=6006 --bind_all
              </pre>
            </div>

            <div className="p-4 bg-orange-950/30 border border-orange-900/40 rounded-xl space-y-2 text-xs text-orange-200">
              <span className="font-bold block">Cloud Shell Web Preview:</span>
              <p className="leading-relaxed">
                Click the <strong>Web Preview</strong> button in Google Cloud Shell toolbar (top right) 
                and select <strong>Preview on port 6006</strong> to open the live TensorBoard dashboard in your browser.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeStep === 'cloudrun' && (
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cloud className="w-4 h-4 text-sky-400" />
              3. Deploy Dual-Pipeline Backend to Google Cloud Run
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Containerize and deploy FastAPI application with automatic scaling, HTTPS endpoint, and zero idle costs.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">3.1 Deploy from Source to Google Cloud Run</span>
                <button
                  onClick={() => copyToClipboard(
                    "gcloud run deploy digit-aipro-backend \\\n  --source . \\\n  --platform managed \\\n  --region us-central1 \\\n  --allow-unauthenticated \\\n  --memory 1Gi \\\n  --cpu 1",
                    "cloudrun_cmd"
                  )}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
                >
                  {copiedKey === 'cloudrun_cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-sky-300 overflow-x-auto">
{`gcloud run deploy digit-aipro-backend \\
  --source . \\
  --platform managed \\
  --region us-central1 \\
  --allow-unauthenticated \\
  --memory 1Gi \\
  --cpu 1`}
              </pre>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">3.2 Alternative: Deploy as Google Cloud Function</span>
                <button
                  onClick={() => copyToClipboard(
                    "gcloud functions deploy digit_predict_fn \\\n  --gen2 \\\n  --runtime=python310 \\\n  --region=us-central1 \\\n  --source=. \\\n  --entry-point=predict_digit_cf \\\n  --trigger-http \\\n  --allow-unauthenticated",
                    "cf_cmd"
                  )}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
                >
                  {copiedKey === 'cf_cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-purple-300 overflow-x-auto">
{`gcloud functions deploy digit_predict_fn \\
  --gen2 \\
  --runtime=python310 \\
  --region=us-central1 \\
  --source=. \\
  --entry-point=predict_digit_cf \\
  --trigger-http \\
  --allow-unauthenticated`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {activeStep === 'fastapi' && (
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-400" />
                4. FastAPI Dual-Pipeline Production Server (server_fastapi.py)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Integrates custom TensorFlow model with GCP Vision fallback, Translation, and Sentiment analysis.
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(FASTAPI_SERVER_CODE, 'fastapi_code_tab')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
            >
              {copiedKey === 'fastapi_code_tab' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copy File</span>
            </button>
          </div>
          <pre className="text-xs font-mono text-slate-300 p-4 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto leading-relaxed h-[380px]">
            {FASTAPI_SERVER_CODE}
          </pre>
        </div>
      )}

      {activeStep === 'docker' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase font-mono">Dockerfile</span>
              <button
                onClick={() => copyToClipboard(DOCKERFILE_CONTENT, 'dockerfile')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
              >
                {copiedKey === 'dockerfile' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-slate-300 p-4 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto leading-relaxed h-[340px]">
              {DOCKERFILE_CONTENT}
            </pre>
          </div>

          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase font-mono">requirements.txt</span>
              <button
                onClick={() => copyToClipboard(REQUIREMENTS_TXT, 'reqs')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
              >
                {copiedKey === 'reqs' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-slate-300 p-4 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto leading-relaxed h-[340px]">
              {REQUIREMENTS_TXT}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
