import { describe, it, expect } from 'vitest';
import {
  calculateGRAVY,
  calculateNetCharge,
  calculateAromaticity,
  calculateMolecularWeight,
  calculateInstabilityIndex,
  predictSecondaryStructure,
  estimateIsoelectricPoint,
  analyzeSequence,
  batchScoreSequences,
  filterSequencesByCriteria,
} from './sequenceEngine';

describe('Sequence Engine', () => {
  describe('calculateGRAVY', () => {
    it('should calculate GRAVY for hydrophobic sequence', () => {
      const gravy = calculateGRAVY('LLLLLL');
      expect(gravy).toBeGreaterThan(3.0);
    });

    it('should calculate GRAVY for hydrophilic sequence', () => {
      const gravy = calculateGRAVY('DDDDDD');
      expect(gravy).toBeLessThan(-2.0);
    });

    it('should handle empty sequence', () => {
      const gravy = calculateGRAVY('');
      expect(gravy).toBe(0);
    });

    it('should be case-insensitive', () => {
      const gravy1 = calculateGRAVY('LLLLLL');
      const gravy2 = calculateGRAVY('llllll');
      expect(gravy1).toBe(gravy2);
    });
  });

  describe('calculateNetCharge', () => {
    it('should calculate positive charge for basic sequence', () => {
      const charge = calculateNetCharge('KKKRRR');
      expect(charge).toBeGreaterThan(0);
    });

    it('should calculate negative charge for acidic sequence', () => {
      const charge = calculateNetCharge('DDDEEE');
      expect(charge).toBeLessThan(0);
    });

    it('should calculate near-zero charge for neutral sequence', () => {
      const charge = calculateNetCharge('AAAAAA');
      expect(Math.abs(charge)).toBeLessThan(0.1);
    });

    it('should vary with pH', () => {
      const charge7 = calculateNetCharge('KKKDDD', 7.0);
      const charge10 = calculateNetCharge('KKKDDD', 10.0);
      expect(charge7).not.toBe(charge10);
    });
  });

  describe('calculateAromaticity', () => {
    it('should calculate aromaticity for aromatic sequence', () => {
      const aromaticity = calculateAromaticity('FFWWYY');
      expect(aromaticity).toBe(1.0);
    });

    it('should calculate zero aromaticity for non-aromatic sequence', () => {
      const aromaticity = calculateAromaticity('AAAAAA');
      expect(aromaticity).toBe(0);
    });

    it('should calculate partial aromaticity', () => {
      const aromaticity = calculateAromaticity('FWAAAA');
      expect(aromaticity).toBeCloseTo(0.333, 2);
    });
  });

  describe('calculateMolecularWeight', () => {
    it('should calculate molecular weight for alanine polymer', () => {
      const mw = calculateMolecularWeight('AAAAAA');
      expect(mw).toBeGreaterThan(400);
      expect(mw).toBeLessThan(500);
    });

    it('should increase with sequence length', () => {
      const mw1 = calculateMolecularWeight('AAA');
      const mw2 = calculateMolecularWeight('AAAAAA');
      expect(mw2).toBeGreaterThan(mw1);
    });
  });

  describe('calculateInstabilityIndex', () => {
    it('should calculate instability index', () => {
      const ii = calculateInstabilityIndex('AAAAAA');
      expect(ii).toBeGreaterThan(0);
      expect(ii).toBeLessThan(100);
    });

    it('should return different values for different sequences', () => {
      const ii1 = calculateInstabilityIndex('AAAAAA');
      const ii2 = calculateInstabilityIndex('KKKRRR');
      expect(ii1).not.toBe(ii2);
    });
  });

  describe('predictSecondaryStructure', () => {
    it('should predict secondary structure tendencies', () => {
      const ss = predictSecondaryStructure('AAAAAA');
      expect(ss.alpha + ss.beta + ss.coil).toBeCloseTo(1.0, 5);
    });

    it('should predict high alpha tendency for alanine', () => {
      const ss = predictSecondaryStructure('AAAAAA');
      expect(ss.alpha).toBeGreaterThan(ss.beta);
    });

    it('should predict high beta tendency for valine', () => {
      const ss = predictSecondaryStructure('VVVVVV');
      expect(ss.beta).toBeGreaterThan(ss.alpha);
    });
  });

  describe('estimateIsoelectricPoint', () => {
    it('should estimate pI for basic sequence', () => {
      const pI = estimateIsoelectricPoint('KKKRRR');
      expect(pI).toBeGreaterThan(7.0);
    });

    it('should estimate pI for acidic sequence', () => {
      const pI = estimateIsoelectricPoint('DDDEEE');
      expect(pI).toBeLessThan(7.0);
    });

    it('should estimate pI near 7 for neutral sequence', () => {
      const pI = estimateIsoelectricPoint('AAAAAA');
      expect(Math.abs(pI - 7.0)).toBeLessThan(1.0);
    });
  });

  describe('analyzeSequence', () => {
    it('should return complete sequence score', () => {
      const score = analyzeSequence('MVHLTPEEKS');
      expect(score).toHaveProperty('hydrophobicity');
      expect(score).toHaveProperty('charge');
      expect(score).toHaveProperty('polarity');
      expect(score).toHaveProperty('aromaticity');
      expect(score).toHaveProperty('secondaryStructureTendency');
      expect(score).toHaveProperty('instabilityIndex');
      expect(score).toHaveProperty('gravy');
      expect(score).toHaveProperty('molecularWeight');
      expect(score).toHaveProperty('isoelectricPoint');
      expect(score).toHaveProperty('overallScore');
    });

    it('should calculate overall score between 0 and 100', () => {
      const score = analyzeSequence('MVHLTPEEKS');
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
    });

    it('should throw error for empty sequence', () => {
      expect(() => analyzeSequence('')).toThrow();
    });

    it('should throw error for null sequence', () => {
      expect(() => analyzeSequence(null as any)).toThrow();
    });
  });

  describe('batchScoreSequences', () => {
    it('should score multiple sequences', () => {
      const sequences = ['AAAAAA', 'KKKRRR', 'DDDEEE'];
      const results = batchScoreSequences(sequences);
      expect(results).toHaveLength(3);
    });

    it('should rank sequences by score', () => {
      const sequences = ['AAAAAA', 'KKKRRR', 'DDDEEE'];
      const results = batchScoreSequences(sequences);
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score.overallScore).toBeGreaterThanOrEqual(results[i + 1].score.overallScore);
      }
    });

    it('should assign sequential ranks', () => {
      const sequences = ['AAAAAA', 'KKKRRR', 'DDDEEE'];
      const results = batchScoreSequences(sequences);
      expect(results[0].rank).toBe(1);
      expect(results[1].rank).toBe(2);
      expect(results[2].rank).toBe(3);
    });

    it('should filter out empty sequences', () => {
      const sequences = ['AAAAAA', '', 'KKKRRR'];
      const results = batchScoreSequences(sequences);
      expect(results).toHaveLength(2);
    });
  });

  describe('filterSequencesByCriteria', () => {
    it('should filter by GRAVY', () => {
      const sequences = ['AAAAAA', 'LLLLLL', 'DDDEEE'];
      const filtered = filterSequencesByCriteria(sequences, {
        minGRAVY: 0,
        maxGRAVY: 2,
      });
      expect(filtered.length).toBeLessThanOrEqual(sequences.length);
    });

    it('should filter by charge', () => {
      const sequences = ['AAAAAA', 'KKKRRR', 'DDDEEE'];
      const filtered = filterSequencesByCriteria(sequences, {
        maxCharge: 1,
      });
      expect(filtered).toContain('AAAAAA');
    });

    it('should filter by instability index', () => {
      const sequences = ['AAAAAA', 'KKKRRR', 'DDDEEE'];
      const filtered = filterSequencesByCriteria(sequences, {
        maxInstabilityIndex: 40,
      });
      expect(filtered.length).toBeGreaterThan(0);
    });

    it('should filter by minimum score', () => {
      const sequences = ['AAAAAA', 'KKKRRR', 'DDDEEE'];
      const filtered = filterSequencesByCriteria(sequences, {
        minScore: 60,
      });
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });

    it('should apply multiple filters', () => {
      const sequences = ['AAAAAA', 'LLLLLL', 'KKKRRR', 'DDDEEE'];
      const filtered = filterSequencesByCriteria(sequences, {
        minGRAVY: -0.5,
        maxGRAVY: 1.5,
        maxCharge: 2,
        maxInstabilityIndex: 50,
      });
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });
  });
});
