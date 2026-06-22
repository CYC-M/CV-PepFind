/**
 * pdbRetrieval.ts — RCSB PDB Structure Database Integration
 *
 * Provides two main capabilities:
 * 1. searchPdbByName / searchPdbBySequence — find PDB IDs via RCSB Search API
 * 2. fetchPdbFile — download the actual PDB file content from RCSB Files API
 *
 * APIs used:
 * - RCSB Search API: https://search.rcsb.org/rcsbsearch/v2/query
 * - RCSB GraphQL API: https://data.rcsb.org/graphql
 * - RCSB Files API: https://files.rcsb.org/download/{ID}.pdb
 */

const RCSB_SEARCH_URL = 'https://search.rcsb.org/rcsbsearch/v2/query';
const RCSB_GRAPHQL_URL = 'https://data.rcsb.org/graphql';
const RCSB_FILES_BASE = 'https://files.rcsb.org/download';

const FETCH_TIMEOUT_MS = 15_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PdbEntry {
  /** 4-character PDB ID, e.g. "2NAL" */
  pdbId: string;
  /** Human-readable title from PDB header */
  title: string;
  /** Experimental method, e.g. "X-RAY DIFFRACTION", "SOLUTION NMR" */
  method: string | null;
  /** Resolution in Angstroms (null for NMR) */
  resolution: number | null;
  /** Primary sequence of the first polymer chain */
  sequence: string | null;
  /** Organism source */
  organism: string | null;
  /** Release date */
  releaseDate: string | null;
  /** Direct link to RCSB page */
  rcsbUrl: string;
}

export interface PdbStructureResult {
  /** The query that was used */
  query: string;
  /** Best-match PDB entry metadata */
  entry: PdbEntry | null;
  /** Full PDB file content (text) */
  pdbFileContent: string | null;
  /** Whether the PDB data is real (true) or simulated (false) */
  isRealData: boolean;
  /** Source label for UI display */
  source: string;
  /** ISO timestamp of retrieval */
  retrievedAt: string;
  /** Error message if partial failure */
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * Search RCSB for PDB entries matching a free-text query.
 * Returns up to `limit` PDB IDs ordered by score.
 */
export async function searchPdbIds(query: string, limit = 5): Promise<string[]> {
  const body = {
    query: {
      type: 'terminal',
      service: 'full_text',
      parameters: { value: query },
    },
    return_type: 'entry',
    request_options: {
      paginate: { start: 0, rows: limit },
      sort: [{ sort_by: 'score', direction: 'desc' }],
    },
  };

  const res = await fetchWithTimeout(RCSB_SEARCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'CV-PepFind/1.0' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`RCSB Search API error ${res.status}: ${res.statusText}`);
  }

  const data = await res.json() as { result_set?: Array<{ identifier: string }> };
  return (data.result_set ?? []).map(r => r.identifier);
}

/**
 * Search RCSB for PDB entries by amino acid sequence (sequence motif search).
 * Falls back to full-text search if sequence search returns no results.
 */
export async function searchPdbIdsBySequence(sequence: string, limit = 5): Promise<string[]> {
  // RCSB sequence motif search
  const body = {
    query: {
      type: 'terminal',
      service: 'sequence',
      parameters: {
        evalue_cutoff: 1,
        identity_cutoff: 0.5,
        sequence_type: 'protein',
        value: sequence,
      },
    },
    return_type: 'entry',
    request_options: {
      paginate: { start: 0, rows: limit },
      sort: [{ sort_by: 'score', direction: 'desc' }],
    },
  };

  try {
    const res = await fetchWithTimeout(RCSB_SEARCH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'CV-PepFind/1.0' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json() as { result_set?: Array<{ identifier: string }> };
      const ids = (data.result_set ?? []).map(r => r.identifier);
      if (ids.length > 0) return ids;
    }
  } catch {
    // Fall through to text search
  }

  // Fallback: use sequence as full-text query
  return searchPdbIds(sequence, limit);
}

/**
 * Fetch metadata for a specific PDB entry via GraphQL.
 */
export async function fetchPdbMetadata(pdbId: string): Promise<PdbEntry | null> {
  const gql = `{
    entry(entry_id: "${pdbId.toUpperCase()}") {
      struct { title }
      exptl { method }
      rcsb_entry_info { resolution_combined }
      rcsb_accession_info { initial_release_date }
      polymer_entities {
        rcsb_polymer_entity { pdbx_description }
        entity_poly { pdbx_seq_one_letter_code_can }
        rcsb_entity_source_organism { ncbi_scientific_name }
      }
    }
  }`;

  const res = await fetchWithTimeout(RCSB_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'CV-PepFind/1.0' },
    body: JSON.stringify({ query: gql }),
  });

  if (!res.ok) return null;

  const json = await res.json() as {
    data?: {
      entry?: {
        struct?: { title?: string };
        exptl?: Array<{ method?: string }>;
        rcsb_entry_info?: { resolution_combined?: number[] };
        rcsb_accession_info?: { initial_release_date?: string };
        polymer_entities?: Array<{
          rcsb_polymer_entity?: { pdbx_description?: string };
          entity_poly?: { pdbx_seq_one_letter_code_can?: string };
          rcsb_entity_source_organism?: Array<{ ncbi_scientific_name?: string }>;
        }>;
      };
    };
  };

  const entry = json?.data?.entry;
  if (!entry) return null;

  const firstEntity = entry.polymer_entities?.[0];
  const resolution = entry.rcsb_entry_info?.resolution_combined?.[0] ?? null;

  return {
    pdbId: pdbId.toUpperCase(),
    title: entry.struct?.title ?? pdbId,
    method: entry.exptl?.[0]?.method ?? null,
    resolution: resolution ?? null,
    sequence: firstEntity?.entity_poly?.pdbx_seq_one_letter_code_can ?? null,
    organism: firstEntity?.rcsb_entity_source_organism?.[0]?.ncbi_scientific_name ?? null,
    releaseDate: entry.rcsb_accession_info?.initial_release_date ?? null,
    rcsbUrl: `https://www.rcsb.org/structure/${pdbId.toUpperCase()}`,
  };
}

/**
 * Download the PDB file content for a given PDB ID.
 * Returns the raw PDB text, or null on failure.
 */
export async function fetchPdbFile(pdbId: string): Promise<string | null> {
  const url = `${RCSB_FILES_BASE}/${pdbId.toUpperCase()}.pdb`;
  try {
    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'CV-PepFind/1.0' },
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Basic validation: PDB files start with HEADER or ATOM records
    if (!text.includes('ATOM') && !text.includes('HETATM') && !text.includes('HEADER')) {
      return null;
    }
    return text;
  } catch {
    return null;
  }
}

/**
 * Main entry point: given a molecule name or description, find the best-matching
 * PDB structure and return both its metadata and the PDB file content.
 *
 * Strategy:
 * 1. Search RCSB for PDB IDs matching the query
 * 2. Fetch metadata for the top result
 * 3. Download the PDB file
 */
export async function lookupPdbStructure(query: string): Promise<PdbStructureResult> {
  const retrievedAt = new Date().toISOString();

  try {
    // Step 1: Search for PDB IDs
    const pdbIds = await searchPdbIds(query, 5);

    if (pdbIds.length === 0) {
      return {
        query,
        entry: null,
        pdbFileContent: null,
        isRealData: false,
        source: 'RCSB PDB',
        retrievedAt,
        error: `No PDB entries found for query: "${query}"`,
      };
    }

    // Step 2: Try each PDB ID until we get a valid file
    for (const pdbId of pdbIds) {
      const [metadata, pdbFile] = await Promise.all([
        fetchPdbMetadata(pdbId),
        fetchPdbFile(pdbId),
      ]);

      if (pdbFile) {
        return {
          query,
          entry: metadata,
          pdbFileContent: pdbFile,
          isRealData: true,
          source: `RCSB PDB (${pdbId})`,
          retrievedAt,
        };
      }
    }

    // All PDB IDs failed to download
    const fallbackMeta = await fetchPdbMetadata(pdbIds[0]);
    return {
      query,
      entry: fallbackMeta,
      pdbFileContent: null,
      isRealData: false,
      source: 'RCSB PDB',
      retrievedAt,
      error: 'PDB file download failed for all candidates',
    };
  } catch (err) {
    console.error('[PDB Retrieval] Error:', err);
    return {
      query,
      entry: null,
      pdbFileContent: null,
      isRealData: false,
      source: 'RCSB PDB',
      retrievedAt,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Lookup PDB structure directly by a known PDB ID (e.g. "2NAL").
 */
export async function lookupPdbById(pdbId: string): Promise<PdbStructureResult> {
  const retrievedAt = new Date().toISOString();
  const id = pdbId.toUpperCase().trim();

  try {
    const [metadata, pdbFile] = await Promise.all([
      fetchPdbMetadata(id),
      fetchPdbFile(id),
    ]);

    return {
      query: id,
      entry: metadata,
      pdbFileContent: pdbFile,
      isRealData: !!pdbFile,
      source: `RCSB PDB (${id})`,
      retrievedAt,
      error: pdbFile ? undefined : `Could not download PDB file for ${id}`,
    };
  } catch (err) {
    return {
      query: id,
      entry: null,
      pdbFileContent: null,
      isRealData: false,
      source: 'RCSB PDB',
      retrievedAt,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
