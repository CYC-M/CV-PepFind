/**
 * Pipeline Engine - Simulates the 5-step peptide screening workflow:
 * Step 0: ESM-2 Scoring
 * Step 1: Sequence Filtering
 * Step 2: ESMFold Structure Prediction
 * Step 3: Structure Output
 * Step 4: Binding Score / Docking
 */

import {
  updateQueryStatus, updatePipelineStep,
  saveEsmScores, saveStructurePrediction, saveDockingResults,
} from "./db";

// ─── Amino acid properties ────────────────────────────────────────────────────
const AA_HYDROPHOBIC = new Set(['A', 'V', 'I', 'L', 'M', 'F', 'W', 'P']);
const AA_POLAR       = new Set(['S', 'T', 'N', 'Q', 'Y', 'C']);
const AA_POSITIVE    = new Set(['K', 'R', 'H']);
const AA_NEGATIVE    = new Set(['D', 'E']);
const VALID_AA       = new Set('ACDEFGHIKLMNPQRSTVWY');

export function validateSequence(seq: string): boolean {
  return seq.length >= 3 && seq.length <= 50 && seq.split('').every(aa => VALID_AA.has(aa));
}

// ─── ESM-2 Scoring simulation ─────────────────────────────────────────────────
function computeEsmScore(sequence: string): { score: number; perplexity: number } {
  const len = sequence.length;
  let score = 0;
  // Simulate position-weight matrix scoring
  for (let i = 0; i < len; i++) {
    const aa = sequence[i];
    if (AA_HYDROPHOBIC.has(aa)) score += 0.08 + Math.random() * 0.04;
    else if (AA_POLAR.has(aa))  score += 0.06 + Math.random() * 0.04;
    else if (AA_POSITIVE.has(aa)) score += 0.07 + Math.random() * 0.03;
    else if (AA_NEGATIVE.has(aa)) score += 0.05 + Math.random() * 0.03;
    else score += 0.04 + Math.random() * 0.02;
  }
  // Normalize to [0.3, 0.95]
  const rawScore = score / len;
  const normalized = 0.30 + (rawScore / 0.12) * 0.65;
  const clamped = Math.min(0.95, Math.max(0.30, normalized));
  const perplexity = 1 / clamped * (0.9 + Math.random() * 0.2);
  return { score: parseFloat(clamped.toFixed(4)), perplexity: parseFloat(perplexity.toFixed(4)) };
}

// ─── PDB structure generation ─────────────────────────────────────────────────
function generatePdbData(sequence: string, plddt: number): string {
  const lines: string[] = [];
  lines.push(`REMARK  AI智能多肽筛选系统 - ESMFold模拟结构`);
  lines.push(`REMARK  序列: ${sequence}`);
  lines.push(`REMARK  pLDDT: ${plddt.toFixed(2)}`);
  lines.push(`REMARK  生成时间: ${new Date().toISOString()}`);

  const AA3: Record<string, string> = {
    A:'ALA',C:'CYS',D:'ASP',E:'GLU',F:'PHE',G:'GLY',H:'HIS',
    I:'ILE',K:'LYS',L:'LEU',M:'MET',N:'ASN',P:'PRO',Q:'GLN',
    R:'ARG',S:'SER',T:'THR',V:'VAL',W:'TRP',Y:'TYR',
  };

  let atomSerial = 1;
  // Generate a helix-like backbone with some variation
  for (let i = 0; i < sequence.length; i++) {
    const aa = sequence[i];
    const resName = AA3[aa] ?? 'ALA';
    const resSeq = i + 1;

    // Alpha-helix parameters with noise
    const phi = -57 + (Math.random() - 0.5) * 20;
    const psi = -47 + (Math.random() - 0.5) * 20;
    const t = (i / sequence.length) * Math.PI * 2;

    // Helix coordinates
    const x = parseFloat((1.5 * Math.cos(t * 1.8) + (Math.random() - 0.5) * 0.3).toFixed(3));
    const y = parseFloat((1.5 * Math.sin(t * 1.8) + (Math.random() - 0.5) * 0.3).toFixed(3));
    const z = parseFloat((1.54 * i + (Math.random() - 0.5) * 0.2).toFixed(3));

    // CA atom
    lines.push(
      `ATOM  ${String(atomSerial).padStart(5)} ` +
      ` CA  ${resName} A${String(resSeq).padStart(4)}    ` +
      `${String(x.toFixed(3)).padStart(8)}${String(y.toFixed(3)).padStart(8)}${String(z.toFixed(3)).padStart(8)}` +
      `  1.00${String(plddt.toFixed(2)).padStart(6)}           C`
    );
    atomSerial++;

    // N atom
    const nx = x + (Math.random() - 0.5) * 0.5;
    const ny = y + (Math.random() - 0.5) * 0.5;
    const nz = z - 0.5 + (Math.random() - 0.5) * 0.2;
    lines.push(
      `ATOM  ${String(atomSerial).padStart(5)} ` +
      `  N  ${resName} A${String(resSeq).padStart(4)}    ` +
      `${String(nx.toFixed(3)).padStart(8)}${String(ny.toFixed(3)).padStart(8)}${String(nz.toFixed(3)).padStart(8)}` +
      `  1.00${String((plddt * 0.95).toFixed(2)).padStart(6)}           N`
    );
    atomSerial++;

    // C atom
    const cx = x + (Math.random() - 0.5) * 0.5;
    const cy = y + (Math.random() - 0.5) * 0.5;
    const cz = z + 0.5 + (Math.random() - 0.5) * 0.2;
    lines.push(
      `ATOM  ${String(atomSerial).padStart(5)} ` +
      `  C  ${resName} A${String(resSeq).padStart(4)}    ` +
      `${String(cx.toFixed(3)).padStart(8)}${String(cy.toFixed(3)).padStart(8)}${String(cz.toFixed(3)).padStart(8)}` +
      `  1.00${String((plddt * 0.92).toFixed(2)).padStart(6)}           C`
    );
    atomSerial++;
  }
  lines.push('END');
  return lines.join('\n');
}

// ─── Docking result generation ────────────────────────────────────────────────
function generateDockingResults(sequences: string[], count: number) {
  const results = sequences.map((seq, idx) => {
    // Binding score in kcal/mol (negative = favorable)
    const baseScore = -(5.0 + Math.random() * 7.0);
    const confidence = 0.55 + Math.random() * 0.40;
    // Pick interaction residues
    const residueCount = 3 + Math.floor(Math.random() * 5);
    const interactionResidues: string[] = [];
    for (let i = 0; i < residueCount; i++) {
      const pos = Math.floor(Math.random() * seq.length);
      interactionResidues.push(`${seq[pos]}${pos + 1}`);
    }
    return {
      sequence: seq,
      bindingScore: parseFloat(baseScore.toFixed(3)),
      confidence: parseFloat(confidence.toFixed(4)),
      interactionResidues,
      _sortKey: baseScore, // more negative = better
    };
  });

  // Sort by binding score (most negative first)
  results.sort((a, b) => a._sortKey - b._sortKey);

  return results.slice(0, count).map((r, i) => ({
    rank: i + 1,
    sequence: r.sequence,
    bindingScore: r.bindingScore,
    confidence: r.confidence,
    interactionResidues: r.interactionResidues,
  }));
}

// ─── Sleep helper ─────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Main Pipeline Runner ─────────────────────────────────────────────────────
export interface PipelineEvent {
  type: 'step_start' | 'step_progress' | 'step_complete' | 'step_failed' | 'pipeline_complete' | 'pipeline_failed';
  stepIndex?: number;
  stepName?: string;
  progress?: number;
  data?: unknown;
  error?: string;
}

export async function runPipeline(
  queryId: number,
  sequences: string[],
  options: {
    esmThreshold: number;
    confidenceThreshold: number;
    enableEsmfold: boolean;
    enableDocking: boolean;
    onEvent: (event: PipelineEvent) => void;
  }
): Promise<void> {
  const { esmThreshold, confidenceThreshold, enableEsmfold, enableDocking, onEvent } = options;

  try {
    await updateQueryStatus(queryId, "running");

    // ── Step 0: ESM-2 Scoring ──────────────────────────────────────────────
    await updatePipelineStep(queryId, 0, { status: "running", progress: 0, startedAt: new Date() });
    onEvent({ type: 'step_start', stepIndex: 0, stepName: 'ESM-2 打分' });

    const esmResults: Array<{ sequence: string; score: number; perplexity: number; passed: boolean }> = [];
    for (let i = 0; i < sequences.length; i++) {
      await sleep(300 + Math.random() * 200);
      const { score, perplexity } = computeEsmScore(sequences[i]);
      const passed = score >= esmThreshold;
      esmResults.push({ sequence: sequences[i], score, perplexity, passed });
      const progress = Math.round(((i + 1) / sequences.length) * 100);
      await updatePipelineStep(queryId, 0, { progress });
      onEvent({ type: 'step_progress', stepIndex: 0, progress, data: { sequence: sequences[i], score, perplexity, passed } });
    }
    await saveEsmScores(queryId, esmResults);
    await updatePipelineStep(queryId, 0, { status: "completed", progress: 100, completedAt: new Date(), resultData: esmResults });
    onEvent({ type: 'step_complete', stepIndex: 0, data: esmResults });
    await sleep(400);

    // ── Step 1: Sequence Filtering ─────────────────────────────────────────
    await updatePipelineStep(queryId, 1, { status: "running", progress: 0, startedAt: new Date() });
    onEvent({ type: 'step_start', stepIndex: 1, stepName: '序列过滤' });

    await sleep(600);
    const passedSequences = esmResults.filter(r => r.passed).map(r => r.sequence);
    const filteredCount = sequences.length - passedSequences.length;
    await updatePipelineStep(queryId, 1, {
      status: "completed", progress: 100, completedAt: new Date(),
      resultData: { total: sequences.length, passed: passedSequences.length, filtered: filteredCount }
    });
    onEvent({ type: 'step_complete', stepIndex: 1, data: { passedSequences, filteredCount } });
    await sleep(400);

    if (passedSequences.length === 0) {
      await updatePipelineStep(queryId, 2, { status: "failed", errorMessage: "所有序列均未通过ESM-2阈值过滤" });
      await updatePipelineStep(queryId, 3, { status: "failed" });
      await updatePipelineStep(queryId, 4, { status: "failed" });
      onEvent({ type: 'pipeline_failed', error: '所有序列均未通过过滤阈值，请调低ESM-2阈值后重试' });
      await updateQueryStatus(queryId, "failed");
      return;
    }

    // ── Step 2: ESMFold Structure Prediction ───────────────────────────────
    let structureData: Array<{ sequence: string; pdbData: string; plddt: number; ptm: number }> = [];
    if (enableEsmfold) {
      await updatePipelineStep(queryId, 2, { status: "running", progress: 0, startedAt: new Date() });
      onEvent({ type: 'step_start', stepIndex: 2, stepName: 'ESMFold 结构预测' });

      for (let i = 0; i < passedSequences.length; i++) {
        await sleep(500 + Math.random() * 500);
        const plddt = parseFloat((confidenceThreshold * 100 + Math.random() * 15).toFixed(2));
        const ptm = parseFloat((0.70 + Math.random() * 0.25).toFixed(4));
        const pdbData = generatePdbData(passedSequences[i], plddt);
        structureData.push({ sequence: passedSequences[i], pdbData, plddt, ptm });
        await saveStructurePrediction({ queryId, sequence: passedSequences[i], pdbData, plddt, ptm });
        const progress = Math.round(((i + 1) / passedSequences.length) * 100);
        await updatePipelineStep(queryId, 2, { progress });
        onEvent({ type: 'step_progress', stepIndex: 2, progress, data: { sequence: passedSequences[i], plddt, ptm } });
      }
      await updatePipelineStep(queryId, 2, { status: "completed", progress: 100, completedAt: new Date(), resultData: { count: structureData.length } });
      onEvent({ type: 'step_complete', stepIndex: 2, data: structureData });
      await sleep(400);
    } else {
      await updatePipelineStep(queryId, 2, { status: "completed", progress: 100, resultData: { skipped: true } });
      onEvent({ type: 'step_complete', stepIndex: 2, data: { skipped: true } });
    }

    // ── Step 3: Structure Output ───────────────────────────────────────────
    await updatePipelineStep(queryId, 3, { status: "running", progress: 0, startedAt: new Date() });
    onEvent({ type: 'step_start', stepIndex: 3, stepName: '结构输出' });
    await sleep(800);
    await updatePipelineStep(queryId, 3, {
      status: "completed", progress: 100, completedAt: new Date(),
      resultData: { structures: structureData.length, format: "PDB" }
    });
    onEvent({ type: 'step_complete', stepIndex: 3, data: { structures: structureData, format: "PDB" } });
    await sleep(400);

    // ── Step 4: Binding Score / Docking ───────────────────────────────────
    if (enableDocking) {
      await updatePipelineStep(queryId, 4, { status: "running", progress: 0, startedAt: new Date() });
      onEvent({ type: 'step_start', stepIndex: 4, stepName: 'Binding 评分 / Docking 对接' });

      // Simulate docking progress
      for (let p = 10; p <= 80; p += 10) {
        await sleep(300 + Math.random() * 200);
        await updatePipelineStep(queryId, 4, { progress: p });
        onEvent({ type: 'step_progress', stepIndex: 4, progress: p });
      }

      const allDocking = generateDockingResults(passedSequences, passedSequences.length);
      await saveDockingResults(queryId, allDocking);
      await updatePipelineStep(queryId, 4, {
        status: "completed", progress: 100, completedAt: new Date(),
        resultData: { total: allDocking.length, top5: allDocking.slice(0, 5) }
      });
      onEvent({ type: 'step_complete', stepIndex: 4, data: { dockingResults: allDocking } });
    } else {
      await updatePipelineStep(queryId, 4, { status: "completed", progress: 100, resultData: { skipped: true } });
      onEvent({ type: 'step_complete', stepIndex: 4, data: { skipped: true } });
    }

    await updateQueryStatus(queryId, "completed");
    onEvent({ type: 'pipeline_complete' });

  } catch (err) {
    console.error("[Pipeline] Error:", err);
    await updateQueryStatus(queryId, "failed");
    onEvent({ type: 'pipeline_failed', error: String(err) });
  }
}
