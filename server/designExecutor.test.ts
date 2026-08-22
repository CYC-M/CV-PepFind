import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./llmSequenceGenerator', () => ({
  generatePeptideSequences: vi.fn(),
}));
vi.mock('./structureEngine', () => ({
  batchDocking: vi.fn(),
}));
vi.mock('./peptideOptimization', () => ({
  optimizePeptideSequences: vi.fn(() => [
    { sequence: 'WVVVVVVV', score: 90, strategy: 'genetic' },
  ]),
}));

import { generatePeptideSequences } from './llmSequenceGenerator';
import { batchDocking } from './structureEngine';
import { executeDesignIteration } from './designExecutor';

const baseConfig = {
  targetProtein: 'IL6',
  targetSequence: 'MNSFSTSAFAAQLNDNEGK',
  designParameters: {
    minLength: 8,
    maxLength: 15,
    maxCharge: 5,
    maxInstabilityIndex: 40,
    minSequenceScore: 0.5,
    minAffinityScore: -8,
  },
  generationStrategy: 'optimization' as const,
  maxIterations: 1,
  topCandidates: 5,
};

describe('designExecutor optimization integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generatePeptideSequences).mockResolvedValue([
      { sequence: 'ACDEFGHIK', rationale: 'seed', confidence: 0.8 },
    ]);
    vi.mocked(batchDocking).mockImplementation((sequences: string[]) =>
      sequences.map((peptide, index) => ({
        peptide,
        score: { affinity: -5 - index, confidence: 0.8 },
        rank: index + 1,
      })) as any,
    );
  });

  it('includes optimized sequences in analysis and records optimization metrics', async () => {
    const logs: Array<{ message: string; details?: any }> = [];
    const candidates: any[] = [];
    const context = {
      taskId: 'optimization-test',
      config: baseConfig,
      iteration: 0,
      candidates,
      onProgress: vi.fn(),
      onCandidate: (candidate: any) => candidates.push(candidate),
      onLog: (message: string, details?: any) => logs.push({ message, details }),
      onStepChange: vi.fn(),
    };

    await executeDesignIteration(context);

    expect(batchDocking).toHaveBeenCalledWith(
      expect.arrayContaining(['ACDEFGHIK', 'WVVVVVVV']),
      baseConfig.targetSequence,
    );
    const generationLog = logs.find(log => log.message.includes('生成了'));
    expect(generationLog?.details?.metrics).toMatchObject({
      generatedCount: 1,
      optimizedCount: 1,
      analysisCount: 2,
      optimizationStrategy: 'genetic',
    });
    expect(candidates.length).toBeGreaterThan(0);
  });
});
