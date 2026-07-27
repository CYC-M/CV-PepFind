/**
 * tRPC router for design task management
 */

import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import {
  createDesignTask,
  getDesignTask,
  runDesignTask,
  pauseDesignTask,
  resumeDesignTask,
  cancelDesignTask,
  getTopCandidates,
  exportCandidatesAsCSV,
  subscribeToTask,
  type DesignTaskConfig,
  type DesignTaskConfigInput,
} from './designTaskQueue';

const DesignParametersSchema = z.object({
  minLength: z.number().min(5).max(50),
  maxLength: z.number().min(5).max(100),
  maxCharge: z.number().min(0).max(10),
  maxInstabilityIndex: z.number().min(0).max(100),
  minSequenceScore: z.number().min(0).max(1),
  minAffinityScore: z.number().min(-20).max(0),
});

const DesignTaskConfigSchema = z.object({
  targetProtein: z.string().min(1),
  targetSequence: z.string().min(5).optional(),
  requirements: z.string().min(1).optional(),
  designParameters: DesignParametersSchema.optional(),
  generationStrategy: z.enum(['random', 'optimization', 'hybrid']).optional(),
  maxIterations: z.number().min(1).max(100).optional(),
  topCandidates: z.number().min(1).max(50).optional(),
});

export const designTaskRouter = router({
  /**
   * Create a new design task
   */
  create: publicProcedure
    .input(DesignTaskConfigSchema)
    .mutation(({ input }) => {
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Auto-configure parameters with sensible defaults
      const config: DesignTaskConfig = {
        targetProtein: input.targetProtein,
        targetSequence: input.targetSequence || '',
        requirements: input.requirements || '',
        designParameters: input.designParameters || {
          minLength: 8,
          maxLength: 50,
          maxCharge: 5,
          maxInstabilityIndex: 40,
          minSequenceScore: 0.5,
          minAffinityScore: -0.6,
        },
        generationStrategy: input.generationStrategy || 'hybrid',
        maxIterations: input.maxIterations || 10,
        topCandidates: input.topCandidates || 10,
      };
      
      const task = createDesignTask(taskId, config);

      return {
        taskId,
        status: task.status,
        progress: task.progress,
      };
    }),

  /**
   * Get task status and progress
   */
  getStatus: publicProcedure.input(z.object({ taskId: z.string() })).query(({ input }) => {
    const task = getDesignTask(input.taskId);

    if (!task) {
      return null;
    }

    return {
      taskId: task.taskId,
      status: task.status,
      progress: task.progress,
      iteration: task.iteration,
      candidatesFound: task.candidates.length,
      topCandidates: task.candidates.slice(0, 10).map(c => ({
        sequence: c.sequence,
        sequenceScore: parseFloat(c.sequenceScore.toFixed(2)),
        affinityScore: parseFloat(c.affinityScore.toFixed(2)),
        combinedScore: parseFloat(c.combinedScore.toFixed(2)),
        rank: c.rank,
      })),
      error: task.error,
      startTime: task.startTime,
      endTime: task.endTime,
    };
  }),

  /**
   * Get top candidates
   */
  getCandidates: publicProcedure
    .input(z.object({ taskId: z.string(), limit: z.number().min(1).max(100).optional() }))
    .query(({ input }) => {
      const candidates = getTopCandidates(input.taskId, input.limit || 10);

      return candidates.map(c => ({
        sequence: c.sequence,
        sequenceScore: parseFloat(c.sequenceScore.toFixed(2)),
        affinityScore: parseFloat(c.affinityScore.toFixed(2)),
        combinedScore: parseFloat(c.combinedScore.toFixed(2)),
        rank: c.rank,
        timestamp: c.timestamp,
      }));
    }),

  /**
   * Start task execution (non-blocking)
   * Returns immediately and runs task in background
   */
  start: publicProcedure.input(z.object({ taskId: z.string() })).mutation(async ({ input }) => {
    try {
      // Start task in background without waiting
      runDesignTask(input.taskId).catch(err => {
        console.error(`Background task execution failed for ${input.taskId}:`, err);
      });
      
      // Return immediately so client can start polling
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),

  /**
   * Pause task
   */
  pause: publicProcedure.input(z.object({ taskId: z.string() })).mutation(({ input }) => {
    pauseDesignTask(input.taskId);
    const task = getDesignTask(input.taskId);
    return { status: task?.status };
  }),

  /**
   * Resume task
   */
  resume: publicProcedure.input(z.object({ taskId: z.string() })).mutation(({ input }) => {
    resumeDesignTask(input.taskId);
    const task = getDesignTask(input.taskId);
    return { status: task?.status };
  }),

  /**
   * Cancel task
   */
  cancel: publicProcedure.input(z.object({ taskId: z.string() })).mutation(({ input }) => {
    cancelDesignTask(input.taskId);
    const task = getDesignTask(input.taskId);
    return { status: task?.status };
  }),

  /**
   * Export candidates as CSV
   */
  exportCSV: publicProcedure.input(z.object({ taskId: z.string() })).query(({ input }) => {
    return exportCandidatesAsCSV(input.taskId);
  }),
});
