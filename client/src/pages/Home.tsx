import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dna, History, Settings, ChevronRight, X, Clock,
  Sparkles, Database, MessageSquare, Eye,
} from "lucide-react";
import CVPepFindPanel from "@/components/CVPepFindPanel";
import AIVisualizationPanel from "@/components/AIVisualizationPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { AutonomousDesignPanel } from "@/components/AutonomousDesignPanel";
import { AgentProvider } from "@/contexts/AgentContext";
import { trpc } from "@/lib/trpc";
import { useIsMobile } from "@/hooks/useMobile";
import { useResizablePanel } from "@/hooks/useResizablePanel";

// Resizable Sidebar Component
function ResizableSidebar({ children }: { children: React.ReactNode }) {
  const { widthPercent, isResizing, startResize } = useResizablePanel({
    minPercent: 30,
    maxPercent: 50,
    defaultPercent: 40,
    storageKey: 'cv-pepfind-sidebar-width',
  });

  return (
    <div className="flex relative flex-shrink-0">
      {/* Drag Handle */}
      <div
        onMouseDown={startResize}
        className={`w-1 flex-shrink-0 bg-border hover:bg-primary/40 transition-colors cursor-col-resize ${
          isResizing ? 'bg-primary/60' : ''
        }`}
        title="Drag to resize sidebar"
      />
      {/* Sidebar Content */}
      <div
        style={{ width: `${widthPercent}vw` }}
        className="flex-shrink-0 border-l border-border bg-card/30 overflow-hidden flex flex-col"
      >
        {children}
      </div>
    </div>
  );
}

export default function Home() {
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [vizCollapsed, setVizCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<'viz' | 'agent' | 'design'>('agent');

  const isMobile = useIsMobile();
  const { data: history } = trpc.peptide.history.useQuery({ limit: 20 });

  // ════════════════════════════════════════════════════════════════════════════
  // 历史记录侧边栏（桌面）/ 底部弹出（手机）
  // ════════════════════════════════════════════════════════════════════════════
  const HistoryList = () => (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
      {!history || history.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-8">
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
          <div
            key={item.id}
            className="w-full text-left p-3 rounded-xl border border-border bg-background/50 hover:border-primary/40 hover:bg-primary/5 transition-all"
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
          </div>
        ))
      )}
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // 桌面版布局（双栏：左可视化 + 右 AI 对话）
  // ════════════════════════════════════════════════════════════════════════════
  if (!isMobile) {
    return (
      <AgentProvider>
        <SettingsPanel open={showSettings} onOpenChange={setShowSettings} />
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-background fixed inset-0">

          {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
          <header className="flex-shrink-0 h-12 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 gap-3 z-50">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/40 to-accent/30 flex items-center justify-center border border-primary/30">
                <Dna className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground leading-none">CV-PepFind for you</h1>
                <p className="text-[9px] text-muted-foreground leading-none mt-0.5">AI-Driven Peptide Screening</p>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-2 ml-4">
              <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                <span className="text-[10px] text-primary font-medium">AI 驱动</span>
              </div>
              <div className="flex items-center gap-1.5 bg-accent/10 border border-accent/20 rounded-full px-2.5 py-1">
                <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                <span className="text-[10px] text-accent font-medium">实时可视化</span>
              </div>
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
              <button
                onClick={() => setShowSettings(true)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>

          {/* ── Main Content ──────────────────────────────────────────────── */}
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
                  <HistoryList />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Left Panel: AI Visualization ──────────────────────────── */}
            <motion.div
              animate={{ width: vizCollapsed ? 40 : undefined }}
              className={`flex-shrink-0 border-r border-border bg-card/20 relative overflow-hidden ${vizCollapsed ? '' : 'flex-1'}`}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {!vizCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full"
                >
                  <AIVisualizationPanel />
                </motion.div>
              )}

              {/* Collapse toggle */}
              <button
                onClick={() => setVizCollapsed(!vizCollapsed)}
                className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-12 bg-card border border-border rounded-r-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-all z-10 shadow-md"
              >
                <ChevronRight className={`w-3 h-3 transition-transform ${vizCollapsed ? '' : 'rotate-180'}`} />
              </button>

              {/* Collapsed state */}
              {vizCollapsed && (
                <div className="flex flex-col items-center pt-4 gap-3">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </motion.div>

            {/* ── Right Panel: CV-PepFind AI Agent (Resizable) ──────────────────────── */}
            <ResizableSidebar>
              <CVPepFindPanel />
            </ResizableSidebar>
          </div>
        </div>
      </AgentProvider>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 手机版布局（选项卡：可视化 / AI 对话）
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <AgentProvider>
      <SettingsPanel open={showSettings} onOpenChange={setShowSettings} />
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
        <header className="flex-shrink-0 h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-3 gap-2 z-20">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary/40 to-accent/30 flex items-center justify-center border border-primary/30">
              <Dna className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h1 className="text-xs font-bold text-foreground leading-none">CV-PepFind</h1>
              <p className="text-[8px] text-muted-foreground leading-none mt-0.5">AI Peptide Screening</p>
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
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* ── History Modal ──────────────────────────────────────────────── */}
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
                <HistoryList />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Main Content ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {mobileTab === 'viz' && (
                <motion.div
                  key="viz"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="h-full overflow-hidden"
                >
                  <AIVisualizationPanel />
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

              {mobileTab === 'design' && (
                <motion.div
                  key="design"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full overflow-y-auto p-4"
                >
                  <AutonomousDesignPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Tab Navigation ──────────────────────────────────────────── */}
          <div className="flex-shrink-0 border-t border-border bg-card/50 backdrop-blur-sm flex items-center justify-around h-14 px-2 gap-1">
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
              <span className="text-[10px] font-medium">AI 助手</span>
            </button>

            <button
              onClick={() => setMobileTab('design')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all ${
                mobileTab === 'design'
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              <span className="text-[10px] font-medium">设计</span>
            </button>
          </div>
        </div>
      </div>
    </AgentProvider>
  );
}
