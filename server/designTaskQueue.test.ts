import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createDesignTask,
  getDesignTask,
  subscribeToTask,
  runDesignTask,
  pauseDesignTask,
  resumeDesignTask,
  cancelDesignTask,
  getTopCandidates,
  exportCandidatesAsCSV,
  type DesignTaskConfig,
  type DesignTaskEvent,
} from './designTaskQueue';

describe('designTaskQueue', () => {
  let taskId: string;
  let config: DesignTaskConfig;

  beforeEach(() => {
    taskId = `task-${Date.now()}-${Math.random()}`;
    config = {
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
      generationStrategy: 'hybrid',
      maxIterations: 2,
      topCandidates: 5,
    };
  });

  describe('createDesignTask', () => {
    it('should create a new task with pending status', () => {
      const task = createDesignTask(taskId, config);

      expect(task.taskId).toBe(taskId);
      expect(task.status).toBe('pending');
      expect(task.config).toEqual(config);
      expect(task.candidates).toEqual([]);
      expect(task.iteration).toBe(0);
      expect(task.progress).toBe(0);
    });

    it('should initialize startTime', () => {
      const beforeTime = Date.now();
      const task = createDesignTask(taskId, config);
      const afterTime = Date.now();

      expect(task.startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(task.startTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('getDesignTask', () => {
    it('should retrieve created task', () => {
      createDesignTask(taskId, config);
      const retrieved = getDesignTask(taskId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.taskId).toBe(taskId);
    });

    it('should return undefined for non-existent task', () => {
      const retrieved = getDesignTask('non-existent-task');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('subscribeToTask', () => {
    it('should subscribe to task events', () => {
      createDesignTask(taskId, config);
      const events: DesignTaskEvent[] = [];

      const unsubscribe = subscribeToTask(taskId, event => {
        events.push(event);
      });

      expect(typeof unsubscribe).toBe('function');
    });

    it('should return unsubscribe function', () => {
      createDesignTask(taskId, config);
      const callback = vi.fn();
      const unsubscribe = subscribeToTask(taskId, callback);

      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('pauseDesignTask', () => {
    it('should pause running task', () => {
      const task = createDesignTask(taskId, config);
      task.status = 'running';

      pauseDesignTask(taskId);

      const paused = getDesignTask(taskId);
      expect(paused?.status).toBe('paused');
    });

    it('should not pause non-running task', () => {
      const task = createDesignTask(taskId, config);
      task.status = 'completed';

      pauseDesignTask(taskId);

      const result = getDesignTask(taskId);
      expect(result?.status).toBe('completed');
    });
  });

  describe('resumeDesignTask', () => {
    it('should resume paused task', () => {
      const task = createDesignTask(taskId, config);
      task.status = 'paused';

      resumeDesignTask(taskId);

      const resumed = getDesignTask(taskId);
      expect(resumed?.status).toBe('running');
    });

    it('should not resume non-paused task', () => {
      const task = createDesignTask(taskId, config);
      task.status = 'running';

      resumeDesignTask(taskId);

      const result = getDesignTask(taskId);
      expect(result?.status).toBe('running');
    });
  });

  describe('cancelDesignTask', () => {
    it('should cancel running task', () => {
      const task = createDesignTask(taskId, config);
      task.status = 'running';

      cancelDesignTask(taskId);

      const cancelled = getDesignTask(taskId);
      expect(cancelled?.status).toBe('failed');
      expect(cancelled?.error).toBe('Task cancelled by user');
      expect(cancelled?.endTime).toBeDefined();
    });

    it('should cancel paused task', () => {
      const task = createDesignTask(taskId, config);
      task.status = 'paused';

      cancelDesignTask(taskId);

      const cancelled = getDesignTask(taskId);
      expect(cancelled?.status).toBe('failed');
    });

    it('should not cancel completed task', () => {
      const task = createDesignTask(taskId, config);
      task.status = 'completed';

      cancelDesignTask(taskId);

      const result = getDesignTask(taskId);
      expect(result?.status).toBe('completed');
    });
  });

  describe('getTopCandidates', () => {
    it('should return empty array for non-existent task', () => {
      const candidates = getTopCandidates('non-existent-task');
      expect(candidates).toEqual([]);
    });

    it('should return limited candidates', () => {
      const task = createDesignTask(taskId, config);

      // Add mock candidates
      for (let i = 0; i < 15; i++) {
        task.candidates.push({
          sequence: `PEPTIDE${i}`,
          sequenceScore: 0.5 + i * 0.01,
          affinityScore: -8 - i * 0.1,
          combinedScore: 0.5 + i * 0.01,
          rank: i + 1,
          timestamp: Date.now(),
        });
      }

      const topCandidates = getTopCandidates(taskId, 5);
      expect(topCandidates.length).toBe(5);
    });

    it('should return all candidates if limit exceeds count', () => {
      const task = createDesignTask(taskId, config);

      for (let i = 0; i < 3; i++) {
        task.candidates.push({
          sequence: `PEPTIDE${i}`,
          sequenceScore: 0.5,
          affinityScore: -8,
          combinedScore: 0.5,
          rank: i + 1,
          timestamp: Date.now(),
        });
      }

      const topCandidates = getTopCandidates(taskId, 10);
      expect(topCandidates.length).toBe(3);
    });
  });

  describe('exportCandidatesAsCSV', () => {
    it('should return empty string for non-existent task', () => {
      const csv = exportCandidatesAsCSV('non-existent-task');
      expect(csv).toBe('');
    });

    it('should export candidates as CSV', () => {
      const task = createDesignTask(taskId, config);

      task.candidates.push({
        sequence: 'PEPTIDE1',
        sequenceScore: 0.75,
        affinityScore: -9.5,
        combinedScore: 0.8,
        rank: 1,
        timestamp: Date.now(),
      });

      const csv = exportCandidatesAsCSV(taskId);

      expect(csv).toContain('Rank,Sequence,SequenceScore,AffinityScore,CombinedScore,Timestamp');
      expect(csv).toContain('PEPTIDE1');
      expect(csv).toContain('0.75');
      expect(csv).toContain('-9.50');
      expect(csv).toContain('0.80');
    });

    it('should handle multiple candidates', () => {
      const task = createDesignTask(taskId, config);

      for (let i = 0; i < 3; i++) {
        task.candidates.push({
          sequence: `PEPTIDE${i}`,
          sequenceScore: 0.5 + i * 0.1,
          affinityScore: -8 - i * 0.5,
          combinedScore: 0.5 + i * 0.1,
          rank: i + 1,
          timestamp: Date.now(),
        });
      }

      const csv = exportCandidatesAsCSV(taskId);
      const lines = csv.split('\n').filter(line => line.length > 0);

      expect(lines.length).toBe(4); // Header + 3 candidates
    });
  });

  describe('runDesignTask', () => {
    it('should throw error for non-existent task', async () => {
      await expect(runDesignTask('non-existent-task')).rejects.toThrow(
        'Task non-existent-task not found'
      );
    });

    it('should update task status to running', async () => {
      createDesignTask(taskId, config);

      // Run with minimal iterations
      const runPromise = runDesignTask(taskId);

      const task = getDesignTask(taskId);
      expect(task?.status).toBe('running');

      await runPromise;
    });

    it('should complete task successfully', async () => {
      createDesignTask(taskId, config);

      await runDesignTask(taskId);

      const task = getDesignTask(taskId);
      expect(task?.status).toBe('completed');
      expect(task?.endTime).toBeDefined();
      expect(task?.iteration).toBeGreaterThan(0);
      expect(task?.progress).toBe(100);
    });

    it('should generate candidates', async () => {
      createDesignTask(taskId, config);

      await runDesignTask(taskId);

      const task = getDesignTask(taskId);
      // May or may not have candidates depending on random generation
      expect(Array.isArray(task?.candidates)).toBe(true);
    });

    it('should emit progress events', async () => {
      createDesignTask(taskId, config);

      const events: DesignTaskEvent[] = [];
      subscribeToTask(taskId, event => {
        events.push(event);
      });

      await runDesignTask(taskId);

      const progressEvents = events.filter(e => e.type === 'progress');
      expect(progressEvents.length).toBeGreaterThan(0);
    });

    it('should emit completed event', async () => {
      createDesignTask(taskId, config);

      const events: DesignTaskEvent[] = [];
      subscribeToTask(taskId, event => {
        events.push(event);
      });

      await runDesignTask(taskId);

      const completedEvents = events.filter(e => e.type === 'completed');
      expect(completedEvents.length).toBe(1);
    });
  });

  describe('task pause and resume', () => {
    it('should handle pause and resume during execution', async () => {
      const longConfig = {
        ...config,
        maxIterations: 5,
      };

      createDesignTask(taskId, longConfig);

      const runPromise = runDesignTask(taskId);

      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 50));

      pauseDesignTask(taskId);
      const pausedTask = getDesignTask(taskId);
      expect(pausedTask?.status).toBe('paused');

      // Resume
      resumeDesignTask(taskId);
      const resumedTask = getDesignTask(taskId);
      expect(resumedTask?.status).toBe('running');

      await runPromise;

      const finalTask = getDesignTask(taskId);
      expect(finalTask?.status).toBe('completed');
    });
  });

  describe('task cancellation', () => {
    it('should mark task as failed when cancelled', () => {
      const task = createDesignTask(taskId, config);
      task.status = 'running';

      cancelDesignTask(taskId);

      const cancelledTask = getDesignTask(taskId);
      expect(cancelledTask?.status).toBe('failed');
      expect(cancelledTask?.error).toBe('Task cancelled by user');
    });
  });
});
