import { describe, it, expect } from 'vitest';
import {
  smithWatermanAlignment,
  calculateRMSD,
  calculateSimilarityScore,
  formatAlignmentForDisplay,
  getAlignmentStats,
} from './sequenceAlignment';

describe('Sequence Alignment', () => {
  describe('smithWatermanAlignment', () => {
    it('should align identical sequences', () => {
      const seq1 = 'ACGT';
      const seq2 = 'ACGT';
      const result = smithWatermanAlignment(seq1, seq2);

      expect(result.alignment1).toBe('ACGT');
      expect(result.alignment2).toBe('ACGT');
      expect(result.identity).toBe(4);
      expect(result.similarity).toBe(100);
    });

    it('should align similar sequences', () => {
      const seq1 = 'ACGT';
      const seq2 = 'ACCT';
      const result = smithWatermanAlignment(seq1, seq2);

      expect(result.identity).toBeGreaterThan(0);
      expect(result.similarity).toBeGreaterThan(0);
      expect(result.similarity).toBeLessThanOrEqual(100);
    });

    it('should handle sequences with gaps', () => {
      const seq1 = 'ACGTACGT';
      const seq2 = 'ACGT';
      const result = smithWatermanAlignment(seq1, seq2);

      expect(result.alignment1.length).toBeGreaterThan(0);
      expect(result.alignment2.length).toBeGreaterThan(0);
      expect(result.gaps).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty sequences', () => {
      const seq1 = '';
      const seq2 = 'ACGT';
      const result = smithWatermanAlignment(seq1, seq2);

      expect(result.alignment1.length).toBeGreaterThanOrEqual(0);
      expect(result.alignment2.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate alignment score', () => {
      const seq1 = 'ACGTACGT';
      const seq2 = 'ACGTACGT';
      const result = smithWatermanAlignment(seq1, seq2);

      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('calculateRMSD', () => {
    it('should calculate RMSD for identical coordinates', () => {
      const coords1 = [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 1 },
      ];
      const coords2 = [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 1 },
      ];
      const result = calculateRMSD(coords1, coords2);

      expect(result.rmsd).toBeLessThan(0.01);
      expect(result.alignedLength).toBe(2);
    });

    it('should calculate RMSD for different coordinates', () => {
      const coords1 = [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 1 },
      ];
      const coords2 = [
        { x: 1, y: 1, z: 1 },
        { x: 2, y: 3, z: 2 },
      ];
      const result = calculateRMSD(coords1, coords2);

      expect(result.rmsd).toBeGreaterThan(0);
      expect(result.alignedLength).toBe(2);
    });

    it('should handle empty coordinate sets', () => {
      const coords1: Array<{ x: number; y: number; z: number }> = [];
      const coords2: Array<{ x: number; y: number; z: number }> = [];
      const result = calculateRMSD(coords1, coords2);

      expect(result.rmsd).toBe(0);
      expect(result.alignedLength).toBe(0);
    });

    it('should handle mismatched coordinate lengths', () => {
      const coords1 = [{ x: 0, y: 0, z: 0 }];
      const coords2 = [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 1 },
      ];
      const result = calculateRMSD(coords1, coords2);

      expect(result.rmsd).toBe(0);
      expect(result.alignedLength).toBe(0);
    });
  });

  describe('calculateSimilarityScore', () => {
    it('should calculate high similarity for identical sequences', () => {
      const alignment = smithWatermanAlignment('ACGT', 'ACGT');
      const rmsd = {
        rmsd: 0.5,
        alignedLength: 4,
        mismatchCount: 0,
        identityPercent: 100,
      };
      const score = calculateSimilarityScore(alignment, rmsd);

      expect(score.sequenceSimilarity).toBe(100);
      expect(score.overallScore).toBeGreaterThan(80);
      expect(score.description).toBe('Very similar');
    });

    it('should calculate low similarity for different sequences', () => {
      const alignment = smithWatermanAlignment('AAAA', 'TTTT');
      const rmsd = {
        rmsd: 10,
        alignedLength: 4,
        mismatchCount: 4,
        identityPercent: 0,
      };
      const score = calculateSimilarityScore(alignment, rmsd);

      expect(score.overallScore).toBeLessThan(50);
    });

    it('should provide appropriate description based on score', () => {
      const alignment = smithWatermanAlignment('ACGT', 'ACGT');
      const rmsd = {
        rmsd: 5,
        alignedLength: 4,
        mismatchCount: 1,
        identityPercent: 75,
      };
      const score = calculateSimilarityScore(alignment, rmsd);

      expect(['Very similar', 'Similar', 'Moderately similar', 'Weakly similar', 'Dissimilar']).toContain(
        score.description
      );
    });
  });

  describe('formatAlignmentForDisplay', () => {
    it('should format alignment with match lines', () => {
      const alignment = smithWatermanAlignment('ACGTACGT', 'ACGTACGT');
      const formatted = formatAlignmentForDisplay(alignment);

      expect(formatted).toContain('Seq1:');
      expect(formatted).toContain('Seq2:');
      expect(formatted).toContain('|');
    });

    it('should handle long sequences', () => {
      const seq1 = 'A'.repeat(100);
      const seq2 = 'A'.repeat(100);
      const alignment = smithWatermanAlignment(seq1, seq2);
      const formatted = formatAlignmentForDisplay(alignment);

      expect(formatted.length).toBeGreaterThan(0);
      expect(formatted.split('\n').length).toBeGreaterThan(5);
    });
  });

  describe('getAlignmentStats', () => {
    it('should calculate alignment statistics', () => {
      const alignment = smithWatermanAlignment('ACGTACGT', 'ACGTACGT');
      const stats = getAlignmentStats(alignment);

      expect(stats.alignmentLength).toBeGreaterThan(0);
      expect(stats.identityPercent).toBeGreaterThanOrEqual(0);
      expect(stats.identityPercent).toBeLessThanOrEqual(100);
      expect(stats.gapPercent).toBeGreaterThanOrEqual(0);
      expect(stats.gapPercent).toBeLessThanOrEqual(100);
    });

    it('should handle perfect alignment', () => {
      const alignment = smithWatermanAlignment('ACGT', 'ACGT');
      const stats = getAlignmentStats(alignment);

      expect(stats.identityPercent).toBe(100);
      expect(stats.gapCount).toBe(0);
    });

    it('should calculate gap percentage', () => {
      const alignment = smithWatermanAlignment('ACGTACGT', 'ACGT');
      const stats = getAlignmentStats(alignment);

      expect(stats.gapPercent).toBeGreaterThanOrEqual(0);
      expect(stats.gapPercent).toBeLessThanOrEqual(100);
    });
  });
});
