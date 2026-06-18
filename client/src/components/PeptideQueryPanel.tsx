import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, ChevronDown, ChevronUp, Play, Plus, Trash2,
  Settings2, ToggleLeft, ToggleRight, Clock, Dna, Target,
  AlertCircle, CheckCircle2, Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/useMobile";

interface QueryPanelProps {
  onQuerySubmitted: (queryId: number, sequences: string[], options: QueryOptions) => void;
}

export interface QueryOptions {
  esmThreshold: number;
  confidenceThreshold: number;
  enableEsmfold: boolean;
  enableDocking: boolean;
  targetProtein: string;
}

// Amino acid color coding
const AA_COLORS: Record<string, string> = {
  A: '#f59e0b', V: '#f59e0b', I: '#f59e0b', L: '#f59e0b', M: '#f59e0b',
  F: '#f59e0b', W: '#f59e0b', P: '#f59e0b', // hydrophobic - amber
  S: '#10b981', T: '#10b981', N: '#10b981', Q: '#10b981', Y: '#10b981', C: '#10b981', // polar - green
  K: '#6366f1', R: '#6366f1', H: '#6366f1', // positive - indigo
  D: '#ef4444', E: '#ef4444', // negative - red
  G: '#94a3b8', // special - gray
};

function ColoredSequence({ seq }: { seq: string }) {
  return (
    <span className="font-mono text-xs tracking-wider">
      {seq.split('').map((aa, i) => (
        <span key={i} style={{ color: AA_COLORS[aa] ?? '#94a3b8' }}>{aa}</span>
      ))}
    </span>
  );
}

function validateAA(seq: string): boolean {
  return /^[ACDEFGHIKLMNPQRSTVWY]+$/.test(seq) && seq.length >= 3 && seq.length <= 50;
}

const EXAMPLE_SEQUENCES = [
  "ACDEFGHIKLMNPQRSTVWY",
  "LLGDFFRKSKEKIGKEFKRI",
  "YGRKKRRQRRR",
  "KWKLFKKIEK",
  "RRGWALRLVLAY",
];

export default function PeptideQueryPanel({ onQuerySubmitted }: QueryPanelProps) {
  const isMobile = useIsMobile();
  const [sequences, setSequences] = useState<string[]>(['']);
  const [batchMode, setBatchMode] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [targetProtein, setTargetProtein] = useState('');
  const [esmThreshold, setEsmThreshold] = useState(0.5);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const [enableEsmfold, setEnableEsmfold] = useState(true);
  const [enableDocking, setEnableDocking] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitMutation = trpc.peptide.submit.useMutation();

  const addSequence = () => {
    if (sequences.length < 20) setSequences(prev => [...prev, '']);
  };

  const removeSequence = (idx: number) => {
    setSequences(prev => prev.filter((_, i) => i !== idx));
  };

  const updateSequence = (idx: number, val: string) => {
    setSequences(prev => prev.map((s, i) => i === idx ? val.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '') : s));
  };

  const parseBatchSequences = (text: string): string[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const seqs: string[] = [];
    for (const line of lines) {
      if (line.startsWith('>')) continue; // FASTA header
      const seq = line.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
      if (seq.length >= 3) seqs.push(seq);
    }
    return seqs.slice(0, 20);
  };

  const handleSubmit = useCallback(async () => {
    const finalSeqs = batchMode ? parseBatchSequences(batchText) : sequences.filter(s => s.length >= 3);
    if (finalSeqs.length === 0) {
      toast.error('请至少输入一条有效序列（长度≥3）');
      return;
    }
    const invalid = finalSeqs.filter(s => !validateAA(s));
    if (invalid.length > 0) {
      toast.error(`序列含无效字符: ${invalid[0]}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitMutation.mutateAsync({
        sequences: finalSeqs,
        targetProtein: targetProtein || undefined,
        esmThreshold,
        confidenceThreshold,
        enableEsmfold,
        enableDocking,
      });
      toast.success(`任务已提交，Query ID: ${result.queryId}`);
      onQuerySubmitted(result.queryId, finalSeqs, {
        esmThreshold, confidenceThreshold, enableEsmfold, enableDocking, targetProtein,
      });
    } catch (err) {
      toast.error(`提交失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [batchMode, batchText, sequences, targetProtein, esmThreshold, confidenceThreshold, enableEsmfold, enableDocking]);

  const loadExample = () => {
    const examples = EXAMPLE_SEQUENCES.slice(0, 3);
    setSequences(examples);
    setBatchMode(false);
    toast.success('已加载示例序列');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className={`${isMobile ? 'px-3 py-2' : 'px-4 py-3'} border-b border-border flex items-center gap-2.5`}>
        <div className={`${isMobile ? 'w-6 h-6' : 'w-7 h-7'} rounded-lg bg-primary/15 flex items-center justify-center`}>
          <Dna className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-primary`} />
        </div>
        <div className="min-w-0">
          <h2 className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold text-foreground truncate`}>多肽查询</h2>
          <p className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-muted-foreground truncate`}>Peptide Query Panel</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setBatchMode(!batchMode)}
            className={`${isMobile ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1'} rounded-md transition-all ${batchMode ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            {batchMode ? '批量' : '单条'}
          </button>
          <button
            onClick={loadExample}
            className={`${isMobile ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1'} rounded-md bg-muted text-muted-foreground hover:text-foreground transition-all`}
          >
            示例
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-3 py-2 space-y-3' : 'px-4 py-3 space-y-4'}`}>

        {/* Target Protein */}
        <div>
          <label className={`${isMobile ? 'text-[11px]' : 'text-xs'} font-medium text-muted-foreground flex items-center gap-1.5 mb-1`}>
            <Target className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} /> 靶点蛋白
          </label>
          <input
            type="text"
            value={targetProtein}
            onChange={e => setTargetProtein(e.target.value)}
            placeholder="如: ACE2, EGFR, PD-1..."
            className={`w-full bg-input border border-border rounded-lg ${isMobile ? 'px-2 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'} text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all`}
          />
        </div>

        {/* Sequence Input */}
        <div>
          <label className={`${isMobile ? 'text-[11px]' : 'text-xs'} font-medium text-muted-foreground flex items-center gap-1.5 mb-1`}>
            <FlaskConical className={`${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
            <span className="truncate">{batchMode ? 'FASTA / 批量序列' : `序列输入 (${sequences.filter(s=>s.length>=3).length}/20)`}</span>
          </label>

          <AnimatePresence mode="wait">
            {batchMode ? (
              <motion.div key="batch" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                <textarea
                  value={batchText}
                  onChange={e => setBatchText(e.target.value)}
                  placeholder={`>seq1\nACDEFGHIKLMNPQRSTVWY\n>seq2\nLLGDFFRKSKEKIGKEFKRI\n\n或直接每行一条序列`}
                  rows={isMobile ? 5 : 8}
                  className={`w-full bg-input border border-border rounded-lg ${isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-3 py-2 text-xs'} font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all resize-none`}
                />
                <p className={`${isMobile ? 'text-[9px]' : 'text-[10px]'} text-muted-foreground mt-1`}>
                  支持FASTA格式，最多20条，长度3-50
                </p>
              </motion.div>
            ) : (
              <motion.div key="single" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
                {sequences.map((seq, idx) => {
                  const isValid = seq.length === 0 || validateAA(seq);
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className="flex items-center gap-2"
                    >
                      <div className={`flex-1 relative rounded-lg border transition-all ${
                        seq.length > 0 && !isValid
                          ? 'border-destructive/60 bg-destructive/5'
                          : seq.length >= 3 && isValid
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border bg-input'
                      }`}>
                        <input
                          type="text"
                          value={seq}
                          onChange={e => updateSequence(idx, e.target.value)}
                          placeholder={`序列 ${idx + 1}（如 ACDEFGHIK...）`}
                          className="w-full bg-transparent px-3 py-2 text-xs font-mono focus:outline-none"
                          style={{ color: seq.length >= 3 && isValid ? 'inherit' : undefined }}
                        />
                        {seq.length >= 3 && isValid && (
                          <div className="px-3 pb-1.5">
                            <ColoredSequence seq={seq} />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {seq.length > 0 && (
                          isValid
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            : <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                        )}
                        {sequences.length > 1 && (
                          <button onClick={() => removeSequence(idx)} className="p-1 hover:text-destructive transition-colors text-muted-foreground">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {sequences.length < 20 && (
                  <button
                    onClick={addSequence}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-all text-xs"
                  >
                    <Plus className="w-3 h-3" /> 添加序列
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Advanced Settings */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <Settings2 className="w-3 h-3" />
            <span>高级筛选配置</span>
            <span className="ml-auto">{showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</span>
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-3 space-y-4">
                  {/* ESM-2 Threshold */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-muted-foreground">ESM-2 评分阈值</label>
                      <span className="text-xs font-mono text-primary">{esmThreshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range" min="0.1" max="0.9" step="0.05"
                      value={esmThreshold}
                      onChange={e => setEsmThreshold(parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{ background: `linear-gradient(to right, oklch(0.72 0.18 162) ${esmThreshold * 100 / 0.9}%, oklch(0.22 0.025 255) ${esmThreshold * 100 / 0.9}%)` }}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-0.5">
                      <span>宽松 0.1</span><span>严格 0.9</span>
                    </div>
                  </div>

                  {/* Confidence Threshold */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-muted-foreground">结构置信度阈值</label>
                      <span className="text-xs font-mono text-primary">{confidenceThreshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range" min="0.3" max="0.95" step="0.05"
                      value={confidenceThreshold}
                      onChange={e => setConfidenceThreshold(parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{ background: `linear-gradient(to right, oklch(0.68 0.15 200) ${(confidenceThreshold - 0.3) / 0.65 * 100}%, oklch(0.22 0.025 255) ${(confidenceThreshold - 0.3) / 0.65 * 100}%)` }}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-0.5">
                      <span>0.30</span><span>0.95</span>
                    </div>
                  </div>

                  {/* Step toggles */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-foreground">ESMFold 结构预测</p>
                        <p className="text-[10px] text-muted-foreground">预测3D空间结构</p>
                      </div>
                      <button onClick={() => setEnableEsmfold(!enableEsmfold)} className="transition-colors">
                        {enableEsmfold
                          ? <ToggleRight className="w-8 h-8 text-primary" />
                          : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-foreground">Docking 分子对接</p>
                        <p className="text-[10px] text-muted-foreground">计算结合亲和力</p>
                      </div>
                      <button onClick={() => setEnableDocking(!enableDocking)} className="transition-colors">
                        {enableDocking
                          ? <ToggleRight className="w-8 h-8 text-primary" />
                          : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pipeline Preview */}
        <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
          <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">Pipeline 预览</p>
          <div className="flex items-center gap-1">
            {[
              { label: 'ESM-2', active: true },
              { label: '过滤', active: true },
              { label: 'ESMFold', active: enableEsmfold },
              { label: '输出', active: true },
              { label: 'Docking', active: enableDocking },
            ].map((step, i, arr) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div className={`flex-1 text-center py-1 rounded text-[9px] font-medium transition-all ${
                  step.active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground/40 line-through'
                }`}>
                  {step.label}
                </div>
                {i < arr.length - 1 && (
                  <div className={`text-[10px] ${step.active ? 'text-primary/60' : 'text-muted-foreground/30'}`}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="px-4 py-3 border-t border-border">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed glow-primary"
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> 提交中...</>
          ) : (
            <><Play className="w-4 h-4" /> 启动 Pipeline</>
          )}
        </button>
      </div>

      {/* History hint */}
      <div className="px-4 pb-3">
        <button className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground text-xs transition-colors">
          <Clock className="w-3 h-3" /> 查看历史记录
        </button>
      </div>
    </div>
  );
}
