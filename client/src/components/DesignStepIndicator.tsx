/**
 * Design Step Indicator - Animated step progress display
 * Shows current step with smooth animations and detailed information
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, AlertCircle, Zap } from 'lucide-react';

export type DesignStep = 
  | 'initializing'
  | 'generating_sequences'
  | 'analyzing_properties'
  | 'filtering_sequences'
  | 'docking_simulation'
  | 'evaluating_affinity'
  | 'ranking_candidates'
  | 'completed';

export interface DesignStepInfo {
  step: DesignStep;
  stepNumber: number;
  totalSteps: number;
  description: string;
  progress: number; // 0-100 within this step
  startTime: number;
  estimatedDuration?: number;
}

const STEP_ORDER: DesignStep[] = [
  'initializing',
  'generating_sequences',
  'analyzing_properties',
  'filtering_sequences',
  'docking_simulation',
  'evaluating_affinity',
  'ranking_candidates',
  'completed',
];

const STEP_CONFIG: Record<DesignStep, { label: string; icon: React.ReactNode; color: string; emoji: string }> = {
  initializing: {
    label: '初始化',
    icon: <Circle className="w-5 h-5" />,
    color: 'from-blue-500 to-blue-600',
    emoji: '⚙️',
  },
  generating_sequences: {
    label: '序列生成',
    icon: <Zap className="w-5 h-5" />,
    color: 'from-purple-500 to-purple-600',
    emoji: '🧬',
  },
  analyzing_properties: {
    label: '性质分析',
    icon: <Zap className="w-5 h-5" />,
    color: 'from-cyan-500 to-cyan-600',
    emoji: '📊',
  },
  filtering_sequences: {
    label: '序列过滤',
    icon: <Zap className="w-5 h-5" />,
    color: 'from-green-500 to-green-600',
    emoji: '🔍',
  },
  docking_simulation: {
    label: '分子对接',
    icon: <Zap className="w-5 h-5" />,
    color: 'from-orange-500 to-orange-600',
    emoji: '🎯',
  },
  evaluating_affinity: {
    label: '亲和力评估',
    icon: <Zap className="w-5 h-5" />,
    color: 'from-pink-500 to-pink-600',
    emoji: '💪',
  },
  ranking_candidates: {
    label: '排序候选',
    icon: <Zap className="w-5 h-5" />,
    color: 'from-yellow-500 to-yellow-600',
    emoji: '🏆',
  },
  completed: {
    label: '完成',
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: 'from-emerald-500 to-emerald-600',
    emoji: '✅',
  },
};

interface DesignStepIndicatorProps {
  stepInfo?: DesignStepInfo;
  isRunning?: boolean;
  error?: string | null;
}

export function DesignStepIndicator({ stepInfo, isRunning = false, error = null }: DesignStepIndicatorProps) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Track completed steps
  useEffect(() => {
    if (stepInfo && stepInfo.progress >= 100) {
      setCompletedSteps(prev => 
        prev.includes(stepInfo.stepNumber) ? prev : [...prev, stepInfo.stepNumber]
      );
    }
  }, [stepInfo?.stepNumber, stepInfo?.progress]);

  if (!stepInfo) return null;

  const config = STEP_CONFIG[stepInfo.step];
  const isCurrentStep = stepInfo.progress < 100;
  const isCompleted = completedSteps.includes(stepInfo.stepNumber);

  return (
    <div className="space-y-4">
      {/* Step Timeline */}
      <div className="flex items-center gap-2">
        {Array.from({ length: stepInfo.totalSteps }, (_, idx) => idx).map((idx) => {
          const stepNum = idx + 1;
          const isActive = stepNum === stepInfo.stepNumber;
          const isDone = completedSteps.includes(stepNum);

          return (
            <motion.div
              key={idx}
              className="flex-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
            >
              <div className="flex flex-col items-center gap-1">
                {/* Step Circle */}
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    isActive
                      ? `bg-gradient-to-r ${config.color} text-white shadow-lg shadow-primary/20`
                      : isDone
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-muted text-muted-foreground border border-border'
                  }`}
                  animate={
                    isActive
                      ? {
                          scale: [1, 1.1, 1],
                          boxShadow: [
                            '0 0 0 0 rgba(59, 130, 246, 0.4)',
                            '0 0 0 10px rgba(59, 130, 246, 0)',
                          ],
                        }
                      : {}
                  }
                  transition={isActive ? { duration: 2, repeat: Infinity } : {}}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span>{stepNum}</span>
                  )}
                </motion.div>

                {/* Step Label */}
                <span className={`text-xs font-medium text-center leading-tight ${
                  isActive || isDone ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {STEP_CONFIG[STEP_ORDER[idx]]?.label ?? stepNum}
                </span>
              </div>

              {/* Connector Line */}
              {idx < stepInfo.totalSteps - 1 && (
                <motion.div
                  className={`h-0.5 mx-1 mt-2 ${
                    isDone ? 'bg-emerald-500' : isActive ? 'bg-gradient-to-r from-primary to-primary/50' : 'bg-border'
                  }`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: isDone ? 1 : isActive ? 0.5 : 0 }}
                  transition={{ duration: 0.5 }}
                  style={{ originX: 0 }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Current Step Details */}
      <AnimatePresence mode="wait">
        {isCurrentStep && (
          <motion.div
            key={stepInfo.step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={`p-4 rounded-lg border-2 bg-gradient-to-r ${config.color} bg-opacity-5 border-opacity-30`}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{config.emoji}</span>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{config.label}</h3>
                <p className="text-sm text-muted-foreground">{stepInfo.description}</p>
              </div>
              {isRunning && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="w-5 h-5 text-primary" />
                </motion.div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium">进度</span>
                <span className="text-muted-foreground">{Math.round(stepInfo.progress)}%</span>
              </div>
              <div className="w-full h-2 bg-background rounded-full overflow-hidden border border-border/50">
                <motion.div
                  className={`h-full bg-gradient-to-r ${config.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${stepInfo.progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Elapsed Time */}
            {stepInfo.startTime && (
              <div className="mt-3 text-xs text-muted-foreground">
                已用时间: {formatDuration(Date.now() - stepInfo.startTime)}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400 text-sm">错误</p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Completion Message */}
      {stepInfo.step === 'completed' && !error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center"
        >
          <p className="font-semibold text-emerald-700 dark:text-emerald-400">✨ 迭代完成！</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-300 mt-1">
            所有步骤已完成，准备下一迭代或返回结果
          </p>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Helper function to format duration
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Compact version - suitable for sidebars
 */
interface CompactDesignStepIndicatorProps {
  stepInfo?: DesignStepInfo;
  isRunning?: boolean;
}

export function CompactDesignStepIndicator({ stepInfo, isRunning = false }: CompactDesignStepIndicatorProps) {
  if (!stepInfo) return null;

  const config = STEP_CONFIG[stepInfo.step];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50"
    >
      <span className="text-lg">{config.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{config.label}</p>
        <p className="text-xs text-muted-foreground truncate">{stepInfo.description}</p>
      </div>
      {isRunning && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-4 h-4 text-primary flex-shrink-0" />
        </motion.div>
      )}
      <span className="text-xs font-medium text-muted-foreground flex-shrink-0">
        {Math.round(stepInfo.progress)}%
      </span>
    </motion.div>
  );
}
