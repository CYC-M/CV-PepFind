/**
 * Design Task Queue - Async system for long-running peptide design jobs
 * Supports job creation, progress tracking, and result streaming
 */

import { executeDesignIteration, type DesignExecutionContext, type DesignStepInfo } from './designExecutor';

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

export interface DesignTaskLog {
  timestamp: number;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: {
    thinking?: string;
    intermediateResults?: unknown;
    metrics?: Record<string, unknown>;
    reasoning?: string;
    error?: string;
  };
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
  currentStep?: DesignStepInfo;
  logs: DesignTaskLog[];
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
    logs: [],
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
              currentStep: task.currentStep,
            },

          timestamp: Date.now(),
        });
      },
      onStepChange: (stepInfo) => {
        task.currentStep = stepInfo;
        emitTaskEvent({
          type: 'progress',
          taskId,
          data: {
            iteration: task.iteration,
            progress: task.progress,
            candidatesFound: task.candidates.length,
            currentStep: stepInfo,
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
        const rawDetails = details && typeof details === 'object' ? details : undefined;
        const level: DesignTaskLog['level'] = rawDetails?.error
          ? 'error'
          : message.includes('发现高亲和力') || message.includes('完成')
            ? 'success'
            : message.includes('失败') || message.includes('错误')
              ? 'warning'
              : 'info';
        const log: DesignTaskLog = {
          timestamp: Date.now(),
          level,
          message,
          details: rawDetails
            ? {
                thinking: typeof rawDetails.thinking === 'string' ? rawDetails.thinking : undefined,
                intermediateResults: rawDetails.intermediateResults,
                metrics: rawDetails.metrics && typeof rawDetails.metrics === 'object' ? rawDetails.metrics : undefined,
                reasoning: typeof rawDetails.reasoning === 'string' ? rawDetails.reasoning : undefined,
                error: typeof rawDetails.error === 'string' ? rawDetails.error : undefined,
              }
            : undefined,
        };
        task.logs = [...task.logs.slice(-119), log];
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
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`Design iteration ${iter + 1} failed:`, errorMsg);
        
        // Log the error for debugging
        emitTaskEvent({
          type: 'error',
          taskId,
          data: { 
            iteration: iter + 1,
            error: errorMsg,
            message: `迭代 ${iter + 1} 失败，继续下一迭代...`
          },
          timestamp: Date.now(),
        });
        
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
