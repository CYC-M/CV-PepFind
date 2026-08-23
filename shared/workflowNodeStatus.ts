export type WorkflowTaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';
export type WorkflowNodeStatus = 'waiting' | 'running' | 'completed' | 'paused' | 'failed';

/** 将后端八步任务压缩为工作台四阶段：需求解析、候选构建、性质筛选、亲和排序。 */
export function getWorkflowNodeStates(status: WorkflowTaskStatus, stepNumber?: number): WorkflowNodeStatus[] {
  if (status === 'pending') return ['waiting', 'waiting', 'waiting', 'waiting'];
  if (status === 'completed') return ['completed', 'completed', 'completed', 'completed'];

  const activeIndex = (stepNumber ?? 1) <= 2 ? 1 : (stepNumber ?? 1) <= 4 ? 2 : 3;

  return [0, 1, 2, 3].map((index) => {
    if (index === 0) return 'completed';
    if (index < activeIndex) return 'completed';
    if (index > activeIndex) return 'waiting';
    if (status === 'paused') return 'paused';
    if (status === 'failed') return 'failed';
    return 'running';
  }) as WorkflowNodeStatus[];
}

const workflowRanges = [
  { start: 0, end: 0 },
  { start: 0, end: 30 },
  { start: 30, end: 55 },
  { start: 55, end: 100 },
];

/** 返回工作台四阶段的局部完成度，供节点进度条与百分比读数使用。 */
export function getWorkflowNodeProgress(status: WorkflowTaskStatus, stepNumber: number | undefined, overallProgress: number): number[] {
  if (status === 'pending') return [0, 0, 0, 0];
  if (status === 'completed') return [100, 100, 100, 100];

  const states = getWorkflowNodeStates(status, stepNumber);
  const normalizedProgress = Math.max(0, Math.min(100, overallProgress));

  return states.map((nodeState, index) => {
    if (nodeState === 'completed') return 100;
    if (nodeState === 'waiting') return 0;
    // 当前后端会在多轮迭代中重复报告候选构建步骤；运行节点直接使用真实总体进度，避免阶段尚未结束时提前显示 100%。
    if (nodeState === 'running') return Math.min(99, normalizedProgress);
    const range = workflowRanges[index];
    if (range.end === range.start) return 100;
    return Math.max(0, Math.min(100, Math.round(((normalizedProgress - range.start) / (range.end - range.start)) * 100)));
  });
}
