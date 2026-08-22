import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Dna,
  Download,
  Pause,
  Play,
  RotateCcw,
  Square,
  Target,
  TerminalSquare,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { PeptideLink } from '@/components/PeptideLink';
import { CompactDesignStepIndicator } from '@/components/DesignStepIndicator';
import { trpc } from '@/lib/trpc';

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
  running: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300',
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

function formatDuration(startTime?: number, endTime?: number) {
  if (!startTime) return '—';
  const duration = Math.max(0, (endTime ?? Date.now()) - startTime);
  const seconds = Math.floor(duration / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatValue(value: unknown): string {
  if (typeof value === 'number') return value.toFixed(2);
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? '是' : '否';
  try {
    return JSON.stringify(value) ?? '—';
  } catch {
    return '—';
  }
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? '—';
  } catch {
    return '—';
  }
}

function LogEntry({ log, isLatest }: { log: WorkLog; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(isLatest);
  const hasDetails = Boolean(log.details?.thinking || log.details?.reasoning || log.details?.error || log.details?.metrics || log.details?.intermediateResults);
  const levelClass = {
    info: 'bg-slate-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    error: 'bg-rose-400',
  }[log.level];

  return (
    <div className="relative pl-6">
      <span className={`absolute left-[5px] top-2 h-2.5 w-2.5 rounded-full ring-4 ring-background ${levelClass}`} aria-hidden="true" />
      <div className={`rounded-xl border px-3 py-2.5 transition-colors ${isLatest ? 'border-cyan-400/30 bg-cyan-400/5' : 'border-border/70 bg-background/35'}`}>
        <button
          type="button"
          onClick={() => hasDetails && setExpanded((current) => !current)}
          className={`flex w-full items-start gap-3 text-left ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
          aria-expanded={hasDetails ? expanded : undefined}
        >
          <span className="mt-0.5 shrink-0 font-mono text-[10px] text-muted-foreground/70">
            {new Date(log.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="min-w-0 flex-1 break-words text-xs leading-5 text-foreground/90">{log.message}</span>
          {hasDetails && <span className="shrink-0 text-[10px] text-muted-foreground">{expanded ? '收起' : '展开'}</span>}
        </button>
        <AnimatePresence initial={false}>
          {expanded && hasDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-2 border-t border-border/60 pt-2 text-[11px] leading-5 text-muted-foreground">
                {(log.details?.thinking || log.details?.reasoning) && (
                  <div>
                    <p className="mb-0.5 font-medium text-cyan-300">过程摘要</p>
                    <p className="whitespace-pre-wrap break-words">{log.details.thinking || log.details.reasoning}</p>
                  </div>
                )}
                {log.details?.error && (
                  <div className="rounded-lg border border-rose-400/20 bg-rose-400/5 px-2 py-1.5 text-rose-200">
                    {log.details.error}
                  </div>
                )}
                {log.details?.metrics && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(log.details.metrics).map(([key, value]) => (
                      <div key={key} className="min-w-0 rounded-md bg-muted/50 px-2 py-1">
                        <span className="mr-1 text-muted-foreground/70">{key}:</span>
                        <span className="break-all text-foreground/80">{formatValue(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {Boolean(log.details?.intermediateResults) && (
                  <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/20 p-2 font-mono text-[10px] text-muted-foreground/80">
                    {formatJson(log.details?.intermediateResults)}
                  </pre>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FlowOverview({ step, progress, status }: { step?: WorkStep; progress: number; status?: WorkStatus }) {
  const stages = [
    { label: '初始化', key: 'initializing' },
    { label: '生成序列', key: 'generating_sequences' },
    { label: '性质分析', key: 'analyzing_properties' },
    { label: '过滤序列', key: 'filtering_sequences' },
    { label: '分子对接', key: 'docking_simulation' },
    { label: '亲和力评估', key: 'evaluating_affinity' },
    { label: '排序候选', key: 'ranking_candidates' },
    { label: '完成', key: 'completed' },
  ];
  const currentNumber = step?.stepNumber ?? (status === 'completed' ? stages.length : 0);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300/80">任务进程</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">设计流水线</h2>
        </div>
        <span className="font-mono text-xs text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-1.5 bg-muted/70" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stages.map((stage, index) => {
          const stageNumber = index + 1;
          const done = stageNumber < currentNumber || status === 'completed';
          const active = stageNumber === currentNumber && status !== 'completed';
          return (
            <div key={stage.key} className={`flex min-w-0 items-center gap-2 rounded-lg border px-2 py-2 ${active ? 'border-cyan-400/40 bg-cyan-400/10' : done ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-border/70 bg-background/30'}`}>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${done ? 'bg-emerald-400/20 text-emerald-300' : active ? 'bg-cyan-400/20 text-cyan-300' : 'bg-muted text-muted-foreground'}`}>
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : active ? <Activity className="h-3.5 w-3.5 animate-pulse" /> : stageNumber}
              </span>
              <span className="min-w-0 truncate text-[11px] text-foreground/80">{stage.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WorkLayout() {
  const [targetProtein, setTargetProtein] = useState('');
  const [targetSequence, setTargetSequence] = useState('');
  const [requirements, setRequirements] = useState('高亲和力、低毒性、具备良好的稳定性');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const createTask = trpc.designTask.create.useMutation();
  const startTask = trpc.designTask.start.useMutation();
  const pauseTask = trpc.designTask.pause.useMutation();
  const resumeTask = trpc.designTask.resume.useMutation();
  const cancelTask = trpc.designTask.cancel.useMutation();
  const utils = trpc.useUtils();

  const statusQuery = trpc.designTask.getStatus.useQuery(
    { taskId: taskId ?? '' },
    {
      enabled: Boolean(taskId),
      refetchInterval: taskId ? 1200 : false,
      refetchOnWindowFocus: false,
    },
  );

  const status = statusQuery.data;
  const currentStatus = (status?.status ?? 'pending') as WorkStatus;
  const logs = (status?.logs ?? []) as WorkLog[];
  const candidates = (status?.topCandidates ?? []) as WorkCandidate[];
  const step = status?.currentStep as WorkStep | undefined;
  const isBusy = currentStatus === 'running' || currentStatus === 'paused' || createTask.isPending || startTask.isPending;
  const isTerminal = Boolean(status && TERMINAL_STATUSES.has(status.status));

  useEffect(() => {
    if (!taskId) return;
    void utils.designTask.getStatus.invalidate({ taskId });
  }, [taskId, utils.designTask.getStatus]);

  const latestLog = logs[logs.length - 1];
  const estimatedTime = useMemo(() => {
    if (!status?.startTime || !status?.progress || status.progress <= 0 || isTerminal) return '—';
    const elapsed = Date.now() - status.startTime;
    const total = elapsed / (status.progress / 100);
    return formatDuration(Date.now(), Date.now() + Math.max(0, total - elapsed));
  }, [status?.progress, status?.startTime, isTerminal]);

  const handleStart = async () => {
    const protein = targetProtein.trim();
    if (!protein) {
      setFormError('请输入需要亲和的靶点名称。');
      return;
    }
    setFormError(null);
    try {
      const created = await createTask.mutateAsync({
        targetProtein: protein,
        targetSequence: targetSequence.trim() || undefined,
        requirements: requirements.trim() || undefined,
      });
      setTaskId(created.taskId);
      await startTask.mutateAsync({ taskId: created.taskId });
      await utils.designTask.getStatus.invalidate({ taskId: created.taskId });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '任务启动失败，请稍后重试。');
    }
  };

  const handlePauseResume = async () => {
    if (!taskId) return;
    try {
      if (currentStatus === 'paused') {
        await resumeTask.mutateAsync({ taskId });
      } else {
        await pauseTask.mutateAsync({ taskId });
      }
      await utils.designTask.getStatus.invalidate({ taskId });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '任务状态更新失败。');
    }
  };

  const handleCancel = async () => {
    if (!taskId) return;
    try {
      await cancelTask.mutateAsync({ taskId });
      await utils.designTask.getStatus.invalidate({ taskId });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '停止任务失败。');
    }
  };

  const handleReset = () => {
    setTaskId(null);
    setFormError(null);
    void statusQuery.refetch();
  };

  const handleExport = async () => {
    if (!taskId || candidates.length === 0) return;
    const csv = await utils.designTask.exportCSV.fetch({ taskId });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `cv-pepfind-${taskId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="flex min-h-full w-full flex-col bg-background lg:h-full lg:min-h-0 lg:overflow-hidden" aria-label="Work autonomous peptide design">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card/45 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
            <Dna className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold sm:text-base">CV-PepFind Work</h1>
              <Badge className={`shrink-0 border text-[10px] ${STATUS_STYLES[currentStatus] ?? STATUS_STYLES.pending}`}>
                {currentStatus === 'running' && <Activity className="mr-1 h-3 w-3 animate-pulse" />}
                {STATUS_LABELS[currentStatus] ?? '等待启动'}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">输入靶点与设计目标，Agent 将自动执行多轮候选筛选</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-[10px] text-muted-foreground sm:flex">
          <CircleDashed className="h-3.5 w-3.5 text-cyan-300" />
          <span>{taskId ? `任务 ${taskId.slice(-8)}` : '未创建任务'}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 overflow-visible lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <main className="min-w-0 overflow-visible overscroll-contain border-b border-border lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 sm:p-6">
            <Card className="border-cyan-400/15 bg-card/55 shadow-xl shadow-cyan-950/10">
              <CardContent className="p-4 sm:p-5">
                <FlowOverview step={step} progress={status?.progress ?? 0} status={status?.status as WorkStatus | undefined} />
                {step && (
                  <div className="mt-4 space-y-2">
                    <CompactDesignStepIndicator stepInfo={step} isRunning={currentStatus === 'running'} />
                    <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/30 px-3 py-2 text-[11px] text-muted-foreground">
                      <Zap className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                      <span className="min-w-0 break-words">第 {step.stepNumber}/{step.totalSteps} 步 · 步骤进度 {Math.round(step.progress)}%</span>
                    </div>
                  </div>
                )}
                <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2" data-testid="work-task-context">
                  <div className="min-w-0 rounded-xl border border-border/70 bg-background/35 p-3">
                    <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      <Target className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                      <span>亲和靶点</span>
                    </div>
                    <p className="mt-2 break-words text-sm font-semibold text-foreground">{status?.config?.targetProtein || targetProtein || '尚未设置'}</p>
                    {(status?.config?.targetSequence || targetSequence) && (
                      <p className="mt-1 max-h-16 overflow-y-auto break-all font-mono text-[10px] leading-4 text-muted-foreground">{status?.config?.targetSequence || targetSequence}</p>
                    )}
                  </div>
                  <div className="min-w-0 rounded-xl border border-border/70 bg-background/35 p-3">
                    <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      <Zap className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                      <span>设计需求</span>
                    </div>
                    <p className="mt-2 max-h-20 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-5 text-foreground/85">{status?.config?.requirements || requirements || '使用系统默认设计目标'}</p>
                  </div>
                </div>
                {!taskId && (
                  <div className="mt-3 rounded-xl border border-dashed border-border bg-background/25 p-4 text-center">
                    <CircleDashed className="mx-auto h-7 w-7 text-cyan-300/70" />
                    <p className="mt-2 text-sm font-medium">等待设计任务</p>
                    <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">在右侧填写靶点和设计要求。开始后，这里会切换为 Agent 的流程、步骤状态和过程记录。</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {taskId && (
              <Card className="min-w-0 border-border/80 bg-card/45">
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 px-4 pb-3 pt-4 sm:px-5">
                  <CardTitle className="flex items-center gap-2 text-sm"><TerminalSquare className="h-4 w-4 text-cyan-300" />Agent 思考过程</CardTitle>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{logs.length} 条记录</span>
                </CardHeader>
                <CardContent className="px-4 pb-4 sm:px-5">
                  <div className="relative space-y-2 border-l border-border/70 pl-0" data-testid="work-thinking-process">
                    {logs.length > 0 ? logs.map((log, index) => <LogEntry key={`${log.timestamp}-${index}`} log={log} isLatest={index === logs.length - 1 && currentStatus === 'running'} />) : (
                      <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">正在等待第一条系统记录…</div>
                    )}
                  </div>
                  {latestLog && currentStatus === 'running' && <p className="mt-3 flex items-center gap-2 text-[10px] text-cyan-300/80"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />Agent 正在处理当前任务</p>}
                  <p className="mt-3 border-t border-border/50 pt-3 text-[10px] leading-4 text-muted-foreground/70">这里展示服务端产生的阶段、过程摘要、指标和中间结果，用于验证任务进展；不会把模型隐藏推理链作为事实展示。</p>
                </CardContent>
              </Card>
            )}


          </div>
        </main>

        <aside className="min-w-0 overflow-visible overscroll-contain bg-card/20 lg:min-h-0 lg:overflow-y-auto">
          <div className="flex w-full flex-col gap-4 p-4 sm:p-6">
            <Card className="border-border/80 bg-card/55">
              <CardHeader className="px-4 pb-3 pt-4 sm:px-5"><CardTitle className="flex items-center gap-2 text-sm"><Target className="h-4 w-4 text-cyan-300" />设计任务</CardTitle></CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:px-5">
                <div className="space-y-2">
                  <Label htmlFor="work-target" className="text-xs">亲和靶点 <span className="text-rose-300">*</span></Label>
                  <Input id="work-target" value={targetProtein} onChange={(event) => setTargetProtein(event.target.value)} disabled={isBusy || Boolean(taskId)} placeholder="例如：IL-6、PD-L1 或蛋白名称" className="h-10 bg-background/60 text-sm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work-sequence" className="text-xs">靶点序列 <span className="text-muted-foreground">（可选）</span></Label>
                  <Textarea id="work-sequence" value={targetSequence} onChange={(event) => setTargetSequence(event.target.value)} disabled={isBusy || Boolean(taskId)} placeholder="如果已知靶点 FASTA，可粘贴到这里" className="min-h-20 resize-y bg-background/60 font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work-requirements" className="text-xs">设计需求 <span className="text-muted-foreground">（自然语言）</span></Label>
                  <Textarea id="work-requirements" value={requirements} onChange={(event) => setRequirements(event.target.value)} disabled={isBusy || Boolean(taskId)} placeholder="例如：高亲和力、低毒性、适合细胞外靶点" className="min-h-24 resize-y bg-background/60 text-xs leading-5" />
                </div>
                {formError && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-400/25 bg-rose-400/5 p-3 text-xs leading-5 text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{formError}</div>}
                {!taskId ? (
                  <Button type="button" onClick={handleStart} disabled={createTask.isPending || startTask.isPending || !targetProtein.trim()} className="h-10 w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400"><Play className="mr-2 h-4 w-4" />开始自主设计</Button>
                ) : (
                  <Button type="button" variant="outline" onClick={handleReset} disabled={isBusy} className="h-10 w-full"><RotateCcw className="mr-2 h-4 w-4" />新建任务</Button>
                )}
              </CardContent>
            </Card>

            {taskId && (
              <>
                <Card className="min-w-0 border-border/80 bg-card/55">
                  <CardHeader className="px-4 pb-3 pt-4 sm:px-5"><CardTitle className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4 text-cyan-300" />运行状态</CardTitle></CardHeader>
                  <CardContent className="space-y-4 px-4 pb-4 sm:px-5">
                    <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">总体进度</span><span className="font-mono text-sm font-semibold text-cyan-200">{Math.round(status?.progress ?? 0)}%</span></div>
                    <Progress value={status?.progress ?? 0} className="h-2" />
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-lg bg-background/45 p-2.5"><p className="text-muted-foreground">迭代</p><p className="mt-1 font-mono text-foreground">{status?.iteration ?? 0}</p></div>
                      <div className="rounded-lg bg-background/45 p-2.5"><p className="text-muted-foreground">候选数</p><p className="mt-1 font-mono text-foreground">{status?.candidatesFound ?? 0}</p></div>
                      <div className="rounded-lg bg-background/45 p-2.5"><p className="text-muted-foreground">已用时</p><p className="mt-1 font-mono text-foreground">{formatDuration(status?.startTime, status?.endTime)}</p></div>
                      <div className="rounded-lg bg-background/45 p-2.5"><p className="text-muted-foreground">预计剩余</p><p className="mt-1 font-mono text-foreground">{estimatedTime}</p></div>
                    </div>
                    <div className="flex gap-2">
                      {(currentStatus === 'running' || currentStatus === 'paused') && <Button type="button" variant="outline" onClick={handlePauseResume} disabled={pauseTask.isPending || resumeTask.isPending} className="min-w-0 flex-1">{currentStatus === 'paused' ? <><Play className="mr-1.5 h-3.5 w-3.5" />恢复</> : <><Pause className="mr-1.5 h-3.5 w-3.5" />暂停</>}</Button>}
                      {(currentStatus === 'running' || currentStatus === 'paused') && <Button type="button" variant="outline" onClick={handleCancel} disabled={cancelTask.isPending} className="min-w-0 flex-1 border-rose-400/25 text-rose-200 hover:bg-rose-400/10"><Square className="mr-1.5 h-3.5 w-3.5" />停止</Button>}
                    </div>
                    {status?.error && <div className="rounded-lg border border-rose-400/20 bg-rose-400/5 p-2.5 text-xs leading-5 text-rose-200">{status.error}</div>}
                  </CardContent>
                </Card>

                <Card className="min-w-0 border-border/80 bg-card/55">
                  <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 px-4 pb-3 pt-4 sm:px-5"><CardTitle className="flex min-w-0 items-center gap-2 text-sm"><Dna className="h-4 w-4 shrink-0 text-emerald-300" /><span className="truncate">候选多肽</span></CardTitle><Button type="button" variant="ghost" size="sm" onClick={handleExport} disabled={candidates.length === 0} className="h-7 shrink-0 px-2 text-[10px]"><Download className="mr-1 h-3 w-3" />导出</Button></CardHeader>
                  <CardContent className="space-y-2 px-4 pb-4 sm:px-5">
                    {candidates.length === 0 ? <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs leading-5 text-muted-foreground">候选序列将在通过性质分析和亲和力评估后出现。</div> : candidates.map((candidate, index) => (
                      <div key={`${candidate.sequence}-${index}`} className="min-w-0 rounded-xl border border-border/70 bg-background/40 p-3">
                        <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-emerald-300">#{candidate.rank || index + 1}</span><span className="font-mono text-[10px] text-muted-foreground">综合 {candidate.combinedScore.toFixed(2)}</span></div>
                        <div className="mt-2 min-w-0 overflow-x-auto"><PeptideLink sequence={candidate.sequence} className="whitespace-nowrap text-xs text-cyan-200 hover:text-cyan-100" /></div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground"><span>序列评分 <b className="font-mono text-foreground/80">{candidate.sequenceScore.toFixed(2)}</b></span><span>亲和评分 <b className="font-mono text-foreground/80">{candidate.affinityScore.toFixed(2)}</b></span></div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}

            <div className="flex items-center gap-2 px-1 text-[10px] leading-4 text-muted-foreground/70"><Clock3 className="h-3.5 w-3.5 shrink-0" />任务状态来自服务端轮询；未来可替换为持久化队列与 WebSocket 推送。</div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default WorkLayout;
