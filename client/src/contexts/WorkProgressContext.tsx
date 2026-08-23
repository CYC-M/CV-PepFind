import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { WorkflowTaskStatus } from '@shared/workflowNodeStatus';

export type WorkVisualizationProgress = {
  status: WorkflowTaskStatus;
  stepNumber?: number;
  progress: number;
};

export type WorkVisualizationControls = {
  available: boolean;
  paused: boolean;
  pending: boolean;
  onToggle: () => void;
  onCancel: () => void;
};

const initialProgress: WorkVisualizationProgress = {
  status: 'pending',
  progress: 0,
};

const emptyControls: WorkVisualizationControls = {
  available: false,
  paused: false,
  pending: false,
  onToggle: () => undefined,
  onCancel: () => undefined,
};

type WorkVisualizationControlState = Pick<WorkVisualizationControls, 'available' | 'paused' | 'pending'>;

const emptyControlState: WorkVisualizationControlState = {
  available: false,
  paused: false,
  pending: false,
};

type WorkProgressContextValue = {
  progress: WorkVisualizationProgress;
  setProgress: (next: WorkVisualizationProgress) => void;
  controls: WorkVisualizationControls;
  setControls: (next: WorkVisualizationControls) => void;
};

const WorkProgressContext = createContext<WorkProgressContextValue | null>(null);

export function WorkProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgressState] = useState<WorkVisualizationProgress>(initialProgress);
  const [controlState, setControlState] = useState<WorkVisualizationControlState>(emptyControlState);
  const controlHandlersRef = useRef<Pick<WorkVisualizationControls, 'onToggle' | 'onCancel'>>(emptyControls);

  const setProgress = useCallback((next: WorkVisualizationProgress) => {
    setProgressState((current) => (
      current.status === next.status
      && current.stepNumber === next.stepNumber
      && current.progress === next.progress
        ? current
        : next
    ));
  }, []);

  const setControls = useCallback((next: WorkVisualizationControls) => {
    controlHandlersRef.current = { onToggle: next.onToggle, onCancel: next.onCancel };
    setControlState((current) => (
      current.available === next.available
      && current.paused === next.paused
      && current.pending === next.pending
        ? current
        : { available: next.available, paused: next.paused, pending: next.pending }
    ));
  }, []);

  const controls = useMemo<WorkVisualizationControls>(() => ({
    ...controlState,
    onToggle: () => controlHandlersRef.current.onToggle(),
    onCancel: () => controlHandlersRef.current.onCancel(),
  }), [controlState]);

  const value = useMemo(() => ({ progress, setProgress, controls, setControls }), [controls, progress, setControls, setProgress]);
  return <WorkProgressContext.Provider value={value}>{children}</WorkProgressContext.Provider>;
}

export function useWorkProgress() {
  const context = useContext(WorkProgressContext);
  if (!context) throw new Error('useWorkProgress must be used within WorkProgressProvider');
  return context;
}
