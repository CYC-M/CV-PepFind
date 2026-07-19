import { describe, it, expect } from 'vitest';
import {
  predictConformation,
  calculateRMSD,
  estimateHydrogenBonds,
  calculateHydrophobicInteractions,
  calculateElectrostaticInteractions,
  estimateVanDerWaalsClashes,
  calculateBindingEnergy,
  calculateDockingScore,
  batchDocking,
} from './structureEngine';

describe('Structure Engine', () => {
  describe('predictConformation', () => {
    it('should predict conformation for valid sequence', () => {
      const conf = predictConformation('MVHLTPEEKS');
      expect(conf).toHaveProperty('sequence');
      expect(conf).toHaveProperty('predictedStructure');
      expect(conf).toHaveProperty('confidence');
      expect(conf).toHaveProperty('secondaryStructure');
      expect(conf).toHaveProperty('solventAccessibility');
    });

    it('should generate correct number of residues', () => {
      const sequence = 'MVHLTPEEKS';
      const conf = predictConformation(sequence);
      expect(conf.predictedStructure).toHaveLength(sequence.length);
    });

    it('should assign correct residue names', () => {
      const sequence = 'MVHLTPEEKS';
      const conf = predictConformation(sequence);
      for (let i = 0; i < sequence.length; i++) {
        expect(conf.predictedStructure[i].residueName).toBe(sequence[i]);
      }
    });

    it('should predict secondary structure', () => {
      const conf = predictConformation('MVHLTPEEKS');
      expect(conf.secondaryStructure).toMatch(/^[HEC]+$/);
      expect(conf.secondaryStructure).toHaveLength(conf.sequence.length);
    });

    it('should calculate solvent accessibility', () => {
      const conf = predictConformation('MVHLTPEEKS');
      expect(conf.solventAccessibility).toHaveLength(conf.sequence.length);
      for (const sa of conf.solventAccessibility) {
        expect(sa).toBeGreaterThanOrEqual(0);
        expect(sa).toBeLessThanOrEqual(1);
      }
    });

    it('should have confidence between 0 and 1', () => {
      const conf = predictConformation('MVHLTPEEKS');
      expect(conf.confidence).toBeGreaterThan(0.6);
      expect(conf.confidence).toBeLessThan(1.0);
    });

    it('should throw error for empty sequence', () => {
      expect(() => predictConformation('')).toThrow();
    });

    it('should throw error for null sequence', () => {
      expect(() => predictConformation(null as any)).toThrow();
    });
  });

  describe('calculateRMSD', () => {
    it('should calculate RMSD for identical structures', () => {
      const conf = predictConformation('AAAAAA');
      const result = calculateRMSD(conf.predictedStructure, conf.predictedStructure);
      expect(result.rmsd).toBe(0);
      expect(result.alignedLength).toBe(conf.predictedStructure.length);
    });

    it('should calculate RMSD for different structures', () => {
      const conf1 = predictConformation('AAAAAA');
      const conf2 = predictConformation('KKKRRR');
      const result = calculateRMSD(conf1.predictedStructure, conf2.predictedStructure);
      expect(result.rmsd).toBeGreaterThanOrEqual(0);
      expect(result.alignedLength).toBe(6);
    });

    it('should handle different length structures', () => {
      const conf1 = predictConformation('AAAAAA');
      const conf2 = predictConformation('AAA');
      const result = calculateRMSD(conf1.predictedStructure, conf2.predictedStructure);
      expect(result.alignedLength).toBe(3);
    });
  });

  describe('estimateHydrogenBonds', () => {
    it('should estimate hydrogen bonds', () => {
      const hBonds = estimateHydrogenBonds('SETN', 'SETN');
      expect(hBonds).toBeGreaterThanOrEqual(0);
      expect(hBonds).toBeLessThanOrEqual(4);
    });

    it('should return zero for non-hbond-forming residues', () => {
      const hBonds = estimateHydrogenBonds('AAAA', 'AAAA');
      expect(hBonds).toBe(0);
    });

    it('should handle different length sequences', () => {
      const hBonds = estimateHydrogenBonds('SETN', 'SET');
      expect(hBonds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateHydrophobicInteractions', () => {
    it('should calculate hydrophobic interactions', () => {
      const interactions = calculateHydrophobicInteractions('AAAAAA', 'AAAAAA');
      expect(interactions).toBe(6);
    });

    it('should return zero for polar sequences', () => {
      const interactions = calculateHydrophobicInteractions('SETN', 'SETN');
      expect(interactions).toBe(0);
    });

    it('should count mixed sequences correctly', () => {
      const interactions = calculateHydrophobicInteractions('AALLL', 'AALLL');
      expect(interactions).toBe(5);
    });
  });

  describe('calculateElectrostaticInteractions', () => {
    it('should calculate electrostatic interactions', () => {
      const interactions = calculateElectrostaticInteractions('KKKDDD', 'DDDKKK');
      expect(interactions).toBeGreaterThan(0);
    });

    it('should return zero for same charge sequences', () => {
      const interactions = calculateElectrostaticInteractions('KKKRRR', 'KKKRRR');
      expect(interactions).toBe(0);
    });

    it('should handle neutral sequences', () => {
      const interactions = calculateElectrostaticInteractions('AAAAAA', 'AAAAAA');
      expect(interactions).toBe(0);
    });
  });

  describe('estimateVanDerWaalsClashes', () => {
    it('should estimate van der Waals clashes', () => {
      const conf1 = predictConformation('AAAAAA');
      const conf2 = predictConformation('AAAAAA');
      const clashes = estimateVanDerWaalsClashes(conf1.predictedStructure, conf2.predictedStructure);
      expect(clashes).toBeGreaterThanOrEqual(0);
    });

    it('should return zero or minimal clashes for identical structures', () => {
      const conf = predictConformation('AAAAAA');
      const clashes = estimateVanDerWaalsClashes(conf.predictedStructure, conf.predictedStructure);
      expect(clashes).toBeGreaterThanOrEqual(0);
      expect(clashes).toBeLessThanOrEqual(conf.predictedStructure.length);
    });
  });

  describe('calculateBindingEnergy', () => {
    it('should calculate binding energy', () => {
      const conf1 = predictConformation('MVHLTPEEKS');
      const conf2 = predictConformation('MVHLTPEEKS');
      const energy = calculateBindingEnergy(
        'MVHLTPEEKS',
        'MVHLTPEEKS',
        conf1.predictedStructure,
        conf2.predictedStructure
      );
      expect(typeof energy).toBe('number');
    });

  });

  describe('calculateDockingScore', () => {
    it('should calculate comprehensive docking score', () => {
      const conf1 = predictConformation('MVHLTPEEKS');
      const conf2 = predictConformation('MVHLTPEEKS');
      const score = calculateDockingScore(
        'MVHLTPEEKS',
        'MVHLTPEEKS',
        conf1.predictedStructure,
        conf2.predictedStructure
      );

      expect(score).toHaveProperty('bindingEnergy');
      expect(score).toHaveProperty('rmsd');
      expect(score).toHaveProperty('hydrogenBonds');
      expect(score).toHaveProperty('hydrophobicInteractions');
      expect(score).toHaveProperty('electrostaticInteractions');
      expect(score).toHaveProperty('vanDerWaalsClashes');
      expect(score).toHaveProperty('affinity');
      expect(score).toHaveProperty('confidence');
    });

    it('should have affinity between 0 and 100', () => {
      const conf1 = predictConformation('MVHLTPEEKS');
      const conf2 = predictConformation('MVHLTPEEKS');
      const score = calculateDockingScore(
        'MVHLTPEEKS',
        'MVHLTPEEKS',
        conf1.predictedStructure,
        conf2.predictedStructure
      );
      expect(score.affinity).toBeGreaterThanOrEqual(0);
      expect(score.affinity).toBeLessThanOrEqual(100);
    });

    it('should have confidence between 0 and 1', () => {
      const conf1 = predictConformation('MVHLTPEEKS');
      const conf2 = predictConformation('MVHLTPEEKS');
      const score = calculateDockingScore(
        'MVHLTPEEKS',
        'MVHLTPEEKS',
        conf1.predictedStructure,
        conf2.predictedStructure
      );
      expect(score.confidence).toBeGreaterThanOrEqual(0);
      expect(score.confidence).toBeLessThanOrEqual(1);
    });

    it('should give higher affinity for identical sequences', () => {
      const conf1 = predictConformation('MVHLTPEEKS');
      const conf2 = predictConformation('MVHLTPEEKS');
      const identicalScore = calculateDockingScore(
        'MVHLTPEEKS',
        'MVHLTPEEKS',
        conf1.predictedStructure,
        conf2.predictedStructure
      );

      const conf3 = predictConformation('KKKRRRDDD');
      const differentScore = calculateDockingScore(
        'KKKRRRDDD',
        'MVHLTPEEKS',
        conf3.predictedStructure,
        conf2.predictedStructure
      );

      expect(identicalScore.affinity).toBeGreaterThanOrEqual(differentScore.affinity);
    });
  });

  describe('batchDocking', () => {
    it('should dock multiple peptides', () => {
      const peptides = ['AAAAAA', 'KKKRRR', 'DDDEEE'];
      const results = batchDocking(peptides, 'MVHLTPEEKS');
      expect(results).toHaveLength(3);
    });

    it('should rank by affinity', () => {
      const peptides = ['AAAAAA', 'KKKRRR', 'DDDEEE'];
      const results = batchDocking(peptides, 'MVHLTPEEKS');
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score.affinity).toBeGreaterThanOrEqual(results[i + 1].score.affinity);
      }
    });

    it('should assign sequential ranks', () => {
      const peptides = ['AAAAAA', 'KKKRRR', 'DDDEEE'];
      const results = batchDocking(peptides, 'MVHLTPEEKS');
      expect(results[0].rank).toBe(1);
      expect(results[1].rank).toBe(2);
      expect(results[2].rank).toBe(3);
    });

    it('should filter out empty sequences', () => {
      const peptides = ['AAAAAA', '', 'KKKRRR'];
      const results = batchDocking(peptides, 'MVHLTPEEKS');
      expect(results).toHaveLength(2);
    });
  });
});
