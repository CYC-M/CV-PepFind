/**
 * Local peptide sequence optimization algorithms.
 *
 * These heuristics optimize the existing sequence-engine score. They are not a
 * substitute for experimental validation or a physics-based affinity model;
 * their purpose is to improve the candidate search before docking.
 */

import { analyzeSequence } from './sequenceEngine';

const AMINO_ACIDS = 'ACDEFGHIKLMNPQRSTVWY';
const DEFAULT_MIN_LENGTH = 8;
const DEFAULT_MAX_LENGTH = 20;

type RandomSource = () => number;

export type PeptideOptimizationStrategy = 'genetic' | 'simulated_annealing' | 'hybrid';

export interface PeptideOptimizationOptions {
  strategy?: PeptideOptimizationStrategy;
  minLength?: number;
  maxLength?: number;
  populationSize?: number;
  generations?: number;
  iterations?: number;
  maxResults?: number;
  random?: RandomSource;
}

export interface OptimizedPeptide {
  sequence: string;
  score: number;
  strategy: PeptideOptimizationStrategy;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pickAminoAcid(random: RandomSource): string {
  return AMINO_ACIDS[Math.floor(clamp(random(), 0, 0.999999) * AMINO_ACIDS.length)];
}

function randomSequence(length: number, random: RandomSource): string {
  return Array.from({ length }, () => pickAminoAcid(random)).join('');
}

function sanitizeSeed(sequence: string, minLength: number, maxLength: number): string | null {
  const normalized = sequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
  if (!normalized) return null;
  const targetLength = clamp(normalized.length, minLength, maxLength);
  return normalized.slice(0, targetLength).padEnd(targetLength, 'A');
}

function mutate(sequence: string, random: RandomSource, minLength: number, maxLength: number): string {
  if (!sequence) return randomSequence(minLength, random);
  const chars = sequence.split('');
  const mutationCount = Math.max(1, Math.ceil(chars.length * 0.12));
  for (let index = 0; index < mutationCount; index += 1) {
    const position = Math.floor(clamp(random(), 0, 0.999999) * chars.length);
    chars[position] = pickAminoAcid(random);
  }
  return chars.join('').slice(0, maxLength).padEnd(minLength, 'A');
}

function crossover(left: string, right: string, random: RandomSource, minLength: number, maxLength: number): string {
  const length = clamp(Math.round((left.length + right.length) / 2), minLength, maxLength);
  const split = Math.floor(clamp(random(), 0, 0.999999) * Math.max(1, length - 1)) + 1;
  const child = `${left.slice(0, split)}${right.slice(split)}`;
  return child.slice(0, length).padEnd(length, 'A');
}

function score(sequence: string): number {
  try {
    return analyzeSequence(sequence).overallScore;
  } catch {
    return Number.NEGATIVE_INFINITY;
  }
}

function rankUnique(sequences: string[], strategy: PeptideOptimizationStrategy, maxResults: number): OptimizedPeptide[] {
  const seen = new Set<string>();
  return sequences
    .map(sequence => sequence.toUpperCase())
    .filter(sequence => {
      if (seen.has(sequence)) return false;
      seen.add(sequence);
      return true;
    })
    .map(sequence => ({ sequence, score: score(sequence), strategy }))
    .filter(item => Number.isFinite(item.score))
    .sort((left, right) => right.score - left.score)
    .slice(0, maxResults);
}

function geneticOptimize(
  seeds: string[],
  options: Required<Pick<PeptideOptimizationOptions, 'minLength' | 'maxLength' | 'populationSize' | 'generations' | 'maxResults'>> & { random: RandomSource },
): OptimizedPeptide[] {
  const { minLength, maxLength, populationSize, generations, maxResults, random } = options;
  let population = seeds.length > 0 ? [...seeds] : [randomSequence(minLength, random)];

  while (population.length < populationSize) {
    const parent = population[Math.floor(clamp(random(), 0, 0.999999) * population.length)];
    population.push(mutate(parent, random, minLength, maxLength));
  }

  for (let generation = 0; generation < generations; generation += 1) {
    const ranked = rankUnique(population, 'genetic', populationSize);
    const eliteCount = Math.max(2, Math.ceil(populationSize * 0.25));
    const elites = ranked.slice(0, eliteCount).map(item => item.sequence);
    const nextPopulation = [...elites];

    while (nextPopulation.length < populationSize) {
      const left = elites[Math.floor(clamp(random(), 0, 0.999999) * elites.length)];
      const right = elites[Math.floor(clamp(random(), 0, 0.999999) * elites.length)];
      nextPopulation.push(mutate(crossover(left, right, random, minLength, maxLength), random, minLength, maxLength));
    }
    population = nextPopulation;
  }

  return rankUnique(population, 'genetic', maxResults);
}

function simulatedAnnealingOptimize(
  seeds: string[],
  options: Required<Pick<PeptideOptimizationOptions, 'minLength' | 'maxLength' | 'iterations' | 'maxResults'>> & { random: RandomSource },
): OptimizedPeptide[] {
  const { minLength, maxLength, iterations, maxResults, random } = options;
  const startingPoints = seeds.length > 0 ? seeds : [randomSequence(minLength, random)];
  const results: string[] = [];

  for (const seed of startingPoints.slice(0, maxResults)) {
    let current = seed;
    let currentScore = score(current);
    let best = current;
    let bestScore = currentScore;

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const temperature = Math.max(0.05, 1 - iteration / Math.max(1, iterations));
      const proposal = mutate(current, random, minLength, maxLength);
      const proposalScore = score(proposal);
      const acceptsWorseMove = Math.exp((proposalScore - currentScore) / temperature) > random();

      if (proposalScore >= currentScore || acceptsWorseMove) {
        current = proposal;
        currentScore = proposalScore;
      }
      if (currentScore > bestScore) {
        best = current;
        bestScore = currentScore;
      }
    }
    results.push(best);
  }

  return rankUnique(results, 'simulated_annealing', maxResults);
}

/**
 * Optimize a set of seed sequences with a deterministic-in-tests local search.
 */
export function optimizePeptideSequences(
  seeds: string[],
  options: PeptideOptimizationOptions = {},
): OptimizedPeptide[] {
  const minLength = Math.max(2, Math.floor(options.minLength ?? DEFAULT_MIN_LENGTH));
  const maxLength = Math.max(minLength, Math.floor(options.maxLength ?? DEFAULT_MAX_LENGTH));
  const maxResults = Math.max(1, Math.floor(options.maxResults ?? 10));
  const strategy = options.strategy ?? 'hybrid';
  const random = options.random ?? Math.random;
  const sanitizedSeeds = seeds
    .map(seed => sanitizeSeed(seed, minLength, maxLength))
    .filter((seed): seed is string => Boolean(seed));

  if (strategy === 'genetic') {
    return geneticOptimize(sanitizedSeeds, {
      minLength,
      maxLength,
      populationSize: Math.max(4, Math.floor(options.populationSize ?? Math.max(8, maxResults * 2))),
      generations: Math.max(1, Math.floor(options.generations ?? 4)),
      maxResults,
      random,
    });
  }

  if (strategy === 'simulated_annealing') {
    return simulatedAnnealingOptimize(sanitizedSeeds, {
      minLength,
      maxLength,
      iterations: Math.max(1, Math.floor(options.iterations ?? 12)),
      maxResults,
      random,
    });
  }

  const genetic = geneticOptimize(sanitizedSeeds, {
    minLength,
    maxLength,
    populationSize: Math.max(4, Math.floor(options.populationSize ?? Math.max(8, maxResults * 2))),
    generations: Math.max(1, Math.floor(options.generations ?? 3)),
    maxResults,
    random,
  });
  const annealed = simulatedAnnealingOptimize(sanitizedSeeds, {
    minLength,
    maxLength,
    iterations: Math.max(1, Math.floor(options.iterations ?? 10)),
    maxResults,
    random,
  });

  return rankUnique([...genetic.map(item => item.sequence), ...annealed.map(item => item.sequence)], 'hybrid', maxResults);
}
