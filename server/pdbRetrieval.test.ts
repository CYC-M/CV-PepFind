/**
 * Unit tests for pdbRetrieval.ts
 * Tests the RCSB PDB structure database retrieval service
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  searchPdbIds,
  fetchPdbMetadata,
  fetchPdbFile,
  lookupPdbStructure,
  lookupPdbById,
  type PdbEntry,
} from './pdbRetrieval';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SEARCH_RESPONSE = {
  total_count: 19,
  result_set: [
    { identifier: '2NAL', score: 1.0 },
    { identifier: '2L5M', score: 0.9 },
    { identifier: '6S6N', score: 0.8 },
  ],
};

const MOCK_GRAPHQL_RESPONSE = {
  data: {
    entry: {
      struct: { title: 'NMR STRUCTURE OF RETRO-KR-12' },
      exptl: [{ method: 'SOLUTION NMR' }],
      rcsb_entry_info: { resolution_combined: null },
      rcsb_accession_info: { initial_release_date: '2017-01-18' },
      polymer_entities: [
        {
          rcsb_polymer_entity: { pdbx_description: 'RETRO-KR-12' },
          entity_poly: { pdbx_seq_one_letter_code_can: 'KRIVQRIKDFLRNLVPRTES' },
          rcsb_entity_source_organism: [{ ncbi_scientific_name: 'Synthetic construct' }],
        },
      ],
    },
  },
};

const MOCK_PDB_FILE = `HEADER    ANTIMICROBIAL PROTEIN                   05-JAN-16   2NAL              
TITLE     NMR STRUCTURE OF RETRO-KR-12
ATOM      1  N   LYS A   1       1.000   2.000   3.000  1.00  0.00           N  
ATOM      2  CA  LYS A   1       2.000   3.000   4.000  1.00  0.00           C  
END`;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('pdbRetrieval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchPdbIds', () => {
    it('should return PDB IDs from RCSB search', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_SEARCH_RESPONSE,
      });

      const ids = await searchPdbIds('LL-37 antimicrobial peptide', 3);

      expect(ids).toEqual(['2NAL', '2L5M', '6S6N']);
    });

    it('should call RCSB search API with correct URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_SEARCH_RESPONSE,
      });

      await searchPdbIds('antimicrobial', 5);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('search.rcsb.org');
    });

    it('should return empty array when no results found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total_count: 0, result_set: [] }),
      });

      const ids = await searchPdbIds('nonexistent xyz', 5);
      expect(ids).toEqual([]);
    });

    it('should throw error when RCSB search API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      await expect(searchPdbIds('test', 5)).rejects.toThrow('RCSB Search API error 503');
    });
  });

  describe('fetchPdbMetadata', () => {
    it('should return PDB entry metadata from GraphQL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_GRAPHQL_RESPONSE,
      });

      const entry = await fetchPdbMetadata('2NAL');

      expect(entry).not.toBeNull();
      expect(entry!.pdbId).toBe('2NAL');
      expect(entry!.title).toBe('NMR STRUCTURE OF RETRO-KR-12');
      expect(entry!.method).toBe('SOLUTION NMR');
      expect(entry!.sequence).toBe('KRIVQRIKDFLRNLVPRTES');
      expect(entry!.organism).toBe('Synthetic construct');
      expect(entry!.rcsbUrl).toBe('https://www.rcsb.org/structure/2NAL');
    });

    it('should uppercase the PDB ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_GRAPHQL_RESPONSE,
      });

      const entry = await fetchPdbMetadata('2nal'); // lowercase input
      expect(entry!.pdbId).toBe('2NAL');
    });

    it('should return null when GraphQL returns no data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { entry: null } }),
      });

      const entry = await fetchPdbMetadata('XXXX');
      expect(entry).toBeNull();
    });

    it('should return null when API returns non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const entry = await fetchPdbMetadata('XXXX');
      expect(entry).toBeNull();
    });
  });

  describe('fetchPdbFile', () => {
    it('should return PDB file content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => MOCK_PDB_FILE,
      });

      const content = await fetchPdbFile('2NAL');

      expect(content).not.toBeNull();
      expect(content).toContain('HEADER');
      expect(content).toContain('ATOM');
    });

    it('should uppercase the PDB ID in the URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => MOCK_PDB_FILE,
      });

      await fetchPdbFile('2nal');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('2NAL.pdb');
    });

    it('should return null when API returns non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const content = await fetchPdbFile('XXXX');
      expect(content).toBeNull();
    });

    it('should return null when content does not contain ATOM records', async () => {
      // Note: validation checks for ATOM, HETATM, or HEADER — use content with none of these
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'REMARK 999 This is not a valid PDB file\nREM no structural records here',
      });

      const content = await fetchPdbFile('XXXX');
      expect(content).toBeNull();
    });

    it('should return null when fetch throws (e.g. network error)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const content = await fetchPdbFile('2NAL');
      expect(content).toBeNull();
    });
  });

  describe('lookupPdbStructure', () => {
    it('should return real PDB data when search and download succeed', async () => {
      // Call 1: RCSB search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_SEARCH_RESPONSE,
      });
      // Call 2: GraphQL metadata
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_GRAPHQL_RESPONSE,
      });
      // Call 3: PDB file download
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => MOCK_PDB_FILE,
      });

      const result = await lookupPdbStructure('LL-37 antimicrobial peptide');

      expect(result.isRealData).toBe(true);
      expect(result.pdbFileContent).toContain('ATOM');
      expect(result.entry?.pdbId).toBe('2NAL');
      expect(result.source).toContain('2NAL');
    });

    it('should return isRealData=false when no PDB IDs found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total_count: 0, result_set: [] }),
      });

      const result = await lookupPdbStructure('nonexistent peptide xyz123');

      expect(result.isRealData).toBe(false);
      expect(result.pdbFileContent).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should return isRealData=false when PDB file download fails', async () => {
      // Search succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_SEARCH_RESPONSE,
      });
      // Metadata fetch for first ID
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_GRAPHQL_RESPONSE,
      });
      // PDB file download fails for first ID
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
      // Metadata fetch for second ID
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_GRAPHQL_RESPONSE,
      });
      // PDB file download fails for second ID
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
      // Metadata fetch for third ID
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_GRAPHQL_RESPONSE,
      });
      // PDB file download fails for third ID
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
      // Fallback metadata
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_GRAPHQL_RESPONSE,
      });

      const result = await lookupPdbStructure('test peptide');

      expect(result.isRealData).toBe(false);
      expect(result.pdbFileContent).toBeNull();
    });

    it('should handle unexpected errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const result = await lookupPdbStructure('test');

      expect(result.isRealData).toBe(false);
      expect(result.error).toContain('Network failure');
    });
  });

  describe('lookupPdbById', () => {
    it('should fetch PDB structure by ID directly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_GRAPHQL_RESPONSE,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => MOCK_PDB_FILE,
      });

      const result = await lookupPdbById('2NAL');

      expect(result.isRealData).toBe(true);
      expect(result.query).toBe('2NAL');
      expect(result.pdbFileContent).toContain('ATOM');
      expect(result.entry?.pdbId).toBe('2NAL');
    });

    it('should uppercase the input PDB ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_GRAPHQL_RESPONSE,
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => MOCK_PDB_FILE,
      });

      const result = await lookupPdbById('2nal');
      expect(result.query).toBe('2NAL');
    });

    it('should return isRealData=false when PDB file download fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_GRAPHQL_RESPONSE,
      });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const result = await lookupPdbById('XXXX');

      expect(result.isRealData).toBe(false);
      expect(result.pdbFileContent).toBeNull();
      expect(result.error).toBeDefined();
    });
  });
});
