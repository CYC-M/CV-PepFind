import { describe, expect, it } from 'vitest';
import { getWorkPhaseProgress } from '../shared/workStages';

describe('getWorkPhaseProgress', () => {
  it('marks sequence construction active during initialization and generation', () => {
    const phases = getWorkPhaseProgress(2, 20, 'running');
    expect(phases.map((phase) => phase.state)).toEqual(['active', 'pending', 'pending']);
    expect(phases[0].progress).toBeGreaterThan(0);
  });

  it('marks prior phases complete once property screening begins', () => {
    const phases = getWorkPhaseProgress(4, 50, 'running');
    expect(phases.map((phase) => phase.state)).toEqual(['completed', 'active', 'pending']);
  });

  it('marks every phase complete when the design task completes', () => {
    expect(getWorkPhaseProgress(8, 100, 'completed').every((phase) => phase.state === 'completed' && phase.progress === 100)).toBe(true);
  });
});
