/**
 * ComparisonViewer — Side-by-side 3D structure comparison
 *
 * Displays two 3Dmol viewers:
 * - Left: Candidate peptide structure (from docking results)
 * - Right: Reference structure from RCSB PDB
 *
 * Includes:
 * - Synchronized camera controls (optional)
 * - Sequence alignment view
 * - Similarity metrics
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Maximize2, Minimize2, Dna } from 'lucide-react';
import { SequenceAlignmentView } from "./SequenceAlignmentView";
import { type AlignmentResult, type SimilarityScore } from "@/lib/sequenceAlignment";

interface Mol3DViewer {
  addModel: (data: string, format: string) => void;
  setStyle: (sel: Record<string, unknown>, style: Record<string, unknown>) => void;
  zoomTo: () => void;
  render: () => void;
  clear: () => void;
}

interface ComparisonViewerProps {
  candidatePdbData: string | null;
  candidateName: string;
  referencePdbData: string | null;
  referenceName: string;
  referenceUrl?: string;
  onClose: () => void;
}

export default function ComparisonViewer({
  candidatePdbData,
  candidateName,
  referencePdbData,
  referenceName,
  referenceUrl,
  onClose,
}: ComparisonViewerProps) {
  const candidateViewerRef = useRef<HTMLDivElement>(null);
  const referenceViewerRef = useRef<HTMLDivElement>(null);
  const candidateViewer3DRef = useRef<Mol3DViewer | null>(null);
  const referenceViewer3DRef = useRef<Mol3DViewer | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [candidateLoaded, setCandidateLoaded] = useState(false);
  const [referenceLoaded, setReferenceLoaded] = useState(false);
  const [alignment, setAlignment] = useState<AlignmentResult | null>(null);
  const [similarity, setSimilarity] = useState<SimilarityScore | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Initialize 3Dmol viewers
  useEffect(() => {
    const initViewers = async () => {
      // Load 3Dmol.js
      if (!(window as any).$3Dmol) {
        const script = document.createElement('script');
        script.src = 'https://3Dmol.csb.pitt.edu/build/3Dmol-min.js';
        script.async = true;
        script.onload = () => initViewers();
        document.head.appendChild(script);
        return;
      }

      // Initialize candidate viewer
      if (candidateViewerRef.current && candidatePdbData) {
        const viewer = (window as any).$3Dmol.createViewer(candidateViewerRef.current, { backgroundColor: 'rgba(0,0,0,0.1)' });
        candidateViewer3DRef.current = viewer;

        viewer.addModel(candidatePdbData, 'pdb');
        viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
        viewer.zoomTo();
        viewer.render();
        setCandidateLoaded(true);
      }

      // Initialize reference viewer
      if (referenceViewerRef.current && referencePdbData) {
        const viewer = (window as any).$3Dmol.createViewer(referenceViewerRef.current, { backgroundColor: 'rgba(0,0,0,0.1)' });
        referenceViewer3DRef.current = viewer;

        viewer.addModel(referencePdbData, 'pdb');
        viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
        viewer.zoomTo();
        viewer.render();
        setReferenceLoaded(true);
      }
    };

    initViewers();
  }, [candidatePdbData, referencePdbData]);


  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 ${
        isFullscreen ? 'p-0' : ''
      }`}
    >
      <div
        className={`bg-background rounded-2xl border border-border/50 shadow-2xl flex flex-col ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-[80vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Dna className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Structure Comparison</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Maximize2 className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Viewers */}
        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          {/* Candidate viewer */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <div className="flex items-center justify-between px-3 py-2 bg-primary/5 rounded-lg border border-primary/20">
              <span className="text-sm font-medium text-foreground">Candidate Peptide</span>
              {candidateLoaded && (
                <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">Loaded</span>
              )}
            </div>
            <div
              ref={candidateViewerRef}
              className="flex-1 rounded-lg border border-border/50 bg-card/50 overflow-hidden"
              style={{ minHeight: 0 }}
            />
            <p className="text-xs text-muted-foreground truncate">{candidateName}</p>
          </div>

          {/* Reference viewer */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <span className="text-sm font-medium text-foreground">RCSB Reference</span>
              {referenceLoaded && (
                <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full">Loaded</span>
              )}
            </div>
            <div
              ref={referenceViewerRef}
              className="flex-1 rounded-lg border border-border/50 bg-card/50 overflow-hidden"
              style={{ minHeight: 0 }}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground truncate flex-1">{referenceName}</p>
              {referenceUrl && (
                <a
                  href={referenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors ml-2 whitespace-nowrap"
                >
                  View on RCSB →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-border/50 bg-muted/20 text-xs text-muted-foreground">
          <p>
            Tip: Use mouse to rotate structures. Scroll to zoom. Right-click and drag to pan. Click "View on RCSB" to see
            the reference structure details.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
