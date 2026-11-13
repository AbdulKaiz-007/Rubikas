import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  RotateCcw, Zap, Layers, Sliders, Eye, Check,
  ShieldCheck, Database, Upload, Loader2, Download,
  Calculator, Globe2, AlertCircle, Type as TypeIcon,
  Camera, VideoOff, Volume2, Copy, ChevronDown, ChevronUp,
  LogIn
} from 'lucide-react';
import {
  preprocessCanvas,
  classifyDigit,
  detectStrokeComponents,
  isCanvasEmpty,
  PreprocessingResult,
  InferenceResult,
  StrokeComponent
} from '../utils/digitRecognition';
import { useAuth } from '../contexts/AuthContext';
import { saveScanToFirestore } from '../firebase';
import { downloadTrainedNotebook } from '../data/trainedNotebook';

type InputMode = 'digit' | 'multi' | 'camera';

interface VisionOcrResponse {
  success?: boolean;
  detectedText: string;
  contentType: string;
  confidence: number;
  tokens: Array<{ char: string; confidence: number; kind: string }>;
  mathEvaluated?: string | null;
  explanation?: string;
  provider?: string;
  error?: string;
}

interface DigitStudioProps {
  onNavigateToSaved?: () => void;
}

const WORD_PRESETS: Array<{ label: string; text: string }> = [
  { label: 'A', text: 'A' },
  { label: 'B', text: 'B' },
  { label: 'HELLO', text: 'HELLO' },
  { label: '2026', text: '2026' },
  { label: '3 + 7', text: '3 + 7' },
  { label: '18 * 4', text: '18 * 4' },
  { label: 'AI PRO', text: 'AI PRO' },
];

const LANGUAGES = [
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
  { code: 'de', label: 'DE' },
  { code: 'ja', label: 'JA' },
  { code: 'hi', label: 'HI' },
  { code: 'ar', label: 'AR' },
  { code: 'zh', label: 'ZH' },
  { code: 'pt', label: 'PT' },
];

function createCompressedThumbnail(sourceCanvas: HTMLCanvasElement): string | null {
  try {
    const thumb = document.createElement('canvas');
    const maxDim = 240;
    const scale = Math.min(1, maxDim / Math.max(sourceCanvas.width, sourceCanvas.height));
    thumb.width = Math.max(40, Math.round(sourceCanvas.width * scale));
    thumb.height = Math.max(40, Math.round(sourceCanvas.height * scale));
    const tCtx = thumb.getContext('2d');
    if (!tCtx) return null;
    tCtx.drawImage(sourceCanvas, 0, 0, thumb.width, thumb.height);
    const dataUrl = thumb.toDataURL('image/jpeg', 0.65);
    return dataUrl.length <= 55000 ? dataUrl : null;
  } catch {
    return null;
  }
}

export const DigitStudio: React.FC<DigitStudioProps> = ({ onNavigateToSaved }) => {
  const { user, profile, signInWithGoogle, setPreferredLanguage } = useAuth();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const ocrAbortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  const [mode, setMode] = useState<InputMode>('digit');
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState<number>(18);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.85);

  const [preprocessing, setPreprocessing] = useState<PreprocessingResult | null>(null);
  const [components, setComponents] = useState<StrokeComponent[]>([]);
  const [inference, setInference] = useState<InferenceResult | null>(null);

  // Vision OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<VisionOcrResponse | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // End-user Actions: Copy, Translate, Save to Firestore
  const [copiedText, setCopiedText] = useState(false);
  const [quickLang, setQuickLang] = useState(profile?.preferredLanguage || 'es');
  const [quickTranslation, setQuickTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [savingCloud, setSavingCloud] = useState(false);
  const [savedScanId, setSavedScanId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Collapsible Neural Inspector
  const [showInspector, setShowInspector] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<'conv1' | 'pool1' | 'conv2' | 'pool2' | 'dense'>('conv1');
  const [hoveredPixel, setHoveredPixel] = useState<{ r: number; c: number; val: number } | null>(null);

  useEffect(() => {
    if (profile?.preferredLanguage) {
      setQuickLang(profile.preferredLanguage);
    }
  }, [profile?.preferredLanguage]);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
      if (ocrAbortRef.current) ocrAbortRef.current.abort();
    };
  }, [stopCameraStream]);

  const startCameraStream = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported in this browser. Try Upload Image instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError(
        err instanceof Error
          ? `Camera unavailable: ${err.message}. You can upload a photo instead.`
          : 'Camera permission denied. You can upload a photo instead.'
      );
      setCameraActive(false);
    }
  }, []);

  const canvasWidth = mode === 'digit' ? 280 : 560;
  const canvasHeight = mode === 'digit' ? 280 : 220;

  const callVisionOcr = useCallback(
    async (imageDataUrl: string, ocrMode: 'auto' | 'digit' | 'letter' | 'word' | 'math' = 'auto') => {
      if (ocrAbortRef.current) {
        ocrAbortRef.current.abort();
      }
      const controller = new AbortController();
      ocrAbortRef.current = controller;

      setOcrLoading(true);
      setOcrError(null);
      setQuickTranslation(null);
      setSavedScanId(null);
      setSaveError(null);

      try {
        const resp = await fetch('/api/vision-ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: imageDataUrl, mode: ocrMode }),
          signal: controller.signal,
        });

        const data = (await resp.json()) as VisionOcrResponse & { retryAfterSeconds?: number };
        if (!resp.ok) {
          if (resp.status === 429) {
            const waitSec = data.retryAfterSeconds || 5;
            throw new Error(`Free-tier AI rate limit reached. Wait ${waitSec}s and click Vision OCR or Recognize.`);
          }
          throw new Error(data.error || `Vision OCR HTTP ${resp.status}`);
        }
        setOcrResult(data);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setOcrError(err instanceof Error ? err.message : 'Vision OCR request failed.');
      } finally {
        if (ocrAbortRef.current === controller) {
          setOcrLoading(false);
        }
      }
    },
    []
  );

  const runInference = useCallback(
    async (opts?: { thresholdOverride?: number; forceVisionOcr?: boolean }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (isCanvasEmpty(ctx, canvas.width, canvas.height)) {
        setPreprocessing(null);
        setInference(null);
        setComponents([]);
        setOcrResult(null);
        setOcrError(null);
        return;
      }

      const detectedComps = detectStrokeComponents(ctx, canvas.width, canvas.height);
      setComponents(detectedComps);

      const prep = preprocessCanvas(ctx, canvas.width, canvas.height);
      setPreprocessing(prep);

      if (mode !== 'digit' || opts?.forceVisionOcr || detectedComps.length > 1) {
        if (prep) {
          const localRes = classifyDigit(prep.grayscaleMatrix);
          localRes.modelUsed = 'GOOGLE_CLOUD_VISION_API_FALLBACK';
          setInference(localRes);
        }
        const dataUrl = uploadedPreviewUrl || canvas.toDataURL('image/png');
        await callVisionOcr(dataUrl, mode === 'multi' ? 'auto' : 'digit');
        return;
      }

      if (!prep) return;
      const result = classifyDigit(prep.grayscaleMatrix);
      const activeThreshold = opts?.thresholdOverride ?? confidenceThreshold;

      if (result.confidence < activeThreshold) {
        result.modelUsed = 'GOOGLE_CLOUD_VISION_API_FALLBACK';
        setInference(result);
        const dataUrl = uploadedPreviewUrl || canvas.toDataURL('image/png');
        await callVisionOcr(dataUrl, 'auto');
      } else {
        result.modelUsed = 'CUSTOM_TENSORFLOW_CNN';
        setInference(result);
        setOcrResult(null);
        setOcrError(null);
      }
    },
    [mode, confidenceThreshold, uploadedPreviewUrl, callVisionOcr]
  );

  const drawPresetDigit = useCallback(
    (digit: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      setUploadedPreviewUrl(null);
      setSavedScanId(null);
      setSaveError(null);
      setOcrResult(null);
      setOcrError(null);
      setQuickTranslation(null);

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 22;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      ctx.beginPath();
      switch (digit) {
        case 0:
          ctx.ellipse(cx, cy, 52, 76, 0, 0, Math.PI * 2);
          break;
        case 1:
          ctx.moveTo(cx - 16, cy - 55);
          ctx.lineTo(cx, cy - 78);
          ctx.lineTo(cx, cy + 78);
          break;
        case 2:
          ctx.arc(cx, cy - 38, 42, Math.PI * 1.05, 0.15, false);
          ctx.lineTo(cx - 44, cy + 76);
          ctx.lineTo(cx + 46, cy + 76);
          break;
        case 3:
          ctx.arc(cx - 8, cy - 34, 38, -Math.PI * 0.8, Math.PI * 0.45, false);
          ctx.moveTo(cx - 8, cy + 2);
          ctx.arc(cx - 8, cy + 38, 42, -Math.PI * 0.45, Math.PI * 0.85, false);
          break;
        case 4:
          ctx.moveTo(cx + 24, cy + 78);
          ctx.lineTo(cx + 24, cy - 78);
          ctx.lineTo(cx - 46, cy + 24);
          ctx.lineTo(cx + 46, cy + 24);
          break;
        case 5:
          ctx.moveTo(cx + 38, cy - 74);
          ctx.lineTo(cx - 34, cy - 74);
          ctx.lineTo(cx - 34, cy - 8);
          ctx.arc(cx - 4, cy + 28, 44, -Math.PI * 0.6, Math.PI * 0.72, false);
          break;
        case 6:
          ctx.moveTo(cx + 20, cy - 74);
          ctx.bezierCurveTo(cx - 35, cy - 44, cx - 44, cy - 4, cx - 44, cy + 30);
          ctx.arc(cx, cy + 30, 44, Math.PI, Math.PI * 3, false);
          break;
        case 7:
          ctx.moveTo(cx - 44, cy - 74);
          ctx.lineTo(cx + 44, cy - 74);
          ctx.lineTo(cx - 14, cy + 78);
          break;
        case 8:
          ctx.arc(cx, cy - 34, 36, Math.PI * 0.5, Math.PI * 2.5);
          ctx.moveTo(cx, cy + 3);
          ctx.arc(cx, cy + 40, 40, -Math.PI * 0.5, Math.PI * 1.5);
          break;
        case 9:
          ctx.arc(cx, cy - 30, 40, 0, Math.PI * 2);
          ctx.moveTo(cx + 40, cy - 30);
          ctx.lineTo(cx + 40, cy + 50);
          ctx.arc(cx + 8, cy + 58, 32, 0, Math.PI * 0.5, false);
          break;
      }
      ctx.stroke();

      void runInference();
    },
    [runInference]
  );

  const drawPresetText = useCallback(
    (text: string, skipAutoApi = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      setUploadedPreviewUrl(null);
      setSavedScanId(null);
      setSaveError(null);
      setOcrError(null);
      setQuickTranslation(null);

      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      const fontSize = text.length <= 2 ? 128 : text.length <= 5 ? 88 : 68;
      ctx.font = `italic 600 ${fontSize}px "Georgia", "Times New Roman", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
      ctx.restore();

      const detectedComps = detectStrokeComponents(ctx, canvas.width, canvas.height);
      setComponents(detectedComps);
      const prep = preprocessCanvas(ctx, canvas.width, canvas.height);
      setPreprocessing(prep);

      if (skipAutoApi) {
        setOcrResult({
          success: true,
          detectedText: text,
          contentType: text === '3 + 7' ? 'math_expression' : 'word',
          confidence: 0.99,
          tokens: text
            .split('')
            .filter((ch) => ch.trim().length > 0)
            .map((ch) => ({
              char: ch,
              confidence: 0.99,
              kind: /\d/.test(ch) ? 'digit' : /[a-zA-Z]/.test(ch) ? 'letter' : 'symbol',
            })),
          mathEvaluated: text === '3 + 7' ? '10' : null,
          explanation: 'Sample loaded on canvas. Draw your own or click Vision OCR to test live.',
          provider: 'CLOUD_VISION_MULTIMODAL_OCR',
        });
        return;
      }

      void runInference({ forceVisionOcr: true });
    },
    [runInference]
  );

  useEffect(() => {
    if (mode === 'camera') {
      void startCameraStream();
      return;
    }
    stopCameraStream();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setUploadedPreviewUrl(null);
    setOcrResult(null);
    setOcrError(null);
    setQuickTranslation(null);
    setSavedScanId(null);

    if (mode === 'digit') {
      drawPresetDigit(7);
    } else if (mode === 'multi') {
      drawPresetText('3 + 7', true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const captureCameraFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scale = Math.min(canvas.width / vw, canvas.height / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    ctx.drawImage(video, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);

    const capturedUrl = canvas.toDataURL('image/jpeg', 0.85);
    setUploadedPreviewUrl(capturedUrl);
    stopCameraStream();
    setMode('multi');

    setTimeout(() => {
      const targetCanvas = canvasRef.current;
      if (!targetCanvas) return;
      const tCtx = targetCanvas.getContext('2d');
      if (!tCtx) return;
      const img = new Image();
      img.onload = () => {
        tCtx.fillStyle = '#090d16';
        tCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
        const s = Math.min(targetCanvas.width / img.width, targetCanvas.height / img.height);
        const w = img.width * s;
        const h = img.height * s;
        tCtx.drawImage(img, (targetCanvas.width - w) / 2, (targetCanvas.height - h) / 2, w, h);
        const prep = preprocessCanvas(tCtx, targetCanvas.width, targetCanvas.height);
        setPreprocessing(prep);
        void callVisionOcr(capturedUrl, 'auto');
      };
      img.src = capturedUrl;
    }, 30);
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width),
        y: (touch.clientY - rect.top) * (canvas.height / rect.height),
      };
    }
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setIsDrawing(true);
    setSavedScanId(null);
    setSaveError(null);
    setUploadedPreviewUrl(null);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = mode === 'multi' ? Math.max(8, brushSize - 4) : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);

    if (mode === 'multi') {
      // Wait 1.3s after user lifts pen so multi-stroke letters/words finish before calling Vision OCR
      debounceTimerRef.current = window.setTimeout(() => {
        void runInference();
      }, 1300);
    } else {
      // Run instant local CNN immediately if confident; only delay if uncertain (in case of 2-stroke digits like 4, 5, 7)
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const prep = preprocessCanvas(ctx, canvas.width, canvas.height);
        const comps = detectStrokeComponents(ctx, canvas.width, canvas.height);
        setPreprocessing(prep);
        setComponents(comps);
        if (prep && comps.length <= 1) {
          const quickRes = classifyDigit(prep.grayscaleMatrix);
          if (quickRes.confidence >= confidenceThreshold) {
            quickRes.modelUsed = 'CUSTOM_TENSORFLOW_CNN';
            setInference(quickRes);
            setOcrResult(null);
            setOcrError(null);
            return;
          }
          setInference(quickRes);
        }
      }
      debounceTimerRef.current = window.setTimeout(() => {
        void runInference();
      }, 950);
    }
  }, [isDrawing, mode, confidenceThreshold, runInference]);

  const clearCanvas = () => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (ocrAbortRef.current) {
      ocrAbortRef.current.abort();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setPreprocessing(null);
    setInference(null);
    setComponents([]);
    setOcrResult(null);
    setOcrError(null);
    setOcrLoading(false);
    setUploadedPreviewUrl(null);
    setSavedScanId(null);
    setSaveError(null);
    setQuickTranslation(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUploadedPreviewUrl(dataUrl);
      setOcrError(null);
      setQuickTranslation(null);
      setSavedScanId(null);
      setSaveError(null);

      if (mode === 'camera') {
        stopCameraStream();
        setMode('multi');
      }

      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const scale = Math.min((canvas.width - 12) / img.width, (canvas.height - 12) / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        ctx.drawImage(img, x, y, w, h);

        const prep = preprocessCanvas(ctx, canvas.width, canvas.height);
        setPreprocessing(prep);
        void callVisionOcr(dataUrl, 'auto');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const usingFallbackResult =
    (mode !== 'digit' ||
      inference?.modelUsed === 'GOOGLE_CLOUD_VISION_API_FALLBACK' ||
      components.length > 1 ||
      Boolean(uploadedPreviewUrl) ||
      Boolean(ocrResult)) &&
    Boolean(ocrResult?.detectedText);

  const primaryPrediction = usingFallbackResult
    ? ocrResult!.detectedText
    : inference
      ? String(inference.topDigit)
      : '';

  const primaryConfidence = usingFallbackResult ? ocrResult!.confidence : inference?.confidence ?? 0;

  const handleQuickTranslate = async (lang: string) => {
    if (!primaryPrediction) return;
    setQuickLang(lang);
    if (user) {
      void setPreferredLanguage(lang);
    }
    setTranslating(true);
    try {
      const resp = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: primaryPrediction, targetLanguage: lang }),
      });
      const data = (await resp.json()) as { translatedText?: string; error?: string };
      if (!resp.ok) throw new Error(data.error || 'Translation failed');
      setQuickTranslation(data.translatedText ?? primaryPrediction);
    } catch {
      setQuickTranslation(null);
    } finally {
      setTranslating(false);
    }
  };

  const handleCopyOutput = () => {
    if (!primaryPrediction) return;
    const text =
      usingFallbackResult && ocrResult?.mathEvaluated
        ? `${primaryPrediction} = ${ocrResult.mathEvaluated}`
        : primaryPrediction;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 1800);
  };

  const handleSpeakOutput = () => {
    const text = quickTranslation || primaryPrediction;
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utter);
  };

  const handleSaveToCloud = async () => {
    if (!primaryPrediction) return;
    setSaveError(null);

    let activeUser = user;
    if (!activeUser) {
      activeUser = await signInWithGoogle();
      if (!activeUser) return;
    }

    setSavingCloud(true);
    try {
      const canvas = canvasRef.current;
      const thumbnailDataUrl = canvas ? createCompressedThumbnail(canvas) : null;
      const id = await saveScanToFirestore(activeUser.uid, {
        detectedText: primaryPrediction,
        contentType: usingFallbackResult ? ocrResult?.contentType : 'digit',
        confidence: primaryConfidence,
        pipeline: usingFallbackResult
          ? ocrResult?.provider === 'GOOGLE_CLOUD_VISION_REST_API'
            ? 'GOOGLE_CLOUD_VISION_REST_API'
            : 'CLOUD_VISION_FALLBACK'
          : 'CUSTOM_TENSORFLOW_CNN',
        mathEvaluated: usingFallbackResult ? ocrResult?.mathEvaluated : null,
        translatedText: quickTranslation,
        targetLanguage: quickTranslation ? quickLang : null,
        notes: noteInput,
        thumbnailDataUrl,
      });
      setSavedScanId(id);
      setNoteInput('');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save scan to Firestore.');
    } finally {
      setSavingCloud(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* End-User Hero Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Local 28×28 Digit CNN</span>
            <span aria-hidden="true">·</span>
            <span>Cloud Vision Fallback</span>
            <span aria-hidden="true">·</span>
            <span>Math Solver &amp; Translation</span>
            <span aria-hidden="true">·</span>
            <span>Cloud History</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Smart Handwriting, Photo &amp; Camera Scanner
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Draw digits, letters, words, or equations—or upload a photo or use your camera. Confident digits run
            instantly on-device; everything else routes automatically through Cloud Vision Fallback with translation,
            voice readout, and Firestore cloud sync.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={downloadTrainedNotebook}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Trained .ipynb Model</span>
          </button>

          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl shrink-0">
            <div className="text-xs">
              <span className="text-slate-400 block text-[11px]">Fallback Threshold</span>
              <span className="font-mono tabular-nums font-semibold text-indigo-300">
                {(confidenceThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.50"
              max="0.95"
              step="0.05"
              value={confidenceThreshold}
              onChange={(e) => {
                const nextThreshold = parseFloat(e.target.value);
                setConfidenceThreshold(nextThreshold);
                if (preprocessing && mode === 'digit') {
                  void runInference({ thresholdOverride: nextThreshold });
                }
              }}
              className="w-24 accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Mode Switcher & Photo Upload */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto max-w-full">
          <button
            onClick={() => setMode('digit')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              mode === 'digit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Draw Digit</span>
          </button>
          <button
            onClick={() => setMode('multi')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              mode === 'multi' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <TypeIcon className="w-3.5 h-3.5" />
            <span>Words &amp; Math</span>
          </button>
          <button
            onClick={() => setMode('camera')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              mode === 'camera' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera Scan</span>
          </button>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Upload Photo or Note</span>
          </button>
        </div>
      </div>

      {/* Main End-User 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Canvas / Camera + Presets (5 cols) */}
        <div className="lg:col-span-5 p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              {mode === 'camera' ? (
                <>
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Live Camera Capture</span>
                </>
              ) : (
                <>
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Drawing Pad ({canvasWidth}×{canvasHeight})</span>
                </>
              )}
            </span>

            {mode !== 'camera' && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => void runInference({ forceVisionOcr: mode === 'multi' })}
                  className="px-2.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  {ocrLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  <span>Recognize</span>
                </button>
                <button
                  onClick={() => void runInference({ forceVisionOcr: true })}
                  title="Run directly with Cloud Vision Fallback"
                  className="px-2.5 py-1.5 text-xs font-semibold text-amber-200 bg-amber-950/70 hover:bg-amber-900/80 border border-amber-700/60 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <span>Vision OCR</span>
                </button>
                <button
                  onClick={clearCanvas}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            )}
          </div>

          {mode === 'camera' ? (
            <div className="space-y-3">
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                />
                {!cameraActive && !cameraError && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Starting camera...</span>
                  </div>
                )}
                {cameraError && (
                  <div className="p-6 text-center space-y-3">
                    <VideoOff className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">{cameraError}</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
                    >
                      Upload Photo Instead
                    </button>
                  </div>
                )}
              </div>
              {cameraActive && (
                <button
                  onClick={captureCameraFrame}
                  className="w-full py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture &amp; Recognize with Cloud Vision</span>
                </button>
              )}
              <canvas ref={canvasRef} width={560} height={220} className="hidden" />
            </div>
          ) : (
            <>
              <div
                className={`relative mx-auto w-full rounded-xl overflow-hidden border border-slate-800 bg-[#090d16] ${
                  mode === 'digit' ? 'max-w-[280px] aspect-square' : 'aspect-[560/220]'
                }`}
              >
                <canvas
                  ref={canvasRef}
                  width={canvasWidth}
                  height={canvasHeight}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full cursor-crosshair touch-none block"
                />
                <div className="absolute inset-0 pointer-events-none opacity-15 border-dashed border-slate-700 grid grid-cols-2 grid-rows-2" />
                {components.length > 0 && (
                  <div className="absolute bottom-2 right-2 pointer-events-none px-2 py-0.5 bg-slate-950/85 border border-slate-700/80 rounded text-[10px] font-mono text-slate-300">
                    {components.length} segment{components.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Brush Thickness */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                <span className="text-slate-400">Pen Thickness</span>
                <div className="flex items-center gap-1.5">
                  {[12, 18, 24].map((size) => (
                    <button
                      key={size}
                      onClick={() => setBrushSize(size)}
                      className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors font-mono text-[11px] ${
                        brushSize === size
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {size === 12 ? 'S' : size === 18 ? 'M' : 'L'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Test Presets */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1.5">Try Single Digits (0–9):</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                      <button
                        key={digit}
                        onClick={() => {
                          if (mode !== 'digit') {
                            setMode('digit');
                            setTimeout(() => drawPresetDigit(digit), 30);
                          } else {
                            drawPresetDigit(digit);
                          }
                        }}
                        className="py-1.5 text-xs font-mono font-medium bg-slate-800 hover:bg-indigo-600/70 hover:text-white text-slate-300 rounded border border-slate-700/60 transition-colors"
                      >
                        {digit}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block mb-1.5">
                    Try Letters, Words &amp; Math (Cloud Vision Fallback):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {WORD_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          if (mode !== 'multi') {
                            setMode('multi');
                            setTimeout(() => drawPresetText(preset.text), 40);
                          } else {
                            drawPresetText(preset.text);
                          }
                        }}
                        className="px-2.5 py-1 text-xs font-mono font-medium bg-slate-950 hover:bg-indigo-600/70 hover:text-white text-indigo-300 rounded border border-slate-800 transition-colors whitespace-nowrap"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Actionable End-User Result, Translator & Cloud Save (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-5">
            {/* Top Output Row */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Recognized Output</span>
                  {usingFallbackResult && ocrResult?.contentType && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono uppercase text-indigo-300">{ocrResult.contentType}</span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-baseline gap-4">
                  <span
                    className={`font-extrabold text-white tracking-tight font-mono break-words ${
                      primaryPrediction.length > 16
                        ? 'text-2xl md:text-3xl'
                        : primaryPrediction.length > 5
                          ? 'text-3xl md:text-4xl'
                          : primaryPrediction.length > 1
                            ? 'text-4xl md:text-5xl'
                            : 'text-6xl'
                    }`}
                  >
                    {ocrLoading && !primaryPrediction ? '...' : primaryPrediction || '--'}
                  </span>

                  {usingFallbackResult && ocrResult?.mathEvaluated && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-950/60 border border-emerald-700/60 rounded-lg font-mono">
                      <Calculator className="w-4 h-4 text-emerald-400" />
                      <span className="text-xl font-bold text-emerald-300 tabular-nums">
                        = {ocrResult.mathEvaluated}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                  <span className="font-mono tabular-nums text-emerald-400 font-semibold">
                    {primaryConfidence > 0 ? `${(primaryConfidence * 100).toFixed(1)}% confidence` : 'Waiting for input'}
                  </span>
                  {inference && (
                    <>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="font-mono tabular-nums text-slate-400">
                        Entropy {inference.entropy.toFixed(2)} bits
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Pipeline Badge + Utility Actions */}
              <div className="flex flex-col sm:items-end gap-2 shrink-0">
                {ocrLoading ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/70 border border-amber-700/60 rounded-lg text-xs font-semibold text-amber-200">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Running Cloud Vision Fallback...</span>
                  </div>
                ) : usingFallbackResult ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/80 border border-amber-700/60 rounded-lg text-xs font-semibold text-amber-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {ocrResult?.provider === 'GOOGLE_CLOUD_VISION_REST_API'
                        ? 'GCP Vision REST API'
                        : 'Cloud Vision Fallback'}
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/80 border border-indigo-700/60 rounded-lg text-xs font-semibold text-indigo-300">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Local CNN (On-Device)</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopyOutput}
                    disabled={!primaryPrediction}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleSpeakOutput}
                    disabled={!primaryPrediction}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Listen</span>
                  </button>
                </div>
              </div>
            </div>

            {ocrError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/70 rounded-xl flex items-center gap-2 text-xs text-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{ocrError}</span>
              </div>
            )}

            {/* Token Breakdown when Vision OCR ran */}
            {usingFallbackResult && ocrResult && (
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-amber-300">Cloud Vision Character Breakdown</span>
                  <span className="text-slate-400">{ocrResult.explanation}</span>
                </div>
                {ocrResult.tokens && ocrResult.tokens.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {ocrResult.tokens.slice(0, 24).map((tok, i) => (
                      <div
                        key={`${tok.char}-${i}`}
                        className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg flex flex-col items-center min-w-[40px] font-mono"
                      >
                        <span className="text-base font-bold text-white">{tok.char}</span>
                        <span className="text-[10px] text-emerald-400 tabular-nums">
                          {(tok.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick Cloud Translation */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Globe2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Translate Recognized Text:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => void handleQuickTranslate(l.code)}
                      disabled={!primaryPrediction || translating}
                      className={`px-2 py-1 rounded font-mono text-[11px] transition-colors disabled:opacity-40 ${
                        quickTranslation && quickLang === l.code
                          ? 'bg-sky-600 text-white font-semibold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {(translating || quickTranslation) && (
                <div className="p-3 bg-sky-950/30 border border-sky-800/50 rounded-xl text-xs text-sky-100 flex items-center justify-between gap-2">
                  <span>
                    {translating ? 'Translating via Cloud Translation...' : `${quickLang.toUpperCase()}: ${quickTranslation}`}
                  </span>
                </div>
              )}
            </div>

            {/* Save to Personal Firestore Cloud Library */}
            <div className="pt-3 border-t border-slate-800/80 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Optional label or note before saving (e.g. Receipt #4, Math Q2)..."
                  maxLength={500}
                  className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => void handleSaveToCloud()}
                  disabled={!primaryPrediction || savingCloud || Boolean(savedScanId)}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
                    savedScanId
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40'
                  }`}
                >
                  {savingCloud ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : savedScanId ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved to Cloud</span>
                    </>
                  ) : user ? (
                    <>
                      <Database className="w-3.5 h-3.5" />
                      <span>Save Scan to Cloud</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign in &amp; Save Scan</span>
                    </>
                  )}
                </button>
              </div>

              {savedScanId && onNavigateToSaved && (
                <div className="flex items-center justify-between text-xs text-emerald-400">
                  <span>Synced to your Firestore scan library.</span>
                  <button
                    onClick={onNavigateToSaved}
                    className="underline hover:text-emerald-300 font-semibold"
                  >
                    Open Saved Scans →
                  </button>
                </div>
              )}

              {saveError && (
                <p className="text-xs text-rose-400">{saveError}</p>
              )}
            </div>
          </div>

          {/* Collapsible Neural Inspector & 28x28 Tensor Drawer */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowInspector((v) => !v)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-semibold text-slate-300 hover:bg-slate-900/80 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-indigo-400" />
                <span>Neural Layer &amp; 28×28 Tensor Diagnostics</span>
              </span>
              {showInspector ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showInspector && (
              <div className="p-5 pt-2 border-t border-slate-800 space-y-5">
                {/* 28x28 Tensor + Softmax bars */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  <div className="md:col-span-5 flex gap-3 items-center">
                    <div className="w-28 h-28 bg-black border border-slate-800 rounded grid grid-cols-28 grid-rows-28 shrink-0 overflow-hidden">
                      {preprocessing?.grayscaleMatrix.map((row, r) =>
                        row.map((val, c) => (
                          <div
                            key={`${r}-${c}`}
                            onMouseEnter={() => setHoveredPixel({ r, c, val })}
                            style={{
                              backgroundColor: `rgb(${Math.round(val * 255)}, ${Math.round(val * 255)}, ${Math.round(val * 255)})`,
                            }}
                            className="w-full h-full"
                          />
                        ))
                      )}
                    </div>
                    <div className="text-[11px] font-mono space-y-1.5 text-slate-400">
                      <div>
                        COM: <span className="text-slate-200">{preprocessing?.centerOfMass.cx ?? '--'}, {preprocessing?.centerOfMass.cy ?? '--'}</span>
                      </div>
                      <div>
                        Active: <span className="text-slate-200">{preprocessing?.activePixelCount ?? 0}/784</span>
                      </div>
                      <div className="text-indigo-300">
                        {hoveredPixel ? `(${hoveredPixel.r},${hoveredPixel.c})=${hoveredPixel.val.toFixed(2)}` : 'Hover tensor'}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-7 grid grid-cols-10 gap-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
                      const prob = inference?.probabilities[digit] ?? 0;
                      const isTop = inference?.topDigit === digit;
                      return (
                        <div key={digit} className="flex flex-col items-center gap-1">
                          <div className="w-full bg-slate-950 rounded-t h-16 flex items-end p-0.5 overflow-hidden">
                            <div
                              style={{ height: `${Math.max(4, prob * 100)}%` }}
                              className={`w-full rounded-t transition-all duration-300 ${
                                isTop ? 'bg-indigo-500' : 'bg-slate-700'
                              }`}
                            />
                          </div>
                          <span className={`text-[11px] font-mono ${isTop ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}>
                            {digit}
                          </span>
                          <span className="text-[9px] font-mono tabular-nums text-slate-500">
                            {(prob * 100).toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Conv/Pool tabs */}
                <div className="space-y-3 pt-3 border-t border-slate-800/70">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Feature Maps</span>
                    </span>
                    <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono">
                      {(['conv1', 'pool1', 'conv2', 'pool2', 'dense'] as const).map((layer) => (
                        <button
                          key={layer}
                          onClick={() => setSelectedLayer(layer)}
                          className={`px-2 py-1 rounded transition-colors ${
                            selectedLayer === layer
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {layer.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedLayer === 'conv1' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {['Horizontal Edges', 'Vertical Edges', 'Laplacian', 'Texture'].map((name, idx) => (
                        <div key={idx} className="p-2 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                          <span className="text-[11px] font-mono text-slate-400 block truncate">{name}</span>
                          <div className="aspect-square bg-black border border-slate-800/80 rounded grid grid-cols-28 grid-rows-28 overflow-hidden">
                            {inference?.layerActivations.conv1Filters[idx]?.map((row, r) =>
                              row.map((val, c) => (
                                <div
                                  key={`${r}-${c}`}
                                  style={{
                                    backgroundColor: `rgb(${Math.round(val * 255)}, ${Math.round(val * 255)}, ${Math.round(val * 255)})`,
                                  }}
                                  className="w-full h-full"
                                />
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedLayer === 'pool1' && (
                    <div className="flex gap-4 items-center">
                      <div className="w-24 h-24 bg-black border border-slate-800 rounded grid grid-cols-14 grid-rows-14 overflow-hidden shrink-0">
                        {inference?.layerActivations.pool1.map((row, r) =>
                          row.map((val, c) => (
                            <div
                              key={`${r}-${c}`}
                              style={{
                                backgroundColor: `rgb(${Math.round(val * 255)}, ${Math.round(val * 255)}, ${Math.round(val * 255)})`,
                              }}
                              className="w-full h-full"
                            />
                          ))
                        )}
                      </div>
                      <p className="text-xs text-slate-400">MaxPool2D (2×2, stride 2) downsampling 28×28 → 14×14.</p>
                    </div>
                  )}

                  {selectedLayer === 'conv2' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {['Curvature', 'Loops', 'Junctions', 'Terminals'].map((name, idx) => (
                        <div key={idx} className="p-2 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                          <span className="text-[11px] font-mono text-slate-400 block truncate">{name}</span>
                          <div className="aspect-square bg-black border border-slate-800/80 rounded grid grid-cols-14 grid-rows-14 overflow-hidden">
                            {inference?.layerActivations.conv2Filters[idx]?.map((row, r) =>
                              row.map((val, c) => (
                                <div
                                  key={`${r}-${c}`}
                                  style={{
                                    backgroundColor: `rgb(${Math.round(val * 255)}, ${Math.round(val * 255)}, ${Math.round(val * 255)})`,
                                  }}
                                  className="w-full h-full"
                                />
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedLayer === 'pool2' && (
                    <div className="flex gap-4 items-center">
                      <div className="w-20 h-20 bg-black border border-slate-800 rounded grid grid-cols-7 grid-rows-7 overflow-hidden shrink-0">
                        {inference?.layerActivations.pool2.map((row, r) =>
                          row.map((val, c) => (
                            <div
                              key={`${r}-${c}`}
                              style={{
                                backgroundColor: `rgb(${Math.round(val * 255)}, ${Math.round(val * 255)}, ${Math.round(val * 255)})`,
                              }}
                              className="w-full h-full"
                            />
                          ))
                        )}
                      </div>
                      <p className="text-xs text-slate-400">Deepest spatial pooling 7×7 grid feeding Dense(128).</p>
                    </div>
                  )}

                  {selectedLayer === 'dense' && (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl grid grid-cols-16 gap-1">
                      {inference?.layerActivations.denseVector.map((val, idx) => (
                        <div
                          key={idx}
                          title={`Unit ${idx}: ${val}`}
                          style={{ opacity: Math.max(0.15, val) }}
                          className="h-5 bg-indigo-500 rounded-xs"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
