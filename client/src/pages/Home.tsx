import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dna, History, Settings, ChevronRight, X, Clock,
  FlaskConical, Sparkles, Activity, Database, MessageSquare, Eye,
} from "lucide-react";
import PeptideQueryPanel, { QueryOptions } from "@/components/PeptideQueryPanel";
import VisualizationPanel from "@/components/VisualizationPanel";
import CVPepFindPanel from "@/components/CVPepFindPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { trpc } from "@/lib/trpc";
import { useIsMobile } from "@/hooks/useMobile";

interface QuerySession {
  queryId: number;
  sequences: string[];
  options: QueryOptions;
  timestamp: Date;
}

export default function Home() {
  const [currentSession, setCurrentSession] = useState<QuerySession | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<'query' | 'viz' | 'agent'>('viz');
  
  const isMobile = useIsMobile();
  const { data: history } = trpc.peptide.history.useQuery({ limit: 20 });

  const handleQuerySubmitted = (queryId: number, sequences: string[], options: QueryOptions) => {
    setCurrentSession({ queryId, sequences, options, timestamp: new Date() });
    // 手机端自动切换到可视化标签
    if (isMobile) {
      setMobileTab('viz');
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 欢迎屏幕
  // ════════════════════════════════════════════════════════════════════════════
  const WelcomeScreen = () => (
    <div className="h-full flex flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center border border-primary/30 mx-auto">
          <Dna className="w-10 h-10 text-primary" />
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold text-foreground mb-2">AI智能多肽筛选系统</h2>
        <p className="text-sm text-muted-foreground mb-8">在虚拟环境中模拟多肽与靶点的亲和力</p>
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-3 w-full max-w-xs"
      >
        <div className="p-4 rounded-xl border border-border bg-card/50">
          <div className="flex items-center gap-3 mb-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            <span className="font-medium text-sm">ESM-2 打分</span>
          </div>
          <p className="text-xs text-muted-foreground">序列表征与初步评估</p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card/50">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <span className="font-medium text-sm">ESMFold 预测</span>
          </div>
          <p className="text-xs text-muted-foreground">3D 结构预测与可视化</p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card/50">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-medium text-sm">Docking 对接</span>
          </div>
          <p className="text-xs text-muted-foreground">亲和力评分与优化建议</p>
        </div>
      </motion.div>

      <p className="text-xs text-muted-foreground/60 mt-8">
        {isMobile ? '在左侧输入多肽序列开始' : '在左侧输入多肽序列开始'}
      </p>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 桌面版布局（三栏）
  // ════════════════════════════════════════════════════════════════════════════
  if (!isMobile) {
    return (
      <>
        <SettingsPanel open={showSettings} onOpenChange={setShowSettings} />
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-background fixed inset-0">
        {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
        <header className="flex-shrink-0 h-12 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 gap-3 z-50">
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
        <div className="flex-1 flex overflow-hidden relative min-h-0">

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
                <Sparkles className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </motion.div>
        </div>
      </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 手机版布局（选项卡）
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* ── Top Navigation Bar ─────────────────────────────────────────────── */}
      <header className="flex-shrink-0 h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-3 gap-2 z-20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary/40 to-accent/30 flex items-center justify-center border border-primary/30">
            <Dna className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-foreground leading-none">多肽筛选</h1>
            <p className="text-[8px] text-muted-foreground leading-none mt-0.5">Peptide Screening</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all ${
              showHistory ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <History className="w-3.5 h-3.5" />
          </button>
          {/* 设置按钮：打开设置面板，包含个人信息、切换语言（支持8大语言）、退出登录等常见设置 */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            title="Settings: Language, Theme, Account"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── History Modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-background/60 backdrop-blur-sm"
              onClick={() => setShowHistory(false)}
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute bottom-0 left-0 right-0 z-40 bg-card border-t border-border rounded-t-2xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">历史查询</h3>
                </div>
                <button onClick={() => setShowHistory(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {!history || history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
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
                      className="w-full text-left p-3 rounded-xl border border-border bg-background/50 hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-95"
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
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {mobileTab === 'query' && (
              <motion.div
                key="query"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-y-auto"
              >
                <PeptideQueryPanel onQuerySubmitted={handleQuerySubmitted} />
              </motion.div>
            )}

            {mobileTab === 'viz' && (
              <motion.div
                key="viz"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-hidden"
              >
                {currentSession ? (
                  <VisualizationPanel
                    queryId={currentSession.queryId}
                    sequences={currentSession.sequences}
                    pipelineOptions={currentSession.options}
                  />
                ) : (
                  <div className="h-full overflow-y-auto">
                    <WelcomeScreen />
                  </div>
                )}
              </motion.div>
            )}

            {mobileTab === 'agent' && (
              <motion.div
                key="agent"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-hidden"
              >
                <CVPepFindPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Tab Navigation ────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-t border-border bg-card/50 backdrop-blur-sm flex items-center justify-around h-14 px-2 gap-1">
          <button
            onClick={() => setMobileTab('query')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all ${
              mobileTab === 'query'
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FlaskConical className="w-5 h-5" />
            <span className="text-[10px] font-medium">查询</span>
          </button>

          <button
            onClick={() => setMobileTab('viz')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all ${
              mobileTab === 'viz'
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="w-5 h-5" />
            <span className="text-[10px] font-medium">可视化</span>
          </button>

          <button
            onClick={() => setMobileTab('agent')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all ${
              mobileTab === 'agent'
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-medium">助手</span>
          </button>
        </div>
      </div>
    </div>
  );
}
