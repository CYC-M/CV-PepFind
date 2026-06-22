/**
 * Unit tests for peptideRetrieval.ts
 * Tests the real UniProt database retrieval service
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  retrievePeptidesFromUniProt,
  searchPeptidesBySequence,
  formatRetrievalResultsForLLM,
  type PeptideEntry,
  type RetrievalResult,
} from './peptideRetrieval';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const MOCK_UNIPROT_RESPONSE = {
  results: [
    {
      primaryAccession: 'C0HJU9',
      proteinDescription: {
        recommendedName: {
          fullName: { value: 'Antimicrobial peptide LyeTx 1' },
        },
      },
      sequence: {
        value: 'IWLTALKFLGKNLGKHLAKQQLAKL',
        length: 25,
      },
      organism: {
        scientificName: 'Lycosa erythrognatha',
      },
      keywords: [
        { name: 'Antimicrobial' },
        { name: 'Secreted' },
      ],
      comments: [
        {
          commentType: 'FUNCTION',
          texts: [{ value: 'Has antimicrobial activity against bacteria.' }],
        },
      ],
    },
    {
      primaryAccession: 'P84386',
      proteinDescription: {
        recommendedName: {
          fullName: { value: 'Antimicrobial peptide 6' },
        },
      },
      sequence: {
        value: 'GFLGSLLKTGLKVGSNLL',
        length: 18,
      },
      organism: {
        scientificName: 'Rana temporaria',
      },
      keywords: [
        { name: 'Antimicrobial' },
      ],
      comments: [],
    },
  ],
};

describe('peptideRetrieval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('retrievePeptidesFromUniProt', () => {
    it('should retrieve peptides from UniProt API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_UNIPROT_RESPONSE,
      });

      const result = await retrievePeptidesFromUniProt('antimicrobial peptide', 5);

      expect(result).toBeDefined();
      expect(result.peptides).toHaveLength(2);
      expect(result.source).toContain('UniProt');
      expect(result.retrievedAt).toBeDefined();
    });

    it('should correctly parse peptide entries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_UNIPROT_RESPONSE,
      });

      const result = await retrievePeptidesFromUniProt('antimicrobial', 5);
      const firstPeptide = result.peptides[0];

      expect(firstPeptide.accession).toBe('C0HJU9');
      expect(firstPeptide.name).toBe('Antimicrobial peptide LyeTx 1');
      expect(firstPeptide.sequence).toBe('IWLTALKFLGKNLGKHLAKQQLAKL');
      expect(firstPeptide.length).toBe(25);
      expect(firstPeptide.organism).toBe('Lycosa erythrognatha');
      expect(firstPeptide.keywords).toContain('Antimicrobial');
      expect(firstPeptide.function).toContain('antimicrobial activity');
      expect(firstPeptide.source).toBe('UniProt');
    });

    it('should build correct UniProt query URL for antimicrobial peptides', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      await retrievePeptidesFromUniProt('find antimicrobial peptides', 5);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('rest.uniprot.org');
      expect(calledUrl).toContain('antimicrobial');
      // URL is encoded, so 'reviewed:true' becomes 'reviewed%3Atrue'
      expect(calledUrl).toMatch(/reviewed(%3A|:)true/);
    });

    it('should throw error when UniProt API returns non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      await expect(retrievePeptidesFromUniProt('test', 5)).rejects.toThrow(
        'Failed to retrieve peptides from UniProt'
      );
    });

    it('should filter out sequences shorter than 3 or longer than 100 aa', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              primaryAccession: 'SHORT',
              proteinDescription: { recommendedName: { fullName: { value: 'Short' } } },
              sequence: { value: 'AC', length: 2 }, // Too short
              organism: {},
              keywords: [],
              comments: [],
            },
            {
              primaryAccession: 'VALID',
              proteinDescription: { recommendedName: { fullName: { value: 'Valid' } } },
              sequence: { value: 'ACDEFGHIKLM', length: 11 }, // Valid
              organism: {},
              keywords: [],
              comments: [],
            },
          ],
        }),
      });

      const result = await retrievePeptidesFromUniProt('test', 5);
      expect(result.peptides).toHaveLength(1);
      expect(result.peptides[0].accession).toBe('VALID');
    });

    it('should return empty results when API returns no results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const result = await retrievePeptidesFromUniProt('nonexistent peptide xyz', 5);
      expect(result.peptides).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('searchPeptidesBySequence', () => {
    it('should search peptides by sequence', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_UNIPROT_RESPONSE,
      });

      const result = await searchPeptidesBySequence('IWLTALKFLGKNLGKHLAKQQLAKL', 5);

      expect(result).toBeDefined();
      expect(result.peptides.length).toBeGreaterThanOrEqual(0);
    });

    it('should fall back to keyword search when sequence search fails', async () => {
      // First call (sequence search) fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });
      // Second call (fallback keyword search) succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_UNIPROT_RESPONSE,
      });

      const result = await searchPeptidesBySequence('ACDEF', 5);
      expect(result.peptides.length).toBeGreaterThanOrEqual(0);
      // Should have called fetch twice (sequence search + fallback)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('formatRetrievalResultsForLLM', () => {
    it('should format results as Markdown', () => {
      const mockResult: RetrievalResult = {
        query: 'antimicrobial peptide',
        total: 2,
        peptides: [
          {
            accession: 'C0HJU9',
            name: 'Antimicrobial peptide LyeTx 1',
            sequence: 'IWLTALKFLGKNLGKHLAKQQLAKL',
            length: 25,
            organism: 'Lycosa erythrognatha',
            keywords: ['Antimicrobial', 'Secreted'],
            function: 'Has antimicrobial activity.',
            source: 'UniProt',
          },
        ],
        source: 'UniProt REST API',
        retrievedAt: '2026-06-22T00:00:00.000Z',
      };

      const formatted = formatRetrievalResultsForLLM(mockResult);

      expect(formatted).toContain('## Real Peptide Database Results');
      expect(formatted).toContain('C0HJU9');
      expect(formatted).toContain('Antimicrobial peptide LyeTx 1');
      expect(formatted).toContain('IWLTALKFLGKNLGKHLAKQQLAKL');
      expect(formatted).toContain('Lycosa erythrognatha');
      expect(formatted).toContain('UniProt');
    });

    it('should return "no results" message when peptides array is empty', () => {
      const emptyResult: RetrievalResult = {
        query: 'nonexistent',
        total: 0,
        peptides: [],
        source: 'UniProt REST API',
        retrievedAt: '2026-06-22T00:00:00.000Z',
      };

      const formatted = formatRetrievalResultsForLLM(emptyResult);
      expect(formatted).toContain('No peptides found');
    });

    it('should include sequence in monospace format', () => {
      const result: RetrievalResult = {
        query: 'test',
        total: 1,
        peptides: [{
          accession: 'TEST1',
          name: 'Test Peptide',
          sequence: 'ACDEFGHIKLM',
          length: 11,
          source: 'UniProt',
        }],
        source: 'UniProt REST API',
        retrievedAt: '2026-06-22T00:00:00.000Z',
      };

      const formatted = formatRetrievalResultsForLLM(result);
      // Sequence should be in backtick monospace format
      expect(formatted).toContain('`ACDEFGHIKLM`');
    });
  });
});
