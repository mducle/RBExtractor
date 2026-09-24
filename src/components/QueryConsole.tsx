import React, { useState, useEffect } from 'react';
import {
  Search,
  Loader2,
  Sparkles,
  RefreshCw,
  X,
  ChevronDown,
  Calendar,
  Filter,
  RotateCcw,
  Check
} from 'lucide-react';
import { PresetQuery } from '../types';

interface QueryConsoleProps {
  currentQuery: string;
  yearFrom: string;
  yearTo: string;
  activeFilterYear: string | null;
  onSearch: (query: string, limit: number, fromYear?: string, toYear?: string) => void;
  onClearYearFilter: () => void;
  isLoading: boolean;
  selectedLimit: number;
}

export const QueryConsole: React.FC<QueryConsoleProps> = ({
  currentQuery,
  yearFrom,
  yearTo,
  activeFilterYear,
  onSearch,
  onClearYearFilter,
  isLoading,
  selectedLimit,
}) => {
  const [searchInput, setSearchInput] = useState(currentQuery);
  const [limit, setLimit] = useState(selectedLimit);
  const [fromInput, setFromInput] = useState(yearFrom);
  const [toInput, setToInput] = useState(yearTo);
  const [presets, setPresets] = useState<PresetQuery[]>([]);

  // Sync inputs if parent state updates
  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    setFromInput(yearFrom);
  }, [yearFrom]);

  useEffect(() => {
    setToInput(yearTo);
  }, [yearTo]);

  useEffect(() => {
    fetch('/api/presets')
      .then((res) => res.json())
      .then((data) => {
        if (data.presets) setPresets(data.presets);
      })
      .catch((err) => console.warn('Failed to load presets:', err));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    onSearch(searchInput.trim(), limit, fromInput.trim(), toInput.trim());
  };

  const handleSelectPreset = (preset: PresetQuery) => {
    setSearchInput(preset.query);
    onSearch(preset.query, limit, fromInput.trim(), toInput.trim());
  };

  const handleQuickYear = (from: string, to: string) => {
    setFromInput(from);
    setToInput(to);
    onSearch(searchInput.trim(), limit, from, to);
  };

  const handleResetYear = () => {
    setFromInput('');
    setToInput('');
    onClearYearFilter();
    onSearch(searchInput.trim(), limit, '', '');
  };

  const currentYear = new Date().getFullYear();

  const QUICK_YEARS = [
    { label: 'All Years', from: '', to: '' },
    { label: '2024–2026 (Recent)', from: '2024', to: '2026' },
    { label: '2021–2026 (5y)', from: '2021', to: '2026' },
    { label: '2016–2020', from: '2016', to: '2020' },
    { label: '2010–2015', from: '2010', to: '2015' },
  ];

  const hasActiveYearFilter = Boolean(activeFilterYear || fromInput.trim() || toInput.trim());

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 mb-6 shadow-lg backdrop-blur-sm space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Main Query Bar & Limit & Submit */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search STFC ePubs (e.g. 'beamtime allocation', ISIS, neutron, author, or keyword)..."
              disabled={isLoading}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-10 pr-9 py-2.5 text-sm text-slate-100 placeholder-slate-500 font-sans focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all disabled:opacity-60"
            />
            {searchInput && !isLoading && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Record Limit Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-slate-400 whitespace-nowrap hidden sm:inline">
              Fetch Limit:
            </label>
            <div className="relative">
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                disabled={isLoading}
                aria-label="Fetch Limit"
                className="appearance-none bg-slate-950 border border-slate-700/80 rounded-lg pl-3 pr-8 py-2.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer disabled:opacity-60"
              >
                <option value={5}>5 Works</option>
                <option value={10}>10 Works</option>
                <option value={20}>20 Works</option>
                <option value={35}>35 Works</option>
                <option value={50}>50 Works</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-500">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Execute Query Button */}
            <button
              type="submit"
              disabled={isLoading || !searchInput.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs tracking-wide uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Scanning ePubs & DOIs...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Query & Extract</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Year Range Filter Controls */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          {/* Quick Year Range Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 mr-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Year Range:</span>
            </span>

            {QUICK_YEARS.map((qy) => {
              const isSelected =
                (qy.from === '' && qy.to === '' && !fromInput && !toInput) ||
                (qy.from === fromInput && qy.to === toInput);

              return (
                <button
                  key={qy.label}
                  type="button"
                  onClick={() => handleQuickYear(qy.from, qy.to)}
                  disabled={isLoading}
                  className={`text-xs px-2.5 py-1 rounded-md transition-all font-mono border cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-semibold shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                      : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {qy.label}
                </button>
              );
            })}
          </div>

          {/* Custom Year Inputs & Apply / Clear */}
          <div className="flex items-center gap-2 self-start lg:self-auto bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1.5">
              <label htmlFor="filterYearFrom" className="text-[11px] font-mono text-slate-400">
                From:
              </label>
              <input
                id="filterYearFrom"
                type="number"
                min={1970}
                max={currentYear + 1}
                value={fromInput}
                onChange={(e) => setFromInput(e.target.value)}
                placeholder="1970"
                disabled={isLoading}
                className="w-18 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <span className="text-slate-500 font-mono text-xs">–</span>

            <div className="flex items-center gap-1.5">
              <label htmlFor="filterYearTo" className="text-[11px] font-mono text-slate-400">
                To:
              </label>
              <input
                id="filterYearTo"
                type="number"
                min={1970}
                max={currentYear + 1}
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                placeholder={String(currentYear)}
                disabled={isLoading}
                className="w-18 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || (!fromInput && !toInput)}
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Apply
            </button>

            {hasActiveYearFilter && (
              <button
                type="button"
                onClick={handleResetYear}
                disabled={isLoading}
                title="Reset Year Range filter"
                className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 3: Curated Facility Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/70">
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Curated Facility Presets:
          </span>
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              disabled={isLoading}
              title={preset.description}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors border cursor-pointer ${
                searchInput === preset.query
                  ? 'bg-cyan-950/70 border-cyan-500/60 text-cyan-300 font-medium'
                  : 'bg-slate-950/50 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
};
