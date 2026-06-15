import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dna, History, Settings, ChevronRight, X, Clock,
  FlaskConical, Sparkles, Activity, Database,
} from "lucide-react";
import PeptideQueryPanel, { QueryOptions } from "@/components/PeptideQueryPanel";
import VisualizationPanel from "@/components/VisualizationPanel";
import CVPepFindPanel from "@/components/CVPepFindPanel";
import { trpc } from "@/lib/trpc";

interface QuerySession {
  queryId: number;
  sequences: string[];
  options: QueryOptions;
  timestamp: Date;
}

export default function Home() {
  const [currentSession, setCurrentSession] = useState<QuerySession | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const { data: history } = trpc.peptide.history.useQuery({ limit: 20 });

  const handleQuerySubmitted = (queryId: number, sequences: string[], options: QueryOptions) => {
    setCurrentSession({ queryId, sequences, options, timestamp: new Date() });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <header className="flex-shrink-0 h-12 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 gap-3 z-20">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/40 to-accent/30 flex items-center justify-center border border-primary/30">
            <Dna className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-none">AI智能多肽筛选系统</h1>
            <p className="text-[9px] text-muted-foreground leading-none mt-0.5">Peptide Screening Platform</p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 ml-4">
          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <span className="text-[10px] text-primary font-medium">ESM-2 就绪</span>
          </div>
          <div className="flex items-center gap-1.5 bg-accent/10 border border-accent/20 rounded-full px-2.5 py-1">
            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            <span className="text-[10px] text-accent font-medium">ESMFold 就绪</span>
          </div>
          {currentSession && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 bg-muted border border-border rounded-full px-2.5 py-1"
            >
              <Activity className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Query #{currentSession.queryId}</span>
            </motion.div>
          )}
        </div>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
              showHistory ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            历史记录
          </button>
          <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* History Sidebar Overlay */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-background/60 backdrop-blur-sm"
              onClick={() => setShowHistory(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute left-0 top-0 bottom-0 w-80 z-40 bg-card border-r border-border shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">历史查询记录</h3>
                </div>
                <button onClick={() => setShowHistory(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {!history || history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Clock className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">暂无历史记录</p>
                  </div>
                ) : (
                  history.map((item: {
                    id: number;
                    sequences: unknown;
                    targetProtein: string | null;
                    status: string;
                    createdAt: Date;
                  }) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        const seqs = Array.isArray(item.sequences) ? item.sequences as string[] : [];
                        setCurrentSession({
                          queryId: item.id,
                          sequences: seqs,
                          options: {
                            esmThreshold: 0.5,
                            confidenceThreshold: 0.7,
                            enableEsmfold: true,
                            enableDocking: true,
                            targetProtein: item.targetProtein ?? '',
                          },
                          timestamp: new Date(item.createdAt),
                        });
                        setShowHistory(false);
                      }}
                      className="w-full text-left p-3 rounded-xl border border-border bg-background/50 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-foreground">Query #{item.id}</span>
                        <div className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                          item.status === 'completed' ? 'bg-primary/15 text-primary' :
                          item.status === 'running' ? 'bg-accent/15 text-accent' :
                          item.status === 'failed' ? 'bg-destructive/15 text-destructive' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {item.status === 'completed' ? '已完成' :
                           item.status === 'running' ? '运行中' :
                           item.status === 'failed' ? '失败' : '等待中'}
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {Array.isArray(item.sequences) ? (item.sequences as string[]).length : 0} 条序列
                        {item.targetProtein && ` · 靶点: ${item.targetProtein}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </p>
                      <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors mt-1" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Left Panel: Peptide Query ────────────────────────────────────── */}
        <motion.div
          animate={{ width: leftCollapsed ? 40 : 280 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex-shrink-0 border-r border-border bg-card/30 relative overflow-hidden"
        >
          {!leftCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full"
            >
              <PeptideQueryPanel onQuerySubmitted={handleQuerySubmitted} />
            </motion.div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-12 bg-card border border-border rounded-r-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-all z-10 shadow-md"
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${leftCollapsed ? '' : 'rotate-180'}`} />
          </button>

          {/* Collapsed state */}
          {leftCollapsed && (
            <div className="flex flex-col items-center pt-4 gap-3">
              <FlaskConical className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </motion.div>

        {/* ── Center Panel: Visualization ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 bg-background overflow-hidden">
          {currentSession ? (
            <VisualizationPanel
              queryId={currentSession.queryId}
              sequences={currentSession.sequences}
              pipelineOptions={currentSession.options}
            />
          ) : (
            <WelcomeScreen />
          )}
        </div>

        {/* ── Right Panel: CV-PepFind Agent ────────────────────────────────── */}
        <motion.div
          animate={{ width: rightCollapsed ? 40 : 320 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex-shrink-0 border-l border-border bg-card/30 relative overflow-hidden"
        >
          {!rightCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full"
            >
              <CVPepFindPanel />
            </motion.div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setRightCollapsed(!rightCollapsed)}
            className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-12 bg-card border border-border rounded-l-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-all z-10 shadow-md"
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${rightCollapsed ? 'rotate-180' : ''}`} />
          </button>

          {/* Collapsed state */}
          {rightCollapsed && (
            <div className="flex flex-col items-center pt-4 gap-3">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ─── Welcome Screen ───────────────────────────────────────────────────────────
function WelcomeScreen() {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 text-center">
      {/* Animated logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="relative mb-8"
      >
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center glow-primary">
          <Dna className="w-12 h-12 text-primary" />
        </div>
        {/* Orbit rings */}
        <div className="absolute inset-0 rounded-3xl border border-primary/10 animate-spin-slow" style={{ transform: 'scale(1.3)' }} />
        <div className="absolute inset-0 rounded-3xl border border-accent/10 animate-spin-slow" style={{ transform: 'scale(1.6)', animationDirection: 'reverse', animationDuration: '5s' }} />
      </motion.div>

      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-gradient-primary mb-2">AI 智能多肽筛选系统</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-md">
          在虚拟环境中模拟多肽与靶点的亲和力，通过ESM-2打分、ESMFold结构预测和分子对接，
          高效筛选具有高亲和力的候选多肽。
        </p>
      </motion.div>

      {/* Feature cards */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="grid grid-cols-2 gap-3 max-w-lg w-full"
      >
        {[
          { icon: '⚡', title: 'ESM-2 打分', desc: '蛋白语言模型序列评估' },
          { icon: '🧬', title: 'ESMFold 预测', desc: '高精度3D结构预测' },
          { icon: '🎯', title: '分子对接', desc: 'Top 5 亲和力结果' },
          { icon: '🤖', title: 'CV-PepFind', desc: 'AI智能体多肽召回' },
        ].map((feat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.08 }}
            className="glass rounded-xl p-3 text-left border border-border/50 hover:border-primary/30 transition-all"
          >
            <div className="text-xl mb-1.5">{feat.icon}</div>
            <p className="text-xs font-semibold text-foreground">{feat.title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{feat.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-xs text-muted-foreground/50 mt-8"
      >
        在左侧输入多肽序列并点击「启动 Pipeline」开始筛选
      </motion.p>
    </div>
  );
}
