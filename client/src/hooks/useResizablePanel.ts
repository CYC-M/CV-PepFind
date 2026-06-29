import { useState, useCallback, useEffect } from 'react';

interface UseResizablePanelOptions {
  minPercent?: number;  // Minimum width as % of screen
  maxPercent?: number;  // Maximum width as % of screen
  defaultPercent?: number;  // Default width as % of screen
  storageKey?: string;  // localStorage key for persistence
}

export function useResizablePanel({
  minPercent = 30,
  maxPercent = 50,
  defaultPercent = 40,
  storageKey = 'sidebar-width',
}: UseResizablePanelOptions = {}) {
  const [widthPercent, setWidthPercent] = useState<number>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed) && parsed >= minPercent && parsed <= maxPercent) {
          return parsed;
        }
      }
    }
    return defaultPercent;
  });

  const [isResizing, setIsResizing] = useState(false);

  // Handle mouse move during resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const newWidthPercent = (e.clientX / window.innerWidth) * 100;
    const constrainedWidth = Math.max(minPercent, Math.min(maxPercent, newWidthPercent));
    setWidthPercent(constrainedWidth);
  }, [isResizing, minPercent, maxPercent]);

  // Handle mouse up to stop resizing
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Start resizing
  const startResize = useCallback(() => {
    setIsResizing(true);
  }, []);

  // Persist width to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, widthPercent.toString());
    }
  }, [widthPercent, storageKey]);

  // Add/remove event listeners
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'auto';
        document.body.style.userSelect = 'auto';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return {
    widthPercent,
    isResizing,
    startResize,
    widthPx: (widthPercent / 100) * window.innerWidth,
  };
}
