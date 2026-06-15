import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Maximize2, Minimize2, Layers, Atom, ZoomIn, ZoomOut } from "lucide-react";

declare global {
  interface Window {
    $3Dmol: {
      createViewer: (element: HTMLElement, config: Record<string, unknown>) => Viewer3Dmol;
      SurfaceType: { VDW: number; MS: number; SAS: number };
    };
  }
}

interface Viewer3Dmol {
  addModel: (data: string, format: string) => Model3Dmol;
  setStyle: (sel: Record<string, unknown>, style: Record<string, unknown>) => void;
  addSurface: (type: number, style: Record<string, unknown>, sel?: Record<string, unknown>) => void;
  zoomTo: () => void;
  render: () => void;
  zoom: (factor: number) => void;
  rotate: (angle: number, axis: string) => void;
  clear: () => void;
  removeAllModels: () => void;
  removeAllSurfaces: () => void;
  setBackgroundColor: (color: string) => void;
  selectedAtoms: (sel: Record<string, unknown>) => Atom3Dmol[];
  setHoverable: (sel: Record<string, unknown>, hoverable: boolean, hover: (atom: Atom3Dmol, viewer: Viewer3Dmol) => void, unhover: (atom: Atom3Dmol, viewer: Viewer3Dmol) => void) => void;
  setClickable: (sel: Record<string, unknown>, clickable: boolean, callback: (atom: Atom3Dmol, viewer: Viewer3Dmol) => void) => void;
  addLabel: (text: string, style: Record<string, unknown>, sel?: Record<string, unknown>) => void;
  removeAllLabels: () => void;
  resize: () => void;
}

interface Model3Dmol {
  selectedAtoms: (sel: Record<string, unknown>) => Atom3Dmol[];
}

interface Atom3Dmol {
  resn?: string;
  resi?: number;
  atom?: string;
  x?: number;
  y?: number;
  z?: number;
}

type RenderStyle = 'cartoon' | 'stick' | 'sphere' | 'surface';

interface Peptide3DViewerProps {
  pdbData: string | null;
  sequence?: string;
}

const STYLE_CONFIGS: Record<RenderStyle, { label: string; icon: string }> = {
  cartoon: { label: '卡通', icon: '🎨' },
  stick:   { label: '棍棒', icon: '🔗' },
  sphere:  { label: '球体', icon: '⚪' },
  surface: { label: '表面', icon: '🌊' },
};

export default function Peptide3DViewer({ pdbData, sequence }: Peptide3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer3Dmol | null>(null);
  const [renderStyle, setRenderStyle] = useState<RenderStyle>('cartoon');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredResidue, setHoveredResidue] = useState<string | null>(null);
  const [selectedResidue, setSelectedResidue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initViewer = useCallback(() => {
    if (!containerRef.current || !window.$3Dmol) return null;
    const viewer = window.$3Dmol.createViewer(containerRef.current, {
      backgroundColor: 'transparent',
      antialias: true,
      id: 'peptide-viewer-' + Date.now(),
    });
    viewer.setBackgroundColor('0x0a0f1e');
    return viewer;
  }, []);

  const applyStyle = useCallback((viewer: Viewer3Dmol, style: RenderStyle) => {
    viewer.setStyle({}, {});
    switch (style) {
      case 'cartoon':
        viewer.setStyle({}, {
          cartoon: {
            color: 'spectrum',
            opacity: 0.95,
            thickness: 0.4,
            arrows: true,
          }
        });
        break;
      case 'stick':
        viewer.setStyle({}, {
          stick: { colorscheme: 'Jmol', radius: 0.15 }
        });
        viewer.setStyle({ atom: 'CA' }, {
          sphere: { colorscheme: 'Jmol', radius: 0.25 }
        });
        break;
      case 'sphere':
        viewer.setStyle({}, {
          sphere: { colorscheme: 'Jmol', scale: 0.35 }
        });
        break;
      case 'surface':
        viewer.setStyle({}, {
          cartoon: { color: 'spectrum', opacity: 0.3 }
        });
        try {
          viewer.removeAllSurfaces();
          viewer.addSurface(
            window.$3Dmol.SurfaceType.VDW,
            { opacity: 0.7, colorscheme: 'whiteCarbon' },
            {}
          );
        } catch { /* surface may fail on small peptides */ }
        break;
    }
    viewer.render();
  }, []);

  const loadStructure = useCallback((pdb: string) => {
    if (!containerRef.current) return;
    setError(null);
    setIsLoaded(false);

    try {
      if (!viewerRef.current) {
        viewerRef.current = initViewer();
      }
      const viewer = viewerRef.current;
      if (!viewer) return;

      viewer.removeAllModels();
      viewer.removeAllLabels();
      viewer.addModel(pdb, 'pdb');

      applyStyle(viewer, renderStyle);

      // Hover interaction
      viewer.setHoverable(
        {},
        true,
        (atom) => {
          if (atom.resn && atom.resi) {
            setHoveredResidue(`${atom.resn}${atom.resi}`);
          }
        },
        () => setHoveredResidue(null)
      );

      // Click to highlight residue
      viewer.setClickable({}, true, (atom) => {
        if (atom.resn && atom.resi) {
          const label = `${atom.resn}${atom.resi}`;
          setSelectedResidue(label);
          viewer.removeAllLabels();
          viewer.setStyle({}, { cartoon: { color: 'spectrum', opacity: 0.5 } });
          viewer.setStyle({ resi: atom.resi }, {
            stick: { color: '#10b981', radius: 0.2 },
            sphere: { color: '#10b981', radius: 0.35 },
          });
          viewer.addLabel(label, {
            position: { x: atom.x ?? 0, y: atom.y ?? 0, z: atom.z ?? 0 },
            backgroundColor: '0x1a2a1a',
            fontColor: '0x10b981',
            fontSize: 12,
            borderColor: '0x10b981',
            borderThickness: 1,
          });
          viewer.render();
        }
      });

      viewer.zoomTo();
      viewer.render();
      setIsLoaded(true);
    } catch (err) {
      console.error('[3DViewer] Error:', err);
      setError('3D结构加载失败，请检查PDB数据格式');
    }
  }, [initViewer, applyStyle, renderStyle]);

  useEffect(() => {
    if (!pdbData) return;
    // Wait for 3Dmol to load
    const tryLoad = () => {
      if (window.$3Dmol) {
        loadStructure(pdbData);
      } else {
        setTimeout(tryLoad, 200);
      }
    };
    tryLoad();
  }, [pdbData, loadStructure]);

  useEffect(() => {
    if (viewerRef.current && isLoaded) {
      applyStyle(viewerRef.current, renderStyle);
    }
  }, [renderStyle, isLoaded, applyStyle]);

  const handleReset = () => {
    if (viewerRef.current) {
      viewerRef.current.removeAllLabels();
      setSelectedResidue(null);
      applyStyle(viewerRef.current, renderStyle);
      viewerRef.current.zoomTo();
    }
  };

  const handleZoom = (factor: number) => {
    viewerRef.current?.zoom(factor);
  };

  if (!pdbData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-3 border border-border/50">
          <Atom className="w-8 h-8 text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground">等待结构预测完成</p>
        <p className="text-xs text-muted-foreground/50 mt-1">ESMFold将生成PDB格式3D结构</p>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Toolbar */}
      <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between">
        {/* Style selector */}
        <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 border border-border/50">
          {(Object.keys(STYLE_CONFIGS) as RenderStyle[]).map(style => (
            <button
              key={style}
              onClick={() => setRenderStyle(style)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-all ${
                renderStyle === style
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{STYLE_CONFIGS[style].icon}</span>
              <span>{STYLE_CONFIGS[style].label}</span>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 border border-border/50">
          <button onClick={() => handleZoom(1.2)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleZoom(0.8)} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleReset} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Hover/Select info */}
      {(hoveredResidue || selectedResidue) && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-2 left-2 z-10 bg-background/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-primary/30 text-xs font-mono text-primary"
        >
          {hoveredResidue ? `悬停: ${hoveredResidue}` : `选中: ${selectedResidue}`}
        </motion.div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
          <div className="text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">加载3D结构...</p>
          </div>
        </div>
      )}

      {/* 3Dmol container */}
      <div
        ref={containerRef}
        className="flex-1 w-full rounded-lg overflow-hidden"
        style={{ minHeight: '200px', background: 'oklch(0.098 0.018 255)' }}
      />

      {/* Interaction hint */}
      <div className="absolute bottom-2 right-2 z-10">
        <div className="bg-background/70 backdrop-blur-sm rounded-lg px-2 py-1 text-[9px] text-muted-foreground/60 border border-border/30">
          滚轮缩放 · 拖拽旋转 · 点击高亮
        </div>
      </div>
    </div>
  );
}
