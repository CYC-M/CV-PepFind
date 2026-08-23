import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { Dna, FlaskConical, Sparkles, Trophy, Workflow } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const workspaceFeatures = [
  { icon: Dna, label: '序列构建' },
  { icon: FlaskConical, label: '性质筛选' },
  { icon: Trophy, label: '亲和排序' },
];

const pipelineNodes = [
  { icon: Dna, label: '构建', top: 'top-0', description: '解析任务目标与约束，生成并优化多样化的候选多肽序列。' },
  { icon: FlaskConical, label: '筛选', top: 'top-[45px]', description: '评估分子量、电荷、疏水性、稳定性等理化性质，过滤不符合约束的候选。' },
  { icon: Trophy, label: '排序', top: 'top-[90px]', description: '整合序列与亲和力评分，对保留候选进行排序并输出优先级结果。' },
];

/** Work 专属左侧面板，不读取 Chat 的 AgentContext，避免两种模式互相干扰。 */
export default function WorkVisualizationPanel() {
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-6 overflow-hidden px-6">
      {[['left-1/4', 'top-1/4'], ['left-3/4', 'top-1/3'], ['left-1/3', 'top-3/4'], ['left-2/3', 'top-2/3']].map(([left, top], index) => (
        <motion.span key={index} className={`absolute h-1.5 w-1.5 rounded-full bg-primary/35 ${left} ${top}`} animate={{ y: [0, -20, 0], opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 3 + index * 0.45, delay: index * 0.25, repeat: Infinity, ease: 'easeInOut' }} />
      ))}
      <div className="relative h-[138px] w-[176px]" aria-label="多肽筛选流水线图案">
        <motion.div
          className="absolute inset-x-0 top-1/2 h-[104px] -translate-y-1/2 rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/10 via-card/90 to-accent/10 shadow-[0_16px_50px_-28px_rgb(16_185_129_/_0.65)] dark:border-primary/40 dark:from-primary/15 dark:via-card/95 dark:to-accent/15"
          animate={activeNode === null ? { opacity: 1 } : { opacity: 1, scale: 1.025 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
        />
        <motion.div
          className="absolute bottom-[19px] left-1/2 top-[19px] w-px -translate-x-1/2 bg-gradient-to-b from-primary/25 via-primary/85 to-accent/35 dark:from-primary/35 dark:via-primary dark:to-accent/45"
          animate={activeNode === null ? { opacity: 0.7 } : { opacity: 1, scaleY: 1.05 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
        />
        <motion.span className="absolute left-1/2 top-[22px] h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_12px_rgba(16,185,129,0.9)]" animate={{ y: [0, 88, 0], opacity: [0.35, 1, 0.35] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} />
        {pipelineNodes.map(({ icon: Icon, label, top, description }, index) => {
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
                  className={`absolute left-1/2 ${top} z-10 flex w-[132px] -translate-x-1/2 items-center gap-2.5 rounded-xl border px-3 py-2 outline-none backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isActive ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20 dark:bg-primary/15' : 'border-border/80 bg-card/90 shadow-sm dark:border-primary/35 dark:bg-card/95'}`}
                  animate={isActive ? { scale: 1.055, y: -2 } : { scale: 1, y: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}
                >
                  <motion.span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary dark:bg-primary/20" animate={isActive ? { rotate: shouldReduceMotion ? 0 : [0, -7, 7, 0], scale: 1.08 } : { rotate: 0, scale: 1 }} transition={{ duration: shouldReduceMotion ? 0 : 0.32, ease: [0.23, 1, 0.32, 1] }}><Icon className="h-3.5 w-3.5" /></motion.span>
                  <span className="min-w-0"><span className="block text-[9px] font-medium uppercase tracking-[0.13em] text-primary/85">Step 0{index + 1}</span><span className="block text-xs font-semibold text-foreground">{label}</span></span>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12} className="z-[60] max-w-64 border-primary/65 bg-popover text-popover-foreground shadow-2xl shadow-black/60 ring-primary/30 dark:border-primary/70 dark:bg-popover dark:text-popover-foreground dark:shadow-black/75 dark:ring-primary/40">
                <p className="flex items-center gap-1.5 font-bold tracking-tight text-popover-foreground"><span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary">Step 0{index + 1}</span>{label}阶段</p>
                <p className="mt-1.5 leading-relaxed text-popover-foreground/90">{description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        <motion.div className="absolute -right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent" animate={{ scale: [0.94, 1.06, 0.94], opacity: [0.55, 1, 0.55] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}><Workflow className="h-4 w-4" /></motion.div>
      </div>
      <div className="z-10 text-center">
        <div className="mb-2 flex items-center justify-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h2 className="text-lg font-semibold text-foreground/90">多肽工作台</h2></div>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">在右侧以自然语言下达任务。Work Agent 会持续构建候选、评估理化性质并排序高亲和力多肽。</p>
      </div>
      <div className="z-10 flex gap-3">
        {workspaceFeatures.map(({ icon: Icon, label }, index) => <motion.div key={label} className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-2 transition-colors ${activeNode === index ? 'border-primary/70 bg-primary/10 shadow-md shadow-primary/15 dark:bg-primary/15' : 'border-border/65 bg-card/70 dark:border-primary/25 dark:bg-card/80'}`} animate={activeNode === index ? { y: -2 } : { y: 0 }} transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}><Icon className="h-4 w-4 text-primary/80" /><span className="text-[10px] text-muted-foreground">{label}</span></motion.div>)}
      </div>
    </div>
  );
}
