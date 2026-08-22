import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Columns3,
  Dna,
  Download,
  FlaskConical,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Target,
  Trophy,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { PeptideLink } from '@/components/PeptideLink';
import { trpc } from '@/lib/trpc';
import { calculatePeptideMetrics } from '@shared/peptideMetrics';
import { CANDIDATE_COMPARISON_METRICS, getCandidateComparisonValue, retainAvailableCandidateSelections } from '@shared/candidateComparison';
import { extractWorkTarget } from '@shared/workRequest';
import { getWorkPhaseProgress } from '@shared/workStages';

const TERMINAL_STATUSES = new Set(['completed', 'failed']);

const STATUS_LABELS: Record<string, string> = {
  pending: '等待启动',
  running: '运行中',
  paused: '已暂停',
  completed: '已完成',
  failed: '已停止',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  running: 'border-primary/30 bg-primary/10 text-primary',
  paused: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  completed: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  failed: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
};

type WorkStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';

type WorkLog = {
  timestamp: number;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: {
    thinking?: string;
    reasoning?: string;
    error?: string;
    metrics?: Record<string, unknown>;
    intermediateResults?: unknown;
  };
};

type WorkStep = {
  step: 'initializing' | 'generating_sequences' | 'analyzing_properties' | 'filtering_sequences' | 'docking_simulation' | 'evaluating_affinity' | 'ranking_candidates' | 'completed';
  stepNumber: number;
  totalSteps: number;
  description: string;
  progress: number;
  startTime: number;
  estimatedDuration?: number;
};

type WorkCandidate = {
  sequence: string;
  sequenceScore: number;
  affinityScore: number;
  combinedScore: number;
  rank: number;
  timestamp?: number;
};

const COMMON_WORK_PROMPTS = [
  '为 PD-1 设计高亲和力多肽',
  '为 IL-6 设计低毒性、稳定的候选多肽',
  '靶向 EGFR，筛选适合细胞外结合的多肽',
];

function formatDuration(startTime?: number, endTime?: number) {
  if (!startTime) return '—';
  const seconds = Math.floor(Math.max(0, (endTime ?? Date.now()) - startTime) / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function metricText(value: unknown) {
  if (typeof value === 'number') return value.toFixed(2);
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? '是' : '否';
  try {
    return JSON.stringify(value) ?? '—';
  } catch {
    return '—';
  }
}

function AgentAvatar({ processing = false }: { processing?: boolean }) {
  return (
    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/15 text-primary ${processing ? 'ai-processing' : ''}`}>
      {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
    </span>
  );
}

function CandidateMetric({ label, value, tone = 'text-foreground/85' }: { label: string; value: string; tone?: string }) {
  return <div className="min-w-0 rounded-lg border border-border/60 bg-background/45 px-2.5 py-2"><p className="truncate text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">{label}</p><p className={`mt-1 truncate font-mono text-[11px] font-semibold ${tone}`}>{value}</p></div>;
}

function CandidateDetailCard({ candidate, index, selected, selectionDisabled, onSelectionChange }: { candidate: WorkCandidate; index: number; selected: boolean; selectionDisabled: boolean; onSelectionChange: (checked: boolean) => void }) {
  const [expanded, setExpanded] = useState(false);
  const metrics = useMemo(() => calculatePeptideMetrics(candidate.sequence), [candidate.sequence]);
  const rank = candidate.rank || index + 1;

  return (
    <motion.div layout className={`min-w-0 overflow-hidden rounded-xl border transition-colors ${selected ? 'border-primary/55 bg-primary/[0.075]' : expanded ? 'border-primary/35 bg-primary/[0.045]' : 'border-border/70 bg-background/35 hover:border-primary/25'}`}>
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <Checkbox checked={selected} disabled={selectionDisabled} onCheckedChange={(checked) => onSelectionChange(Boolean(checked))} aria-label={`选择候选多肽 ${candidate.sequence} 进行对比`} className="border-primary/45 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
        <button type="button" onClick={() => setExpanded((current) => !current)} aria-expanded={expanded} aria-controls={`candidate-detail-${index}`} className="flex min-w-0 flex-1 items-center justify-between gap-3 py-0.5 text-left transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70">
          <span className="flex min-w-0 items-center gap-2.5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-mono text-[10px] font-semibold text-primary">{rank}</span><span className="min-w-0"><span className="block truncate font-mono text-xs font-semibold tracking-wide text-foreground">{candidate.sequence}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">展开详情 · 勾选对比</span></span></span>
          <span className="flex shrink-0 items-center gap-2 text-right"><span><span className="block font-mono text-[11px] font-semibold text-emerald-200">{candidate.combinedScore.toFixed(2)}</span><span className="block text-[9px] text-muted-foreground">综合分</span></span>{expanded ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}</span>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {expanded && <motion.div id={`candidate-detail-${index}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} className="overflow-hidden"><div className="border-t border-primary/15 px-3 pb-3 pt-2.5"><div className="flex items-start gap-2 rounded-lg border border-primary/15 bg-primary/[0.045] px-2.5 py-2"><Dna className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><div className="min-w-0"><p className="text-[9px] font-medium uppercase tracking-[0.1em] text-primary/80">候选序列</p><div className="mt-1 overflow-x-auto"><PeptideLink sequence={candidate.sequence} className="whitespace-nowrap font-mono text-[11px] text-foreground hover:text-primary" /></div></div></div><div className="mt-2 grid grid-cols-2 gap-2"><CandidateMetric label="亲和力评分" value={candidate.affinityScore.toFixed(2)} tone="text-emerald-200" /><CandidateMetric label="序列评分" value={candidate.sequenceScore.toFixed(2)} tone="text-primary" /><CandidateMetric label="分子量" value={`${metrics.molecularWeight.toFixed(1)} Da`} /><CandidateMetric label="净电荷" value={`${metrics.netCharge >= 0 ? '+' : ''}${metrics.netCharge.toFixed(1)}`} /><CandidateMetric label="疏水性 (GRAVY)" value={metrics.hydrophobicity.toFixed(2)} /><CandidateMetric label="稳定性估计" value={`${metrics.stabilityIndex.toFixed(0)} / 100`} /><CandidateMetric label="等电点 (pI)" value={metrics.isoelectricPoint.toFixed(1)} /><CandidateMetric label="结构倾向" value={metrics.secondaryStructure.dominant} /></div><p className="mt-2 flex items-start gap-1.5 text-[9px] leading-4 text-muted-foreground/75"><FlaskConical className="mt-0.5 h-3 w-3 shrink-0 text-amber-300/80" />理化性质为序列层面的快速筛选估计，需结合后续结构预测及实验验证。</p></div></motion.div>}
      </AnimatePresence>
    </motion.div>
  );
}

function CandidateComparisonDialog({ open, onOpenChange, candidates }: { open: boolean; onOpenChange: (open: boolean) => void; candidates: WorkCandidate[] }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[calc(100vh-1.5rem)] max-w-[calc(100%-1rem)] gap-0 overflow-hidden rounded-2xl border-primary/20 bg-card p-0 sm:max-w-5xl"><DialogHeader className="border-b border-border/70 bg-primary/[0.06] px-5 py-4 pr-12"><DialogTitle className="flex items-center gap-2 text-base"><Columns3 className="h-4 w-4 text-primary" />候选多肽并排对比</DialogTitle><DialogDescription className="text-xs leading-5">已选择 {candidates.length} 个候选。指标用于快速序列筛选，建议与后续结构预测和实验验证结合解读。</DialogDescription></DialogHeader>{candidates.length < 2 ? <div className="p-8 text-center text-sm text-muted-foreground">至少选择两个候选多肽后即可并排对比。</div> : <div className="max-h-[calc(100vh-11rem)] overflow-auto"><table className="min-w-[620px] w-full border-collapse text-left"><thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm"><tr className="border-b border-border/70"><th scope="col" className="sticky left-0 z-20 min-w-32 bg-card/95 px-4 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">指标</th>{candidates.map((candidate, index) => <th key={candidate.sequence} scope="col" className="min-w-40 px-3 py-3"><div className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[9px] text-primary">{candidate.rank || index + 1}</span><PeptideLink sequence={candidate.sequence} className="max-w-28 truncate font-mono text-[11px] text-foreground" /></div></th>)}</tr></thead><tbody>{CANDIDATE_COMPARISON_METRICS.map((metric) => <tr key={metric.key} className="border-b border-border/50 transition-colors hover:bg-muted/30"><th scope="row" className="sticky left-0 z-[1] bg-card px-4 py-3 text-[11px] font-medium text-muted-foreground">{metric.label}</th>{candidates.map((candidate) => <td key={`${candidate.sequence}-${metric.key}`} className={`px-3 py-3 font-mono text-xs ${metric.emphasis === 'primary' ? 'font-semibold text-emerald-200' : 'text-foreground/85'}`}>{getCandidateComparisonValue(candidate, metric.key)}</td>)}</tr>)}</tbody></table></div>}</DialogContent></Dialog>;
}

function FlowMessage({ step, status, progress }: { step?: WorkStep; status: WorkStatus; progress: number }) {
  const phases = getWorkPhaseProgress(step?.stepNumber, progress, status);
  const phaseIcons = [Dna, FlaskConical, Trophy];
  return <div className="flex gap-2.5"><AgentAvatar processing={status === 'running'} /><div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-3"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold">{status === 'completed' ? '设计流程已完成' : '设计流程更新'}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{step?.description || '任务将按既定的八个步骤执行。'}</p></div><span className="font-mono text-xs text-primary">{Math.round(progress)}%</span></div><Progress value={progress} className="mt-3 h-1.5 bg-muted" /><div className="mt-3 grid gap-2 sm:grid-cols-3">{phases.map((phase, index) => { const Icon = phaseIcons[index]; const active = phase.state === 'active'; const completed = phase.state === 'completed'; const failed = phase.state === 'failed'; return <div key={phase.id} className={`rounded-xl border p-2.5 transition-colors ${active ? 'border-primary/40 bg-primary/[0.07]' : completed ? 'border-emerald-400/25 bg-emerald-400/[0.05]' : failed ? 'border-rose-400/30 bg-rose-400/[0.05]' : 'border-border/60 bg-background/35'}`}><div className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-1.5"><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${active ? 'bg-primary/15 text-primary' : completed ? 'bg-emerald-400/10 text-emerald-300' : failed ? 'bg-rose-400/10 text-rose-300' : 'bg-muted text-muted-foreground'}`}>{completed ? <CheckCircle2 className="h-3 w-3" /> : <Icon className="h-3 w-3" />}</span><span className="truncate text-[10px] font-semibold">{phase.label}</span></span><span className={`shrink-0 font-mono text-[10px] ${active ? 'text-primary' : completed ? 'text-emerald-300' : failed ? 'text-rose-300' : 'text-muted-foreground'}`}>{completed ? '完成' : failed ? '失败' : phase.state === 'paused' ? '暂停' : `${phase.progress}%`}</span></div><p className="mt-1.5 truncate text-[9px] text-muted-foreground">{phase.description}</p><Progress value={phase.progress} className="mt-2 h-1 bg-muted" /></div>; })}</div></div></div>;
}

function LogMessage({ log, isLatest }: { log: WorkLog; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(isLatest);
  const hasDetails = Boolean(log.details?.thinking || log.details?.reasoning || log.details?.error || log.details?.metrics || log.details?.intermediateResults);
  const dot = { info: 'bg-primary', success: 'bg-emerald-400', warning: 'bg-amber-400', error: 'bg-rose-400' }[log.level];
  return <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.2 }} className="flex gap-2.5"><AgentAvatar processing={isLatest && log.level === 'info'} /><div className={`min-w-0 flex-1 rounded-2xl rounded-tl-sm border px-3 py-2.5 ${isLatest ? 'border-primary/25 bg-card' : 'border-border/70 bg-card/65'}`}><button type="button" onClick={() => hasDetails && setExpanded((current) => !current)} className={`flex w-full items-start gap-2 text-left ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`} aria-expanded={hasDetails ? expanded : undefined}><span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} /><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="text-[10px] font-medium text-primary">CV-PepFind Work Agent</span><span className="font-mono text-[9px] text-muted-foreground/70">{new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span></span><span className="mt-1 block break-words text-xs leading-5 text-foreground/90">{log.message}</span></span>{hasDetails && (expanded ? <ChevronUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />)}</button><AnimatePresence initial={false}>{expanded && hasDetails && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="mt-2 space-y-2 border-t border-border/60 pt-2 text-[11px] leading-5 text-muted-foreground">{(log.details?.thinking || log.details?.reasoning) && <div><p className="font-medium text-primary">过程摘要</p><p className="mt-0.5 whitespace-pre-wrap break-words">{log.details.thinking || log.details.reasoning}</p></div>}{log.details?.error && <div className="rounded-lg border border-rose-400/20 bg-rose-400/5 px-2 py-1.5 text-rose-200">{log.details.error}</div>}{log.details?.metrics && <div className="grid grid-cols-2 gap-1.5">{Object.entries(log.details.metrics).map(([key, value]) => <div key={key} className="min-w-0 rounded-md bg-muted/50 px-2 py-1"><span className="mr-1 text-muted-foreground/70">{key}:</span><span className="break-all text-foreground/80">{metricText(value)}</span></div>)}</div>}</div></motion.div>}</AnimatePresence></div></motion.div>;
}

export function WorkLayout() {
  const [targetProtein, setTargetProtein] = useState('');
  const [targetSequence, setTargetSequence] = useState('');
  const [requirements, setRequirements] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedCandidateKeys, setSelectedCandidateKeys] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [showSequenceInput, setShowSequenceInput] = useState(false);
  const reducedMotion = useReducedMotion();

  const createTask = trpc.designTask.create.useMutation();
  const startTask = trpc.designTask.start.useMutation();
  const pauseTask = trpc.designTask.pause.useMutation();
  const resumeTask = trpc.designTask.resume.useMutation();
  const cancelTask = trpc.designTask.cancel.useMutation();
  const utils = trpc.useUtils();
  const statusQuery = trpc.designTask.getStatus.useQuery({ taskId: taskId ?? '' }, { enabled: Boolean(taskId), refetchInterval: taskId ? 1200 : false, refetchOnWindowFocus: false });

  const status = statusQuery.data;
  const currentStatus = (status?.status ?? 'pending') as WorkStatus;
  const logs = (status?.logs ?? []) as WorkLog[];
  const candidates = useMemo(() => (status?.topCandidates ?? []) as WorkCandidate[], [status?.topCandidates]);
  const step = status?.currentStep as WorkStep | undefined;
  const candidateKey = (candidate: WorkCandidate) => candidate.sequence;
  const selectedCandidates = candidates.filter((candidate) => selectedCandidateKeys.includes(candidateKey(candidate)));
  const isBusy = currentStatus === 'running' || currentStatus === 'paused' || createTask.isPending || startTask.isPending;
  const isTerminal = Boolean(status && TERMINAL_STATUSES.has(status.status));
  const latestLog = logs[logs.length - 1];
  const estimatedTime = useMemo(() => {
    if (!status?.startTime || !status?.progress || status.progress <= 0 || isTerminal) return '—';
    const elapsed = Date.now() - status.startTime;
    const total = elapsed / (status.progress / 100);
    return formatDuration(Date.now(), Date.now() + Math.max(0, total - elapsed));
  }, [status?.progress, status?.startTime, isTerminal]);

  useEffect(() => {
    setSelectedCandidateKeys((current) => retainAvailableCandidateSelections(current, candidates));
  }, [candidates]);

  const handleStart = async () => {
    const protein = targetProtein.trim() || extractWorkTarget(requirements);
    if (!protein) { setFormError('请在任务中说明靶点，例如“为 IL-6 设计高亲和力、低毒性多肽”。'); return; }
    setFormError(null);
    try {
      setTargetProtein(protein);
      const created = await createTask.mutateAsync({ targetProtein: protein, targetSequence: targetSequence.trim() || undefined, requirements: requirements.trim() || undefined });
      setTaskId(created.taskId);
      await startTask.mutateAsync({ taskId: created.taskId });
      await utils.designTask.getStatus.invalidate({ taskId: created.taskId });
    } catch (error) { setFormError(error instanceof Error ? error.message : '任务启动失败，请稍后重试。'); }
  };
  const handlePauseResume = async () => { if (!taskId) return; try { if (currentStatus === 'paused') await resumeTask.mutateAsync({ taskId }); else await pauseTask.mutateAsync({ taskId }); await utils.designTask.getStatus.invalidate({ taskId }); } catch (error) { setFormError(error instanceof Error ? error.message : '任务状态更新失败。'); } };
  const handleCancel = async () => { if (!taskId) return; try { await cancelTask.mutateAsync({ taskId }); await utils.designTask.getStatus.invalidate({ taskId }); } catch (error) { setFormError(error instanceof Error ? error.message : '停止任务失败。'); } };
  const handleReset = () => { setTaskId(null); setFormError(null); setSelectedCandidateKeys([]); setComparisonOpen(false); };
  const handleCandidateSelection = (candidate: WorkCandidate, checked: boolean) => { const key = candidateKey(candidate); setSelectedCandidateKeys((current) => checked ? (current.includes(key) || current.length >= 3 ? current : [...current, key]) : current.filter((currentKey) => currentKey !== key)); };
  const handleExport = async () => { if (!taskId || candidates.length === 0) return; const csv = await utils.designTask.exportCSV.fetch({ taskId }); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `cv-pepfind-${taskId}.csv`; anchor.click(); URL.revokeObjectURL(url); };
  const handleExportJSON = () => { if (!taskId || candidates.length === 0) return; const payload = { taskId, exportedAt: new Date().toISOString(), targetProtein: status?.config?.targetProtein || targetProtein, requirements: status?.config?.requirements || requirements, candidates: candidates.map((candidate) => ({ ...candidate, physicochemicalMetrics: calculatePeptideMetrics(candidate.sequence) })) }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `cv-pepfind-${taskId}.json`; anchor.click(); URL.revokeObjectURL(url); };
  const appendRequirement = (suggestion: string) => setRequirements((current) => current.includes(suggestion) ? current : `${current.replace(/[。；;，,\s]+$/, '')}${current.trim() ? '、' : ''}${suggestion}`);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-background" aria-label="Work autonomous peptide design">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-border px-4 py-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${currentStatus === 'running' ? 'ai-processing' : 'ai-breathing'}`}><Dna className="h-5 w-5 text-primary" /></div>
        <div className="min-w-0"><h1 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">CV-PepFind <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium text-primary">Work</span></h1><p className="text-[10px] text-muted-foreground">Autonomous Peptide Design Agent</p></div>
        <div className="ml-auto flex items-center gap-1"><Badge className={`border text-[10px] ${STATUS_STYLES[currentStatus]}`}>{currentStatus === 'running' && <Activity className="mr-1 h-3 w-3 animate-pulse" />}{STATUS_LABELS[currentStatus]}</Badge>{taskId && <button type="button" onClick={handleReset} disabled={isBusy} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40" aria-label="新建任务" title="新建任务"><RotateCcw className="h-3.5 w-3.5" /></button>}</div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {!taskId && <div className="flex gap-2.5"><AgentAvatar /><div className="max-w-full rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-2.5 text-sm leading-relaxed text-foreground">你好，我是 CV-PepFind Work Agent。请告诉我亲和靶点与设计约束；我会持续生成、筛选、优化并排序候选多肽。</div></div>}

        {taskId && <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.22 }} className="flex flex-row-reverse gap-2.5"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/15 text-accent"><Target className="h-3.5 w-3.5" /></span><div className="max-w-[88%] rounded-2xl rounded-tr-sm border border-accent/20 bg-accent/15 px-3 py-2.5 text-sm text-foreground"><p className="font-medium">为 {status?.config?.targetProtein || targetProtein} 设计候选多肽</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-foreground/75">{status?.config?.requirements || requirements}</p></div></motion.div>}

        {taskId && <FlowMessage step={step} status={currentStatus} progress={status?.progress ?? 0} />}

        {taskId && <div className="flex gap-2.5"><AgentAvatar processing={currentStatus === 'running'} /><div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">{currentStatus === 'running' ? `正在${step?.description || '处理设计任务'}` : currentStatus === 'completed' ? '本轮候选排序已完成' : currentStatus === 'paused' ? '任务已暂停' : '任务状态'}</p><span className="font-mono text-[10px] text-primary">{Math.round(status?.progress ?? 0)}%</span></div><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{latestLog?.message || 'Agent 将把序列生成、性质筛选和亲和力评估统一到可追踪流程中。'}</p><div className="mt-3 grid grid-cols-4 gap-1.5"><span className="rounded-md bg-muted/60 p-1.5 text-center text-[9px] text-muted-foreground">迭代<strong className="mt-0.5 block font-mono text-xs text-foreground">{status?.iteration ?? 0}</strong></span><span className="rounded-md bg-muted/60 p-1.5 text-center text-[9px] text-muted-foreground">候选<strong className="mt-0.5 block font-mono text-xs text-foreground">{status?.candidatesFound ?? 0}</strong></span><span className="rounded-md bg-muted/60 p-1.5 text-center text-[9px] text-muted-foreground">已用时<strong className="mt-0.5 block font-mono text-xs text-foreground">{formatDuration(status?.startTime, status?.endTime)}</strong></span><span className="rounded-md bg-muted/60 p-1.5 text-center text-[9px] text-muted-foreground">剩余<strong className="mt-0.5 block font-mono text-xs text-foreground">{estimatedTime}</strong></span></div>{(currentStatus === 'running' || currentStatus === 'paused') && <div className="mt-3 flex gap-2"><Button type="button" variant="outline" size="sm" onClick={handlePauseResume} className="h-7 flex-1 text-[10px]">{currentStatus === 'paused' ? <><Play className="mr-1 h-3 w-3" />恢复</> : <><Pause className="mr-1 h-3 w-3" />暂停</>}</Button><Button type="button" variant="outline" size="sm" onClick={handleCancel} className="h-7 flex-1 border-rose-400/25 text-[10px] text-rose-200 hover:bg-rose-400/10"><Square className="mr-1 h-3 w-3" />停止</Button></div>}{status?.error && <p className="mt-2 rounded-lg bg-rose-400/5 px-2 py-1.5 text-[10px] text-rose-200">{status.error}</p>}</div></div>}

        {taskId && <div className="space-y-3" aria-label="Work Agent 动态消息">{logs.slice(-40).map((log, index) => <LogMessage key={`${log.timestamp}-${index}`} log={log} isLatest={index === logs.length - 1 && currentStatus === 'running'} />)}</div>}

        {taskId && candidates.length > 0 && <div className="flex gap-2.5"><AgentAvatar /><div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-semibold">候选多肽</p><p className="mt-0.5 text-[10px] text-muted-foreground">已选择 <span className="font-mono text-primary">{selectedCandidateKeys.length}/3</span> · 至少选 2 项进行对比</p></div><div className="flex items-center gap-1"><Button type="button" size="sm" onClick={() => setComparisonOpen(true)} disabled={selectedCandidates.length < 2} className="h-7 px-2 text-[10px]"><Columns3 className="mr-1 h-3 w-3" />对比</Button><Button type="button" variant="ghost" size="sm" onClick={handleExport} className="h-7 px-1.5 text-[10px]"><Download className="mr-1 h-3 w-3" />CSV</Button><Button type="button" variant="ghost" size="sm" onClick={handleExportJSON} className="h-7 px-1.5 text-[10px]">JSON</Button></div></div><div className="mt-3 space-y-2">{candidates.map((candidate, index) => <CandidateDetailCard key={candidateKey(candidate)} candidate={candidate} index={index} selected={selectedCandidateKeys.includes(candidateKey(candidate))} selectionDisabled={!selectedCandidateKeys.includes(candidateKey(candidate)) && selectedCandidateKeys.length >= 3} onSelectionChange={(checked) => handleCandidateSelection(candidate, checked)} />)}</div></div></div>}

        {taskId && <p className="px-8 text-[9px] leading-4 text-muted-foreground/65">以上为服务端状态、过程摘要与指标形成的可验证任务动态，并非模型隐藏推理链。</p>}
      </div>

      <div className="shrink-0 border-t border-border/50 px-3 py-2"><div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" aria-label="快捷设计约束">{['高亲和力', '低毒性', '高稳定性'].map((suggestion) => <button key={suggestion} type="button" disabled={isBusy || Boolean(taskId)} onClick={() => appendRequirement(suggestion)} className="shrink-0 rounded-lg border border-transparent bg-muted px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground transition-all hover:border-border hover:bg-muted/80 hover:text-foreground disabled:opacity-50">{suggestion}</button>)}<button type="button" disabled={isBusy || Boolean(taskId)} onClick={() => setShowSequenceInput((current) => !current)} className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition-all ${showSequenceInput ? 'border-primary/30 bg-primary/10 text-primary' : 'border-transparent bg-muted text-muted-foreground hover:border-border hover:text-foreground'} disabled:opacity-50`}>{showSequenceInput ? '收起 FASTA' : '添加 FASTA'}</button></div></div>

      {showSequenceInput && <div className="shrink-0 px-3 pb-2"><Textarea value={targetSequence} onChange={(event) => setTargetSequence(event.target.value)} disabled={isBusy || Boolean(taskId)} placeholder="可选：粘贴靶点 FASTA 序列" className="min-h-16 resize-y border-border bg-input/70 font-mono text-[10px]" aria-label="靶点 FASTA 序列" /></div>}
      {formError && <div role="alert" className="mx-3 mb-2 flex shrink-0 items-start gap-2 rounded-lg border border-rose-400/25 bg-rose-400/5 p-2.5 text-[11px] leading-5 text-rose-200"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{formError}</div>}
      <div className="shrink-0 px-3 pb-3"><div className="relative flex items-end gap-2 rounded-xl border border-border bg-input p-2.5 transition-all focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20"><Textarea value={requirements} onChange={(event) => setRequirements(event.target.value)} disabled={isBusy || Boolean(taskId)} placeholder="例如：为 IL-6 设计高亲和力、低毒性多肽…" rows={1} className="min-h-5 max-h-24 flex-1 resize-y border-0 bg-transparent p-0 text-sm leading-5 shadow-none focus-visible:ring-0" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !taskId && requirements.trim()) { event.preventDefault(); void handleStart(); } }} aria-label="多肽设计任务" />{!taskId ? <button type="button" onClick={() => void handleStart()} disabled={!requirements.trim() || createTask.isPending || startTask.isPending} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40" aria-label="开始自主设计">{createTask.isPending || startTask.isPending ? <Loader2 className={`h-3.5 w-3.5 ${reducedMotion ? '' : 'animate-spin'}`} /> : <Send className="h-3.5 w-3.5" />}</button> : <button type="button" onClick={handleReset} disabled={isBusy} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-40" aria-label="新建任务"><RotateCcw className="h-3.5 w-3.5" /></button>}</div>{!taskId && <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none" aria-label="常见任务提示词"><span className="shrink-0 py-1.5 text-[9px] font-medium text-muted-foreground">常见任务</span>{COMMON_WORK_PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => { setRequirements(prompt); setFormError(null); }} className="shrink-0 rounded-lg border border-transparent bg-muted px-2.5 py-1.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/25 hover:bg-primary/[0.06] hover:text-foreground">{prompt}</button>)}</div>}</div>
      <CandidateComparisonDialog open={comparisonOpen} onOpenChange={setComparisonOpen} candidates={selectedCandidates} />
    </section>
  );
}

export default WorkLayout;
