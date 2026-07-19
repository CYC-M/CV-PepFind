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
  targetSequence: z.string().min(5),
  designParameters: DesignParametersSchema,
  generationStrategy: z.enum(['random', 'optimization', 'hybrid']),
  maxIterations: z.number().min(1).max(100),
  topCandidates: z.number().min(1).max(50),
});

export const designTaskRouter = router({
  /**
   * Create a new design task
   */
  create: publicProcedure
    .input(DesignTaskConfigSchema)
    .mutation(({ input }) => {
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const config = input as DesignTaskConfig;
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
   * Start task execution
   */
  start: publicProcedure.input(z.object({ taskId: z.string() })).mutation(async ({ input }) => {
    try {
      await runDesignTask(input.taskId);
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
    const csv = exportCandidatesAsCSV(input.taskId);
    return { csv };
  }),


});
