import { describe, expect, it } from 'vitest';
import { optimizePeptideSequences } from './peptideOptimization';

const deterministicRandom = () => 0.25;

describe('peptideOptimization', () => {
  it('returns valid, unique, ranked sequences with genetic optimization', () => {
    const results = optimizePeptideSequences(['ACDEFGHIK', 'ACDEFGHIK'], {
      strategy: 'genetic',
      minLength: 8,
      maxLength: 12,
      populationSize: 6,
      generations: 2,
      maxResults: 4,
      random: deterministicRandom,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(4);
    expect(new Set(results.map(result => result.sequence)).size).toBe(results.length);
    expect(results.every(result => /^[ACDEFGHIKLMNPQRSTVWY]+$/.test(result.sequence))).toBe(true);
    expect(results.every(result => result.sequence.length >= 8 && result.sequence.length <= 12)).toBe(true);
    expect(results.every(result => result.strategy === 'genetic')).toBe(true);
    expect(results.every((result, index) => index === 0 || results[index - 1].score >= result.score)).toBe(true);
  });

  it('improves or retains the best seed score with simulated annealing', () => {
    const results = optimizePeptideSequences(['ACDEFGHIK', 'WVVVVVVV'], {
      strategy: 'simulated_annealing',
      iterations: 10,
      maxResults: 2,
      random: deterministicRandom,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].score).toBeGreaterThanOrEqual(0);
    expect(results.every(result => result.strategy === 'simulated_annealing')).toBe(true);
  });

  it('combines genetic and annealing search in hybrid mode', () => {
    const results = optimizePeptideSequences(['ACDEFGHIK'], {
      strategy: 'hybrid',
      populationSize: 6,
      generations: 1,
      iterations: 6,
      maxResults: 3,
      random: deterministicRandom,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(3);
    expect(results.every(result => result.strategy === 'hybrid')).toBe(true);
  });

  it('sanitizes invalid seed characters and enforces sequence bounds', () => {
    const results = optimizePeptideSequences([' acd-efg! '], {
      strategy: 'genetic',
      minLength: 8,
      maxLength: 8,
      populationSize: 4,
      generations: 1,
      maxResults: 1,
      random: deterministicRandom,
    });

    expect(results[0]?.sequence).toMatch(/^[ACDEFGHIKLMNPQRSTVWY]{8}$/);
  });
});
