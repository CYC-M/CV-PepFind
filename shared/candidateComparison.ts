import { calculatePeptideMetrics } from './peptideMetrics';

export type ComparableCandidate = {
  sequence: string;
  affinityScore: number;
  sequenceScore: number;
  combinedScore: number;
};

export type ComparisonMetric = {
  key: string;
  label: string;
  emphasis?: 'primary' | 'secondary';
};

export const CANDIDATE_COMPARISON_METRICS: ComparisonMetric[] = [
  { key: 'combinedScore', label: '综合评分', emphasis: 'primary' },
  { key: 'affinityScore', label: '亲和力评分', emphasis: 'primary' },
  { key: 'sequenceScore', label: '序列评分', emphasis: 'secondary' },
  { key: 'molecularWeight', label: '分子量' },
  { key: 'netCharge', label: '净电荷' },
  { key: 'hydrophobicity', label: '疏水性 (GRAVY)' },
  { key: 'stabilityIndex', label: '稳定性估计' },
  { key: 'isoelectricPoint', label: '等电点 (pI)' },
  { key: 'secondaryStructure', label: '结构倾向' },
];

export function getCandidateComparisonValue(candidate: ComparableCandidate, key: string): string {
  const metrics = calculatePeptideMetrics(candidate.sequence);
  switch (key) {
    case 'combinedScore': return candidate.combinedScore.toFixed(2);
    case 'affinityScore': return candidate.affinityScore.toFixed(2);
    case 'sequenceScore': return candidate.sequenceScore.toFixed(2);
    case 'molecularWeight': return `${metrics.molecularWeight.toFixed(1)} Da`;
    case 'netCharge': return `${metrics.netCharge >= 0 ? '+' : ''}${metrics.netCharge.toFixed(1)}`;
    case 'hydrophobicity': return metrics.hydrophobicity.toFixed(2);
    case 'stabilityIndex': return `${metrics.stabilityIndex.toFixed(0)} / 100`;
    case 'isoelectricPoint': return metrics.isoelectricPoint.toFixed(1);
    case 'secondaryStructure': return metrics.secondaryStructure.dominant;
    default: return '—';
  }
}

/**
 * Keeps only selections that still exist in the latest ranked candidate list.
 * Returns the original array when there is no effective change so React state
 * synchronisation can avoid scheduling a redundant render.
 */
export function retainAvailableCandidateSelections(selectedKeys: readonly string[], candidates: readonly Pick<ComparableCandidate, 'sequence'>[]): string[] {
  const available = new Set(candidates.map((candidate) => candidate.sequence));
  const next = selectedKeys.filter((key) => available.has(key));
  return next.length === selectedKeys.length ? selectedKeys as string[] : next;
}
