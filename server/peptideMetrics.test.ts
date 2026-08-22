import { describe, expect, it } from 'vitest';
import { calculatePeptideMetrics } from '../shared/peptideMetrics';

describe('candidate peptide metrics', () => {
  it('calculates molecular weight and screening descriptors for a valid peptide', () => {
    const metrics = calculatePeptideMetrics('ACDEFGHIK');

    expect(metrics.length).toBe(9);
    expect(metrics.molecularWeight).toBeGreaterThan(800);
    expect(metrics.hydrophobicity).toBeTypeOf('number');
    expect(metrics.stabilityIndex).toBeGreaterThanOrEqual(0);
    expect(metrics.stabilityIndex).toBeLessThanOrEqual(100);
  });

  it('reports a positive charge and higher estimated pI for a basic sequence', () => {
    const metrics = calculatePeptideMetrics('KKKRRR');

    expect(metrics.netCharge).toBeGreaterThan(0);
    expect(metrics.isoelectricPoint).toBeGreaterThan(7);
  });

  it('sanitizes invalid residues and remains deterministic for empty input', () => {
    expect(calculatePeptideMetrics('AXXK').length).toBe(2);
    expect(calculatePeptideMetrics('')).toMatchObject({ length: 0, molecularWeight: 0 });
  });
});
