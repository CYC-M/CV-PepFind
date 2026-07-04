import React, { useState, useCallback } from 'react';
import { Ruler, X, RotateCcw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  formatDistance,
  getMeasurementDescription,
  exportMeasurementsAsText,
  getMeasurementStats,
  type Measurement,
  type MeasurementState,
} from '@/lib/measurementTool';

interface MeasurementToolProps {
  isActive: boolean;
  measurements: Measurement[];
  selectedAtomCount: number;
  onToggle: () => void;
  onClear: () => void;
  onExport: () => void;
  onUnitChange?: (unit: 'angstrom' | 'nanometer') => void;
  currentUnit?: 'angstrom' | 'nanometer';
}

export const MeasurementTool: React.FC<MeasurementToolProps> = ({
  isActive,
  measurements,
  selectedAtomCount,
  onToggle,
  onClear,
  onExport,
  onUnitChange,
  currentUnit = 'angstrom',
}) => {
  const [expandedMeasurement, setExpandedMeasurement] = useState<number | null>(null);
  const stats = getMeasurementStats(measurements);

  const handleExport = useCallback(() => {
    const text = exportMeasurementsAsText(measurements);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `measurements-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onExport();
  }, [measurements, onExport]);

  return (
    <div className="flex flex-col gap-3 p-3 bg-background/50 rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-muted-foreground'}`} />
          <span className="text-sm font-medium">
            {isActive ? 'Measurement Mode' : 'Measurement Tool'}
          </span>
          {selectedAtomCount > 0 && (
            <span className="text-xs px-2 py-1 bg-accent/20 text-accent rounded-full">
              {selectedAtomCount}/2 atoms
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant={isActive ? 'default' : 'outline'}
          onClick={onToggle}
          className="h-7 px-2 text-xs"
        >
          {isActive ? 'Active' : 'Activate'}
        </Button>
      </div>

      {/* Instructions */}
      {isActive && (
        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
          Click two atoms in the 3D view to measure the distance between them.
        </div>
      )}

      {/* Unit Selector */}
      {measurements.length > 0 && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={currentUnit === 'angstrom' ? 'default' : 'outline'}
            onClick={() => onUnitChange?.('angstrom')}
            className="h-7 px-2 text-xs flex-1"
          >
            Ångström (Å)
          </Button>
          <Button
            size="sm"
            variant={currentUnit === 'nanometer' ? 'default' : 'outline'}
            onClick={() => onUnitChange?.('nanometer')}
            className="h-7 px-2 text-xs flex-1"
          >
            Nanometer (nm)
          </Button>
        </div>
      )}

      {/* Measurements List */}
      {measurements.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Measurements ({measurements.length})
            </span>
            {stats.count > 1 && (
              <span className="text-xs text-muted-foreground">
                Avg: {formatDistance(stats.average, stats.unit)}
              </span>
            )}
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {measurements.map((m, index) => (
              <div
                key={index}
                className="text-xs p-2 bg-muted/50 rounded border border-border/50 cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() =>
                  setExpandedMeasurement(expandedMeasurement === index ? null : index)
                }
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono">
                    {formatDistance(m.distance, m.unit)}
                  </span>
                  <span className="text-muted-foreground">#{index + 1}</span>
                </div>

                {expandedMeasurement === index && (
                  <div className="mt-1 pt-1 border-t border-border/50 text-muted-foreground">
                    <div className="text-xs">
                      {m.atom1.residue}
                      {m.atom1.resi}:{m.atom1.atom}
                    </div>
                    <div className="text-xs">↓</div>
                    <div className="text-xs">
                      {m.atom2.residue}
                      {m.atom2.resi}:{m.atom2.atom}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Statistics */}
          {stats.count > 1 && (
            <div className="text-xs p-2 bg-accent/10 rounded border border-accent/30 space-y-1">
              <div className="flex justify-between">
                <span>Min:</span>
                <span className="font-mono">{formatDistance(stats.min, stats.unit)}</span>
              </div>
              <div className="flex justify-between">
                <span>Max:</span>
                <span className="font-mono">{formatDistance(stats.max, stats.unit)}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg:</span>
                <span className="font-mono">{formatDistance(stats.average, stats.unit)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {measurements.length > 0 && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              className="h-7 px-2 text-xs flex-1"
              title="Export measurements as text"
            >
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onClear}
              className="h-7 px-2 text-xs flex-1"
              title="Clear all measurements"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </>
        )}
      </div>

      {/* Empty State */}
      {measurements.length === 0 && !isActive && (
        <div className="text-xs text-muted-foreground text-center py-2">
          No measurements yet. Activate to start.
        </div>
      )}
    </div>
  );
};

export default MeasurementTool;
