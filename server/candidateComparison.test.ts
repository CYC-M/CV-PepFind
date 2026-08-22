import { describe, expect, it } from 'vitest';
import { CANDIDATE_COMPARISON_METRICS, getCandidateComparisonValue } from '../shared/candidateComparison';

const candidate = {
  sequence: 'ACDEFGHIK',
  affinityScore: 74.25,
  sequenceScore: 81.5,
  combinedScore: 77.9,
};

describe('candidate comparison metrics', () => {
  it('exposes all screening metrics needed by the comparison dialog', () => {
    expect(CANDIDATE_COMPARISON_METRICS.map((metric) => metric.key)).toEqual([
      'combinedScore', 'affinityScore', 'sequenceScore', 'molecularWeight', 'netCharge',
      'hydrophobicity', 'stabilityIndex', 'isoelectricPoint', 'secondaryStructure',
    ]);
  });

  it('formats scores and physicochemical descriptors consistently', () => {
    expect(getCandidateComparisonValue(candidate, 'affinityScore')).toBe('74.25');
    expect(getCandidateComparisonValue(candidate, 'molecularWeight')).toMatch(/Da$/);
    expect(getCandidateComparisonValue(candidate, 'netCharge')).toMatch(/^[+-]/);
    expect(getCandidateComparisonValue(candidate, 'secondaryStructure')).toMatch(/螺旋|折叠|卷曲/);
  });

  it('returns a safe placeholder for an unknown comparison field', () => {
    expect(getCandidateComparisonValue(candidate, 'missing')).toBe('—');
  });
});
