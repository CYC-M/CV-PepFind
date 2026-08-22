import { motion } from 'framer-motion';
import { Dna, FlaskConical, Sparkles, Trophy } from 'lucide-react';

const workspaceFeatures = [
  { icon: Dna, label: '序列构建' },
  { icon: FlaskConical, label: '性质筛选' },
  { icon: Trophy, label: '亲和排序' },
];

/** Work 专属左侧面板，不读取 Chat 的 AgentContext，避免两种模式互相干扰。 */
export default function WorkVisualizationPanel() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-6 overflow-hidden px-6">
      {[['left-1/4', 'top-1/4'], ['left-3/4', 'top-1/3'], ['left-1/3', 'top-3/4'], ['left-2/3', 'top-2/3']].map(([left, top], index) => (
        <motion.span key={index} className={`absolute h-1.5 w-1.5 rounded-full bg-primary/35 ${left} ${top}`} animate={{ y: [0, -20, 0], opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 3 + index * 0.45, delay: index * 0.25, repeat: Infinity, ease: 'easeInOut' }} />
      ))}
      <motion.div className="relative" animate={{ rotate: 360 }} transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}>
        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-gradient-to-br from-primary/20 to-accent/15">
          <Dna className="h-12 w-12 text-primary/75" />
        </div>
        {[0, 120, 240].map((deg, index) => <motion.span key={deg} className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full bg-primary/50" style={{ transform: `rotate(${deg}deg) translateX(48px) translateY(-50%)` }} animate={{ scale: [1, 1.35, 1], opacity: [0.45, 1, 0.45] }} transition={{ duration: 2.2, delay: index * 0.65, repeat: Infinity }} />)}
      </motion.div>
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
