import React, { useState } from 'react';
import { X, Search, BookOpen, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { ExtractedPublication } from '../types';

interface DirectLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResultExtracted: (pub: ExtractedPublication) => void;
}

export const DirectLookupModal: React.FC<DirectLookupModalProps> = ({
  isOpen,
  onClose,
  onResultExtracted,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/inspect-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: inputVal.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to inspect target');
      }

      onResultExtracted(data.publication);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error resolving DOI or ePubs work ID');
    } finally {
      setIsLoading(false);
    }
  };

  const sampleInputs = [
    { label: 'Nature 2025 Paper', val: '10.1038/s43246-025-00843-x' },
    { label: 'ePubs Work 53402930', val: 'https://epubs.stfc.ac.uk/work/53402930' },
    { label: 'ePubs Work 62380021', val: '62380021' },
    { label: 'ACS Nano Paper', val: '10.1021/acsnano.0c09814' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide font-mono">
              Direct DOI / ePubs Work Inspector
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleLookup} className="p-6 space-y-4">
          <p className="text-xs text-slate-300">
            Paste any publication DOI (e.g. <code className="text-cyan-300 font-mono">10.1038/s43246-025-00843-x</code>) or STFC ePubs Work URL/ID to instantly query metadata and scan for RB experiment numbers.
          </p>

          <div className="relative">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="e.g. 10.1038/s43246-025-00843-x or https://epubs.stfc.ac.uk/work/62380021"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-500/40 rounded-lg text-xs text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick preset chips */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Quick Test Examples:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sampleInputs.map((sample) => (
                <button
                  type="button"
                  key={sample.val}
                  onClick={() => setInputVal(sample.val)}
                  className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !inputVal.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(6,182,212,0.25)]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning Target...</span>
                </>
              ) : (
                <>
                  <span>Extract Metadata & RB</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
