import React, { useState } from 'react';
import { X, ExternalLink, Copy, Check, FileText, CheckCircle2, ShieldAlert, Sparkles, Database } from 'lucide-react';
import { ExtractedPublication } from '../types';

interface DetailModalProps {
  publication: ExtractedPublication | null;
  onClose: () => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ publication, onClose }) => {
  const [copiedRb, setCopiedRb] = useState<string | null>(null);

  if (!publication) return null;

  const copyToClipboard = (text: string, rbId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRb(rbId);
    setTimeout(() => setCopiedRb(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/80 text-xs font-mono font-medium">
              {publication.expressionType || 'Work Record'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ePubs #{publication.workId || 'N/A'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Title */}
          <div>
            <h2 className="text-lg font-bold text-slate-100 leading-snug">
              {publication.title}
            </h2>
          </div>

          {/* Primary Scientific Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-lg border border-slate-800">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Publication Year
              </span>
              <span className="font-mono text-base font-semibold text-cyan-300">
                {publication.year}
              </span>
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Digital Object Identifier (DOI)
              </span>
              {publication.doi ? (
                <div className="flex items-center gap-2">
                  <a
                    href={publication.doiUrl || `https://doi.org/${publication.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-cyan-400 hover:underline flex items-center gap-1 break-all"
                  >
                    <span>{publication.doi}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              ) : (
                <span className="text-slate-500 font-mono text-xs">No DOI registered</span>
              )}
            </div>

            <div className="md:col-span-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Authors / Contributors
              </span>
              <p className="text-slate-300 text-xs leading-relaxed font-sans">
                {publication.authors}
              </p>
            </div>
          </div>

          {/* Extracted RB Experiment Numbers Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Detected RB Experiment Numbers
              </span>
              <span className="text-xs font-mono text-slate-500">
                {publication.rbExperimentNumbers.length} identified
              </span>
            </div>

            {publication.rbExperimentNumbers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {publication.rbExperimentNumbers.map((rb) => (
                  <div
                    key={rb}
                    className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-md font-mono text-xs font-semibold shadow-sm"
                  >
                    <span>{rb}</span>
                    <button
                      onClick={() => copyToClipboard(rb, rb)}
                      className="p-1 hover:bg-emerald-900/60 rounded text-emerald-400 hover:text-emerald-200 transition-colors"
                      title="Copy RB Number"
                    >
                      {copiedRb === rb ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    </button>
                    <a
                      href={`https://doi.org/10.5286/ISIS.E.${rb}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-emerald-900/60 rounded text-emerald-400 hover:text-emerald-200 transition-colors"
                      title="Inspect ISIS Data Repository Record"
                    >
                      <Database className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-950/40 border border-slate-800 rounded-md p-3 text-xs text-slate-500 font-mono">
                No RB experiment numbers detected in DOI text or ePubs metadata.
              </div>
            )}
          </div>

          {/* Acknowledgement Sentences */}
          {publication.acknowledgements.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Extracted Beamtime Allocation Acknowledgement Clauses
              </span>
              <div className="space-y-2">
                {publication.acknowledgements.map((ack, idx) => (
                  <div
                    key={idx}
                    className="bg-amber-950/30 border border-amber-600/30 text-amber-200 p-3 rounded-md text-xs font-sans italic leading-relaxed"
                  >
                    "{ack}"
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Evidence Snippets & Sources */}
          {publication.matchedSnippets.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                Raw Text Evidence Snippets
              </span>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {publication.matchedSnippets.map((snip, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 border border-slate-800 p-3 rounded-md text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span className="text-cyan-400 font-medium">{snip.source}</span>
                      <span className="text-emerald-400 font-bold">{snip.rb}</span>
                    </div>
                    <div className="text-slate-300 font-mono bg-slate-900/60 p-2 rounded border border-slate-800/80 break-words whitespace-pre-wrap">
                      {snip.snippet}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resolution Diagnostics */}
          <div className="border-t border-slate-800 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span>DOI Resolver Status:</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  publication.doiResolutionStatus === 'resolved'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : publication.doiResolutionStatus === 'redirected'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                    : publication.doiResolutionStatus === 'blocked_by_publisher'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {publication.doiResolutionStatus.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {publication.epubsUrl && (
                <a
                  href={publication.epubsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>View in STFC ePubs</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
