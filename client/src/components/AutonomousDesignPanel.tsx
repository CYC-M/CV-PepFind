/**
 * Autonomous Design Panel - UI for configuring and monitoring long-running design tasks
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { trpc } from '@/lib/trpc';
import { PeptideLink } from './PeptideLink';

interface DesignConfig {
  targetProtein: string;
  targetSequence: string;
  minLength: number;
  maxLength: number;
  maxCharge: number;
  maxInstabilityIndex: number;
  minSequenceScore: number;
  minAffinityScore: number;
  generationStrategy: 'random' | 'optimization' | 'hybrid';
  maxIterations: number;
  topCandidates: number;
}

interface TaskStatus {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  iteration: number;
  candidatesFound: number;
  error?: string;
  startTime: number;
  endTime?: number;
}

export function AutonomousDesignPanel() {
  const [config, setConfig] = useState<DesignConfig>({
    targetProtein: 'IL6',
    targetSequence: 'MNSFSTSAFAAQLNDNEGK',
    minLength: 8,
    maxLength: 15,
    maxCharge: 5,
    maxInstabilityIndex: 40,
    minSequenceScore: 0.5,
    minAffinityScore: -8,
    generationStrategy: 'hybrid',
    maxIterations: 10,
    topCandidates: 10,
  });

  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Create task mutation
  const createTaskMutation = trpc.designTask.create.useMutation();

  // Start task mutation
  const startTaskMutation = trpc.designTask.start.useMutation();

  // Pause task mutation
  const pauseTaskMutation = trpc.designTask.pause.useMutation();

  // Resume task mutation
  const resumeTaskMutation = trpc.designTask.resume.useMutation();

  // Cancel task mutation
  const cancelTaskMutation = trpc.designTask.cancel.useMutation();

  // Get status query
  const statusQuery = trpc.designTask.getStatus.useQuery(
    { taskId: taskId || '' },
    {
      enabled: !!taskId && isRunning,
      refetchInterval: 1000, // Poll every second
    }
  );

  // Update task status when query data changes
  useEffect(() => {
    if (statusQuery.data) {
      setTaskStatus(statusQuery.data);
      if (statusQuery.data.status === 'completed' || statusQuery.data.status === 'failed') {
        setIsRunning(false);
      }
    }
  }, [statusQuery.data]);

  // Get candidates query
  const candidatesQuery = trpc.designTask.getCandidates.useQuery(
    { taskId: taskId || '', limit: config.topCandidates },
    {
      enabled: !!taskId,
      refetchInterval: 2000, // Poll every 2 seconds
    }
  );

  // Update candidates when query data changes
  useEffect(() => {
    if (candidatesQuery.data) {
      setCandidates(candidatesQuery.data);
    }
  }, [candidatesQuery.data]);

  // Export CSV query
  const exportCSVQuery = trpc.designTask.exportCSV.useQuery(
    { taskId: taskId || '' },
    { enabled: false }
  );

  const handleCreateTask = async () => {
    try {
      const result = await createTaskMutation.mutateAsync({
        targetProtein: config.targetProtein,
        targetSequence: config.targetSequence,
        designParameters: {
          minLength: config.minLength,
          maxLength: config.maxLength,
          maxCharge: config.maxCharge,
          maxInstabilityIndex: config.maxInstabilityIndex,
          minSequenceScore: config.minSequenceScore,
          minAffinityScore: config.minAffinityScore,
        },
        generationStrategy: config.generationStrategy,
        maxIterations: config.maxIterations,
        topCandidates: config.topCandidates,
      });
      setTaskId(result.taskId);
      setTaskStatus({
        taskId: result.taskId,
        status: 'pending',
        progress: 0,
        iteration: 0,
        candidatesFound: 0,
        startTime: Date.now(),
      });
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleStartTask = async () => {
    if (taskId) {
      try {
        await startTaskMutation.mutateAsync({ taskId });
        setIsRunning(true);
      } catch (error) {
        console.error('Error starting task:', error);
      }
    }
  };

  const handlePauseTask = async () => {
    if (taskId) {
      try {
        await pauseTaskMutation.mutateAsync({ taskId });
      } catch (error) {
        console.error('Error pausing task:', error);
      }
    }
  };

  const handleResumeTask = async () => {
    if (taskId) {
      try {
        await resumeTaskMutation.mutateAsync({ taskId });
      } catch (error) {
        console.error('Error resuming task:', error);
      }
    }
  };

  const handleCancelTask = async () => {
    if (taskId) {
      try {
        await cancelTaskMutation.mutateAsync({ taskId });
        setIsRunning(false);
      } catch (error) {
        console.error('Error cancelling task:', error);
      }
    }
  };

  const handleExportCSV = async () => {
    if (taskId) {
      try {
        const data = await exportCSVQuery.refetch();
        if (data.data && typeof data.data === 'string') {
          const blob = new Blob([data.data], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `peptide-candidates-${taskId}.csv`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Failed to export CSV:', error);
      }
    }
  };

  const handleConfigChange = (key: keyof DesignConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle>设计配置</CardTitle>
          <CardDescription>配置自主多肽设计任务的参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Target Protein */}
          <div className="space-y-2">
            <Label htmlFor="target-protein">目标蛋白</Label>
            <Input
              id="target-protein"
              value={config.targetProtein}
              onChange={e => handleConfigChange('targetProtein', e.target.value)}
              placeholder="e.g., IL6"
            />
          </div>

          {/* Target Sequence */}
          <div className="space-y-2">
            <Label htmlFor="target-sequence">目标序列</Label>
            <Input
              id="target-sequence"
              value={config.targetSequence}
              onChange={e => handleConfigChange('targetSequence', e.target.value)}
              placeholder="Enter target amino acid sequence"
            />
          </div>

          {/* Generation Strategy */}
          <div className="space-y-2">
            <Label htmlFor="strategy">生成策略</Label>
            <Select value={config.generationStrategy} onValueChange={v => handleConfigChange('generationStrategy', v as any)}>
              <SelectTrigger id="strategy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="random">随机</SelectItem>
                <SelectItem value="optimization">优化</SelectItem>
                <SelectItem value="hybrid">混合</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sequence Length */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-length">最小长度</Label>
              <Input
                id="min-length"
                type="number"
                value={config.minLength}
                onChange={e => handleConfigChange('minLength', parseInt(e.target.value))}
                min={5}
                max={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-length">最大长度</Label>
              <Input
                id="max-length"
                type="number"
                value={config.maxLength}
                onChange={e => handleConfigChange('maxLength', parseInt(e.target.value))}
                min={5}
                max={100}
              />
            </div>
          </div>

          {/* Charge and Stability */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-charge">最大电荷</Label>
              <Input
                id="max-charge"
                type="number"
                value={config.maxCharge}
                onChange={e => handleConfigChange('maxCharge', parseInt(e.target.value))}
                min={0}
                max={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-instability">最大不稳定性指数</Label>
              <Input
                id="max-instability"
                type="number"
                value={config.maxInstabilityIndex}
                onChange={e => handleConfigChange('maxInstabilityIndex', parseInt(e.target.value))}
                min={0}
                max={100}
              />
            </div>
          </div>

          {/* Scoring Thresholds */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-seq-score">最小序列评分</Label>
              <Slider
                value={[config.minSequenceScore]}
                onValueChange={v => handleConfigChange('minSequenceScore', v[0])}
                min={0}
                max={1}
                step={0.1}
              />
              <span className="text-sm text-muted-foreground">{config.minSequenceScore.toFixed(1)}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="min-affinity">最小亲和力评分</Label>
              <Slider
                value={[Math.abs(config.minAffinityScore)]}
                onValueChange={v => handleConfigChange('minAffinityScore', -v[0])}
                min={0}
                max={20}
                step={0.5}
              />
              <span className="text-sm text-muted-foreground">{config.minAffinityScore.toFixed(1)}</span>
            </div>
          </div>

          {/* Iterations and Candidates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-iterations">最大迭代次数</Label>
              <Input
                id="max-iterations"
                type="number"
                value={config.maxIterations}
                onChange={e => handleConfigChange('maxIterations', parseInt(e.target.value))}
                min={1}
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="top-candidates">返回候选数</Label>
              <Input
                id="top-candidates"
                type="number"
                value={config.topCandidates}
                onChange={e => handleConfigChange('topCandidates', parseInt(e.target.value))}
                min={1}
                max={50}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {!taskId ? (
              <Button onClick={handleCreateTask} disabled={createTaskMutation.isPending}>
                {createTaskMutation.isPending ? '创建中...' : '创建任务'}
              </Button>
            ) : (
              <>
                {!isRunning ? (
                  <Button onClick={handleStartTask} disabled={startTaskMutation.isPending}>
                    {startTaskMutation.isPending ? '启动中...' : '启动任务'}
                  </Button>
                ) : (
                  <>
                    <Button onClick={handlePauseTask} variant="outline" disabled={pauseTaskMutation.isPending}>
                      暂停
                    </Button>
                    <Button onClick={handleCancelTask} variant="destructive" disabled={cancelTaskMutation.isPending}>
                      取消
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress Panel */}
      {taskStatus && (
        <Card>
          <CardHeader>
            <CardTitle>任务进度</CardTitle>
            <CardDescription>任务ID: {taskStatus.taskId}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">状态</span>
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                taskStatus.status === 'running' ? 'bg-blue-100 text-blue-800' :
                taskStatus.status === 'completed' ? 'bg-green-100 text-green-800' :
                taskStatus.status === 'failed' ? 'bg-red-100 text-red-800' :
                taskStatus.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {taskStatus.status}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">进度</span>
                <span className="text-sm text-muted-foreground">{taskStatus.progress}%</span>
              </div>
              <Progress value={taskStatus.progress} />
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4 pt-4">
              <div>
                <span className="text-sm text-muted-foreground">迭代次数</span>
                <p className="text-lg font-semibold">{taskStatus.iteration}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">找到候选</span>
                <p className="text-lg font-semibold">{taskStatus.candidatesFound}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">耗时</span>
                <p className="text-lg font-semibold">
                  {taskStatus.endTime
                    ? ((taskStatus.endTime - taskStatus.startTime) / 1000).toFixed(1)
                    : ((Date.now() - taskStatus.startTime) / 1000).toFixed(1)}
                  s
                </p>
              </div>
            </div>

            {/* Error Message */}
            {taskStatus.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                {taskStatus.error}
              </div>
            )}

            {/* Export Button */}
            {taskStatus.status === 'completed' && (
              <Button onClick={handleExportCSV} variant="outline" className="w-full" disabled={exportCSVQuery.isFetching}>
                {exportCSVQuery.isFetching ? '导出中...' : '导出为CSV'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Candidates Table */}
      {candidates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>候选多肽</CardTitle>
            <CardDescription>排名前{candidates.length}的候选多肽</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">排名</th>
                    <th className="text-left py-2 px-2">序列</th>
                    <th className="text-right py-2 px-2">序列评分</th>
                    <th className="text-right py-2 px-2">亲和力评分</th>
                    <th className="text-right py-2 px-2">综合评分</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2">{candidate.rank}</td>
                      <td className="py-2 px-2 font-mono text-xs">
                        <PeptideLink sequence={candidate.sequence} />
                      </td>
                      <td className="text-right py-2 px-2">{candidate.sequenceScore.toFixed(2)}</td>
                      <td className="text-right py-2 px-2">{candidate.affinityScore.toFixed(2)}</td>
                      <td className="text-right py-2 px-2 font-semibold">{candidate.combinedScore.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
