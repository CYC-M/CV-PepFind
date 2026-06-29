import { useState, useCallback, useEffect } from 'react';
import { Layers, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type RenderingStyle = 'cartoon' | 'stick' | 'surface' | 'sphere' | 'line';

interface RenderingStyleConfig {
  style: RenderingStyle;
  label: string;
  description: string;
  icon: string;
  shortcut?: string;
}

const RENDERING_STYLES: Record<RenderingStyle, RenderingStyleConfig> = {
  cartoon: {
    style: 'cartoon',
    label: '卡通',
    description: '彩虹色卡通模式，适合查看二级结构',
    icon: '🎨',
    shortcut: '1',
  },
  stick: {
    style: 'stick',
    label: '球棍',
    description: '球棍模式，显示原子和键',
    icon: '🎯',
    shortcut: '2',
  },
  surface: {
    style: 'surface',
    label: '表面',
    description: '分子表面模式，显示分子轮廓',
    icon: '🌊',
    shortcut: '3',
  },
  sphere: {
    style: 'sphere',
    label: '球体',
    description: '球体模式，显示原子球',
    icon: '⚪',
    shortcut: '4',
  },
  line: {
    style: 'line',
    label: '线条',
    description: '线条模式，轻量级渲染',
    icon: '📏',
    shortcut: '5',
  },
};

interface RenderingStyleSelectorProps {
  currentStyle: RenderingStyle;
  onStyleChange: (style: RenderingStyle) => void;
  disabled?: boolean;
}

export function RenderingStyleSelector({
  currentStyle,
  onStyleChange,
  disabled = false,
}: RenderingStyleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;

      // Check if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const styleEntries = Object.entries(RENDERING_STYLES);
      for (const [key, config] of styleEntries) {
        if (config.shortcut && e.key === config.shortcut) {
          e.preventDefault();
          onStyleChange(key as RenderingStyle);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, onStyleChange]);

  const handleStyleClick = useCallback(
    (style: RenderingStyle) => {
      onStyleChange(style);
      setIsOpen(false);
    },
    [onStyleChange]
  );

  const currentConfig = RENDERING_STYLES[currentStyle];

  return (
    <div className="flex items-center gap-2">
      {/* Quick access buttons (show first 3 styles) */}
      <div className="flex gap-1.5">
        {(['cartoon', 'stick', 'surface'] as RenderingStyle[]).map((style) => {
          const config = RENDERING_STYLES[style];
          const isActive = currentStyle === style;

          return (
            <Tooltip key={style}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStyleClick(style)}
                  disabled={disabled}
                  className={`h-8 px-2 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                  title={`${config.label} (${config.shortcut})`}
                >
                  <span className="mr-1">{config.icon}</span>
                  {config.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-medium">{config.label}</p>
                <p className="text-muted-foreground">{config.description}</p>
                {config.shortcut && (
                  <p className="text-muted-foreground text-[10px] mt-1">
                    快捷键: {config.shortcut}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Dropdown for more styles */}
      <div className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              disabled={disabled}
              className="h-8 px-2"
              title="More rendering styles"
            >
              <Layers className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>更多渲染模式</p>
          </TooltipContent>
        </Tooltip>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[200px] overflow-hidden">
            {(['sphere', 'line'] as RenderingStyle[]).map((style) => {
              const config = RENDERING_STYLES[style];
              const isActive = currentStyle === style;

              return (
                <button
                  key={style}
                  onClick={() => handleStyleClick(style)}
                  disabled={disabled}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'hover:bg-muted text-foreground'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="text-base">{config.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium">{config.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                  {config.shortcut && (
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {config.shortcut}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
