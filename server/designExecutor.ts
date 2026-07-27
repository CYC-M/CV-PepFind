/**
 * Design Executor - Real peptide design execution engine
 * Integrates LLM generation, scoring, and optimization
 */

import { generatePeptideSequences } from './llmSequenceGenerator';
import { analyzeSequence } from './sequenceEngine';
import { batchDocking } from './structureEngine';
import { DesignTaskConfig, DesignCandidate } from './designTaskQueue';

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

export interface DesignExecutionContext {
  taskId: string;
  config: DesignTaskConfig;
  iteration: number;
  candidates: DesignCandidate[];
  onProgress: (progress: number, iteration: number, candidatesFound: number) => void;
  onCandidate: (candidate: DesignCandidate) => void;
  onLog: (message: string, details?: any) => void;
  onStepChange?: (stepInfo: DesignStepInfo) => void;
}

/**
 * Execute one iteration of peptide design
 */
export async function executeDesignIteration(
  context: DesignExecutionContext
): Promise<DesignCandidate[]> {
  const { config, iteration, onProgress, onCandidate, onLog, onStepChange } = context;
  const stepStartTime = Date.now();
  const TOTAL_STEPS = 8;

  const reportStep = (step: DesignStep, stepNumber: number, description: string, progress: number = 0) => {
    if (onStepChange) {
      onStepChange({
        step,
        stepNumber,
        totalSteps: TOTAL_STEPS,
        description,
        progress,
        startTime: stepStartTime,
      });
    }
  };

  try {
    // Step 1: Initialize
    reportStep('initializing', 1, '初始化设计参数', 0);

    // Phase 1: Generate sequences using LLM
    reportStep('generating_sequences', 2, '使用 LLM 生成多样化候选序列', 10);
    onLog(`[迭代 ${iteration}] 使用 LLM 生成候选序列...`, {
      thinking: `启动 LLM 序列生成器。将生成 ${Math.min(10, config.topCandidates)} 个多样化的候选序列，考虑靶点蛋白 ${config.targetProtein} 的特性。`,
    });

    const generatedSequences = await generatePeptideSequences({
      targetProtein: config.targetProtein,
      targetSequence: config.targetSequence,
      count: Math.min(10, config.topCandidates),
      constraints: {
        minLength: config.designParameters.minLength,
        maxLength: config.designParameters.maxLength,
      },
    });

    reportStep('generating_sequences', 2, `已生成 ${generatedSequences.length} 个候选序列`, 40);
    onLog(`[迭代 ${iteration}] 生成了 ${generatedSequences.length} 个候选序列`, {
      thinking: `LLM 已生成 ${generatedSequences.length} 个候选序列。现在进行序列性质分析和过滤。`,
      intermediateResults: {
        generatedCount: generatedSequences.length,
        sequences: generatedSequences.map(s => ({
          sequence: s.sequence,
          confidence: s.confidence,
        })),
      },
    });

    // Phase 2: Analyze and filter sequences
    reportStep('analyzing_properties', 3, '分析序列的物理化学性质', 50);
    onLog(`[迭代 ${iteration}] 分析序列性质...`, {
      thinking: `分析每个生成序列的物理化学性质，包括：\n- 疏水性\n- 电荷\n- 不稳定性指数\n- 极性\n- 芳香性`,
    });

    const analyzedSequences = generatedSequences
      .map(gen => {
        try {
          const analysis = analyzeSequence(gen.sequence);
          return {
            sequence: gen.sequence,
            sequenceScore: analysis.overallScore,
            confidence: gen.confidence,
            properties: {
              hydrophobicity: analysis.hydrophobicity,
              charge: analysis.charge,
              instabilityIndex: analysis.instabilityIndex,
            },
          };
        } catch (err) {
          onLog(`序列分析失败: ${gen.sequence}`, { error: err });
          return null;
        }
      })
      .filter((item): item is any => item !== null);

    reportStep('filtering_sequences', 4, `根据条件过滤序列`, 60);
    onLog(`[迭代 ${iteration}] 过滤序列...`, {
      thinking: `根据设计参数过滤序列：\n- 电荷 ≤ ${config.designParameters.maxCharge}\n- 不稳定性指数 ≤ ${config.designParameters.maxInstabilityIndex}\n- 序列评分 ≥ ${config.designParameters.minSequenceScore}`,
      metrics: {
        analyzedCount: analyzedSequences.length,
        chargeLimit: config.designParameters.maxCharge,
        instabilityLimit: config.designParameters.maxInstabilityIndex,
        minSequenceScore: config.designParameters.minSequenceScore,
      },
    });

    const filteredSequences = analyzedSequences.filter(item => {
      return (
        item.properties.charge <= config.designParameters.maxCharge &&
        item.properties.instabilityIndex <= config.designParameters.maxInstabilityIndex &&
        item.sequenceScore >= config.designParameters.minSequenceScore
      );
    });

    onLog(`[迭代 ${iteration}] 过滤后保留 ${filteredSequences.length} 个序列`, {
      thinking: `${filteredSequences.length} 个序列通过了物理化学性质过滤。现在进行分子对接评估。`,
      metrics: {
        originalCount: analyzedSequences.length,
        filteredCount: filteredSequences.length,
        passRate: ((filteredSequences.length / analyzedSequences.length) * 100).toFixed(1) + '%',
      },
    });

    // Phase 3: Molecular docking
    if (filteredSequences.length > 0) {
      reportStep('docking_simulation', 5, `对 ${filteredSequences.length} 个序列进行分子对接模拟`, 70);
      onLog(`[迭代 ${iteration}] 执行分子对接...`, {
        thinking: `对 ${filteredSequences.length} 个候选序列进行分子对接模拟，评估与靶点 ${config.targetProtein} 的亲和力。`,
      });

      const dockingResults = batchDocking(
        filteredSequences.map(s => s.sequence),
        config.targetSequence
      );

      reportStep('evaluating_affinity', 6, `评估与靶点的亲和力`, 80);
      onLog(`[迭代 ${iteration}] 对接完成，评估亲和力...`, {
        thinking: `对接模拟已完成。现在评估每个候选序列与靶点的亲和力。`,
        metrics: {
          dockingResults: dockingResults.length,
          minAffinityScore: config.designParameters.minAffinityScore,
        },
      });

      const newCandidates: DesignCandidate[] = [];

      for (const result of dockingResults) {
        const analyzedSeq = filteredSequences.find(s => s.sequence === result.peptide);
        if (!analyzedSeq) continue;

        if (result.score.affinity >= config.designParameters.minAffinityScore) {
          const candidate: DesignCandidate = {
            sequence: result.peptide,
            sequenceScore: analyzedSeq.sequenceScore,
            affinityScore: result.score.affinity,
            combinedScore: (analyzedSeq.sequenceScore + result.score.affinity) / 2,
            rank: 0,
            timestamp: Date.now(),
          };

          newCandidates.push(candidate);
          onCandidate(candidate);

          onLog(`[迭代 ${iteration}] 发现高亲和力候选: ${result.peptide}`, {
            thinking: `发现一个满足条件的候选多肽。\n序列: ${result.peptide}\n亲和力评分: ${result.score.affinity.toFixed(2)}\n序列评分: ${analyzedSeq.sequenceScore.toFixed(2)}\n综合评分: ${candidate.combinedScore.toFixed(2)}`,
            metrics: {
              sequence: result.peptide,
              sequenceScore: analyzedSeq.sequenceScore,
              affinityScore: result.score.affinity,
              combinedScore: candidate.combinedScore,
              properties: analyzedSeq.properties,
            },
          });
        }
      }

      context.candidates.push(...newCandidates);
    }

    // Step 7: Ranking candidates
    reportStep('ranking_candidates', 7, `对候选多肽进行排序`, 90);
    context.candidates.sort((a, b) => b.combinedScore - a.combinedScore);

    // Step 8: Completed
    reportStep('completed', 8, `迭代完成`, 100);

    // Update progress
    const progress = Math.round(((iteration + 1) / config.maxIterations) * 100);
    onProgress(progress, iteration + 1, context.candidates.length);

    return context.candidates;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    onLog(`[迭代 ${iteration}] 错误: ${errorMsg}`, {
      error: errorMsg,
      thinking: `设计迭代过程中发生错误。需要记录错误并继续或停止任务。`,
    });
    throw err;
  }
}

/**
 * Execute full design task
 */
export async function executeDesignTask(
  context: DesignExecutionContext
): Promise<DesignCandidate[]> {
  const { config, onLog } = context;

  onLog(`开始多肽设计任务`, {
    thinking: `启动多肽设计 Agent。\n靶点: ${config.targetProtein}\n靶点序列: ${config.targetSequence}\n最大迭代数: ${config.maxIterations}\n返回候选数: ${config.topCandidates}\n\n设计流程：\n1. 使用 LLM 生成候选序列\n2. 分析序列物理化学性质\n3. 过滤不符合条件的序列\n4. 进行分子对接评估\n5. 返回高亲和力候选`,
    metrics: {
      targetProtein: config.targetProtein,
      targetSequenceLength: config.targetSequence.length,
      maxIterations: config.maxIterations,
      topCandidates: config.topCandidates,
      generationStrategy: config.generationStrategy,
    },
  });

  for (let iter = 0; iter < config.maxIterations; iter++) {
    context.iteration = iter;
    try {
      await executeDesignIteration(context);
    } catch (err) {
      onLog(`迭代 ${iter} 失败，继续下一迭代...`, {
        error: err instanceof Error ? err.message : String(err),
      });
      // Continue to next iteration even if one fails
    }
  }

  // Sort and return top candidates
  const topCandidates = context.candidates
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, config.topCandidates)
    .map((c, idx) => ({ ...c, rank: idx + 1 }));

  onLog(`设计任务完成`, {
    thinking: `多肽设计任务已完成。总共评估了 ${context.candidates.length} 个候选序列，返回综合评分最高的 ${topCandidates.length} 个。`,
    metrics: {
      totalCandidates: context.candidates.length,
      topCandidates: topCandidates.length,
      bestScore: topCandidates[0]?.combinedScore || 0,
      worstScore: topCandidates[topCandidates.length - 1]?.combinedScore || 0,
    },
  });

  return topCandidates;
}
