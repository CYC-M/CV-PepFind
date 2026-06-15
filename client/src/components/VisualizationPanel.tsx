import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dna, Atom, Activity, Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import Peptide2DViewer from "./Peptide2DViewer";
import Peptide3DViewer from "./Peptide3DViewer";
import PipelineProgress, { PipelineStepData } from "./PipelineProgress";
import DockingResults from "./DockingResults";
import { trpc } from "@/lib/trpc";

interface VisualizationPanelProps {
  queryId: number | null;
  sequences: string[];
  pipelineOptions?: {
    esmThreshold: number;
    confidenceThreshold: number;
    enableEsmfold: boolean;
    enableDocking: boolean;
  };
}

type Tab = '2d' | '3d' | 'pipeline' | 'docking';

const TABS: Array<{ id: Tab; label: string; icon: React.ElementType; badge?: string }> = [
  { id: '2d', label: '2D 结构', icon: Dna },
  { id: '3d', label: '3D 结构', icon: Atom },
  { id: 'pipeline', label: 'Pipeline', icon: Activity },
  { id: 'docking', label: 'Docking', icon: Trophy },
];

export default function VisualizationPanel({ queryId, sequences, pipelineOptions }: VisualizationPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('pipeline');
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStepData[]>([]);
  const [currentPdbData, setCurrentPdbData] = useState<string | null>(null);
  const [selectedSequenceIdx, setSelectedSequenceIdx] = useState(0);
  const [dockingBadge, setDockingBadge] = useState<number>(0);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(400);

  // Observe container width for responsive 2D viewer
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Poll pipeline status
  const { data: statusData } = trpc.peptide.status.useQuery(
    { queryId: queryId! },
    { enabled: !!queryId, refetchInterval: pipelineRunning ? 1500 : false }
  );

  // Get structure predictions
  const { data: structures } = trpc.peptide.structures.useQuery(
    { queryId: queryId! },
    { enabled: !!queryId && activeTab === '3d', refetchInterval: pipelineRunning ? 2000 : false }
  );

  // Start pipeline via SSE when queryId changes
  useEffect(() => {
    if (!queryId || !sequences.length) return;

    // Close existing SSE
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setPipelineRunning(true);
    setPipelineSteps([]);
    setCurrentPdbData(null);
    setDockingBadge(0);
    setActiveTab('pipeline');

    // Initialize steps immediately
    const stepNames = ['ESM-2 打分', '序列过滤', 'ESMFold 结构预测', '结构输出', 'Binding 评分 / Docking 对接'];
    setPipelineSteps(stepNames.map((name, i) => ({
      stepIndex: i,
      stepName: name,
      status: 'waiting',
      progress: 0,
    })));

    // Start pipeline via fetch+SSE
    const startPipeline = async () => {
      try {
        const res = await fetch('/api/pipeline/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queryId,
            sequences,
            ...pipelineOptions,
          }),
        });

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) return;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

          for (const line of lines) {
            const jsonStr = line.slice(6).trim();
            try {
              const event = JSON.parse(jsonStr);
              handlePipelineEvent(event);
            } catch { /* skip */ }
          }
        }
      } catch (err) {
        console.error('[Pipeline SSE] Error:', err);
        setPipelineRunning(false);
      }
    };

    startPipeline();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [queryId]);

  const handlePipelineEvent = useCallback((event: {
    type: string;
    stepIndex?: number;
    stepName?: string;
    progress?: number;
    data?: unknown;
    error?: string;
  }) => {
    switch (event.type) {
      case 'step_start':
        setPipelineSteps(prev => prev.map(s =>
          s.stepIndex === event.stepIndex
            ? { ...s, status: 'running', progress: 0 }
            : s
        ));
        break;

      case 'step_progress':
        setPipelineSteps(prev => prev.map(s =>
          s.stepIndex === event.stepIndex
            ? { ...s, progress: event.progress ?? s.progress }
            : s
        ));
        break;

      case 'step_complete':
        setPipelineSteps(prev => prev.map(s =>
          s.stepIndex === event.stepIndex
            ? { ...s, status: 'completed', progress: 100, resultData: event.data }
            : s
        ));
        // Step 3 (Structure Output) - load PDB data
        if (event.stepIndex === 3) {
          const data = event.data as { structures?: Array<{ pdbData: string }> };
          if (data?.structures?.[0]?.pdbData) {
            setCurrentPdbData(data.structures[0].pdbData);
            setActiveTab('3d');
          }
        }
        // Step 4 (Docking) - show badge and switch tab
        if (event.stepIndex === 4) {
          const data = event.data as { dockingResults?: Array<unknown> };
          if (data?.dockingResults) {
            setDockingBadge(Math.min(5, data.dockingResults.length));
            setTimeout(() => setActiveTab('docking'), 500);
          }
        }
        break;

      case 'step_failed':
        setPipelineSteps(prev => prev.map(s =>
          s.stepIndex === event.stepIndex
            ? { ...s, status: 'failed', errorMessage: event.error }
            : s
        ));
        break;

      case 'pipeline_complete':
        setPipelineRunning(false);
        break;

      case 'pipeline_failed':
        setPipelineRunning(false);
        break;
    }
  }, []);

  // Sync steps from DB polling
  useEffect(() => {
    if (!statusData?.steps || pipelineRunning) return;
    const mapped: PipelineStepData[] = statusData.steps.map((s: {
      stepIndex: number;
      stepName: string;
      status: string;
      progress: number | null;
      resultData: unknown;
      errorMessage: string | null;
    }) => ({
      stepIndex: s.stepIndex,
      stepName: s.stepName,
      status: s.status as PipelineStepData['status'],
      progress: s.progress ?? 0,
      resultData: s.resultData,
      errorMessage: s.errorMessage ?? undefined,
    }));
    setPipelineSteps(mapped);
  }, [statusData, pipelineRunning]);

  // Load structures from DB
  useEffect(() => {
    if (structures && structures.length > 0 && !currentPdbData) {
      setCurrentPdbData((structures[0] as { pdbData: string | null }).pdbData ?? null);
    }
  }, [structures, currentPdbData]);

  const currentSequence = sequences[selectedSequenceIdx] ?? '';

  return (
    <div className="flex flex-col h-full overflow-hidden" ref={containerRef}>
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-background/50">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {tab.id === 'docking' && dockingBadge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[9px] rounded-full flex items-center justify-center font-bold">
                {dockingBadge}
              </span>
            )}
            {tab.id === 'pipeline' && pipelineRunning && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full animate-pulse" />
            )}
          </button>
        ))}

        {/* Sequence selector (for 2D/3D tabs) */}
        {(activeTab === '2d' || activeTab === '3d') && sequences.length > 1 && (
          <div className="ml-auto flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
            <button
              onClick={() => setSelectedSequenceIdx(Math.max(0, selectedSequenceIdx - 1))}
              disabled={selectedSequenceIdx === 0}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="text-[10px] text-muted-foreground font-mono">
              {selectedSequenceIdx + 1}/{sequences.length}
            </span>
            <button
              onClick={() => setSelectedSequenceIdx(Math.min(sequences.length - 1, selectedSequenceIdx + 1))}
              disabled={selectedSequenceIdx === sequences.length - 1}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === '2d' && (
            <motion.div
              key="2d"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col"
            >
              {currentSequence ? (
                <div className="flex-1 flex flex-col p-3 gap-3">
                  {/* Sequence info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">2D 拓扑结构图</p>
                      <p className="text-[10px] text-muted-foreground">序列长度: {currentSequence.length} aa</p>
                    </div>
                    <div className="flex gap-2 text-[9px]">
                      {[
                        { color: '#f59e0b', label: '疏水' },
                        { color: '#10b981', label: '极性' },
                        { color: '#6366f1', label: '正电' },
                        { color: '#ef4444', label: '负电' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                          <span className="text-muted-foreground">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Canvas */}
                  <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex items-center justify-center">
                    <Peptide2DViewer
                      sequence={currentSequence}
                      width={containerWidth - 24}
                      height={200}
                    />
                  </div>
                  {/* Sequence text */}
                  <div className="bg-muted/30 rounded-lg px-3 py-2 border border-border/50">
                    <p className="text-[10px] text-muted-foreground mb-1">氨基酸序列</p>
                    <p className="font-mono text-xs text-foreground tracking-wider break-all">{currentSequence}</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Dna className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">请先输入多肽序列</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === '3d' && (
            <motion.div
              key="3d"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              className="h-full p-2"
            >
              <Peptide3DViewer
                pdbData={currentPdbData}
                sequence={currentSequence}
              />
            </motion.div>
          )}

          {activeTab === 'pipeline' && (
            <motion.div
              key="pipeline"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto"
            >
              <PipelineProgress steps={pipelineSteps} />
            </motion.div>
          )}

          {activeTab === 'docking' && (
            <motion.div
              key="docking"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-hidden flex flex-col"
            >
              <DockingResults
                queryId={queryId}
                onSelectStructure={(seq) => {
                  const idx = sequences.indexOf(seq);
                  if (idx >= 0) setSelectedSequenceIdx(idx);
                  setActiveTab('3d');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
