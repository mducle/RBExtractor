import React from 'react';
import { Layers, CheckCircle2, AlertCircle, FileSearch, Sparkles } from 'lucide-react';
import { ExtractedPublication } from '../types';

interface StatsRibbonProps {
  publications: ExtractedPublication[];
  totalOnPage: number;
  isLoading: boolean;
  activeFilterYear?: string | null;
}

export const StatsRibbon: React.FC<StatsRibbonProps> = ({
  publications,
  totalOnPage,
  isLoading,
  activeFilterYear,
}) => {
  const withDoi = publications.filter((p) => Boolean(p.doi)).length;
  const withRb = publications.filter((p) => p.rbExperimentNumbers.length > 0).length;
  const totalRbs = publications.reduce((acc, p) => acc + p.rbExperimentNumbers.length, 0);
  const withAck = publications.filter((p) => p.acknowledgements.length > 0).length;
  const detectionRate = publications.length > 0 ? Math.round((withRb / publications.length) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {/* Metric 1: Extracted Publications */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3.5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">
            Analyzed Works
          </span>
          <Layers className="w-4 h-4 text-cyan-400/80" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-100 tabular-nums">
            {isLoading ? '...' : publications.length}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            of {totalOnPage} ePubs results
          </span>
        </div>
        {activeFilterYear && (
          <div className="text-[10px] text-cyan-400 font-mono mt-0.5 truncate">
            Years: {activeFilterYear}
          </div>
        )}
        <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
          <div
            className="bg-cyan-500 h-full transition-all duration-500"
            style={{ width: `${publications.length ? Math.min(100, (publications.length / (totalOnPage || 1)) * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* Metric 2: DOI Coverage */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3.5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">
            DOIs Resolved
          </span>
          <FileSearch className="w-4 h-4 text-blue-400/80" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-100 tabular-nums">
            {isLoading ? '...' : withDoi}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            ({publications.length ? Math.round((withDoi / publications.length) * 100) : 0}%)
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1 rounded-full mt-2.5 overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-500"
            style={{ width: `${publications.length ? (withDoi / publications.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Metric 3: RB Experiment Numbers Detected */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3.5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">
            RB Experiments
          </span>
          <Sparkles className="w-4 h-4 text-emerald-400/80" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-emerald-400 tabular-nums">
            {isLoading ? '...' : totalRbs}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            in {withRb} papers
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1 rounded-full mt-2.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${detectionRate}%` }}
          />
        </div>
      </div>

      {/* Metric 4: Beamtime Acknowledgements */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-3.5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">
            Beamtime Phrases
          </span>
          <CheckCircle2 className="w-4 h-4 text-amber-400/80" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-amber-300 tabular-nums">
            {isLoading ? '...' : withAck}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            explicit grant clauses
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1 rounded-full mt-2.5 overflow-hidden">
          <div
            className="bg-amber-500 h-full transition-all duration-500"
            style={{ width: `${publications.length ? (withAck / publications.length) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};
