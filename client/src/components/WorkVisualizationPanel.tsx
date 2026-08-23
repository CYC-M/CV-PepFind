import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, CircleDashed, Dna, FlaskConical, Loader2, PauseCircle, Sparkles, Target, Trophy, Workflow, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useWorkProgress } from '@/contexts/WorkProgressContext';
import { getWorkflowNodeProgress, getWorkflowNodeStates, type WorkflowNodeStatus } from '@shared/workflowNodeStatus';

const workspaceFeatures = [
  { icon: Target, label: '靶点约束' },
  { icon: Dna, label: '序列优化' },
  { icon: FlaskConical, label: '理化筛选' },
  { icon: Trophy, label: '结果排序' },
];

const pipelineNodes = [
  { icon: Target, label: '需求解析', summary: '提取靶点与约束', top: 'top-0', description: '从自然语言任务中识别目标蛋白、结合偏好以及稳定性、毒性等设计约束。' },
  { icon: Dna, label: '候选构建', summary: '生成并优化序列', top: 'top-[57px]', description: '生成多样化候选多肽，并通过序列级优化扩大可探索的设计空间。' },
  { icon: FlaskConical, label: '性质筛选', summary: '评估理化性质', top: 'top-[114px]', description: '计算分子量、电荷、疏水性、稳定性和 pI 等指标，过滤不满足设计约束的候选。' },
  { icon: Trophy, label: '亲和排序', summary: '输出优先级候选', top: 'top-[171px]', description: '整合序列与亲和力评分，对保留候选进行排序并输出高优先级多肽结果。' },
];

const stateMeta: Record<WorkflowNodeStatus, { label: string; icon: typeof Circle; card: string; iconTone: string; labelTone: string }> = {
  waiting: { label: '等待中', icon: CircleDashed, card: 'border-slate-500/35 bg-slate-500/[0.045] dark:border-slate-400/30', iconTone: 'bg-slate-400/10 text-slate-300', labelTone: 'text-slate-300' },
  running: { label: '运行中', icon: Loader2, card: 'border-primary bg-primary/12 shadow-lg shadow-primary/20 dark:bg-primary/18', iconTone: 'bg-primary/20 text-primary', labelTone: 'text-primary' },
  completed: { label: '已完成', icon: CheckCircle2, card: 'border-emerald-400/55 bg-emerald-400/[0.08] dark:bg-emerald-400/[0.12]', iconTone: 'bg-emerald-400/15 text-emerald-300', labelTone: 'text-emerald-300' },
  paused: { label: '已暂停', icon: PauseCircle, card: 'border-amber-400/55 bg-amber-400/[0.08] dark:bg-amber-400/[0.12]', iconTone: 'bg-amber-400/15 text-amber-300', labelTone: 'text-amber-300' },
  failed: { label: '已失败', icon: XCircle, card: 'border-rose-400/60 bg-rose-400/[0.08] dark:bg-rose-400/[0.12]', iconTone: 'bg-rose-400/15 text-rose-300', labelTone: 'text-rose-300' },
};

/** Work 专属左侧面板：以任务实时进度呈现多肽设计工作流程。 */
export default function WorkVisualizationPanel() {
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const { progress } = useWorkProgress();
  const nodeStates = useMemo(() => getWorkflowNodeStates(progress.status, progress.stepNumber), [progress.status, progress.stepNumber]);
  const nodeProgress = useMemo(() => getWorkflowNodeProgress(progress.status, progress.stepNumber, progress.progress), [progress.progress, progress.status, progress.stepNumber]);
  const overallState = progress.status === 'pending' ? 'waiting' : progress.status === 'running' ? 'running' : progress.status === 'paused' ? 'paused' : progress.status === 'completed' ? 'completed' : 'failed';
  const overallMeta = stateMeta[overallState];

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-5 overflow-hidden px-6">
      {[['left-1/4', 'top-1/4'], ['left-3/4', 'top-1/3'], ['left-1/3', 'top-3/4'], ['left-2/3', 'top-2/3']].map(([left, top], index) => (
        <motion.span key={index} className={`absolute h-1.5 w-1.5 rounded-full bg-primary/35 ${left} ${top}`} animate={shouldReduceMotion ? undefined : { y: [0, -20, 0], opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 3 + index * 0.45, delay: index * 0.25, repeat: Infinity, ease: 'easeInOut' }} />
      ))}

      <div className="z-10 flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary"><Workflow className="h-3.5 w-3.5" />多肽设计工作流程</div>

      <div className="relative h-[236px] w-[260px]" aria-label="多肽自主设计工作流程：需求解析、候选构建、性质筛选、亲和排序">
        <motion.div className="absolute inset-x-0 top-1/2 h-[218px] -translate-y-1/2 rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/10 via-card/90 to-accent/10 shadow-[0_18px_58px_-30px_rgb(16_185_129_/_0.7)] dark:border-primary/40 dark:from-primary/15 dark:via-card/95 dark:to-accent/15" animate={hoveredNode === null ? { opacity: 1 } : { opacity: 1, scale: 1.015 }} transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }} />
        <motion.div className="absolute bottom-[16px] left-1/2 top-[16px] w-px -translate-x-1/2 bg-gradient-to-b from-primary/25 via-primary/85 to-accent/35 dark:from-primary/35 dark:via-primary dark:to-accent/45" animate={hoveredNode === null ? { opacity: 0.7 } : { opacity: 1, scaleY: 1.03 }} transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }} />
        {progress.status === 'running' && <motion.span className="absolute left-1/2 top-[19px] h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_12px_rgba(16,185,129,0.9)]" animate={shouldReduceMotion ? undefined : { y: [0, 187, 0], opacity: [0.35, 1, 0.35] }} transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut' }} />}

        {pipelineNodes.map(({ icon: Icon, label, summary, top, description }, index) => {
          const nodeState = nodeStates[index];
          const meta = stateMeta[nodeState];
          const StatusIcon = meta.icon;
          const isHovered = hoveredNode === index;
          const isRunning = nodeState === 'running';
          const localProgress = nodeProgress[index];
          return (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <motion.div
                  role="group"
                  tabIndex={0}
                  aria-label={`${label}阶段，${meta.label}：${description}`}
                  onMouseEnter={() => setHoveredNode(index)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onFocus={() => setHoveredNode(index)}
                  onBlur={() => setHoveredNode(null)}
                  className={`absolute left-1/2 ${top} z-10 flex w-[214px] -translate-x-1/2 flex-col gap-1.5 overflow-hidden rounded-xl border px-3 py-2 outline-none backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${meta.card}`}
                  animate={isHovered ? { scale: 1.035, x: 3 } : { scale: 1, x: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}
                >
                  {isRunning && !shouldReduceMotion && <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-xl border border-primary/75" animate={{ opacity: [0.16, 0.62, 0.16], scale: [1, 1.025, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} />}
                  <span className="relative flex w-full items-center gap-3"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.iconTone}`}><Icon className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1 text-left"><span className="block text-[9px] font-medium uppercase tracking-[0.13em] text-primary/85">Step 0{index + 1} · {summary}</span><span className="block text-xs font-semibold text-foreground">{label}</span></span><span className={`flex shrink-0 flex-col items-end text-[9px] font-semibold ${meta.labelTone}`}><span className="flex items-center gap-1"><StatusIcon className={`h-3 w-3 ${isRunning && !shouldReduceMotion ? 'animate-spin' : ''}`} />{meta.label}</span><span className="font-mono text-[9px]">{localProgress}%</span></span></span>
                  <span role="progressbar" aria-label={`${label}阶段进度`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={localProgress} className="relative h-1 w-full overflow-hidden rounded-full bg-background/65"><motion.span className={`block h-full rounded-full ${nodeState === 'completed' ? 'bg-emerald-400' : nodeState === 'paused' ? 'bg-amber-400' : nodeState === 'failed' ? 'bg-rose-400' : nodeState === 'running' ? 'bg-primary' : 'bg-slate-400/60'}`} animate={{ scaleX: localProgress / 100 }} transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: [0.23, 1, 0.32, 1] }} style={{ transformOrigin: 'left center' }} /></span>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12} className="z-[60] max-w-64 border-primary/65 bg-popover text-popover-foreground shadow-2xl shadow-black/60 ring-primary/30 dark:border-primary/70 dark:bg-popover dark:text-popover-foreground dark:shadow-black/75 dark:ring-primary/40">
                <p className="flex items-center gap-1.5 font-bold tracking-tight text-popover-foreground"><span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">Step 0{index + 1}</span>{label}<span className={`ml-auto text-[9px] ${meta.labelTone}`}>{meta.label} · {localProgress}%</span></p>
                <p className="mt-1.5 leading-relaxed text-popover-foreground/90">{description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <div className="z-10 text-center"><div className="mb-2 flex items-center justify-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h2 className="text-lg font-semibold text-foreground/90">多肽工作台</h2></div><p className="max-w-sm text-sm leading-relaxed text-muted-foreground">从自然语言需求出发，依次完成靶点与约束解析、候选构建、理化筛选和亲和排序，再返回优先级候选。</p><span className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${overallMeta.card} ${overallMeta.labelTone}`}><overallMeta.icon className={`h-3 w-3 ${overallState === 'running' && !shouldReduceMotion ? 'animate-spin' : ''}`} />流程{overallMeta.label}{progress.status !== 'pending' && ` · ${Math.round(progress.progress)}%`}</span></div>

      <div className="z-10 grid grid-cols-4 gap-2">{workspaceFeatures.map(({ icon: Icon, label }, index) => { const nodeState = nodeStates[index]; const meta = stateMeta[nodeState]; const StatusIcon = meta.icon; return <motion.div key={label} className={`flex min-w-0 flex-col items-center gap-1.5 rounded-xl border px-2 py-2 transition-colors ${meta.card}`} animate={hoveredNode === index ? { y: -2 } : { y: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}><span className="relative"><Icon className="h-4 w-4 text-primary/80" /><StatusIcon className={`absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-card ${meta.labelTone} ${nodeState === 'running' && !shouldReduceMotion ? 'animate-spin' : ''}`} /></span><span className="whitespace-nowrap text-[9px] text-muted-foreground">{label}</span></motion.div>; })}</div>
    </div>
  );
}
