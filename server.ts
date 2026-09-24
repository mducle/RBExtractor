import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

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
  matchedSnippets: Array<{ source: string; snippet: string; rb: string }>;
  doiResolutionStatus: 'resolved' | 'redirected' | 'blocked_by_publisher' | 'error' | 'no_doi';
  resolvedUrl?: string;
  expressionType?: string;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Helper to extract RB experiment numbers and beamtime allocation acknowledgements
function extractRbAndAcknowledgements(text: string, source: string) {
  const rbs = new Set<string>();
  const acknowledgements: string[] = [];
  const matchedSnippets: Array<{ source: string; snippet: string; rb: string }> = [];

  if (!text) return { rbs: [], acknowledgements: [], matchedSnippets: [] };

  // 1. Specific regex for "supported by beamtime allocation RB#######" and variants
  const beamtimeRegex =
    /(?:supported\s+by\s+(?:a\s+)?beamtime\s+allocation[^\n\r<.,;]{0,120}?(?:RB\d{5,8}|\(RB\d{5,8}\))|beamtime\s+allocation\s+(?:from\s+[^\n\r<.,;]{0,60}?)?(?:RB\d{5,8}|\(RB\d{5,8}\))|beamtime\s+allocation\s*\(?RB\d{5,8}\)?)/gi;

  let btMatch;
  while ((btMatch = beamtimeRegex.exec(text)) !== null) {
    const rawMatch = btMatch[0].replace(/\s+/g, ' ').trim();
    if (!acknowledgements.includes(rawMatch)) {
      acknowledgements.push(rawMatch);
    }
    const innerRb = rawMatch.match(/RB\d{5,8}/i);
    if (innerRb) {
      const code = innerRb[0].toUpperCase();
      rbs.add(code);
      if (!matchedSnippets.some((s) => s.rb === code && s.snippet === rawMatch)) {
        matchedSnippets.push({
          source: `${source} (Acknowledgement)`,
          snippet: rawMatch,
          rb: code,
        });
      }
    }
  }

  // 2. References of the form RB####### (5 to 8 digits)
  const rbRegex = /\b(RB\d{5,8})\b/gi;
  let rbMatch;
  while ((rbMatch = rbRegex.exec(text)) !== null) {
    const code = rbMatch[1].toUpperCase();
    rbs.add(code);

    const start = Math.max(0, rbMatch.index - 50);
    const end = Math.min(text.length, rbMatch.index + code.length + 70);
    const rawSnippet = text.slice(start, end).replace(/\s+/g, ' ').trim();

    if (!matchedSnippets.some((s) => s.rb === code && s.source.startsWith(source))) {
      matchedSnippets.push({
        source,
        snippet: `...${rawSnippet}...`,
        rb: code,
      });
    }
  }

  // 3. Check for ISIS dataset DOIs of the format 10.5286/ISIS.E.RB#######
  const isisDoiRegex = /10\.5286\/ISIS\.E\.(RB\d{5,8})/gi;
  let isisMatch;
  while ((isisMatch = isisDoiRegex.exec(text)) !== null) {
    const code = isisMatch[1].toUpperCase();
    rbs.add(code);
    if (!matchedSnippets.some((s) => s.rb === code && s.source.includes('Dataset'))) {
      matchedSnippets.push({
        source: `${source} (Dataset DOI)`,
        snippet: `Dataset DOI: 10.5286/ISIS.E.${code}`,
        rb: code,
      });
    }
  }

  return {
    rbs: Array.from(rbs),
    acknowledgements,
    matchedSnippets,
  };
}

// Robust HTML fetcher with curl fallback for publisher cookie/transit redirects
async function fetchArticleHtml(doiUrl: string): Promise<{ html: string; status: number; finalUrl: string }> {
  try {
    // Attempt standard fetch first
    const res = await fetch(doiUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(9000),
    });

    const body = await res.text();
    // If body is substantial and not a transit wall, use it
    if (body.length > 10000 && !body.includes('transit?redirect_uri=') && !body.includes('cf-chl-opt')) {
      return { html: body, status: res.status, finalUrl: res.url };
    }
  } catch {
    // Proceed to curl fallback
  }

  // Fallback to curl with cookie jar to handle Nature/Springer IDP and redirects
  try {
    const cookieFile = `/tmp/cookie_${Math.random().toString(36).substring(2, 8)}.txt`;
    const { stdout } = await execFileAsync(
      'curl',
      [
        '-s',
        '-L',
        '--max-time',
        '12',
        '-c',
        cookieFile,
        '-b',
        cookieFile,
        '-H',
        `User-Agent: ${USER_AGENT}`,
        '-H',
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        doiUrl,
      ],
      { maxBuffer: 15 * 1024 * 1024 }
    );

    // Clean up temporary cookie file in background
    execFileAsync('rm', ['-f', cookieFile]).catch(() => {});

    return { html: stdout, status: 200, finalUrl: doiUrl };
  } catch (err: any) {
    return { html: '', status: 500, finalUrl: doiUrl };
  }
}

// Scrape and inspect a single DOI URL + STFC ePubs work page
async function inspectPublication(
  workId: string,
  initialTitle: string,
  initialAuthors: string,
  initialYear: string,
  doi: string | null,
  expressionType: string = 'Journal Article'
): Promise<ExtractedPublication> {
  let title = initialTitle;
  let authors = initialAuthors;
  let year = initialYear;
  let detectedDoi = doi;
  const epubsUrl = workId ? `https://epubs.stfc.ac.uk/work/${workId}` : '';

  const allRbs = new Set<string>();
  const allAcknowledgements: string[] = [];
  const allSnippets: Array<{ source: string; snippet: string; rb: string }> = [];
  let doiStatus: ExtractedPublication['doiResolutionStatus'] = detectedDoi ? 'resolved' : 'no_doi';
  let resolvedUrl: string | undefined;

  // Step 1: Query STFC ePubs work page if we have a work ID
  if (workId) {
    try {
      const epubsRes = await fetch(epubsUrl, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(8000),
      });

      if (epubsRes.ok) {
        const epubsHtml = await epubsRes.text();
        const $e = cheerio.load(epubsHtml);

        const fullTitle = $e('td.full-display-title:contains("Title")').next('td.full-display-value').text().trim();
        if (fullTitle) title = fullTitle;

        const contribPanel = $e('#mainForm\\:contribs, .contribsScrollPanel').text().trim();
        if (contribPanel) {
          const cleanContribs = contribPanel
            .replace(/\s+/g, ' ')
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean)
            .join(', ');
          if (cleanContribs.length > 5) {
            authors = cleanContribs;
          }
        }

        if (!year || year === 'Unknown') {
          const yearCol = $e('#mainForm\\:exprTable td:nth-child(5)').text().trim();
          const matchYear = yearCol.match(/\b(19\d\d|20\d\d)\b/);
          if (matchYear) year = matchYear[1];
        }

        if (!detectedDoi) {
          const doiLink = $e('a[href*="doi.org"]').first().attr('href');
          if (doiLink) {
            const m = doiLink.match(/doi\.org\/(10\.\d{4,9}\/[^\s"']+)/);
            if (m) detectedDoi = m[1];
          }
          const altmetricDoi = $e('.altmetric-embed').attr('data-doi');
          if (altmetricDoi) detectedDoi = altmetricDoi;
        }

        // Check Funding Information and Related Research Objects in STFC work page
        const fundingText = $e('td.full-display-title:contains("Funding Information")')
          .next('td.full-display-value')
          .text()
          .trim();
        const relatedText = $e('td.full-display-title:contains("Related Research Object")')
          .next('td.full-display-value')
          .text()
          .trim();
        const keywordsText = $e('td.full-display-title:contains("Keywords")')
          .next('td.full-display-value')
          .text()
          .trim();

        const combinedEpubsMetadata = [fundingText, relatedText, keywordsText].join(' ');
        const epubsExtracted = extractRbAndAcknowledgements(combinedEpubsMetadata, 'STFC ePubs Record');

        epubsExtracted.rbs.forEach((rb) => allRbs.add(rb));
        epubsExtracted.acknowledgements.forEach((ack) => {
          if (!allAcknowledgements.includes(ack)) allAcknowledgements.push(ack);
        });
        epubsExtracted.matchedSnippets.forEach((snip) => allSnippets.push(snip));
      }
    } catch (err) {
      console.warn(`Failed to inspect ePubs work ${workId}:`, err);
    }
  }

  // Step 2: Search the DOI URL
  if (detectedDoi) {
    // If title or authors are missing (e.g. from direct DOI input), fetch from Crossref
    if (!title || title === 'Untitled Publication' || !authors || authors === 'Unknown Authors') {
      try {
        const crRes = await fetch(`https://api.crossref.org/works/${encodeURIComponent(detectedDoi)}`, {
          headers: { 'User-Agent': 'STFC-Beamtime-Extractor (mailto:research@stfc.ac.uk)' },
          signal: AbortSignal.timeout(5000),
        });
        if (crRes.ok) {
          const crJson = (await crRes.json()) as any;
          const msg = crJson?.message;
          if (msg) {
            if (!title || title === 'Untitled Publication') {
              title = msg.title?.[0] || title;
            }
            if (!authors || authors === 'Unknown Authors') {
              const authorsArr = (msg.author || []).map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean);
              if (authorsArr.length > 0) authors = authorsArr.join(', ');
            }
            if (!year || year === 'Unknown') {
              const pubYear = msg['published-print']?.['date-parts']?.[0]?.[0] || msg['published-online']?.['date-parts']?.[0]?.[0];
              if (pubYear) year = String(pubYear);
            }
          }
        }
      } catch {
        // Ignore Crossref fetch errors
      }
    }

    const currentDoiUrl = `https://doi.org/${detectedDoi}`;
    try {
      const { html, finalUrl } = await fetchArticleHtml(currentDoiUrl);
      resolvedUrl = finalUrl;

      const isCloudflare =
        html.includes('cf-chl-opt') ||
        html.includes('Just a moment...') ||
        html.includes('Enable JavaScript and cookies to continue');

      if (isCloudflare) {
        doiStatus = 'blocked_by_publisher';
      } else if (html.length > 0) {
        doiStatus = resolvedUrl !== currentDoiUrl ? 'redirected' : 'resolved';
      } else {
        doiStatus = 'error';
      }

      if (html) {
        const $doc = cheerio.load(html);
        $doc('script, style, svg, noscript').remove();
        const articleText = $doc.text().replace(/\s+/g, ' ');

        const doiExtracted = extractRbAndAcknowledgements(articleText, 'DOI Article Full Text');
        doiExtracted.rbs.forEach((rb) => allRbs.add(rb));
        doiExtracted.acknowledgements.forEach((ack) => {
          if (!allAcknowledgements.includes(ack)) allAcknowledgements.push(ack);
        });
        doiExtracted.matchedSnippets.forEach((snip) => allSnippets.push(snip));
      }

      // Step 3: If no RB was found yet, check Open Access / Europe PMC API as fallback
      if (allRbs.size === 0) {
        try {
          const epmcUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:${encodeURIComponent(
            detectedDoi
          )}&resultType=core&format=json`;
          const epmcRes = await fetch(epmcUrl, {
            headers: { 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(6000),
          });

          if (epmcRes.ok) {
            const epmcJson = (await epmcRes.json()) as any;
            const record = epmcJson?.resultList?.result?.[0];
            if (record) {
              const abstract = record.abstractText || '';
              const grants = JSON.stringify(record.grantsList || '');
              const epmcText = `${abstract} ${grants}`;
              const epmcExtracted = extractRbAndAcknowledgements(epmcText, 'Europe PMC Metadata');
              epmcExtracted.rbs.forEach((rb) => allRbs.add(rb));
              epmcExtracted.acknowledgements.forEach((ack) => {
                if (!allAcknowledgements.includes(ack)) allAcknowledgements.push(ack);
              });
              epmcExtracted.matchedSnippets.forEach((snip) => allSnippets.push(snip));
            }
          }
        } catch {
          // Ignore EPMC errors
        }
      }
    } catch (err: any) {
      console.warn(`DOI resolution failed for ${detectedDoi}:`, err.message);
      doiStatus = 'error';
    }
  }

  return {
    id: workId || detectedDoi || Math.random().toString(36).substring(2, 9),
    workId,
    title: title || 'Untitled Publication',
    authors: authors || 'Unknown Authors',
    year: year || 'Unknown',
    doi: detectedDoi,
    doiUrl: detectedDoi ? `https://doi.org/${detectedDoi}` : null,
    epubsUrl,
    rbExperimentNumbers: Array.from(allRbs),
    acknowledgements: allAcknowledgements,
    matchedSnippets: allSnippets,
    doiResolutionStatus: doiStatus,
    resolvedUrl,
    expressionType,
  };
}

// Route: Query STFC ePubs search and inspect DOIs
app.post('/api/query', async (req, res) => {
  const { query = 'ISIS beamtime', page = 1, limit = 10, yearFrom, yearTo, filterYear } = req.body;

  let resolvedFilterYear: string | null = null;
  const currentYear = new Date().getFullYear();

  if (filterYear && typeof filterYear === 'string' && filterYear.trim()) {
    resolvedFilterYear = filterYear.trim();
  } else if (yearFrom || yearTo) {
    const fromNum = yearFrom ? parseInt(String(yearFrom).trim(), 10) : null;
    const toNum = yearTo ? parseInt(String(yearTo).trim(), 10) : null;

    if (fromNum && toNum) {
      if (fromNum === toNum) {
        resolvedFilterYear = `${fromNum}`;
      } else {
        const minYear = Math.min(fromNum, toNum);
        const maxYear = Math.max(fromNum, toNum);
        resolvedFilterYear = `${minYear}-${maxYear}`;
      }
    } else if (fromNum) {
      resolvedFilterYear = `${fromNum}-${Math.max(fromNum, currentYear + 1)}`;
    } else if (toNum) {
      resolvedFilterYear = `1970-${toNum}`;
    }
  }

  try {
    let searchUrl = `https://epubs.stfc.ac.uk/search/result?q=${encodeURIComponent(query)}&page=${page}`;
    if (resolvedFilterYear) {
      searchUrl += `&filterYear=${encodeURIComponent(resolvedFilterYear)}`;
    }
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });

    if (!searchRes.ok) {
      return res.status(searchRes.status).json({
        error: `STFC ePubs returned status ${searchRes.status}`,
      });
    }

    const html = await searchRes.text();
    const $ = cheerio.load(html);

    // Extract total pages if available
    let totalPages = 1;
    const scriptText = $('script:contains("totalPages")').text();
    const pageMatch = scriptText.match(/totalPages\s*=\s*(\d+)/);
    if (pageMatch) {
      totalPages = parseInt(pageMatch[1], 10);
    }

    const resultElements = $('td.result');
    const itemsToProcess: Array<{
      workId: string;
      title: string;
      authors: string;
      year: string;
      doi: string | null;
      expressionType: string;
    }> = [];

    resultElements.slice(0, Math.min(resultElements.length, limit)).each((_i, el) => {
      const $el = $(el);
      const titleLink = $el.find('.workTitle a');
      const title = titleLink.text().trim() || $el.find('.workTitle').text().trim();
      const href = titleLink.attr('href') || '';
      const workIdMatch = href.match(/\/work\/(\d+)/);
      const workId = workIdMatch ? workIdMatch[1] : '';

      const authors = $el.find('.workContrib').text().replace(/\s+/g, ' ').trim() || 'Unknown Authors';

      // Find DOI
      let doi = $el.find('.altmetric-embed').attr('data-doi') || null;
      if (!doi) {
        const doiHref = $el.find('a[href*="doi.org"]').attr('href');
        if (doiHref) {
          const m = doiHref.match(/doi\.org\/(10\.\d{4,9}\/[^\s"']+)/);
          if (m) doi = m[1];
        }
      }
      if (!doi) {
        const directDoiText = $el.find('a.manifest, a.remote-file').text();
        const m = directDoiText.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);
        if (m) doi = m[0];
      }

      // Year
      const expressionsText = $el.find('.workEpressions').text();
      const yearMatch = expressionsText.match(/\b(19\d\d|20\d\d)\b/);
      const year = yearMatch ? yearMatch[1] : 'Unknown';

      // Type
      const typeMatch = expressionsText.match(/^(Journal Article|Conference Item|Thesis|Book|Report):/i);
      const expressionType = typeMatch ? typeMatch[1] : 'Publication';

      itemsToProcess.push({
        workId,
        title,
        authors,
        year,
        doi,
        expressionType,
      });
    });

    // Inspect each publication concurrently (bounded concurrency of 5)
    const publications: ExtractedPublication[] = [];
    const concurrency = 4;
    for (let i = 0; i < itemsToProcess.length; i += concurrency) {
      const chunk = itemsToProcess.slice(i, i + concurrency);
      const results = await Promise.all(
        chunk.map((item) =>
          inspectPublication(item.workId, item.title, item.authors, item.year, item.doi, item.expressionType)
        )
      );
      publications.push(...results);
    }

    return res.json({
      success: true,
      query,
      yearFrom: yearFrom || null,
      yearTo: yearTo || null,
      filterYear: resolvedFilterYear,
      page,
      totalPages,
      totalOnPage: resultElements.length,
      processedCount: publications.length,
      publications,
    });
  } catch (error: any) {
    console.error('Error querying STFC ePubs:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error while querying STFC ePubs',
    });
  }
});

// Route: Inspect single DOI or ePubs URL directly
app.post('/api/inspect-single', async (req, res) => {
  const { input } = req.body;
  if (!input) {
    return res.status(400).json({ error: 'Missing input parameter' });
  }

  try {
    const trimmed = input.trim();
    let workId = '';
    let doi: string | null = null;

    if (trimmed.includes('epubs.stfc.ac.uk/work/')) {
      const m = trimmed.match(/\/work\/(\d+)/);
      if (m) workId = m[1];
    } else if (trimmed.startsWith('10.') || trimmed.includes('doi.org/10.')) {
      const m = trimmed.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);
      if (m) doi = m[0];
    } else if (/^\d+$/.test(trimmed)) {
      workId = trimmed;
    }

    const pub = await inspectPublication(workId, '', '', '', doi);
    return res.json({ success: true, publication: pub });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Route: Curated presets
app.get('/api/presets', (_req, res) => {
  res.json({
    presets: [
      {
        id: 'isis-beamtime',
        name: 'ISIS Beamtime Allocations',
        query: 'ISIS beamtime',
        description: 'Publications citing ISIS Pulsed Neutron and Muon Source beamtime experiments.',
      },
      {
        id: 'beamtime-allocation-explicit',
        name: 'Explicit Beamtime Phrases',
        query: '"beamtime allocation"',
        description: 'Records explicitly containing the phrase "beamtime allocation".',
      },
      {
        id: 'neutron-diffraction',
        name: 'Neutron Diffraction Allocations',
        query: 'neutron beamtime allocation',
        description: 'Neutron scattering and crystallography beamtime allocations.',
      },
      {
        id: 'muon-spectroscopy',
        name: 'Muon Facility Allocations',
        query: 'muon beamtime',
        description: 'Muon spin rotation (muSR) beamtime allocations.',
      },
      {
        id: 'recent-additions',
        name: 'STFC Recent Additions',
        query: 'ISIS',
        description: 'Latest research added to the STFC open archive.',
      },
    ],
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`STFC ePubs Extractor server running on port ${PORT}`);
  });
}

startServer();
