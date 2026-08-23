import { describe, expect, it } from 'vitest';
import { getWorkflowNodeProgress, getWorkflowNodeStates } from '../shared/workflowNodeStatus';

describe('getWorkflowNodeStates', () => {
  it('keeps all stages waiting before a task starts', () => {
    expect(getWorkflowNodeStates('pending')).toEqual(['waiting', 'waiting', 'waiting', 'waiting']);
  });

  it('maps early running steps to candidate construction after requirement parsing', () => {
    expect(getWorkflowNodeStates('running', 1)).toEqual(['completed', 'running', 'waiting', 'waiting']);
  });

  it('maps property and affinity steps to the corresponding workflow nodes', () => {
    expect(getWorkflowNodeStates('running', 3)).toEqual(['completed', 'completed', 'running', 'waiting']);
    expect(getWorkflowNodeStates('running', 6)).toEqual(['completed', 'completed', 'completed', 'running']);
  });

  it('renders terminal, paused and failed statuses consistently', () => {
    expect(getWorkflowNodeStates('completed', 8)).toEqual(['completed', 'completed', 'completed', 'completed']);
    expect(getWorkflowNodeStates('paused', 5)).toEqual(['completed', 'completed', 'completed', 'paused']);
    expect(getWorkflowNodeStates('failed', 5)).toEqual(['completed', 'completed', 'completed', 'failed']);
  });
});

describe('getWorkflowNodeProgress', () => {
  it('keeps pending stages at zero and terminal stages at one hundred percent', () => {
    expect(getWorkflowNodeProgress('pending', undefined, 0)).toEqual([0, 0, 0, 0]);
    expect(getWorkflowNodeProgress('completed', 8, 100)).toEqual([100, 100, 100, 100]);
  });

  it('derives local progress from the running workflow range', () => {
    expect(getWorkflowNodeProgress('running', 1, 15)).toEqual([100, 15, 0, 0]);
    expect(getWorkflowNodeProgress('running', 3, 40)).toEqual([100, 100, 40, 0]);
    expect(getWorkflowNodeProgress('running', 6, 77)).toEqual([100, 100, 100, 77]);
  });
});
