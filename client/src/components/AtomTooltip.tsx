import { motion, AnimatePresence } from 'framer-motion';
import { Atom, Zap } from 'lucide-react';
import type { AtomInfo } from '@/lib/atomHoverDetector';
import { formatAtomInfo } from '@/lib/atomHoverDetector';

interface AtomTooltipProps {
  atom: AtomInfo | null;
  position: { x: number; y: number };
  visible: boolean;
  nearbyAtoms?: AtomInfo[];
}

export function AtomTooltip({
  atom,
  position,
  visible,
  nearbyAtoms = [],
}: AtomTooltipProps) {
  if (!atom || !visible) return null;

  const { title, details } = formatAtomInfo(atom);

  return (
    <AnimatePresence>
      {visible && atom && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${position.x + 12}px`,
            top: `${position.y + 12}px`,
          }}
        >
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3 max-w-xs">
            {/* Header */}
            <div className="flex items-start gap-2 mb-2 pb-2 border-b border-border/50">
              <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Atom className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground truncate">
                  {title}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {atom.hetflag ? 'Heteroatom' : 'Standard Atom'}
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-1.5 mb-2">
              {details.map((detail, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {detail.label}:
                  </span>
                  <span className="text-xs text-foreground font-mono truncate">
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Nearby Atoms */}
            {nearbyAtoms.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Nearby atoms ({nearbyAtoms.length})
                  </p>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {nearbyAtoms.slice(0, 5).map((nearby, idx) => (
                    <div
                      key={idx}
                      className="text-xs bg-muted/50 rounded px-2 py-1 flex items-center justify-between"
                    >
                      <span className="font-mono truncate">
                        {nearby.atom} ({nearby.element})
                      </span>
                      <span className="text-muted-foreground ml-1 flex-shrink-0">
                        {(
                          Math.sqrt(
                            Math.pow(atom.x - nearby.x, 2) +
                              Math.pow(atom.y - nearby.y, 2) +
                              Math.pow(atom.z - nearby.z, 2)
                          )
                        ).toFixed(2)}
                        Å
                      </span>
                    </div>
                  ))}
                  {nearbyAtoms.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      +{nearbyAtoms.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-2 pt-2 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground text-center">
                Press H to toggle • Click to pin
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
