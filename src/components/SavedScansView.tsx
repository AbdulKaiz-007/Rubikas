import React, { useState, useMemo } from 'react';
import {
  Search, Download, Trash2, Copy, Check, Volume2,
  Camera, Calculator, Globe2, Pencil, Save, X,
  LogIn, FileText, Loader2, AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { deleteScanRecord, updateScanRecord, ScanRecord } from '../firebase';

interface SavedScansViewProps {
  onNavigateToScanner: () => void;
}

type FilterKind = 'all' | 'digits' | 'words' | 'math';

export const SavedScansView: React.FC<SavedScansViewProps> = ({ onNavigateToScanner }) => {
  const { user, authReady, authLoading, signInWithGoogle, scans, scansLoading, scansError } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterKind, setFilterKind] = useState<FilterKind>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filteredScans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scans.filter((s) => {
      if (filterKind === 'digits' && s.contentType !== 'digit' && s.contentType !== 'number') {
        return false;
      }
      if (
        filterKind === 'words' &&
        s.contentType !== 'letter' &&
        s.contentType !== 'word' &&
        s.contentType !== 'sentence' &&
        s.contentType !== 'document'
      ) {
        return false;
      }
      if (filterKind === 'math' && s.contentType !== 'math_expression' && !s.mathEvaluated) {
        return false;
      }
      if (!q) return true;
      return (
        s.detectedText.toLowerCase().includes(q) ||
        (s.translatedText || '').toLowerCase().includes(q) ||
        (s.notes || '').toLowerCase().includes(q) ||
        (s.mathEvaluated || '').toLowerCase().includes(q)
      );
    });
  }, [scans, searchQuery, filterKind]);

  const handleCopy = (scan: ScanRecord) => {
    const full = scan.mathEvaluated
      ? `${scan.detectedText} = ${scan.mathEvaluated}`
      : scan.detectedText;
    navigator.clipboard.writeText(full);
    setCopiedId(scan.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utter);
  };

  const startEditNote = (scan: ScanRecord) => {
    setEditingId(scan.id);
    setNoteDraft(scan.notes || '');
    setActionError(null);
  };

  const saveNote = async (scanId: string) => {
    if (!user) return;
    setBusyId(scanId);
    setActionError(null);
    try {
      await updateScanRecord(user.uid, scanId, { notes: noteDraft });
      setEditingId(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update note.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (scanId: string) => {
    if (!user) return;
    setBusyId(scanId);
    setActionError(null);
    try {
      await deleteScanRecord(user.uid, scanId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete scan.');
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    const headers = ['ID', 'Detected Text', 'Type', 'Math Result', 'Translation', 'Language', 'Confidence', 'Pipeline', 'Notes', 'Created At'];
    const rows = filteredScans.map((s) => [
      s.id,
      s.detectedText,
      s.contentType,
      s.mathEvaluated || '',
      s.translatedText || '',
      s.targetLanguage || '',
      (s.confidence * 100).toFixed(1) + '%',
      s.pipeline,
      s.notes || '',
      s.createdAt ? s.createdAt.toDate().toISOString() : '',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `digit-aipro-scans-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const clean = filteredScans.map((s) => ({
      id: s.id,
      detectedText: s.detectedText,
      contentType: s.contentType,
      mathEvaluated: s.mathEvaluated || null,
      translatedText: s.translatedText || null,
      targetLanguage: s.targetLanguage || null,
      confidence: s.confidence,
      pipeline: s.pipeline,
      notes: s.notes || null,
      createdAt: s.createdAt ? s.createdAt.toDate().toISOString() : null,
    }));
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `digit-aipro-scans-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!authReady) {
    return (
      <div className="p-10 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-center gap-3 text-sm text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
        <span>Checking authentication status...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-8 md:p-10 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-5">
        <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-950 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
          <FileText className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Your Cloud Scan Library</h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
            Sign in with Google to save handwritten digits, Cloud Vision document scans, math solutions, and
            translations privately to your Firestore account and access them across devices.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => void signInWithGoogle()}
            disabled={authLoading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors whitespace-nowrap"
          >
            {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            <span>Sign in with Google</span>
          </button>
          <button
            onClick={onNavigateToScanner}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors whitespace-nowrap"
          >
            <Camera className="w-4 h-4" />
            <span>Back to Scanner</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Personal Cloud Archive</span>
            <span aria-hidden="true">·</span>
            <span>{user.email}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{scans.length} saved records</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Saved Handwriting &amp; Vision Scans
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Search, annotate, listen to, or export every digit, word, math solution, and photo scanned with Cloud
            Vision Fallback.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={exportCsv}
            disabled={filteredScans.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={exportJson}
            disabled={filteredScans.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recognized text, translations, or notes..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'digits', label: 'Digits' },
            { id: 'words', label: 'Words & Docs' },
            { id: 'math', label: 'Math' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterKind(tab.id as FilterKind)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                filterKind === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {(scansError || actionError) && (
        <div className="p-3.5 bg-rose-950/50 border border-rose-800/70 rounded-xl flex items-center gap-2 text-xs text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{scansError || actionError}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {scansLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 bg-slate-900/50 border border-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!scansLoading && filteredScans.length === 0 && (
        <div className="p-10 bg-slate-900/50 border border-slate-800 rounded-2xl text-center space-y-4">
          <p className="text-sm text-slate-300 font-medium">
            {scans.length === 0
              ? 'You have not saved any scans to your cloud library yet.'
              : 'No saved scans match your current search or filter.'}
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Draw a digit, write a word or math problem, upload a document photo, or snap with your camera in the
            Scanner and click Save Scan.
          </p>
          {scans.length === 0 && (
            <button
              onClick={onNavigateToScanner}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan First Item</span>
            </button>
          )}
        </div>
      )}

      {/* Populated List */}
      {!scansLoading && filteredScans.length > 0 && (
        <div className="divide-y divide-slate-800/80 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          {filteredScans.map((scan) => {
            const isEditing = editingId === scan.id;
            const dateStr = scan.createdAt
              ? scan.createdAt.toDate().toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Just now';

            return (
              <div
                key={scan.id}
                className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/80 transition-colors"
              >
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  {/* Thumbnail with resilient fallback */}
                  <div className="w-16 h-16 rounded-xl bg-[#090d16] border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {scan.thumbnailDataUrl ? (
                      <img
                        src={scan.thumbnailDataUrl}
                        alt={`Scanned handwriting: ${scan.detectedText}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <FileText className="w-6 h-6 text-slate-600" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-baseline gap-2.5">
                      <span className="text-lg font-bold font-mono text-white break-words">
                        {scan.detectedText}
                      </span>
                      {scan.mathEvaluated && (
                        <span className="inline-flex items-center gap-1 text-sm font-mono font-bold text-emerald-400">
                          <Calculator className="w-3.5 h-3.5" />
                          <span>= {scan.mathEvaluated}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono uppercase text-indigo-300">{scan.contentType}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-emerald-400">
                        {(scan.confidence * 100).toFixed(1)}%
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {scan.pipeline === 'CUSTOM_TENSORFLOW_CNN'
                          ? 'Local CNN'
                          : scan.pipeline === 'GOOGLE_CLOUD_VISION_REST_API'
                            ? 'GCP Vision REST'
                            : 'Cloud Vision Fallback'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums text-slate-500">{dateStr}</span>
                    </div>

                    {scan.translatedText && (
                      <div className="flex items-center gap-1.5 text-xs text-sky-300 pt-0.5">
                        <Globe2 className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {scan.targetLanguage ? `${scan.targetLanguage.toUpperCase()}: ` : ''}
                          {scan.translatedText}
                        </span>
                      </div>
                    )}

                    {/* Note editor or display */}
                    {isEditing ? (
                      <div className="flex items-center gap-2 pt-1 max-w-md">
                        <input
                          type="text"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="Add a label or note..."
                          maxLength={500}
                          className="flex-1 px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={() => void saveNote(scan.id)}
                          disabled={busyId === scan.id}
                          className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
                          title="Save note"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      scan.notes && <p className="text-xs text-slate-400 italic">Note: {scan.notes}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopy(scan)}
                    className="p-2 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Copy text"
                  >
                    {copiedId === scan.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleSpeak(scan.translatedText || scan.detectedText)}
                    className="p-2 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Read aloud"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => startEditNote(scan)}
                    className="p-2 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Edit note"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => void handleDelete(scan.id)}
                    disabled={busyId === scan.id}
                    className="p-2 text-xs text-rose-300 hover:text-rose-200 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-900/50 rounded-lg transition-colors"
                    title="Delete scan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
