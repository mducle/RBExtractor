import React, { useState, useMemo } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Search,
  ArrowUpDown,
  Filter,
  Eye,
  Database,
  Sparkles,
  Info,
  CheckCircle2,
  FileQuestion,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ExtractedPublication } from '../types';

interface PublicationsTableProps {
  publications: ExtractedPublication[];
  isLoading: boolean;
  onInspect: (pub: ExtractedPublication) => void;
}

export const PublicationsTable: React.FC<PublicationsTableProps> = ({
  publications,
  isLoading,
  onInspect,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'rb_only' | 'ack_only' | 'no_rb'>('all');
  const [tableSearch, setTableSearch] = useState('');
  const [sortField, setSortField] = useState<'year' | 'title' | 'rbCount'>('year');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [copiedRb, setCopiedRb] = useState<string | null>(null);
  const [expandedAuthors, setExpandedAuthors] = useState<Record<string, boolean>>({});

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRb(id);
    setTimeout(() => setCopiedRb(null), 2000);
  };

  const toggleAuthorExpand = (id: string) => {
    setExpandedAuthors((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredAndSortedPublications = useMemo(() => {
    return publications
      .filter((pub) => {
        // Filter by category
        if (filterMode === 'rb_only' && pub.rbExperimentNumbers.length === 0) return false;
        if (filterMode === 'ack_only' && pub.acknowledgements.length === 0) return false;
        if (filterMode === 'no_rb' && pub.rbExperimentNumbers.length > 0) return false;

        // Filter by text search
        if (tableSearch.trim()) {
          const q = tableSearch.toLowerCase();
          const matchTitle = (pub.title || '').toLowerCase().includes(q);
          const matchAuthors = (pub.authors || '').toLowerCase().includes(q);
          const matchDoi = (pub.doi || '').toLowerCase().includes(q);
          const matchRb = pub.rbExperimentNumbers.some((rb) => rb.toLowerCase().includes(q));
          const matchAck = pub.acknowledgements.some((ack) => ack.toLowerCase().includes(q));
          return matchTitle || matchAuthors || matchDoi || matchRb || matchAck;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortField === 'year') {
          const yA = parseInt(a.year, 10) || 0;
          const yB = parseInt(b.year, 10) || 0;
          return sortDirection === 'desc' ? yB - yA : yA - yB;
        }
        if (sortField === 'title') {
          return sortDirection === 'desc'
            ? b.title.localeCompare(a.title)
            : a.title.localeCompare(b.title);
        }
        if (sortField === 'rbCount') {
          const cA = a.rbExperimentNumbers.length;
          const cB = b.rbExperimentNumbers.length;
          return sortDirection === 'desc' ? cB - cA : cA - cB;
        }
        return 0;
      });
  }, [publications, filterMode, tableSearch, sortField, sortDirection]);

  const toggleSort = (field: 'year' | 'title' | 'rbCount') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Table Toolbar / Filters */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              filterMode === 'all'
                ? 'bg-cyan-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Works ({publications.length})
          </button>
          <button
            onClick={() => setFilterMode('rb_only')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1 ${
              filterMode === 'rb_only'
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>RB Detected ({publications.filter((p) => p.rbExperimentNumbers.length > 0).length})</span>
          </button>
          <button
            onClick={() => setFilterMode('ack_only')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors hidden sm:flex items-center gap-1 ${
              filterMode === 'ack_only'
                ? 'bg-amber-400 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Beamtime Clauses ({publications.filter((p) => p.acknowledgements.length > 0).length})</span>
          </button>
          <button
            onClick={() => setFilterMode('no_rb')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors hidden md:block ${
              filterMode === 'no_rb'
                ? 'bg-slate-700 text-slate-100 font-semibold'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            No RB ({publications.filter((p) => p.rbExperimentNumbers.length === 0).length})
          </button>
        </div>

        {/* In-table search input */}
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Filter table rows..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Main Extracted Publications Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-mono uppercase tracking-wider text-slate-400 select-none">
              <th className="py-3 px-3.5 text-center w-12">#</th>
              <th className="py-3 px-4 min-w-[280px]">
                <button
                  onClick={() => toggleSort('title')}
                  className="flex items-center gap-1.5 hover:text-slate-200"
                >
                  <span>Title</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </button>
              </th>
              <th className="py-3 px-4 min-w-[200px]">Authors</th>
              <th className="py-3 px-3.5 text-center w-24">
                <button
                  onClick={() => toggleSort('year')}
                  className="flex items-center justify-center gap-1 hover:text-slate-200 mx-auto"
                >
                  <span>Year</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </button>
              </th>
              <th className="py-3 px-4 min-w-[190px]">DOI</th>
              <th className="py-3 px-4 min-w-[240px]">
                <button
                  onClick={() => toggleSort('rbCount')}
                  className="flex items-center gap-1.5 hover:text-slate-200"
                >
                  <span>RB Experiment Number</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </button>
              </th>
              <th className="py-3 px-3.5 text-center w-24">Evidence</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/80 text-xs">
            {isLoading && publications.length === 0 ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse bg-slate-900/30">
                  <td className="py-4 px-3.5 text-center">
                    <div className="h-4 w-4 bg-slate-800 rounded mx-auto" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-800 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-800/50 rounded w-1/3" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-3 bg-slate-800 rounded w-5/6" />
                  </td>
                  <td className="py-4 px-3.5 text-center">
                    <div className="h-4 bg-slate-800 rounded w-10 mx-auto" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-4 bg-slate-800 rounded w-32" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="h-6 bg-slate-800 rounded w-28" />
                  </td>
                  <td className="py-4 px-3.5 text-center">
                    <div className="h-6 bg-slate-800 rounded w-14 mx-auto" />
                  </td>
                </tr>
              ))
            ) : filteredAndSortedPublications.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={7} className="py-12 px-4 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700/80 flex items-center justify-center text-slate-400 mx-auto">
                      <FileQuestion className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-200">
                      No matching publications found
                    </h3>
                    <p className="text-xs text-slate-400">
                      Try adjusting your search keyword or selection filters above, or execute one of the curated presets to inspect publications from STFC ePubs.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              filteredAndSortedPublications.map((pub, idx) => {
                const isAuthorExpanded = expandedAuthors[pub.id];
                const authorList = pub.authors || 'Unknown';
                const isLongAuthors = authorList.length > 90;
                const displayAuthors = !isAuthorExpanded && isLongAuthors
                  ? `${authorList.slice(0, 85)}...`
                  : authorList;

                const hasRbs = pub.rbExperimentNumbers.length > 0;
                const hasAcks = pub.acknowledgements.length > 0;

                return (
                  <tr
                    key={pub.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Index */}
                    <td className="py-3.5 px-3.5 text-center font-mono text-slate-400 text-[11px] align-top">
                      {idx + 1}
                    </td>

                    {/* Title */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="space-y-1">
                        <div className="font-medium text-slate-100 group-hover:text-cyan-300 transition-colors leading-snug">
                          {pub.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {pub.expressionType || 'Journal Article'}
                          </span>
                          {pub.epubsUrl && (
                            <a
                              href={pub.epubsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-cyan-400/80 hover:text-cyan-300 font-mono flex items-center gap-0.5 hover:underline"
                              title="View original work on STFC ePubs"
                            >
                              <span>ePubs #{pub.workId}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          {hasAcks && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-amber-400" />
                              <span>Beamtime Clause</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Authors */}
                    <td className="py-3.5 px-4 text-slate-300 text-xs align-top leading-relaxed font-sans">
                      <div>
                        {displayAuthors}
                        {isLongAuthors && (
                          <button
                            onClick={() => toggleAuthorExpand(pub.id)}
                            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium ml-1 inline-flex items-center gap-0.5 cursor-pointer"
                          >
                            {isAuthorExpanded ? (
                              <>
                                <span>less</span>
                                <ChevronUp className="w-2.5 h-2.5" />
                              </>
                            ) : (
                              <>
                                <span>more</span>
                                <ChevronDown className="w-2.5 h-2.5" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Year */}
                    <td className="py-3.5 px-3.5 text-center font-mono font-semibold text-cyan-300 align-top tabular-nums text-xs">
                      {pub.year !== 'Unknown' ? pub.year : '—'}
                    </td>

                    {/* DOI */}
                    <td className="py-3.5 px-4 align-top font-mono text-xs">
                      {pub.doi ? (
                        <div className="space-y-1">
                          <a
                            href={pub.doiUrl || `https://doi.org/${pub.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 break-all group/doi"
                            title={`Open DOI: https://doi.org/${pub.doi}`}
                          >
                            <span>{pub.doi}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0 text-cyan-500 opacity-60 group-hover/doi:opacity-100" />
                          </a>
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[9px] px-1 rounded uppercase tracking-wider ${
                                pub.doiResolutionStatus === 'resolved'
                                  ? 'text-emerald-400 bg-emerald-950/60'
                                  : pub.doiResolutionStatus === 'redirected'
                                  ? 'text-cyan-300 bg-cyan-950/60'
                                  : pub.doiResolutionStatus === 'blocked_by_publisher'
                                  ? 'text-amber-400 bg-amber-950/60'
                                  : 'text-slate-500'
                              }`}
                            >
                              {pub.doiResolutionStatus === 'blocked_by_publisher'
                                ? 'Cloudflare Protected'
                                : pub.doiResolutionStatus}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] italic">No DOI</span>
                      )}
                    </td>

                    {/* RB Experiment Number */}
                    <td className="py-3.5 px-4 align-top">
                      {hasRbs ? (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {pub.rbExperimentNumbers.map((rb) => {
                            const copyKey = `${pub.id}-${rb}`;
                            const isCopied = copiedRb === copyKey;
                            return (
                              <div
                                key={rb}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-semibold shadow-sm group/rb hover:border-emerald-400 transition-colors"
                              >
                                <span>{rb}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(rb, copyKey)}
                                  className="p-0.5 hover:bg-emerald-900/80 rounded text-emerald-400 hover:text-emerald-200 transition-colors cursor-pointer"
                                  title="Copy RB number"
                                >
                                  {isCopied ? (
                                    <Check className="w-3 h-3 text-emerald-300" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                                <a
                                  href={`https://doi.org/10.5286/ISIS.E.${rb}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-0.5 hover:bg-emerald-900/80 rounded text-emerald-400 hover:text-emerald-200 transition-colors cursor-pointer"
                                  title="View ISIS Facility Dataset DOI: 10.5286/ISIS.E."
                                >
                                  <Database className="w-3 h-3" />
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs font-mono">
                          None detected
                        </span>
                      )}
                    </td>

                    {/* Evidence & Details Action */}
                    <td className="py-3.5 px-3.5 text-center align-top">
                      <button
                        onClick={() => onInspect(pub)}
                        className="px-2.5 py-1 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/50 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="Inspect full extraction evidence and context"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
        <div>
          Showing{' '}
          <span className="text-slate-200 font-semibold">
            {filteredAndSortedPublications.length}
          </span>{' '}
          of{' '}
          <span className="text-slate-200 font-semibold">{publications.length}</span>{' '}
          extracted records
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>RB Experiment Verified</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            <span>DOI Resolved</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span>Beamtime Clause Found</span>
          </span>
        </div>
      </div>
    </div>
  );
};
