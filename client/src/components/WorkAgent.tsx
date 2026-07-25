/**
 * WorkAgent - Autonomous Peptide Design Agent Interface
 * Long-running agent that autonomously designs high-affinity peptides based on user requirements
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, Play, Pause, Square, Download, RefreshCw } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PeptideLink } from './PeptideLink';

interface WorkAgentTask {
  taskId: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  targetProtein: string;
  targetSequence: string;
  requirements: string;
  progress: number;
  iteration: number;
  totalIterations: number;
  candidatesFound: number;
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
  }>;
}

export function WorkAgent() {
  const [task, setTask] = useState<WorkAgentTask | null>(null);
  const [taskConfig, setTaskConfig] = useState({
    targetProtein: 'IL6',
    targetSequence: 'MNSFSTSAFAAQLNDNEGK',
    requirements: '高亲和力、低毒性、稳定性强',
    maxIterations: 100,
    topCandidates: 10,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // tRPC mutations and queries
  const createTaskMutation = trpc.designTask.create.useMutation();
  const getTaskStatusQuery = trpc.designTask.getStatus.useQuery;
  const startTaskMutation = trpc.designTask.start.useMutation();
  const pauseTaskMutation = trpc.designTask.pause.useMutation();
  const resumeTaskMutation = trpc.designTask.resume.useMutation();
  const cancelTaskMutation = trpc.designTask.cancel.useMutation();
  const getCandidatesQuery = trpc.designTask.getCandidates.useQuery;

  // Poll task status
  useEffect(() => {
    if (!task || !isRunning || isPaused) return;

    const pollInterval = setInterval(async () => {
      try {
        // Use query instead of mutation for status polling
        const utils = trpc.useUtils();
        const status = await utils.designTask.getStatus.fetch({ taskId: task.taskId });
        
        if (status) {
          setTask((prev) => {
            if (!prev) return null;
            
            return {
              ...prev,
              progress: status.progress,
              iteration: status.iteration,
              candidatesFound: status.candidatesFound,
              topCandidates: prev.topCandidates,
              elapsedTime: Date.now() - prev.startTime,
              estimatedTimeRemaining: Math.max(0, (100 - status.progress) / 100 * (Date.now() - prev.startTime) / (status.progress / 100 || 1)),
              logs: [
                ...prev.logs.slice(-99),
                {
                  timestamp: Date.now(),
                  level: 'info',
                  message: `迭代 ${status.iteration}: 已评估 ${status.candidatesFound} 个候选多肽`,
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
  }, [task, isRunning, isPaused]);

  const handleStartTask = async () => {
    try {
      setError(null);
      
      const newTask = await createTaskMutation.mutateAsync({
        targetProtein: taskConfig.targetProtein,
        targetSequence: taskConfig.targetSequence,
        designParameters: {
          minLength: 8,
          maxLength: 20,
          maxCharge: 5,
          maxInstabilityIndex: 40,
          minSequenceScore: 0.3,
          minAffinityScore: -15,
        },
        generationStrategy: 'hybrid',
        maxIterations: taskConfig.maxIterations,
        topCandidates: taskConfig.topCandidates,
      });

      // Start the task
      await startTaskMutation.mutateAsync({ taskId: newTask.taskId });

      setTask({
        taskId: newTask.taskId,
        status: 'running',
        targetProtein: taskConfig.targetProtein,
        targetSequence: taskConfig.targetSequence,
        requirements: taskConfig.requirements,
        progress: 0,
        iteration: 0,
        totalIterations: taskConfig.maxIterations,
        candidatesFound: 0,
        topCandidates: [],
        startTime: Date.now(),
        elapsedTime: 0,
        estimatedTimeRemaining: 0,
        logs: [
          {
            timestamp: Date.now(),
            level: 'info',
            message: `开始设计多肽：靶点=${taskConfig.targetProtein}，需求=${taskConfig.requirements}`,
          },
        ],
      });
      
      setIsRunning(true);
      setIsPaused(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : '启动任务失败';
      setError(message);
      console.error('Failed to start task:', err);
    }
  };

  const handlePauseTask = async () => {
    if (!task) return;

    try {
      if (isPaused) {
        // Resume
        await resumeTaskMutation.mutateAsync({ taskId: task.taskId });
        setIsPaused(false);
      } else {
        // Pause
        await pauseTaskMutation.mutateAsync({ taskId: task.taskId });
        setIsPaused(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败';
      setError(message);
      console.error('Failed to pause/resume task:', err);
    }
  };

  const handleStopTask = async () => {
    if (!task) return;

    try {
      await cancelTaskMutation.mutateAsync({ taskId: task.taskId });
      setIsRunning(false);
      setIsPaused(false);
      setTask((prev) => prev ? { ...prev, status: 'completed' } : null);
    } catch (err) {
      const message = err instanceof Error ? err.message : '停止任务失败';
      setError(message);
      console.error('Failed to stop task:', err);
    }
  };

  const handleResetTask = () => {
    setTask(null);
    setIsRunning(false);
    setIsPaused(false);
    setError(null);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const isLoading = createTaskMutation.isPending || startTaskMutation.isPending || pauseTaskMutation.isPending || resumeTaskMutation.isPending || cancelTaskMutation.isPending;

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      {/* Error Alert */}
      {error && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="pt-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-500">错误</p>
              <p className="text-sm text-red-500/80">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Configuration Panel */}
      {!task ? (
        <Card className="flex-shrink-0">
          <CardHeader>
            <CardTitle>多肽自主设计任务</CardTitle>
            <CardDescription>配置 Agent 的设计参数和目标</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>靶点蛋白</Label>
                <Input
                  value={taskConfig.targetProtein}
                  onChange={(e) => setTaskConfig({ ...taskConfig, targetProtein: e.target.value })}
                  placeholder="例如：IL6, TNF-α"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>靶点序列</Label>
                <Input
                  value={taskConfig.targetSequence}
                  onChange={(e) => setTaskConfig({ ...taskConfig, targetSequence: e.target.value })}
                  placeholder="多肽或蛋白质序列"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>设计需求</Label>
              <Textarea
                value={taskConfig.requirements}
                onChange={(e) => setTaskConfig({ ...taskConfig, requirements: e.target.value })}
                placeholder="描述所需的多肽特性，例如：高亲和力、低毒性、易合成等"
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>最大迭代次数</Label>
                <Input
                  type="number"
                  value={taskConfig.maxIterations}
                  onChange={(e) => setTaskConfig({ ...taskConfig, maxIterations: parseInt(e.target.value) })}
                  min="10"
                  max="1000"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>返回候选数</Label>
                <Input
                  type="number"
                  value={taskConfig.topCandidates}
                  onChange={(e) => setTaskConfig({ ...taskConfig, topCandidates: parseInt(e.target.value) })}
                  min="1"
                  max="100"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button 
              onClick={handleStartTask} 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  启动中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  启动 Agent
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Task Status Panel */
        <Card className="flex-shrink-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>任务进行中</CardTitle>
                <CardDescription>靶点: {task.targetProtein}</CardDescription>
              </div>
              <Badge variant={isRunning && !isPaused ? 'default' : 'secondary'}>
                {isPaused ? '已暂停' : isRunning ? '运行中' : '已停止'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>总体进度</span>
                <span className="font-mono">{task.progress.toFixed(1)}%</span>
              </div>
              <Progress value={task.progress} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-muted p-2 rounded">
                <div className="text-xs text-muted-foreground">迭代</div>
                <div className="text-lg font-bold">{task.iteration}/{task.totalIterations}</div>
              </div>
              <div className="bg-muted p-2 rounded">
                <div className="text-xs text-muted-foreground">候选数</div>
                <div className="text-lg font-bold">{task.candidatesFound}</div>
              </div>
              <div className="bg-muted p-2 rounded">
                <div className="text-xs text-muted-foreground">已用时</div>
                <div className="text-lg font-bold">{formatTime(task.elapsedTime)}</div>
              </div>
              <div className="bg-muted p-2 rounded">
                <div className="text-xs text-muted-foreground">预计剩余</div>
                <div className="text-lg font-bold">{formatTime(task.estimatedTimeRemaining)}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handlePauseTask}
                variant="outline"
                className="flex-1"
                disabled={!isRunning && !isPaused}
              >
                <Pause className="w-4 h-4 mr-2" />
                {isPaused ? '恢复' : '暂停'}
              </Button>
              <Button
                onClick={handleStopTask}
                variant="destructive"
                className="flex-1"
                disabled={!isRunning && !isPaused}
              >
                <Square className="w-4 h-4 mr-2" />
                停止
              </Button>
              <Button
                onClick={handleResetTask}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重置
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results and Logs Tabs */}
      {task && (
        <Tabs defaultValue="candidates" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="candidates">候选多肽 ({task.topCandidates.length})</TabsTrigger>
            <TabsTrigger value="logs">运行日志</TabsTrigger>
          </TabsList>

          {/* Candidates Tab */}
          <TabsContent value="candidates" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {task.topCandidates.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  {isRunning ? (
                    <>
                      <Spinner className="mr-2" />
                      正在搜索候选多肽...
                    </>
                  ) : (
                    '暂无候选多肽'
                  )}
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {task.topCandidates.map((candidate, idx) => (
                    <Card key={idx} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">#{candidate.rank}</Badge>
                            <PeptideLink sequence={candidate.sequence} className="text-sm" />
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">亲和力:</span>
                              <span className="ml-1 font-mono">{candidate.affinityScore.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">序列分:</span>
                              <span className="ml-1 font-mono">{candidate.sequenceScore.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">综合分:</span>
                              <span className="ml-1 font-mono font-bold">{candidate.combinedScore.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-1 font-mono text-xs">
                {task.logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`py-1 ${
                      log.level === 'error'
                        ? 'text-red-500'
                        : log.level === 'warning'
                        ? 'text-yellow-500'
                        : log.level === 'success'
                        ? 'text-green-500'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <span className="text-muted-foreground">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                    {log.message}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
