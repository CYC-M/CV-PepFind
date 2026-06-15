import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ChevronDown, ChevronUp, Zap, Target, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface DockingResult {
  id: number;
  rank: number;
  sequence: string;
  bindingScore: number;
  confidence: number;
  interactionResidues: unknown;
}

interface DockingResultsProps {
  queryId: number | null;
  onSelectStructure?: (sequence: string) => void;
}

type DisplayMode = 5 | 10 | 'all';

const RANK_COLORS = [
  'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
  'from-slate-400/20 to-slate-500/10 border-slate-400/30',
  'from-amber-600/20 to-amber-700/10 border-amber-600/30',
  'from-primary/10 to-primary/5 border-primary/20',
  'from-primary/10 to-primary/5 border-primary/20',
];

const RANK_MEDALS = ['🥇', '🥈', '🥉', '4', '5', '6', '7', '8', '9', '10'];

function ScoreBar({ score }: { score: number }) {
  // Score range: -12 to -5 kcal/mol, more negative = better
  const normalized = Math.max(0, Math.min(100, (Math.abs(score) - 4) / 8 * 100));
  const color = normalized > 70 ? 'bg-primary' : normalized > 40 ? 'bg-accent' : 'bg-muted-foreground';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${normalized}%` }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        />
      </div>
      <span className="text-[10px] font-mono text-foreground w-16 text-right">
        {score.toFixed(3)} kcal/mol
      </span>
    </div>
  );
}

function ConfidenceDots({ confidence }: { confidence: number }) {
  const filled = Math.round(confidence * 5);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < filled ? 'bg-primary' : 'bg-muted'}`} />
      ))}
    </div>
  );
}

function SequenceDisplay({ seq }: { seq: string }) {
  const AA_COLORS: Record<string, string> = {
    A: '#f59e0b', V: '#f59e0b', I: '#f59e0b', L: '#f59e0b', M: '#f59e0b',
    F: '#f59e0b', W: '#f59e0b', P: '#f59e0b',
    S: '#10b981', T: '#10b981', N: '#10b981', Q: '#10b981', Y: '#10b981', C: '#10b981',
    K: '#6366f1', R: '#6366f1', H: '#6366f1',
    D: '#ef4444', E: '#ef4444',
    G: '#94a3b8',
  };
  return (
    <span className="font-mono text-[10px] tracking-wider">
      {seq.split('').map((aa, i) => (
        <span key={i} style={{ color: AA_COLORS[aa] ?? '#94a3b8' }}>{aa}</span>
      ))}
    </span>
  );
}

export default function DockingResults({ queryId, onSelectStructure }: DockingResultsProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(5);
  const [expandedRank, setExpandedRank] = useState<number | null>(1);

  const limit = displayMode === 'all' ? undefined : displayMode;
  const { data: results, isLoading } = trpc.peptide.dockingResults.useQuery(
    { queryId: queryId!, limit },
    { enabled: !!queryId, refetchInterval: 3000 }
  );

  if (!queryId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
          <Target className="w-6 h-6 text-muted-foreground/40" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">暂无对接结果</p>
        <p className="text-xs text-muted-foreground/60 mt-1">启动Pipeline后将在此展示Docking结果</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center mb-2">
          <Zap className="w-5 h-5 text-muted-foreground/40" />
        </div>
        <p className="text-sm text-muted-foreground">Docking 计算中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium text-foreground">Docking 结果</span>
          <span className="text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
            {results.length} 条
          </span>
        </div>
        {/* Display mode toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {([5, 10, 'all'] as DisplayMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setDisplayMode(mode)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                displayMode === mode
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode === 'all' ? '全部' : `Top ${mode}`}
            </button>
          ))}
        </div>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {results.map((result: DockingResult, i: number) => (
            <motion.div
              key={result.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.04, duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className={`rounded-xl border bg-gradient-to-r cursor-pointer transition-all hover:shadow-md ${
                RANK_COLORS[Math.min(i, RANK_COLORS.length - 1)]
              }`}
              onClick={() => setExpandedRank(expandedRank === result.rank ? null : result.rank)}
            >
              {/* Main row */}
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <div className="w-7 h-7 rounded-lg bg-background/50 flex items-center justify-center text-sm flex-shrink-0">
                  {RANK_MEDALS[Math.min(i, RANK_MEDALS.length - 1)]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-foreground">Rank #{result.rank}</span>
                    <ConfidenceDots confidence={result.confidence} />
                    <span className="text-[10px] text-muted-foreground">{(result.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <ScoreBar score={result.bindingScore} />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={e => { e.stopPropagation(); onSelectStructure?.(result.sequence); }}
                    className="p-1.5 rounded-lg bg-background/50 text-muted-foreground hover:text-primary transition-colors"
                    title="在3D视图中查看"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  {expandedRank === result.rank
                    ? <ChevronUp className="w-3 h-3 text-muted-foreground" />
                    : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                </div>
              </div>

              {/* Expanded detail */}
              <AnimatePresence>
                {expandedRank === result.rank && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 border-t border-border/30 pt-2 space-y-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">序列</p>
                        <div className="bg-background/50 rounded-lg px-2 py-1.5">
                          <SequenceDisplay seq={result.sequence} />
                        </div>
                      </div>
                      {Array.isArray(result.interactionResidues) && (result.interactionResidues as unknown[]).length > 0 && (
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1">关键相互作用残基</p>
                          <div className="flex flex-wrap gap-1">
                            {(result.interactionResidues as string[]).map((res: string, j: number) => (
                              <span key={j} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                                {String(res)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="bg-background/50 rounded-lg p-2">
                          <p className="text-muted-foreground">结合能</p>
                          <p className="font-mono text-foreground font-medium">{result.bindingScore.toFixed(3)} kcal/mol</p>
                        </div>
                        <div className="bg-background/50 rounded-lg p-2">
                          <p className="text-muted-foreground">置信度</p>
                          <p className="font-mono text-foreground font-medium">{(result.confidence * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
