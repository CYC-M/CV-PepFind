import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Loader2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export interface PipelineStepData {
  stepIndex: number;
  stepName: string;
  status: "waiting" | "running" | "completed" | "failed";
  progress: number;
  resultData?: unknown;
  errorMessage?: string;
}

interface PipelineProgressProps {
  steps: PipelineStepData[];
  currentStep?: number;
}

const STEP_ICONS = ['⚡', '🔬', '🧬', '📤', '🎯'];
const STEP_DESCRIPTIONS = [
  'ESM-2蛋白语言模型对序列进行表征与打分',
  '过滤低质量序列，保留高分候选',
  'ESMFold预测通过过滤序列的3D空间结构',
  '将PDB格式结构数据推送至可视化模块',
  '计算多肽-靶点结合亲和力，输出Top对接结果',
];

function StepStatusIcon({ status }: { status: PipelineStepData['status'] }) {
  switch (status) {
    case 'completed': return <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />;
    case 'running':   return <Loader2 className="w-4 h-4 text-accent animate-spin flex-shrink-0" />;
    case 'failed':    return <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />;
    default:          return <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />;
  }
}

function StepResultSummary({ step }: { step: PipelineStepData }) {
  const data = step.resultData as Record<string, unknown> | null;
  if (!data) return null;

  if (step.stepIndex === 0 && Array.isArray(data)) {
    const passed = (data as Array<{ passed: boolean }>).filter(r => r.passed).length;
    return <span className="text-[10px] text-muted-foreground">{passed}/{(data as unknown[]).length} 序列通过</span>;
  }
  if (step.stepIndex === 1 && data.passed !== undefined) {
    return <span className="text-[10px] text-muted-foreground">{String(data.passed)} 条序列进入下一步</span>;
  }
  if (step.stepIndex === 2 && data.count !== undefined) {
    return <span className="text-[10px] text-muted-foreground">{String(data.count)} 个结构预测完成</span>;
  }
  if (step.stepIndex === 3 && data.format) {
    return <span className="text-[10px] text-muted-foreground">PDB格式已推送至可视化模块</span>;
  }
  if (step.stepIndex === 4 && data.total !== undefined) {
    return <span className="text-[10px] text-muted-foreground">{String(data.total)} 个对接结果已生成</span>;
  }
  return null;
}

export default function PipelineProgress({ steps, currentStep }: PipelineProgressProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
          <span className="text-2xl">⚗️</span>
        </div>
        <p className="text-sm font-medium text-muted-foreground">等待任务提交</p>
        <p className="text-xs text-muted-foreground/60 mt-1">在左侧输入序列并启动Pipeline</p>
      </div>
    );
  }

  const overallProgress = steps.length > 0
    ? steps.reduce((acc, s) => acc + (s.status === 'completed' ? 100 : s.status === 'running' ? s.progress : 0), 0) / (steps.length * 100) * 100
    : 0;

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Overall progress bar */}
      <div className="mb-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-foreground">Pipeline 进度</span>
          <span className="text-xs font-mono text-primary">{Math.round(overallProgress)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, i) => (
          <motion.div
            key={step.stepIndex}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            <div
              className={`rounded-xl border transition-all cursor-pointer ${
                step.status === 'running'
                  ? 'border-accent/40 bg-accent/5 panel-border-glow'
                  : step.status === 'completed'
                  ? 'border-primary/30 bg-primary/5'
                  : step.status === 'failed'
                  ? 'border-destructive/30 bg-destructive/5'
                  : 'border-border bg-muted/20'
              }`}
              onClick={() => setExpandedStep(expandedStep === i ? null : i)}
            >
              <div className="flex items-center gap-2.5 p-3">
                {/* Step icon */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                  step.status === 'running' ? 'bg-accent/20' :
                  step.status === 'completed' ? 'bg-primary/15' :
                  step.status === 'failed' ? 'bg-destructive/15' :
                  'bg-muted'
                }`}>
                  {STEP_ICONS[step.stepIndex]}
                </div>

                {/* Step info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${
                      step.status === 'running' ? 'text-accent' :
                      step.status === 'completed' ? 'text-foreground' :
                      step.status === 'failed' ? 'text-destructive' :
                      'text-muted-foreground'
                    }`}>
                      步骤 {step.stepIndex + 1}：{step.stepName}
                    </span>
                    <StepStatusIcon status={step.status} />
                  </div>

                  {/* Progress bar for running step */}
                  {step.status === 'running' && (
                    <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden relative">
                      <motion.div
                        className="h-full rounded-full bg-accent"
                        animate={{ width: `${step.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                      {/* Scanning shimmer */}
                      <div className="absolute inset-0 overflow-hidden rounded-full">
                        <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-scan" />
                      </div>
                    </div>
                  )}

                  {/* Result summary */}
                  {step.status === 'completed' && <StepResultSummary step={step} />}
                  {step.status === 'failed' && step.errorMessage && (
                    <span className="text-[10px] text-destructive">{step.errorMessage}</span>
                  )}
                </div>

                {/* Progress % for running */}
                {step.status === 'running' && (
                  <span className="text-xs font-mono text-accent flex-shrink-0">{step.progress}%</span>
                )}

                {/* Expand toggle */}
                <button className="text-muted-foreground/50 flex-shrink-0">
                  {expandedStep === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Expanded detail */}
              <AnimatePresence>
                {expandedStep === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 pt-0 border-t border-border/50">
                      <p className="text-[11px] text-muted-foreground mt-2">{STEP_DESCRIPTIONS[step.stepIndex]}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className="flex justify-center py-0.5">
                <div className={`w-px h-3 transition-colors ${
                  step.status === 'completed' ? 'bg-primary/40' : 'bg-border/50'
                }`} />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
