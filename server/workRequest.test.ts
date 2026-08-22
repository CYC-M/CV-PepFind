import { describe, expect, it } from 'vitest';
import { extractWorkTarget } from '../shared/workRequest';

describe('extractWorkTarget', () => {
  it('extracts common protein symbols from natural-language design requests', () => {
    expect(extractWorkTarget('为 IL-6 设计高亲和力、低毒性多肽')).toBe('IL-6');
    expect(extractWorkTarget('为 PD-1 设计高亲和力多肽')).toBe('PD-1');
    expect(extractWorkTarget('靶向 PD-L1，生成稳定的候选多肽')).toBe('PD-L1');
  });

  it('supports Chinese target names and explicit target syntax', () => {
    expect(extractWorkTarget('针对白介素6设计高稳定性多肽')).toBe('白介素6');
    expect(extractWorkTarget('target: EGFR 高亲和力')).toBe('EGFR');
  });

  it('requires the request to include a recognizable target', () => {
    expect(extractWorkTarget('请设计低毒性、高稳定性候选多肽')).toBeNull();
  });
});
