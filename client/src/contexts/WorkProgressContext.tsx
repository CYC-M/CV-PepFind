import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { WorkflowTaskStatus } from '@shared/workflowNodeStatus';

export type WorkVisualizationProgress = {
  status: WorkflowTaskStatus;
  stepNumber?: number;
  progress: number;
};

const initialProgress: WorkVisualizationProgress = {
  status: 'pending',
  progress: 0,
};

type WorkProgressContextValue = {
  progress: WorkVisualizationProgress;
  setProgress: (next: WorkVisualizationProgress) => void;
};

const WorkProgressContext = createContext<WorkProgressContextValue | null>(null);

export function WorkProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgressState] = useState<WorkVisualizationProgress>(initialProgress);

  const setProgress = useCallback((next: WorkVisualizationProgress) => {
    setProgressState((current) => (
      current.status === next.status
      && current.stepNumber === next.stepNumber
      && current.progress === next.progress
        ? current
        : next
    ));
  }, []);

  const value = useMemo(() => ({ progress, setProgress }), [progress, setProgress]);
  return <WorkProgressContext.Provider value={value}>{children}</WorkProgressContext.Provider>;
}

export function useWorkProgress() {
  const context = useContext(WorkProgressContext);
  if (!context) throw new Error('useWorkProgress must be used within WorkProgressProvider');
  return context;
}
