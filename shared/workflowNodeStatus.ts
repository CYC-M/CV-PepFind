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
