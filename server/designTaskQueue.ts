/**
 * Design Task Queue - Async system for long-running peptide design jobs
 * Supports job creation, progress tracking, and result streaming
 */

import { analyzeSequence } from './sequenceEngine';
import { batchDocking } from './structureEngine';
import { executeDesignIteration, type DesignExecutionContext } from './designExecutor';
import { generatePeptideSequences } from './llmSequenceGenerator';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

export interface DesignTaskConfig {
  targetProtein: string;
  targetSequence: string;
  requirements?: string;
  designParameters: {
    minLength: number;
    maxLength: number;
    maxCharge: number;
    maxInstabilityIndex: number;
    minSequenceScore: number;
    minAffinityScore: number;
  };
  generationStrategy: 'random' | 'optimization' | 'hybrid';
  maxIterations: number;
  topCandidates: number;
}

export type DesignTaskConfigInput = Partial<DesignTaskConfig> & { targetProtein: string };

export interface DesignCandidate {
  sequence: string;
  sequenceScore: number;
  affinityScore: number;
  combinedScore: number;
  rank: number;
  timestamp: number;
}

export interface DesignTaskResult {
  taskId: string;
  status: TaskStatus;
  config: DesignTaskConfig;
  candidates: DesignCandidate[];
  iteration: number;
  progress: number; // 0-100
  startTime: number;
  endTime?: number;
  error?: string;
}

export interface DesignTaskEvent {
  type: 'progress' | 'candidate' | 'completed' | 'error';
  taskId: string;
  data: any;
  timestamp: number;
}

// In-memory task storage (in production, use database)
const taskStore = new Map<string, DesignTaskResult>();
const taskListeners = new Map<string, Set<(event: DesignTaskEvent) => void>>();

/**
 * Generate random peptide sequence
 */
function generateRandomSequence(length: number): string {
  const aminoAcids = 'ACDEFGHIKLMNPQRSTVWY';
  let sequence = '';
  for (let i = 0; i < length; i++) {
    sequence += aminoAcids[Math.floor(Math.random() * aminoAcids.length)];
  }
  return sequence;
}

/**
 * Generate optimized sequence based on target properties
 */
function generateOptimizedSequence(targetSequence: string, length: number): string {
  // Simple strategy: bias towards amino acids similar to target
  const targetAAs = new Map<string, number>();
  for (const aa of targetSequence) {
    targetAAs.set(aa, (targetAAs.get(aa) || 0) + 1);
  }

  const sortedAAs = Array.from(targetAAs.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([aa]) => aa);

  let sequence = '';
  for (let i = 0; i < length; i++) {
    if (Math.random() < 0.7 && sortedAAs.length > 0) {
      sequence += sortedAAs[Math.floor(Math.random() * Math.min(3, sortedAAs.length))];
    } else {
      sequence += 'ACDEFGHIKLMNPQRSTVWY'[Math.floor(Math.random() * 20)];
    }
  }
  return sequence;
}

/**
 * Create new design task
 */
export function createDesignTask(
  taskId: string,
  config: DesignTaskConfig
): DesignTaskResult {
  const task: DesignTaskResult = {
    taskId,
    status: 'pending',
    config,
    candidates: [],
    iteration: 0,
    progress: 0,
    startTime: Date.now(),
  };

  taskStore.set(taskId, task);
  taskListeners.set(taskId, new Set());

  return task;
}

/**
 * Get task by ID
 */
export function getDesignTask(taskId: string): DesignTaskResult | undefined {
  return taskStore.get(taskId);
}

/**
 * Subscribe to task events
 */
export function subscribeToTask(
  taskId: string,
  callback: (event: DesignTaskEvent) => void
): () => void {
  const listeners = taskListeners.get(taskId) || new Set();
  listeners.add(callback);
  taskListeners.set(taskId, listeners);

  // Return unsubscribe function
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Emit task event to all listeners
 */
function emitTaskEvent(event: DesignTaskEvent) {
  const listeners = taskListeners.get(event.taskId);
  if (listeners) {
    listeners.forEach(callback => {
      try {
        callback(event);
      } catch (err) {
        console.error('Error in task listener:', err);
      }
    });
  }
}

/**
 * Run design task (async) - Using real LLM-based design engine
 */
export async function runDesignTask(taskId: string): Promise<void> {
  const task = taskStore.get(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  task.status = 'running';
  task.startTime = Date.now();

  try {
    const { config } = task;
    const candidates: DesignCandidate[] = [];

    // Create execution context for design iterations
    const context: DesignExecutionContext = {
      taskId,
      config,
      iteration: 0,
      candidates: [],
      onProgress: (progress: number, iteration: number, candidatesFound: number) => {
        task.iteration = iteration;
        task.progress = progress;
        
        emitTaskEvent({
          type: 'progress',
          taskId,
          data: {
            iteration,
            progress,
            candidatesFound,
          },
          timestamp: Date.now(),
        });
      },
      onCandidate: (candidate: DesignCandidate) => {
        candidates.push(candidate);
        
        // Sort and keep top candidates
        candidates.sort((a, b) => b.combinedScore - a.combinedScore);
        task.candidates = candidates.slice(0, config.topCandidates);
        
        emitTaskEvent({
          type: 'candidate',
          taskId,
          data: candidate,
          timestamp: Date.now(),
        });
      },
      onLog: (message: string, details?: any) => {
        console.log(`[${taskId}] ${message}`, details);
      },
    };

    // Run design iterations
    for (let iter = 0; iter < config.maxIterations; iter++) {
      // Check if task was cancelled
      if ((task.status as TaskStatus) === 'failed') {
        throw new Error(task.error || 'Task was cancelled');
      }

      // Allow task pause/resume
      while ((task.status as TaskStatus) === 'paused') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Check for cancellation after pause
      if ((task.status as TaskStatus) === 'failed') {
        throw new Error(task.error || 'Task was cancelled');
      }

      context.iteration = iter + 1;
      
      // Execute one design iteration using LLM engine
      try {
        await executeDesignIteration(context);
      } catch (err) {
        console.error(`Design iteration ${iter + 1} failed:`, err);
        // Continue with next iteration even if one fails
      }

      // Update progress
      task.progress = Math.round(((iter + 1) / config.maxIterations) * 100);
      
      // Yield to event loop
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    task.status = 'completed';
    task.endTime = Date.now();

    emitTaskEvent({
      type: 'completed',
      taskId,
      data: {
        totalCandidates: task.candidates.length,
        duration: task.endTime - task.startTime,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    task.status = 'failed';
    task.endTime = Date.now();
    task.error = error instanceof Error ? error.message : String(error);

    emitTaskEvent({
      type: 'error',
      taskId,
      data: { error: task.error },
      timestamp: Date.now(),
    });

    throw error;
  }
}

/**
 * Pause task
 */
export function pauseDesignTask(taskId: string): void {
  const task = taskStore.get(taskId);
  if (task && task.status === 'running') {
    task.status = 'paused';
  }
}

/**
 * Resume task
 */
export function resumeDesignTask(taskId: string): void {
  const task = taskStore.get(taskId);
  if (task && task.status === 'paused') {
    task.status = 'running';
  }
}

/**
 * Cancel task
 */
export function cancelDesignTask(taskId: string): void {
  const task = taskStore.get(taskId);
  if (task && (task.status === 'running' || task.status === 'paused')) {
    task.status = 'failed';
    task.error = 'Task cancelled by user';
    task.endTime = Date.now();
  }
}

/**
 * Get top candidates
 */
export function getTopCandidates(taskId: string, limit: number = 10): DesignCandidate[] {
  const task = taskStore.get(taskId);
  if (!task) {
    return [];
  }
  return task.candidates.slice(0, limit);
}

/**
 * Export candidates as CSV
 */
export function exportCandidatesAsCSV(taskId: string): string {
  const task = taskStore.get(taskId);
  if (!task) {
    return '';
  }

  let csv = 'Rank,Sequence,SequenceScore,AffinityScore,CombinedScore,Timestamp\n';
  for (const candidate of task.candidates) {
    csv += `${candidate.rank},"${candidate.sequence}",${candidate.sequenceScore.toFixed(2)},${candidate.affinityScore.toFixed(2)},${candidate.combinedScore.toFixed(2)},${new Date(candidate.timestamp).toISOString()}\n`;
  }
  return csv;
}
