export interface MatchedSnippet {
  source: string;
  snippet: string;
  rb: string;
}

export interface ExtractedPublication {
  id: string;
  workId: string;
  title: string;
  authors: string;
  year: string;
  doi: string | null;
  doiUrl: string | null;
  epubsUrl: string;
  rbExperimentNumbers: string[];
  acknowledgements: string[];
  matchedSnippets: MatchedSnippet[];
  doiResolutionStatus: 'resolved' | 'redirected' | 'blocked_by_publisher' | 'error' | 'no_doi';
  resolvedUrl?: string;
  expressionType?: string;
}

export interface PresetQuery {
  id: string;
  name: string;
  query: string;
  description: string;
}

export interface QueryResponse {
  success: boolean;
  query: string;
  yearFrom?: number | string | null;
  yearTo?: number | string | null;
  filterYear?: string | null;
  page: number;
  totalPages: number;
  totalOnPage: number;
  processedCount: number;
  publications: ExtractedPublication[];
  error?: string;
}
