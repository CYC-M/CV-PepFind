import { useState, useCallback } from 'react';
import { RotateCcw, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ViewControlPanelProps {
  onResetView: () => void;
  onToggleAutoSpin: (isSpinning: boolean) => void;
  disabled?: boolean;
}

export function ViewControlPanel({
  onResetView,
  onToggleAutoSpin,
  disabled = false,
}: ViewControlPanelProps) {
  const [isSpinning, setIsSpinning] = useState(false);

  const handleResetView = useCallback(() => {
    onResetView();
  }, [onResetView]);

  const handleToggleSpin = useCallback(() => {
    const newState = !isSpinning;
    setIsSpinning(newState);
    onToggleAutoSpin(newState);
  }, [isSpinning, onToggleAutoSpin]);

  return (
    <div className="flex items-center gap-1.5">
      {/* Reset View Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetView}
            disabled={disabled}
            className="h-8 px-2 text-xs font-medium transition-all hover:bg-muted"
            title="Reset view (R)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="ml-1">复位</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p className="font-medium">重置视角</p>
          <p className="text-muted-foreground">恢复默认视角和缩放</p>
          <p className="text-muted-foreground text-[10px] mt-1">快捷键: R</p>
        </TooltipContent>
      </Tooltip>

      {/* Auto-Spin Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isSpinning ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleSpin}
            disabled={disabled}
            className={`h-8 px-2 text-xs font-medium transition-all ${
              isSpinning
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
            title={isSpinning ? 'Stop auto-spin (Space)' : 'Start auto-spin (Space)'}
          >
            {isSpinning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span className="ml-1">停止</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span className="ml-1">旋转</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p className="font-medium">
            {isSpinning ? '停止自动旋转' : '启动自动旋转'}
          </p>
          <p className="text-muted-foreground">
            {isSpinning
              ? '点击停止分子自动旋转'
              : '点击启动分子自动旋转'}
          </p>
          <p className="text-muted-foreground text-[10px] mt-1">快捷键: Space</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
