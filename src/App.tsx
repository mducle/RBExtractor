import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StatsRibbon } from './components/StatsRibbon';
import { QueryConsole } from './components/QueryConsole';
import { PublicationsTable } from './components/PublicationsTable';
import { DetailModal } from './components/DetailModal';
import { DirectLookupModal } from './components/DirectLookupModal';
import { ExtractedPublication, QueryResponse } from './types';
import { Database, Sparkles, BookOpen, AlertCircle, CheckCircle2, Info, ArrowUpRight, Calendar, X } from 'lucide-react';

export default function App() {
  const [publications, setPublications] = useState<ExtractedPublication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('"beamtime allocation"');
  const [selectedLimit, setSelectedLimit] = useState(10);
  const [yearFrom, setYearFrom] = useState<string>('');
  const [yearTo, setYearTo] = useState<string>('');
  const [activeFilterYear, setActiveFilterYear] = useState<string | null>(null);
  const [totalOnPage, setTotalOnPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedPubForInspect, setSelectedPubForInspect] = useState<ExtractedPublication | null>(null);
  const [isDirectLookupOpen, setIsDirectLookupOpen] = useState(false);

  // Perform query to backend with optional year range
  const executeQuery = async (
    query: string,
    limit: number,
    fromYear?: string,
    toYear?: string
  ) => {
    setIsLoading(true);
    setError(null);
    setCurrentQuery(query);
    setSelectedLimit(limit);

    const effYearFrom = fromYear !== undefined ? fromYear : yearFrom;
    const effYearTo = toYear !== undefined ? toYear : yearTo;
    setYearFrom(effYearFrom);
    setYearTo(effYearTo);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          limit,
          yearFrom: effYearFrom || undefined,
          yearTo: effYearTo || undefined,
        }),
      });

      const data: QueryResponse = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to query STFC ePubs');
      }

      setPublications(data.publications);
      setTotalOnPage(data.totalOnPage);
      setActiveFilterYear(data.filterYear || null);
    } catch (err: any) {
      console.error('Extraction error:', err);
      setError(err.message || 'An error occurred while querying and extracting publication data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearYearFilter = () => {
    setYearFrom('');
    setYearTo('');
    setActiveFilterYear(null);
  };

  // Initial load
  useEffect(() => {
    executeQuery('"beamtime allocation"', 10, '', '');
  }, []);

  const handleDirectResult = (pub: ExtractedPublication) => {
    setPublications((prev) => {
      // Prepend if not already present
      const exists = prev.some((p) => p.id === pub.id || (pub.doi && p.doi === pub.doi));
      if (exists) {
        return prev.map((p) => (p.id === pub.id || (pub.doi && p.doi === pub.doi) ? pub : p));
      }
      return [pub, ...prev];
    });
    setSelectedPubForInspect(pub);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <Header
        publications={publications}
        onOpenDirectLookup={() => setIsDirectLookupOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Facility Context Banner */}
        <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/20 rounded-xl p-4 sm:p-5 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                  <Database className="w-3 h-3 mr-1 text-cyan-400" />
                  epubs.stfc.ac.uk
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Scientific Repository Pipeline
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                STFC Research Output & Beamtime Allocation Extractor
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Queries the Science and Technology Facilities Council (STFC) ePubs repository, extracts core bibliographic metadata (<strong>Title</strong>, <strong>Authors</strong>, <strong>Year</strong>, <strong>DOI</strong>), and autonomously inspects the resolved DOI article full-text and registry for beamtime proposal numbers (<strong>RB#######</strong>) and formal acknowledgement clauses (<strong>"supported by beamtime allocation RB#######"</strong>).
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center">
              <button
                onClick={() => setIsDirectLookupOpen(true)}
                className="text-xs font-semibold px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Test Arbitrary DOI</span>
              </button>
            </div>
          </div>
        </div>

        {/* Query & Control Console */}
        <QueryConsole
          currentQuery={currentQuery}
          yearFrom={yearFrom}
          yearTo={yearTo}
          activeFilterYear={activeFilterYear}
          onSearch={executeQuery}
          onClearYearFilter={handleClearYearFilter}
          isLoading={isLoading}
          selectedLimit={selectedLimit}
        />

        {/* Active Year Filter Pill Bar */}
        {activeFilterYear && (
          <div className="flex items-center justify-between bg-cyan-950/40 border border-cyan-500/30 px-4 py-2.5 rounded-lg text-xs font-mono text-cyan-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>
                Active STFC Query Filter:{' '}
                <span className="font-semibold text-white bg-cyan-900/60 px-2 py-0.5 rounded border border-cyan-700/60">
                  Year Range: {activeFilterYear}
                </span>
              </span>
            </div>
            <button
              onClick={() => {
                handleClearYearFilter();
                executeQuery(currentQuery, selectedLimit, '', '');
              }}
              className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-white px-2 py-1 rounded bg-slate-900/80 hover:bg-cyan-900/60 border border-cyan-800/80 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Clear Year Filter</span>
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl flex items-start gap-3 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-red-300">Extraction Notice:</span>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Telemetry Stats Ribbon */}
        <StatsRibbon
          publications={publications}
          totalOnPage={totalOnPage}
          isLoading={isLoading}
          activeFilterYear={activeFilterYear}
        />

        {/* Main Extracted Publications Table */}
        <PublicationsTable
          publications={publications}
          isLoading={isLoading}
          onInspect={(pub) => setSelectedPubForInspect(pub)}
        />

        {/* Technical Explainer / Documentation Footer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 font-mono font-semibold text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>RB Experiment Format</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              ISIS Neutron and Muon Source allocates beamtime under Rutherford Appleton Laboratory experiment proposals formatted as <code className="text-slate-200 font-mono">RB</code> followed by 5–8 digits (e.g. <code className="text-emerald-400 font-mono">RB1520340</code>, <code className="text-emerald-400 font-mono">RB1810221</code>).
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 font-mono font-semibold text-amber-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Beamtime Acknowledgements</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              The scanner recognizes mandatory STFC user clauses such as <em className="text-slate-300">"supported by beamtime allocation from the Science and Technology Facilities Council under proposal RB#######"</em> in journal acknowledgements.
            </p>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 font-mono font-semibold text-blue-400">
              <Database className="w-3.5 h-3.5" />
              <span>DOI Data DOIs</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Experiments are also cross-referenced with ISIS data repository DOIs of the form <code className="text-slate-200 font-mono">10.5286/ISIS.E.RB#######</code>, allowing direct navigation to raw facility neutron and muon datasets.
            </p>
          </div>
        </div>
      </main>

      {/* Slide-over / Modal for Evidence Inspection */}
      <DetailModal
        publication={selectedPubForInspect}
        onClose={() => setSelectedPubForInspect(null)}
      />

      {/* Single DOI / Work ID Analyzer Modal */}
      <DirectLookupModal
        isOpen={isDirectLookupOpen}
        onClose={() => setIsDirectLookupOpen(false)}
        onResultExtracted={handleDirectResult}
      />

      {/* Bottom Legal & Identity Bar */}
      <footer className="border-t border-slate-800 bg-slate-950 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
          <div>
            Data sourced from <a href="https://epubs.stfc.ac.uk/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">epubs.stfc.ac.uk</a> • Rutherford Appleton Laboratory • ISIS Neutron & Muon Source
          </div>
          <div>
            Built with React, TypeScript & Express
          </div>
        </div>
      </footer>
    </div>
  );
}
