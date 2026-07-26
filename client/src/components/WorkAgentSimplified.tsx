/**
 * WorkAgent - Simplified Autonomous Peptide Design Interface
 * User provides only target protein and requirements, system handles the rest
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trpc } from '@/lib/trpc';
import { ChevronDown, ChevronRight, Play, Pause, RotateCcw, X, Sparkles } from 'lucide-react';

type DesignPhase = 0 | 1 | 2 | 3 | 4 | 5;

const DESIGN_PHASES = {
  0: { label: '初始化', description: '解析靶点和配置参数', icon: '⚙️', color: 'from-blue-500 to-blue-600' },
  1: { label: '序列生成', description: '使用 LLM 生成多样化候选序列', icon: '🧬', color: 'from-purple-500 to-purple-600' },
  2: { label: '评估评分', description: '计算性质和亲和力评分', icon: '📊', color: 'from-cyan-500 to-cyan-600' },
  3: { label: '优化迭代', description: '遗传算法和模拟退火优化', icon: '🔄', color: 'from-green-500 to-green-600' },
  4: { label: '精细化', description: '精细化最优候选', icon: '✨', color: 'from-yellow-500 to-yellow-600' },
  5: { label: '完成', description: '生成最终报告', icon: '✅', color: 'from-emerald-500 to-emerald-600' },
};

interface WorkAgentTask {
  taskId: string;
  progress: number;
  iteration: number;
  candidatesFound: number;
  currentPhase: DesignPhase;
  phaseProgress: number;
  topCandidates: Array<{
    rank: number;
    sequence: string;
    affinityScore: number;
    sequenceScore: number;
    combinedScore: number;
    properties: {
      hydrophobicity: number;
      charge: number;
      isoelectricPoint: number;
    };
  }>;
  startTime: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  logs: Array<{
    timestamp: number;
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
    category?: 'phase' | 'iteration' | 'thinking' | 'result' | 'analysis' | 'decision';
    details?: {
      thinking?: string;
      intermediateResults?: Record<string, any>;
      metrics?: Record<string, number>;
      reasoning?: string;
    };
  }>;
}

export function WorkAgentSimplified() {
  const [task, setTask] = useState<WorkAgentTask | null>(null);
  const [taskConfig, setTaskConfig] = useState({
    targetProtein: 'IL6',
    requirements: '高亲和力、低毒性、稳定性强',
  } as { targetProtein: string; requirements: string });
  const [expandedLogIndex, setExpandedLogIndex] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // tRPC mutations and queries
  const createTaskMutation = trpc.designTask.create.useMutation();
  const startTaskMutation = trpc.designTask.start.useMutation();
  const pauseTaskMutation = trpc.designTask.pause.useMutation();
  const resumeTaskMutation = trpc.designTask.resume.useMutation();
  const cancelTaskMutation = trpc.designTask.cancel.useMutation();
  const utils = trpc.useUtils();

  // Helper functions
  const getCurrentPhase = (progress: number): DesignPhase => {
    if (progress < 16) return 0;
    if (progress < 33) return 1;
    if (progress < 50) return 2;
    if (progress < 67) return 3;
    if (progress < 84) return 4;
    return 5;
  };

  const getPhaseProgress = (totalProgress: number, phase: DesignPhase): number => {
    const phaseStart = phase * 16.67;
    const phaseEnd = (phase + 1) * 16.67;
    const phaseRange = phaseEnd - phaseStart;
    const progressInPhase = Math.max(0, Math.min(totalProgress - phaseStart, phaseRange));
    return (progressInPhase / phaseRange) * 100;
  };

  // Poll task status
  useEffect(() => {
    if (!task || !isRunning || isPaused) return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await utils.designTask.getStatus.fetch({ taskId: task.taskId });
        
        if (status) {
          setTask((prev) => {
            if (!prev) return null;
            
            const newPhase = getCurrentPhase(status.progress);
            const phaseProgress = getPhaseProgress(status.progress, newPhase);
            const phaseChanged = newPhase !== prev.currentPhase;
            
            return {
              ...prev,
              progress: status.progress,
              iteration: status.iteration,
              candidatesFound: status.candidatesFound,
              currentPhase: newPhase,
              phaseProgress,
              topCandidates: prev.topCandidates,
              elapsedTime: Date.now() - prev.startTime,
              estimatedTimeRemaining: Math.max(0, (100 - status.progress) / 100 * (Date.now() - prev.startTime) / (status.progress / 100 || 1)),
              logs: [
                ...prev.logs.slice(-99),
                ...(phaseChanged ? [{
                  timestamp: Date.now(),
                  level: 'success' as const,
                  category: 'phase' as const,
                  message: `进入阶段: ${DESIGN_PHASES[newPhase].label} - ${DESIGN_PHASES[newPhase].description}`,
                  details: {
                    thinking: `Agent 已完成前一阶段的任务，现在进入 ${DESIGN_PHASES[newPhase].label} 阶段。将执行 ${DESIGN_PHASES[newPhase].description}。`,
                    reasoning: `基于当前进度 (${status.progress.toFixed(1)}%)，系统自动转换到下一个设计阶段以继续优化过程。`,
                  },
                }] : []),
                {
                  timestamp: Date.now(),
                  level: 'info' as const,
                  category: 'iteration' as const,
                  message: `迭代 ${status.iteration}: 已评估 ${status.candidatesFound} 个候选多肽`,
                  details: {
                    thinking: `分析当前迭代的结果，评估候选多肽的质量和多样性。已生成 ${status.candidatesFound} 个候选序列，正在继续优化。`,
                    metrics: {
                      iteration: status.iteration,
                      candidatesFound: status.candidatesFound,
                      progress: status.progress,
                    },
                  },
                },
              ],
            };
          });

          // Stop polling when task completes
          if (status.progress >= 100) {
            setIsRunning(false);
          }
        }
      } catch (err) {
        console.error('Failed to poll task status:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [task, isRunning, isPaused, utils]);

  const handleStartTask = async () => {
    try {
      setError(null);
      
      // Create task with minimal input - system auto-configures everything
      const newTask = await createTaskMutation.mutateAsync({
        targetProtein: taskConfig.targetProtein,
        requirements: taskConfig.requirements || undefined,
        // All other parameters will be auto-configured by the backend
      });

      const currentPhase = getCurrentPhase(0);
      setTask({
        taskId: newTask.taskId,
        progress: 0,
        iteration: 0,
        candidatesFound: 0,
        currentPhase,
        phaseProgress: 0,
        topCandidates: [],
        startTime: Date.now(),
        elapsedTime: 0,
        estimatedTimeRemaining: 0,
        logs: [
          {
            timestamp: Date.now(),
            level: 'info' as const,
            category: 'phase' as const,
            message: `启动多肽设计：靶点=${taskConfig.targetProtein}，需求=${taskConfig.requirements}`,
            details: {
              thinking: `启动多肽设计 Agent。\n靶点信息：${taskConfig.targetProtein}\n用户需求：${taskConfig.requirements}\n\n系统将自动执行：\n- 生成多样化的候选序列\n- 评估每个候选的性质和亲和力\n- 通过优化算法改进\n- 返回最优候选`,
              metrics: {
                targetLength: taskConfig.targetProtein.length,
              },
            },
          },
          {
            timestamp: Date.now(),
            level: 'info' as const,
            category: 'phase' as const,
            message: `阶段 1/6: ${DESIGN_PHASES[currentPhase].label} - ${DESIGN_PHASES[currentPhase].description}`,
            details: {
              thinking: `初始化设计任务。Agent 将执行以下步骤:\n1. 解析靶点蛋白信息\n2. 分析用户需求\n3. 配置设计参数\n4. 准备序列生成器`,
              reasoning: `根据靶点 ${taskConfig.targetProtein} 和用户需求 "${taskConfig.requirements}"，系统已准备好开始多肽设计流程。`,
            },
          },
        ],
      });
      
      await startTaskMutation.mutateAsync({ taskId: newTask.taskId });
      setIsRunning(true);
      setIsPaused(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '启动任务失败');
    }
  };

  const handlePauseTask = async () => {
    if (!task) return;
    try {
      await pauseTaskMutation.mutateAsync({ taskId: task.taskId });
      setIsPaused(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '暂停任务失败');
    }
  };

  const handleResumeTask = async () => {
    if (!task) return;
    try {
      await resumeTaskMutation.mutateAsync({ taskId: task.taskId });
      setIsPaused(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '恢复任务失败');
    }
  };

  const handleCancelTask = async () => {
    if (!task) return;
    try {
      await cancelTaskMutation.mutateAsync({ taskId: task.taskId });
      setIsRunning(false);
      setTask(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消任务失败');
    }
  };

  const handleReset = () => {
    setTask(null);
    setIsRunning(false);
    setIsPaused(false);
    setError(null);
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const isLoading = createTaskMutation.isPending || startTaskMutation.isPending || pauseTaskMutation.isPending || resumeTaskMutation.isPending || cancelTaskMutation.isPending;

  // Memoize utils to prevent unnecessary re-renders
  React.useMemo(() => utils, [utils]);

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {!task ? (
        // Simplified Input Panel
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              AI 多肽设计
            </CardTitle>
            <CardDescription>只需提供靶点和需求，系统自动完成设计</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-6 overflow-auto">
            {/* Target Protein Input */}
            <div>
              <Label htmlFor="target-protein" className="text-base font-semibold mb-2 block">
                🎯 靶点蛋白
              </Label>
              <Input
                id="target-protein"
                value={taskConfig.targetProtein}
                onChange={(e) => setTaskConfig({ ...taskConfig, targetProtein: e.target.value })}
                placeholder="例如: IL6, TNF-α, EGFR"
                disabled={isRunning}
                className="text-base h-10"
              />
              <p className="text-xs text-muted-foreground mt-1">输入蛋白名称或 UniProt ID</p>
            </div>

            {/* Requirements Input */}
            <div>
              <Label htmlFor="requirements" className="text-base font-semibold mb-2 block">
                📝 设计需求
              </Label>
              <Input
                id="requirements"
                value={taskConfig.requirements}
                onChange={(e) => setTaskConfig({ ...taskConfig, requirements: e.target.value })}
                placeholder="例如: 高亲和力、低毒性、稳定性强、易制造"
                disabled={isRunning}
                className="text-base h-10"
              />
              <p className="text-xs text-muted-foreground mt-1">用自然语言描述您的设计目标</p>
            </div>

            {/* Start Button */}
            <Button
              onClick={handleStartTask}
              disabled={isLoading || isRunning || !taskConfig.targetProtein.trim()}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              <Play className="w-5 h-5 mr-2" />
              开始设计
            </Button>

            {/* Info Box */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-sm text-emerald-700 dark:text-emerald-400">
              <p className="font-semibold mb-2">✨ 系统将自动执行：</p>
              <ul className="space-y-1 text-xs">
                <li>• 使用 Claude AI 生成多样化候选序列</li>
                <li>• 分析每个序列的物理化学性质</li>
                <li>• 进行分子对接评估亲和力</li>
                <li>• 通过优化算法改进候选</li>
                <li>• 返回最优多肽设计</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Task Execution Panel
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Progress Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>任务执行进度</CardTitle>
                  <CardDescription>
                    {formatTime(task.elapsedTime)} 已用 / {formatTime(task.estimatedTimeRemaining)} 预计剩余
                  </CardDescription>
                </div>
                <div className="text-3xl font-bold text-primary">{task.progress.toFixed(1)}%</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>总体进度</span>
                  <span className="text-muted-foreground">{task.iteration} 次迭代</span>
                </div>
                <Progress value={task.progress} className="h-2" />
              </div>

              {/* Design Phases */}
              <div className="grid grid-cols-6 gap-2">
                {Object.entries(DESIGN_PHASES).map(([phaseNum, phase]) => {
                  const phaseIndex = parseInt(phaseNum) as DesignPhase;
                  const isActive = phaseIndex === task.currentPhase;
                  const isCompleted = phaseIndex < task.currentPhase;
                  
                  return (
                    <div
                      key={phaseNum}
                      className={`p-2 rounded-lg text-center text-xs font-semibold transition-all ${
                        isActive
                          ? `bg-gradient-to-r ${phase.color} text-white shadow-lg`
                          : isCompleted
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className="text-lg mb-1">{phase.icon}</div>
                      <div>{phase.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Phase Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>{DESIGN_PHASES[task.currentPhase].label} 进度</span>
                  <span className="text-muted-foreground">{task.phaseProgress.toFixed(0)}%</span>
                </div>
                <Progress value={task.phaseProgress} className="h-2" />
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-muted p-2 rounded">
                  <div className="text-muted-foreground text-xs">迭代数</div>
                  <div className="font-bold text-lg">{String(task.iteration)}</div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-muted-foreground text-xs">候选数</div>
                  <div className="font-bold text-lg">{String(task.candidatesFound)}</div>
                </div>
                <div className="bg-muted p-2 rounded">
                  <div className="text-muted-foreground text-xs">已用时间</div>
                  <div className="font-bold text-lg">{formatTime(task.elapsedTime)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Candidates Section */}
          {task.topCandidates.length > 0 && (
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle>🏆 候选多肽排行榜</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                <div className="space-y-2">
                  {task.topCandidates.map((candidate, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-muted rounded-lg border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg text-primary">#{candidate.rank}</span>
                          <code className="text-xs bg-background px-2 py-1 rounded font-mono">
                            {candidate.sequence}
                          </code>
                        </div>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {candidate.combinedScore.toFixed(2)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div>亲和力: {candidate.affinityScore.toFixed(2)}</div>
                        <div>序列分: {candidate.sequenceScore.toFixed(2)}</div>
                        <div>电荷: {candidate.properties.charge.toFixed(1)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Logs Section */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle>📋 运行日志</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <div className="space-y-2">
                {task.logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg border-l-4 cursor-pointer transition-colors ${
                      log.level === 'error'
                        ? 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-400'
                        : log.level === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                        : log.level === 'warning'
                        ? 'bg-yellow-500/10 border-yellow-500 text-yellow-700 dark:text-yellow-400'
                        : 'bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-400'
                    }`}
                    onClick={() => setExpandedLogIndex(expandedLogIndex === idx ? null : idx)}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{log.message}</div>
                        {expandedLogIndex === idx && log.details && (
                          <div className="mt-2 space-y-1 text-xs">
                            {log.details.thinking && (
                              <div>
                                <span className="font-semibold">💭 思考过程：</span>
                                <p className="whitespace-pre-wrap text-muted-foreground">{log.details.thinking}</p>
                              </div>
                            )}
                            {log.details.reasoning && (
                              <div>
                                <span className="font-semibold">🔍 推理过程：</span>
                                <p className="whitespace-pre-wrap text-muted-foreground">{log.details.reasoning}</p>
                              </div>
                            )}
                            {log.details.metrics && (
                              <div>
                                <span className="font-semibold">📊 关键指标：</span>
                                <div className="text-muted-foreground">
                                  {Object.entries(log.details.metrics).map(([key, val]) => (
                                    <div key={key}>{key}: {val}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {log.details && (
                        <ChevronRight
                          className={`w-4 h-4 mt-0.5 transition-transform ${
                            expandedLogIndex === idx ? 'rotate-90' : ''
                          }`}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Control Buttons */}
          <div className="flex gap-2">
            {!isRunning && !isPaused && (
              <Button onClick={handleStartTask} disabled={isLoading} className="flex-1">
                <Play className="w-4 h-4 mr-2" />
                继续
              </Button>
            )}
            {isRunning && (
              <Button onClick={handlePauseTask} disabled={isLoading} variant="outline" className="flex-1">
                <Pause className="w-4 h-4 mr-2" />
                暂停
              </Button>
            )}
            {isPaused && (
              <Button onClick={handleResumeTask} disabled={isLoading} className="flex-1">
                <Play className="w-4 h-4 mr-2" />
                恢复
              </Button>
            )}
            <Button onClick={handleCancelTask} disabled={isLoading} variant="destructive" className="flex-1">
              <X className="w-4 h-4 mr-2" />
              取消
            </Button>
            <Button onClick={handleReset} disabled={isLoading} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              重置
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
