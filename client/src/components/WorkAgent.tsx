/**
 * WorkAgent - Autonomous Peptide Design Agent Interface
 * Long-running agent that autonomously designs high-affinity peptides based on user requirements
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
import { ChevronDown, ChevronRight, Play, Pause, RotateCcw, X } from 'lucide-react';

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

export function WorkAgent() {
  const [task, setTask] = useState<WorkAgentTask | null>(null);
  const [taskConfig, setTaskConfig] = useState({
    targetProtein: 'IL6',
    targetSequence: 'MNSFSTSAFAAQLNDNEGK',
    requirements: '高亲和力、低毒性、稳定性强',
    maxIterations: 10,
    topCandidates: 10,
  });
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
      
      const newTask = await createTaskMutation.mutateAsync({
        targetProtein: taskConfig.targetProtein,
        targetSequence: taskConfig.targetSequence,
        designParameters: {
          minLength: 8,
          maxLength: 50,
          maxCharge: 5,
          maxInstabilityIndex: 40,
          minSequenceScore: 0.5,
          minAffinityScore: -0.6,
        },
        generationStrategy: 'hybrid',
        maxIterations: taskConfig.maxIterations,
        topCandidates: taskConfig.topCandidates,
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
            message: `开始设计多肽：靶点=${taskConfig.targetProtein}，需求=${taskConfig.requirements}`,
            details: {
              thinking: `启动多肽设计 Agent。\n靶点信息：${taskConfig.targetProtein}\n靶点序列：${taskConfig.targetSequence}\n用户需求：${taskConfig.requirements}\n\n设计策略：\n- 生成多样化的候选序列\n- 评估每个候选的性质和亲和力\n- 通过遗传算法优化\n- 精细化最优候选`,
              metrics: {
                maxIterations: taskConfig.maxIterations,
                topCandidates: taskConfig.topCandidates,
                targetSequenceLength: taskConfig.targetSequence.length,
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
        // Task Configuration Panel
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>多肽自主设计任务配置</CardTitle>
            <CardDescription>配置靶点和设计参数，启动 Agent 自主设计</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4 overflow-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target-protein">靶点蛋白</Label>
                <Input
                  id="target-protein"
                  value={taskConfig.targetProtein}
                  onChange={(e) => setTaskConfig({ ...taskConfig, targetProtein: e.target.value })}
                  placeholder="例如: IL6"
                  disabled={isRunning}
                />
              </div>
              <div>
                <Label htmlFor="max-iterations">最大迭代数</Label>
                <Input
                  id="max-iterations"
                  type="number"
                  value={taskConfig.maxIterations}
                  onChange={(e) => setTaskConfig({ ...taskConfig, maxIterations: parseInt(e.target.value) })}
                  disabled={isRunning}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="target-sequence">靶点序列</Label>
              <Input
                id="target-sequence"
                value={taskConfig.targetSequence}
                onChange={(e) => setTaskConfig({ ...taskConfig, targetSequence: e.target.value })}
                placeholder="输入氨基酸序列"
                disabled={isRunning}
              />
            </div>

            <div>
              <Label htmlFor="requirements">设计需求</Label>
              <Input
                id="requirements"
                value={taskConfig.requirements}
                onChange={(e) => setTaskConfig({ ...taskConfig, requirements: e.target.value })}
                placeholder="例如: 高亲和力、低毒性、稳定性强"
                disabled={isRunning}
              />
            </div>

            <div>
              <Label htmlFor="top-candidates">返回候选数量</Label>
              <Input
                id="top-candidates"
                type="number"
                value={taskConfig.topCandidates}
                onChange={(e) => setTaskConfig({ ...taskConfig, topCandidates: parseInt(e.target.value) })}
                disabled={isRunning}
              />
            </div>

            <Button
              onClick={handleStartTask}
              disabled={isLoading || isRunning}
              className="w-full"
              size="lg"
            >
              <Play className="w-4 h-4 mr-2" />
              启动设计任务
            </Button>
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

              {/* Current Phase Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>当前阶段: {DESIGN_PHASES[task.currentPhase].label}</span>
                  <span className="text-muted-foreground">{task.phaseProgress.toFixed(1)}%</span>
                </div>
                <Progress value={task.phaseProgress} className="h-2" />
              </div>

              {/* Phase Flow */}
              <div className="flex gap-2 mt-4">
                {Object.entries(DESIGN_PHASES).map(([idx, phase]) => {
                  const phaseNum = parseInt(idx);
                  const isActive = phaseNum === task.currentPhase;
                  const isCompleted = phaseNum < task.currentPhase;
                  
                  return (
                    <div key={idx} className="flex-1 text-center">
                      <div
                        className={`h-2 rounded-full mb-1 transition-all ${
                          isCompleted
                            ? 'bg-green-500'
                            : isActive
                            ? `bg-gradient-to-r ${phase.color}`
                            : 'bg-muted'
                        }`}
                      />
                      <div className="text-xs font-medium">{phase.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-muted p-2 rounded text-center">
                  <div className="text-muted-foreground">候选多肽</div>
                  <div className="font-bold">{task.candidatesFound}</div>
                </div>
                <div className="bg-muted p-2 rounded text-center">
                  <div className="text-muted-foreground">迭代次数</div>
                  <div className="font-bold">{task.iteration}</div>
                </div>
                <div className="bg-muted p-2 rounded text-center">
                  <div className="text-muted-foreground">已用时间</div>
                  <div className="font-bold">{formatTime(task.elapsedTime)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Control Buttons */}
          <div className="flex gap-2">
            {isRunning && !isPaused ? (
              <Button onClick={handlePauseTask} variant="outline" className="flex-1">
                <Pause className="w-4 h-4 mr-2" />
                暂停
              </Button>
            ) : isPaused ? (
              <Button onClick={handleResumeTask} variant="outline" className="flex-1">
                <Play className="w-4 h-4 mr-2" />
                恢复
              </Button>
            ) : null}
            <Button onClick={handleCancelTask} variant="destructive" className="flex-1">
              <X className="w-4 h-4 mr-2" />
              停止
            </Button>
            <Button onClick={handleReset} variant="outline" className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              重置
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="logs" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="logs">运行日志</TabsTrigger>
              <TabsTrigger value="candidates">候选多肽</TabsTrigger>
            </TabsList>

            {/* Logs Tab */}
            <TabsContent value="logs" className="flex-1 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {task.logs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        expandedLogIndex === idx
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      } ${
                        log.level === 'error'
                          ? 'border-red-500/30 bg-red-500/5'
                          : log.level === 'warning'
                          ? 'border-yellow-500/30 bg-yellow-500/5'
                          : log.level === 'success'
                          ? 'border-green-500/30 bg-green-500/5'
                          : ''
                      }`}
                      onClick={() => setExpandedLogIndex(expandedLogIndex === idx ? null : idx)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              [{new Date(log.timestamp).toLocaleTimeString()}]
                            </span>
                            {log.category && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                                {log.category}
                              </span>
                            )}
                            <span
                              className={`text-xs font-semibold ${
                                log.level === 'error'
                                  ? 'text-red-500'
                                  : log.level === 'warning'
                                  ? 'text-yellow-500'
                                  : log.level === 'success'
                                  ? 'text-green-500'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {log.level.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground break-words">{log.message}</p>
                        </div>
                        {log.details && (
                          <div className="text-xs text-muted-foreground flex-shrink-0">
                            {expandedLogIndex === idx ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </div>
                        )}
                      </div>

                      {/* Expanded Details */}
                      {expandedLogIndex === idx && log.details && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2 text-xs">
                          {log.details.thinking && (
                            <div>
                              <p className="font-semibold text-primary mb-1">💭 思考过程：</p>
                              <p className="text-muted-foreground whitespace-pre-wrap bg-muted/50 p-2 rounded text-xs">
                                {log.details.thinking}
                              </p>
                            </div>
                          )}
                          {log.details.reasoning && (
                            <div>
                              <p className="font-semibold text-primary mb-1">🔍 推理过程：</p>
                              <p className="text-muted-foreground whitespace-pre-wrap bg-muted/50 p-2 rounded text-xs">
                                {log.details.reasoning}
                              </p>
                            </div>
                          )}
                          {log.details.metrics && Object.keys(log.details.metrics).length > 0 && (
                            <div>
                              <p className="font-semibold text-primary mb-1">📊 关键指标：</p>
                              <div className="grid grid-cols-2 gap-1 bg-muted/50 p-2 rounded text-xs">
                                {Object.entries(log.details.metrics).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-muted-foreground">{key}:</span>
                                    <span className="font-mono font-semibold text-foreground">
                                      {typeof value === 'number' ? value.toFixed(2) : value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {log.details.intermediateResults && Object.keys(log.details.intermediateResults).length > 0 && (
                            <div>
                              <p className="font-semibold text-primary mb-1">📈 中间结果：</p>
                              <pre className="text-muted-foreground whitespace-pre-wrap bg-muted/50 p-2 rounded overflow-auto max-h-32 text-xs">
                                {JSON.stringify(log.details.intermediateResults, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Candidates Tab */}
            <TabsContent value="candidates" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-3">
                  {task.topCandidates.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      暂无候选多肽
                    </div>
                  ) : (
                    task.topCandidates.map((candidate) => (
                      <Card key={candidate.rank}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              #{candidate.rank} - {candidate.sequence}
                            </CardTitle>
                            <div className="text-right">
                              <div className="text-sm font-bold text-primary">
                                {candidate.combinedScore.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">综合评分</div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">亲和力评分:</span>
                            <span>{candidate.affinityScore.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">序列评分:</span>
                            <span>{candidate.sequenceScore.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">疏水性:</span>
                            <span>{candidate.properties.hydrophobicity.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">电荷:</span>
                            <span>{candidate.properties.charge.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">等电点:</span>
                            <span>{candidate.properties.isoelectricPoint.toFixed(2)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
