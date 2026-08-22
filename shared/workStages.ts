export type WorkPhaseState = 'pending' | 'active' | 'completed' | 'paused' | 'failed';

export type WorkPhaseProgress = {
  id: 'sequence' | 'properties' | 'affinity';
  label: string;
  description: string;
  state: WorkPhaseState;
  progress: number;
};

const phaseDefinitions = [
  { id: 'sequence' as const, label: '序列构建', description: '生成并优化候选序列', firstStep: 1, lastStep: 2, startProgress: 0, endProgress: 30 },
  { id: 'properties' as const, label: '性质筛选', description: '分析理化性质并过滤', firstStep: 3, lastStep: 4, startProgress: 30, endProgress: 55 },
  { id: 'affinity' as const, label: '亲和排序', description: '对接评估并排序候选', firstStep: 5, lastStep: 8, startProgress: 55, endProgress: 100 },
];

/** 将后端八步设计流程压缩为工作台的三段实时进度。 */
export function getWorkPhaseProgress(stepNumber: number | undefined, overallProgress: number, status: string): WorkPhaseProgress[] {
  const normalizedProgress = Math.max(0, Math.min(100, overallProgress));
  const activeIndex = status === 'completed' ? phaseDefinitions.length : phaseDefinitions.findIndex((phase) => (stepNumber ?? 1) >= phase.firstStep && (stepNumber ?? 1) <= phase.lastStep);

  return phaseDefinitions.map((phase, index) => {
    if (status === 'completed') return { ...phase, state: 'completed', progress: 100 };
    if (status === 'failed') return { ...phase, state: index === activeIndex ? 'failed' : index < activeIndex ? 'completed' : 'pending', progress: index < activeIndex ? 100 : 0 };
    if (status === 'paused') return { ...phase, state: index === activeIndex ? 'paused' : index < activeIndex ? 'completed' : 'pending', progress: index < activeIndex ? 100 : index === activeIndex ? Math.round(((normalizedProgress - phase.startProgress) / Math.max(1, phase.endProgress - phase.startProgress)) * 100) : 0 };
    if (index < activeIndex) return { ...phase, state: 'completed', progress: 100 };
    if (index > activeIndex) return { ...phase, state: 'pending', progress: 0 };

    const phaseProgress = Math.round(((normalizedProgress - phase.startProgress) / Math.max(1, phase.endProgress - phase.startProgress)) * 100);
    return { ...phase, state: 'active', progress: Math.max(0, Math.min(100, phaseProgress)) };
  });
}
