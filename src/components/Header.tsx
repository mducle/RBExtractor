import React from 'react';
import { Database, Download, FileJson, Sparkles, BookOpen, ExternalLink } from 'lucide-react';
import { ExtractedPublication } from '../types';

interface HeaderProps {
  publications: ExtractedPublication[];
  onOpenDirectLookup: () => void;
}

export const Header: React.FC<HeaderProps> = ({ publications, onOpenDirectLookup }) => {
  const exportCsv = () => {
    if (publications.length === 0) return;
    const headers = ['Title', 'Authors', 'Year', 'DOI', 'RB_Experiment_Numbers', 'Beamtime_Acknowledgements', 'ePubs_URL', 'DOI_URL'];
    const rows = publications.map((p) => [
      `"${(p.title || '').replace(/"/g, '""')}"`,
      `"${(p.authors || '').replace(/"/g, '""')}"`,
      `"${p.year || ''}"`,
      `"${p.doi || ''}"`,
      `"${p.rbExperimentNumbers.join('; ')}"`,
      `"${p.acknowledgements.join('; ').replace(/"/g, '""')}"`,
      `"${p.epubsUrl}"`,
      `"${p.doiUrl || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `stfc_epubs_beamtime_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJson = () => {
    if (publications.length === 0) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(publications, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `stfc_epubs_beamtime_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Facility Logo & Identity */}
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider uppercase text-cyan-400 font-mono">
                STFC • UKRI
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-xs text-slate-400 font-mono">ISIS & Diamond Facilities</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
              ePubs Beamtime Extractor
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800 font-mono font-medium">
                RB-DETECTOR v2.4
              </span>
            </h1>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenDirectLookup}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 hover:border-slate-600 transition-colors"
            title="Inspect a single DOI or ePubs Work ID"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Direct DOI Lookup</span>
          </button>

          <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

          <button
            onClick={exportCsv}
            disabled={publications.length === 0}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
              publications.length > 0
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-500/50 cursor-pointer'
                : 'bg-slate-900/40 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={exportJson}
            disabled={publications.length === 0}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
              publications.length > 0
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-500/50 cursor-pointer'
                : 'bg-slate-900/40 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            <FileJson className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">JSON</span>
          </button>

          <a
            href="https://epubs.stfc.ac.uk/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors pl-1"
            title="Visit STFC ePubs repository"
          >
            <span className="hidden md:inline">ePubs Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
};
