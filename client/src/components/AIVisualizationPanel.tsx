/**
 * AIVisualizationPanel — AI 驱动的动态分子可视化面板
 *
 * 响应 AgentContext 的状态变化，展示：
 * - 空闲状态：欢迎动画
 * - molecule_3d：3D 分子结构（3Dmol.js）
 * - docking_anim：对接动画（多肽趋近/结合/稳定）
 * - docking_result：筛选结果卡片列表
 * - pipeline：Pipeline 进度
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Atom, Dna, Zap, Trophy, Activity, ChevronRight, Sparkles, Target, FlaskConical, Camera, Check } from "lucide-react";
import { useAgent, type DockingCandidate } from "@/contexts/AgentContext";
import ComparisonViewer from "./ComparisonViewer";
import { RenderingStyleSelector, type RenderingStyle } from "./RenderingStyleSelector";
import { applyRenderingStyle } from "@/lib/renderingStyleManager";
import { ViewControlPanel } from "./ViewControlPanel";
import { resetView, toggleAutoSpin, startAutoSpin, stopAutoSpin } from "@/lib/viewControlManager";
import { AtomTooltip } from "./AtomTooltip";
import { getNearbyAtoms, highlightAtom, clearAtomHighlight, type AtomInfo } from "@/lib/atomHoverDetector";
import MeasurementTool from "./MeasurementTool";
import {
  addAtomToSelection,
  clearSelection,
  createMeasurement,
  convertMeasurement,
  type Measurement,
  type MeasurementState,
  initializeMeasurementState,
  toggleMeasurementMode,
  addMeasurement,
  clearMeasurements,
} from "@/lib/measurementTool";
import { toast } from "sonner";
import { findClosestAtom, getAllAtoms, highlightAtomForMeasurement, drawMeasurementLine, getAtomColor } from "@/lib/atomClickDetector";

// ─── 3Dmol.js 类型声明 ────────────────────────────────────────────────────────
interface Mol3DViewer {
  addModel: (data: string, format: string) => void;
  setStyle: (sel: Record<string, unknown>, style: Record<string, unknown>) => void;
  zoomTo: () => void;
  render: () => void;
  spin?: (axis: string, speed: number) => void;
  stopAnimate?: () => void;
  clear: () => void;
  removeAllModels?: () => void;
  addSphere?: (spec: Record<string, unknown>) => void;
  setBackgroundColor?: (color: string) => void;
  getModel?: (index?: number) => any;
  setOrientation?: (mat: Array<Array<number>>) => void;
  getView?: () => any;
  setView?: (view: any) => void;
}
interface Mol3DLib {
  createViewer: (element: HTMLElement, config: Record<string, unknown>) => Mol3DViewer;
}

// ─── 3Dmol 脚本加载 ───────────────────────────────────────────────────────────
let molScriptLoaded = false;
let molScriptLoading = false;
const molScriptCallbacks: Array<() => void> = [];

function get3Dmol(): Mol3DLib | undefined {
  return (window as unknown as Record<string, unknown>)['$3Dmol'] as Mol3DLib | undefined;
}

function load3DmolScript(callback: () => void) {
  if (molScriptLoaded) { callback(); return; }
  molScriptCallbacks.push(callback);
  if (molScriptLoading) return;
  molScriptLoading = true;
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.1.0/3Dmol-min.js';
  script.onload = () => {
    molScriptLoaded = true;
    molScriptCallbacks.forEach(cb => cb());
    molScriptCallbacks.length = 0;
  };
  document.head.appendChild(script);
}

// ─── Idle Welcome Animation ───────────────────────────────────────────────────
function IdleState() {
  const particles = Array.from({ length: 20 }, (_, i) => i);
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 relative overflow-hidden">
      {/* Background particles */}
      {particles.map(i => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Central molecule icon */}
      <motion.div
        className="relative"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center">
          <Atom className="w-12 h-12 text-primary/60" />
        </div>
        {/* Orbiting dots */}
        {[0, 120, 240].map((deg, i) => (
          <motion.div
            key={i}
            className="absolute w-3 h-3 rounded-full bg-primary/50"
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${deg}deg) translateX(48px) translateY(-50%)`,
            }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.7 }}
          />
        ))}
      </motion.div>

      <div className="text-center z-10">
        <h3 className="text-lg font-semibold text-foreground/80 mb-2">AI 分子可视化</h3>
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
          与右侧 AI 对话，描述您的研究需求。<br />
          AI 将自动在此处渲染分子结构与对接动画。
        </p>
      </div>

      {/* Feature hints */}
      <div className="flex gap-3 z-10">
        {[
          { icon: Dna, label: '3D 结构' },
          { icon: Target, label: '对接筛选' },
          { icon: Trophy, label: '结果分析' },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            onClick={() => {
              const msg = `Feature "${label}" coming soon.`;
              console.log(msg);
            }}
            className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl bg-card/50 border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group relative"
            role="button"
            tabIndex={0}
            aria-label={`${label} - Coming Soon`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const msg = `Feature "${label}" coming soon.`;
                console.log(msg);
              }
            }}
          >
            <Icon className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
            <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-background border border-border text-[9px] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Coming Soon</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── WebGL Support Check ──────────────────────────────────────────────────────
function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

// ─── Molecule 3D Viewer ───────────────────────────────────────────────────────
function MoleculeViewer({ pdbData, name, sequence, isRealData, pdbId, rcsbUrl }: {
  pdbData: string | null;
  name: string | null;
  sequence?: string;
  isRealData?: boolean;
  pdbId?: string | null;
  rcsbUrl?: string | null;
}) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewer3DRef = useRef<Mol3DViewer | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webglSupported] = useState(() => checkWebGLSupport());
  const [renderingStyle, setRenderingStyle] = useState<RenderingStyle>('cartoon');
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [hoveredAtom, setHoveredAtom] = useState<AtomInfo | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipEnabled, setTooltipEnabled] = useState(true);
  const [nearbyAtoms, setNearbyAtoms] = useState<AtomInfo[]>([]);
  const [measurementState, setMeasurementState] = useState<MeasurementState>(
    initializeMeasurementState()
  );
  const [measurementUnit, setMeasurementUnit] = useState<'angstrom' | 'nanometer'>('angstrom');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle reset view
  const handleResetView = useCallback(() => {
    if (viewer3DRef.current) {
      resetView(viewer3DRef.current);
      setIsAutoSpinning(false);
    }
  }, []);

  // Handle auto-spin toggle
  const handleToggleAutoSpin = useCallback((shouldSpin: boolean) => {
    if (viewer3DRef.current) {
      if (shouldSpin) {
        startAutoSpin(viewer3DRef.current);
        setIsAutoSpinning(true);
      } else {
        stopAutoSpin(viewer3DRef.current);
        setIsAutoSpinning(false);
      }
    }
  }, []);

  // Handle atom hover
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!loaded || !tooltipEnabled || !viewer3DRef.current) return;

      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setTooltipPosition({ x, y });

      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

      hoverTimeoutRef.current = setTimeout(() => {
        try {
          const model = viewer3DRef.current?.getModel?.();
          if (!model || !model.atoms) return;

          const atoms = model.atoms as AtomInfo[];
          if (atoms.length === 0) return;

              // Find closest atom to mouse position
          let closestAtom: AtomInfo | null = null;
          let closestDistance = 30;

          for (const atom of atoms) {
            const dist = Math.sqrt(Math.pow(x - atom.x, 2) + Math.pow(y - atom.y, 2));
            if (dist < closestDistance) {
              closestDistance = dist;
              closestAtom = atom;
            }
          }

          if (closestAtom && viewer3DRef.current) {
            setHoveredAtom(closestAtom);
            setShowTooltip(true);
            highlightAtom(viewer3DRef.current as any, closestAtom, renderingStyle);

            const nearby = getNearbyAtoms(viewer3DRef.current as any, closestAtom, 4.0);
            setNearbyAtoms(nearby);

            // Calculate absolute tooltip position with boundary checking
            const tooltipX = rect.left + x + 12;
            const tooltipY = rect.top + y + 12;

            let finalX = tooltipX;
            let finalY = tooltipY;

            if (finalX + 300 > window.innerWidth) {
              finalX = window.innerWidth - 300 - 12;
            }
            if (finalY + 200 > window.innerHeight) {
              finalY = window.innerHeight - 200 - 12;
            }

            setTooltipPosition({ x: finalX, y: finalY });
          }
        } catch (error) {
          console.error('Hover detection error:', error);
        }
      }, 100);
    },
    [loaded, tooltipEnabled, renderingStyle]
  );

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
    setHoveredAtom(null);
    setNearbyAtoms([]);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (viewer3DRef.current) {
      clearAtomHighlight(viewer3DRef.current as any, renderingStyle);
    }
  }, [renderingStyle]);

  // Measurement tool handlers
  const handleToggleMeasurement = useCallback(() => {
    setMeasurementState((prev) => toggleMeasurementMode(prev));
  }, []);

  const handleClearMeasurements = useCallback(() => {
    setMeasurementState((prev) => clearMeasurements(prev));
  }, []);

  const handleMeasurementUnitChange = useCallback(
    (newUnit: 'angstrom' | 'nanometer') => {
      setMeasurementUnit(newUnit);
      setMeasurementState((prev) => ({
        ...prev,
        measurements: prev.measurements.map((m) => convertMeasurement(m, newUnit)),
        lastMeasurement: prev.lastMeasurement ? convertMeasurement(prev.lastMeasurement, newUnit) : null,
      }));
    },
    []
  );


  const handleAtomClick = useCallback(
    (atom: AtomInfo) => {
      if (!measurementState.isActive) return;

      const newSelection = addAtomToSelection(measurementState.selectedAtoms, atom, 2);
      setMeasurementState((prev) => ({
        ...prev,
        selectedAtoms: newSelection,
      }));

      if (newSelection.length === 2) {
        const measurement = createMeasurement(newSelection[0], newSelection[1], measurementUnit);
        setMeasurementState((prev) => addMeasurement(prev, measurement));
        toast.success(`Distance: ${measurement.distance.toFixed(2)} ${measurementUnit === 'angstrom' ? 'Å' : 'nm'}`);
        setTimeout(() => {
          setMeasurementState((prev) => ({
            ...prev,
            selectedAtoms: [],
          }));
        }, 500);
      }
    },
    [measurementState.isActive, measurementState.selectedAtoms, measurementUnit]
  );
  // Handle atom click for measurement
  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!measurementState.isActive || !viewer3DRef.current) return;

      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const atoms = getAllAtoms(viewer3DRef.current);
      const closestAtom = findClosestAtom(
        mouseX,
        mouseY,
        atoms,
        viewer3DRef.current,
        rect.width,
        rect.height,
        25
      );

      if (closestAtom) {
        handleAtomClick(closestAtom);
        // Highlight selected atom
        const color = getAtomColor(closestAtom.element);
        highlightAtomForMeasurement(viewer3DRef.current, closestAtom, color);

        // Draw line if two atoms selected
        if (measurementState.selectedAtoms.length === 2) {
          drawMeasurementLine(
            viewer3DRef.current,
            measurementState.selectedAtoms[0],
            closestAtom,
            '0x00FF00'
          );
        }
      }
    },
    [measurementState.isActive, measurementState.selectedAtoms, handleAtomClick]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!loaded) return;

      // Check if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleResetView();
      } else if (e.key === ' ') {
        e.preventDefault();
        handleToggleAutoSpin(!isAutoSpinning);
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setTooltipEnabled(!tooltipEnabled);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMeasurement();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loaded, isAutoSpinning, handleResetView, handleToggleAutoSpin, tooltipEnabled]);

  // Load rendering style preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('preferred-rendering-style');
    if (saved && ['cartoon', 'stick', 'surface', 'sphere', 'line'].includes(saved)) {
      setRenderingStyle(saved as RenderingStyle);
    }
  }, []);

  // Handle rendering style changes
  const handleStyleChange = useCallback((style: RenderingStyle) => {
    setRenderingStyle(style);
    localStorage.setItem('preferred-rendering-style', style);
    if (viewer3DRef.current) {
      applyRenderingStyle(viewer3DRef.current, style);
    }
  }, []);

  const initViewer = useCallback(() => {
    if (!webglSupported) {
      setError('no_webgl');
      return;
    }
    // Ensure we use the current renderingStyle when initializing
    const styleToApply = renderingStyle;
    const mol3d = get3Dmol();
    if (!viewerRef.current || !mol3d) return;
    try {
      if (viewer3DRef.current) {
        viewer3DRef.current.clear();
      }
      const viewer = mol3d.createViewer(viewerRef.current, {
        backgroundColor: 'transparent',
      });
      viewer3DRef.current = viewer;

      if (pdbData) {
        viewer.addModel(pdbData, 'pdb');
        applyRenderingStyle(viewer, styleToApply);
      } else if (sequence) {
        const residues = sequence.split('');
        residues.forEach((_, i) => {
          viewer.addSphere?.({
            center: { x: i * 3.8 - (residues.length * 1.9), y: Math.sin(i * 0.5) * 5, z: Math.cos(i * 0.3) * 3 },
            radius: 1.2,
            color: `hsl(${(i / residues.length) * 240}, 70%, 60%)`,
          });
        });
      }

      viewer.zoomTo();
      viewer.spin?.('y', 0.5);
      viewer.render();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setLoaded(true);
    } catch (e) {
      console.error('3D viewer error:', e);
      setError('webgl_error');
    }
  }, [pdbData, sequence, webglSupported]);

  useEffect(() => {
    if (!webglSupported) { setError('no_webgl'); return; }
    // 10 second timeout
    timeoutRef.current = setTimeout(() => {
      if (!loaded) setError('timeout');
    }, 10000);
    load3DmolScript(() => {
      setTimeout(initViewer, 100);
    });
    return () => {
      viewer3DRef.current?.stopAnimate?.();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [initViewer, webglSupported, loaded]);

  // Error / fallback UI
  if (error) {
    const messages: Record<string, { title: string; desc: string }> = {
      no_webgl: { title: '浏览器不支持 3D 渲染', desc: '请使用 Chrome 或 Edge 浏览器以获得最佳体验' },
      webgl_error: { title: '3D 渲染初始化失败', desc: '请刷新页面重试，或切换至 Chrome / Edge 浏览器' },
      timeout: { title: '3D 结构加载超时', desc: '网络较慢或浏览器资源不足，请稍后重试' },
    };
    const msg = messages[error] || messages.webgl_error;
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
          <Atom className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{msg.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{msg.desc}</p>
        </div>
        {sequence && (
          <div className="mt-2 p-3 bg-muted/30 rounded-lg w-full">
            <p className="text-[10px] text-muted-foreground mb-1">氨基酸序列</p>
            <p className="text-xs font-mono text-foreground break-all">{sequence}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <Atom className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{name || 'Molecule'}</h3>
          {sequence && (
            <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">{sequence}</p>
          )}
        </div>
        {loaded && (
          <div className="ml-2 flex items-center gap-2">
            <RenderingStyleSelector
              currentStyle={renderingStyle}
              onStyleChange={handleStyleChange}
              disabled={!loaded}
            />
            <div className="w-px h-6 bg-border/50" />
            <MeasurementTool
              isActive={measurementState.isActive}
              measurements={measurementState.measurements}
              selectedAtomCount={measurementState.selectedAtoms.length}
              onToggle={handleToggleMeasurement}
              onClear={handleClearMeasurements}
              onExport={() => {}}
              onUnitChange={handleMeasurementUnitChange}
              currentUnit={measurementUnit}
            />
            <div className="w-px h-6 bg-border/50" />
            <ViewControlPanel
              onResetView={handleResetView}
              onToggleAutoSpin={handleToggleAutoSpin}
              disabled={!loaded}
            />
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {isRealData && pdbId && (
            <motion.a
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              href={rcsbUrl ?? `https://www.rcsb.org/structure/${pdbId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 px-2 py-0.5 rounded-full hover:bg-emerald-400/20 transition-colors"
              title={`View ${pdbId} on RCSB PDB`}
            >
              <Dna className="w-2.5 h-2.5" />
              RCSB · {pdbId}
            </motion.a>
          )}
          {!isRealData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full"
            >
              <Atom className="w-2.5 h-2.5" />
              模拟结构
            </motion.div>
          )}
          {loaded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full"
            >
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              3D 渲染中
            </motion.div>
          )}
        </div>
      </div>

      {/* 3D Viewer */}
      <div
        className="flex-1 relative"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleContainerClick}
      >
        {!loaded && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Atom className="w-8 h-8 text-primary/50" />
            </motion.div>
            <p className="text-xs text-muted-foreground">正在加载 3D 结构...</p>
          </div>
        )}
        <div ref={viewerRef} className="w-full h-full" />
        <AtomTooltip
          atom={hoveredAtom}
          position={tooltipPosition}
          visible={showTooltip && tooltipEnabled}
          nearbyAtoms={nearbyAtoms}
        />
      </div>
    </div>
  );
}

// ─── Docking Animation ────────────────────────────────────────────────────────
function DockingAnimation({ target, sequences, phase }: {
  target: string;
  sequences: string[];
  phase: 'approach' | 'binding' | 'bound' | null;
}) {
  const phaseConfig = {
    approach: { label: '多肽趋近靶点...', color: 'text-accent', progress: 30 },
    binding: { label: '构象优化中...', color: 'text-primary', progress: 65 },
    bound: { label: '稳定结合完成', color: 'text-green-400', progress: 100 },
  };
  const cfg = phase ? phaseConfig[phase] : phaseConfig.approach;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
          <Zap className="w-4 h-4 text-accent animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">分子对接筛选</h3>
          <p className="text-[10px] text-muted-foreground">靶点: {target} · {sequences.length} 条候选序列</p>
        </div>
      </div>

      {/* Animation Canvas */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(var(--primary-rgb, 0,255,128), 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--primary-rgb, 0,255,128), 0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Target protein (center) */}
        <div className="relative">
          <motion.div
            className="w-32 h-32 rounded-full border-2 border-primary/40 bg-primary/5 flex items-center justify-center"
            animate={{
              boxShadow: phase === 'bound'
                ? ['0 0 20px rgba(0,255,128,0.3)', '0 0 40px rgba(0,255,128,0.5)', '0 0 20px rgba(0,255,128,0.3)']
                : ['0 0 10px rgba(0,255,128,0.1)', '0 0 20px rgba(0,255,128,0.2)', '0 0 10px rgba(0,255,128,0.1)'],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="text-center">
              <Target className="w-8 h-8 text-primary/60 mx-auto mb-1" />
              <span className="text-xs text-primary/80 font-mono">{target}</span>
            </div>
          </motion.div>

          {/* Orbiting peptide candidates */}
          {sequences.slice(0, 3).map((seq, i) => {
            const angle = (i / 3) * 360;
            const radius = phase === 'approach' ? 100 : phase === 'binding' ? 70 : 55;
            return (
              <motion.div
                key={i}
                className="absolute w-10 h-10 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center"
                style={{
                  top: '50%',
                  left: '50%',
                }}
                animate={{
                  x: Math.cos((angle + (phase === 'approach' ? 0 : 30)) * Math.PI / 180) * radius - 20,
                  y: Math.sin((angle + (phase === 'approach' ? 0 : 30)) * Math.PI / 180) * radius - 20,
                  scale: phase === 'bound' ? 1.2 : 1,
                  opacity: phase === 'bound' ? 1 : 0.7,
                }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
              >
                <Dna className="w-4 h-4 text-accent" />
              </motion.div>
            );
          })}
        </div>

        {/* Phase indicator */}
        <div className="w-full max-w-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
            <span className="text-xs text-muted-foreground">{cfg.progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              animate={{ width: `${cfg.progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Phase steps */}
        <div className="flex gap-4">
          {(['approach', 'binding', 'bound'] as const).map((p, i) => (
            <div key={p} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full transition-colors ${
                phase === p ? 'bg-primary animate-pulse' :
                (phase === 'binding' && i === 0) || (phase === 'bound' && i < 2) ? 'bg-primary/60' :
                'bg-muted-foreground/30'
              }`} />
              <span className="text-[10px] text-muted-foreground capitalize">{p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Docking Results ──────────────────────────────────────────────────────────
function DockingResultsView({ candidates, selected, onSelect }: {
  candidates: DockingCandidate[];
  selected: number | null;
  onSelect: (i: number) => void;
}) {
  const { fetchComparisonPdb } = useAgent();

  const handleCandidateClick = (index: number) => {
    onSelect(index);
    const candidate = candidates[index];
    if (candidate?.sequence) {
      fetchComparisonPdb(candidate.sequence).catch(console.error);
    }
  };
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">筛选结果</h3>
          <p className="text-[10px] text-muted-foreground">找到 {candidates.length} 个候选多肽</p>
        </div>
      </div>

      {/* Candidates list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {candidates.map((c, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => handleCandidateClick(i)}
            className={`w-full text-left p-3 rounded-xl border transition-all ${
              selected === i
                ? 'border-primary/60 bg-primary/10'
                : 'border-border/50 bg-card/50 hover:border-primary/30 hover:bg-primary/5'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  i === 1 ? 'bg-slate-400/20 text-slate-300' :
                  i === 2 ? 'bg-orange-500/20 text-orange-400' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {c.rank}
                </div>
                <span className="text-xs font-medium text-foreground">候选 #{c.rank}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">ΔG</span>
                <span className={`text-xs font-mono font-semibold ${
                  c.score < -9 ? 'text-green-400' :
                  c.score < -7 ? 'text-primary' :
                  'text-accent'
                }`}>{c.score.toFixed(1)}</span>
                <span className="text-[9px] text-muted-foreground">kcal/mol</span>
              </div>
            </div>

            <p className="text-[10px] font-mono text-muted-foreground truncate mb-1.5">{c.sequence}</p>

            <div className="flex items-center justify-between">
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{c.activity}</span>
              <div className="flex items-center gap-1">
                <div className="h-1 w-12 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${c.confidence * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">{(c.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
// ─── Export Screenshot ───────────────────────────────────────────────────────
async function exportPanelScreenshot(panelRef: React.RefObject<HTMLDivElement | null>, modeName: string) {
  const el = panelRef.current;
  if (!el) return;
  try {
    // Use html2canvas if available, otherwise use canvas-based approach
    const html2canvas = (await import('html2canvas').catch(() => null))?.default;
    if (html2canvas) {
      const canvas = await html2canvas(el, {
        backgroundColor: null,
        useCORS: true,
        scale: window.devicePixelRatio || 2,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `cv-pepfind-${modeName}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('截图已保存');
    } else {
      // Fallback: find canvas element (3Dmol renders to canvas)
      const canvas = el.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.download = `cv-pepfind-${modeName}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success('截图已保存');
      } else {
        toast.error('当前视图不支持截图导出');
      }
    }
  } catch (e) {
    console.error('Screenshot error:', e);
    toast.error('截图导出失败，请重试');
  }
}

export default function AIVisualizationPanel() {
  const { vizState, dispatch } = useAgent();
  const panelRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    const modeName = vizState.mode === 'molecule_3d' ? 'molecule' :
      vizState.mode === 'docking_anim' ? 'docking' :
      vizState.mode === 'docking_result' ? 'results' : 'panel';
    await exportPanelScreenshot(panelRef, modeName);
    setIsExporting(false);
  }, [vizState.mode]);

  return (
    <div ref={panelRef} className="h-full bg-background relative overflow-hidden">
      {/* Comparison viewer modal */}
      <AnimatePresence>
        {showComparison && vizState.comparisonPdbData && (
          <ComparisonViewer
            candidatePdbData={vizState.pdbData}
            candidateName={vizState.moleculeName ?? 'Candidate'}
            referencePdbData={vizState.comparisonPdbData}
            referenceName={vizState.comparisonPdbTitle ?? 'Reference'}
            referenceUrl={vizState.comparisonRcsbUrl ?? undefined}
            onClose={() => setShowComparison(false)}
          />
        )}
      </AnimatePresence>

      {/* Status bar */}
      <AnimatePresence>
        {vizState.statusMessage && vizState.mode !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-card/90 backdrop-blur-sm border border-border/60 rounded-full px-3 py-1.5 shadow-lg"
          >
            <Activity className="w-3 h-3 text-primary animate-pulse" />
            <span className="text-[11px] text-foreground/80">{vizState.statusMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <AnimatePresence mode="wait">
        {(vizState.mode as string) === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <IdleState />
          </motion.div>
        )}

        {vizState.mode === 'molecule_3d' && (
          <motion.div key="molecule" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
            <MoleculeViewer
              pdbData={vizState.pdbData}
              name={vizState.moleculeName}
              sequence={vizState.sequences[0]}
              isRealData={vizState.isRealPdbData}
              pdbId={vizState.currentPdbId}
              rcsbUrl={vizState.rcsbUrl}
            />
            {vizState.comparisonPdbData && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setShowComparison(true)}
                className="mx-4 mb-4 px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <Dna className="w-4 h-4" />
                View Side-by-Side Comparison
              </motion.button>
            )}
          </motion.div>
        )}

        {vizState.mode === 'docking_anim' && (
          <motion.div key="docking-anim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
            <DockingAnimation
              target={vizState.targetProtein || ''}
              sequences={vizState.sequences}
              phase={vizState.animationPhase}
            />
          </motion.div>
        )}

        {vizState.mode === 'docking_result' && (
          <motion.div key="docking-result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full">
            <DockingResultsView
              candidates={vizState.dockingCandidates}
              selected={vizState.selectedCandidate}
              onSelect={(i) => dispatch({ type: 'SELECT_CANDIDATE', index: i })}
            />
          </motion.div>
        )}

        {vizState.mode === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-5">
              {vizState.pdbFetchLoading ? (
                <>
                  <div className="relative">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                      <Dna className="w-12 h-12 text-primary/50" />
                    </motion.div>
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-primary/30"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground/80">正在从 RCSB PDB 获取真实结构...</p>
                    <p className="text-xs text-muted-foreground mt-1">{vizState.statusMessage}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-emerald-400/70 bg-emerald-400/5 border border-emerald-400/15 px-3 py-1.5 rounded-full">
                    <Dna className="w-3 h-3" />
                    <span>RCSB Protein Data Bank</span>
                  </div>
                </>
              ) : (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <FlaskConical className="w-10 h-10 text-primary/60" />
                  </motion.div>
                  <p className="text-sm text-muted-foreground">{vizState.statusMessage || '处理中...'}</p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode indicator (bottom right) */}
      {(vizState.mode as string) !== 'idle' && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-card/80 backdrop-blur-sm border border-border/40 rounded-full px-2.5 py-1">
          <Sparkles className="w-3 h-3 text-primary/60" />
          <span className="text-[10px] text-muted-foreground capitalize">
            {vizState.mode === 'molecule_3d' ? '3D 结构' :
             vizState.mode === 'docking_anim' ? '对接动画' :
             vizState.mode === 'docking_result' ? '筛选结果' :
             vizState.mode}
          </span>
          {/* Export Screenshot Button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="ml-1 p-0.5 text-muted-foreground/60 hover:text-primary transition-colors disabled:opacity-50"
            title="导出截图"
            aria-label="导出截图"
          >
            {isExporting ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Camera className="w-3 h-3" />
              </motion.div>
            ) : (
              <Camera className="w-3 h-3" />
            )}
          </button>
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            className="p-0.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            title="重置"
            aria-label="重置可视化"
          >
            <ChevronRight className="w-3 h-3 rotate-180" />
          </button>
        </div>
      )}

      {/* Export Screenshot Button (always visible, top-right) */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={handleExport}
        disabled={isExporting}
        className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-card/80 backdrop-blur-sm border border-border/40 rounded-full px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-card/95 transition-all disabled:opacity-50 shadow-sm"
        title="导出截图"
        aria-label="导出当前可视化面板截图"
      >
        {isExporting ? (
          <>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Camera className="w-3 h-3" />
            </motion.div>
            <span>导出中...</span>
          </>
        ) : (
          <>
            <Camera className="w-3 h-3" />
            <span>导出截图</span>
          </>
        )}
      </motion.button>
    </div>
  );
}
