import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { Dna, FlaskConical, Sparkles, Target, Trophy, Workflow } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const workspaceFeatures = [
  { icon: Target, label: '靶点约束' },
  { icon: Dna, label: '序列优化' },
  { icon: FlaskConical, label: '理化筛选' },
  { icon: Trophy, label: '结果排序' },
];

const pipelineNodes = [
  {
    icon: Target,
    label: '需求解析',
    summary: '提取靶点与约束',
    top: 'top-0',
    description: '从自然语言任务中识别目标蛋白、结合偏好以及稳定性、毒性等设计约束。',
  },
  {
    icon: Dna,
    label: '候选构建',
    summary: '生成并优化序列',
    top: 'top-[52px]',
    description: '生成多样化候选多肽，并通过序列级优化扩大可探索的设计空间。',
  },
  {
    icon: FlaskConical,
    label: '性质筛选',
    summary: '评估理化性质',
    top: 'top-[104px]',
    description: '计算分子量、电荷、疏水性、稳定性和 pI 等指标，过滤不满足设计约束的候选。',
  },
  {
    icon: Trophy,
    label: '亲和排序',
    summary: '输出优先级候选',
    top: 'top-[156px]',
    description: '整合序列与亲和力评分，对保留候选进行排序并输出高优先级多肽结果。',
  },
];

/** Work 专属左侧面板，不读取 Chat 的 AgentContext，避免两种模式互相干扰。 */
export default function WorkVisualizationPanel() {
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-5 overflow-hidden px-6">
      {[['left-1/4', 'top-1/4'], ['left-3/4', 'top-1/3'], ['left-1/3', 'top-3/4'], ['left-2/3', 'top-2/3']].map(([left, top], index) => (
        <motion.span
          key={index}
          className={`absolute h-1.5 w-1.5 rounded-full bg-primary/35 ${left} ${top}`}
          animate={shouldReduceMotion ? undefined : { y: [0, -20, 0], opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 3 + index * 0.45, delay: index * 0.25, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      <div className="z-10 flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
        <Workflow className="h-3.5 w-3.5" />
        多肽设计工作流程
      </div>

      <div className="relative h-[210px] w-[260px]" aria-label="多肽自主设计工作流程：需求解析、候选构建、性质筛选、亲和排序">
        <motion.div
          className="absolute inset-x-0 top-1/2 h-[190px] -translate-y-1/2 rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/10 via-card/90 to-accent/10 shadow-[0_18px_58px_-30px_rgb(16_185_129_/_0.7)] dark:border-primary/40 dark:from-primary/15 dark:via-card/95 dark:to-accent/15"
          animate={activeNode === null ? { opacity: 1 } : { opacity: 1, scale: 1.015 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
        />
        <motion.div
          className="absolute bottom-[16px] left-1/2 top-[16px] w-px -translate-x-1/2 bg-gradient-to-b from-primary/25 via-primary/85 to-accent/35 dark:from-primary/35 dark:via-primary dark:to-accent/45"
          animate={activeNode === null ? { opacity: 0.7 } : { opacity: 1, scaleY: 1.03 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
        />
        <motion.span
          className="absolute left-1/2 top-[19px] h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_12px_rgba(16,185,129,0.9)]"
          animate={shouldReduceMotion ? undefined : { y: [0, 160, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {pipelineNodes.map(({ icon: Icon, label, summary, top, description }, index) => {
          const isActive = activeNode === index;
          return (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <motion.div
                  role="group"
                  tabIndex={0}
                  aria-label={`${label}阶段：${description}`}
                  onMouseEnter={() => setActiveNode(index)}
                  onMouseLeave={() => setActiveNode(null)}
                  onFocus={() => setActiveNode(index)}
                  onBlur={() => setActiveNode(null)}
                  className={`absolute left-1/2 ${top} z-10 flex w-[214px] -translate-x-1/2 items-center gap-3 rounded-xl border px-3 py-2 outline-none backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isActive ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20 dark:bg-primary/15' : 'border-border/80 bg-card/90 shadow-sm dark:border-primary/35 dark:bg-card/95'}`}
                  animate={isActive ? { scale: 1.035, x: 3 } : { scale: 1, x: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}
                >
                  <motion.span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary dark:bg-primary/20"
                    animate={isActive ? { rotate: shouldReduceMotion ? 0 : [0, -7, 7, 0], scale: 1.08 } : { rotate: 0, scale: 1 }}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.32, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </motion.span>
                  <span className="min-w-0 text-left">
                    <span className="block text-[9px] font-medium uppercase tracking-[0.13em] text-primary/85">Step 0{index + 1} · {summary}</span>
                    <span className="block text-xs font-semibold text-foreground">{label}</span>
                  </span>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12} className="z-[60] max-w-64 border-primary/65 bg-popover text-popover-foreground shadow-2xl shadow-black/60 ring-primary/30 dark:border-primary/70 dark:bg-popover dark:text-popover-foreground dark:shadow-black/75 dark:ring-primary/40">
                <p className="flex items-center gap-1.5 font-bold tracking-tight text-popover-foreground"><span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">Step 0{index + 1}</span>{label}</p>
                <p className="mt-1.5 leading-relaxed text-popover-foreground/90">{description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <div className="z-10 text-center">
        <div className="mb-2 flex items-center justify-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h2 className="text-lg font-semibold text-foreground/90">多肽工作台</h2></div>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">从自然语言需求出发，依次完成靶点与约束解析、候选构建、理化筛选和亲和排序，再返回优先级候选。</p>
      </div>

      <div className="z-10 grid grid-cols-4 gap-2">
        {workspaceFeatures.map(({ icon: Icon, label }, index) => (
          <motion.div
            key={label}
            className={`flex min-w-0 flex-col items-center gap-1.5 rounded-xl border px-2 py-2 transition-colors ${activeNode === index ? 'border-primary/70 bg-primary/10 shadow-md shadow-primary/15 dark:bg-primary/15' : 'border-border/65 bg-card/70 dark:border-primary/25 dark:bg-card/80'}`}
            animate={activeNode === index ? { y: -2 } : { y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            <Icon className="h-4 w-4 text-primary/80" />
            <span className="whitespace-nowrap text-[9px] text-muted-foreground">{label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
