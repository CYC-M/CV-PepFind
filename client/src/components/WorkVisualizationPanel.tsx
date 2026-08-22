import { motion } from 'framer-motion';
import { Dna, FlaskConical, Sparkles, Trophy, Workflow } from 'lucide-react';

const workspaceFeatures = [
  { icon: Dna, label: '序列构建' },
  { icon: FlaskConical, label: '性质筛选' },
  { icon: Trophy, label: '亲和排序' },
];

const pipelineNodes = [
  { icon: Dna, label: '构建', top: 'top-0' },
  { icon: FlaskConical, label: '筛选', top: 'top-[45px]' },
  { icon: Trophy, label: '排序', top: 'top-[90px]' },
];

/** Work 专属左侧面板，不读取 Chat 的 AgentContext，避免两种模式互相干扰。 */
export default function WorkVisualizationPanel() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-6 overflow-hidden px-6">
      {[['left-1/4', 'top-1/4'], ['left-3/4', 'top-1/3'], ['left-1/3', 'top-3/4'], ['left-2/3', 'top-2/3']].map(([left, top], index) => (
        <motion.span key={index} className={`absolute h-1.5 w-1.5 rounded-full bg-primary/35 ${left} ${top}`} animate={{ y: [0, -20, 0], opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 3 + index * 0.45, delay: index * 0.25, repeat: Infinity, ease: 'easeInOut' }} />
      ))}
      <div className="relative h-[138px] w-[176px]" aria-label="多肽筛选流水线图案">
        <div className="absolute inset-x-0 top-1/2 h-[104px] -translate-y-1/2 rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/[0.08] via-card/60 to-accent/[0.06] shadow-[0_16px_50px_-28px_rgba(16,185,129,0.65)]" />
        <div className="absolute bottom-[19px] left-1/2 top-[19px] w-px -translate-x-1/2 bg-gradient-to-b from-primary/15 via-primary/70 to-accent/25" />
        <motion.span className="absolute left-1/2 top-[22px] h-2 w-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_12px_rgba(16,185,129,0.9)]" animate={{ y: [0, 88, 0], opacity: [0.35, 1, 0.35] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} />
        {pipelineNodes.map(({ icon: Icon, label, top }, index) => (
          <motion.div key={label} className={`absolute left-1/2 ${top} z-10 flex w-[132px] -translate-x-1/2 items-center gap-2.5 rounded-xl border border-primary/25 bg-background/85 px-3 py-2 backdrop-blur-sm`} animate={{ borderColor: ['rgba(16,185,129,0.22)', 'rgba(16,185,129,0.62)', 'rgba(16,185,129,0.22)'] }} transition={{ duration: 2.8, delay: index * 0.55, repeat: Infinity, ease: 'easeInOut' }}>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-3.5 w-3.5" /></span>
            <span className="min-w-0"><span className="block text-[9px] font-medium uppercase tracking-[0.13em] text-primary/75">Step 0{index + 1}</span><span className="block text-xs font-semibold text-foreground/90">{label}</span></span>
          </motion.div>
        ))}
        <motion.div className="absolute -right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent" animate={{ scale: [0.94, 1.06, 0.94], opacity: [0.55, 1, 0.55] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}><Workflow className="h-4 w-4" /></motion.div>
      </div>
      <div className="z-10 text-center">
        <div className="mb-2 flex items-center justify-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h2 className="text-lg font-semibold text-foreground/90">多肽工作台</h2></div>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">在右侧以自然语言下达任务。Work Agent 会持续构建候选、评估理化性质并排序高亲和力多肽。</p>
      </div>
      <div className="z-10 flex gap-3">
        {workspaceFeatures.map(({ icon: Icon, label }) => <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl border border-border/50 bg-card/50 px-3 py-2"><Icon className="h-4 w-4 text-primary/70" /><span className="text-[10px] text-muted-foreground">{label}</span></div>)}
      </div>
    </div>
  );
}
