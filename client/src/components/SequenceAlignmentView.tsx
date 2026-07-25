import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ColoredAlignmentDisplay } from './ColoredAlignmentDisplay';
import { PeptideLink } from './PeptideLink';
import type { AlignmentResult, RMSDResult, SimilarityScore } from '@/lib/sequenceAlignment';
import { formatAlignmentForDisplay, getAlignmentStats } from '@/lib/sequenceAlignment';

interface SequenceAlignmentViewProps {
  alignment: AlignmentResult;
  rmsd?: RMSDResult;
  similarity?: SimilarityScore;
  isLoading?: boolean;
}

export function SequenceAlignmentView({
  alignment,
  rmsd,
  similarity,
  isLoading = false,
}: SequenceAlignmentViewProps) {
  const stats = useMemo(() => getAlignmentStats(alignment), [alignment]);

  const formattedAlignment = useMemo(
    () => formatAlignmentForDisplay(alignment),
    [alignment]
  );

  const getSimilarityColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500/20 text-green-700 border-green-300';
    if (score >= 60) return 'bg-blue-500/20 text-blue-700 border-blue-300';
    if (score >= 40) return 'bg-yellow-500/20 text-yellow-700 border-yellow-300';
    if (score >= 20) return 'bg-orange-500/20 text-orange-700 border-orange-300';
    return 'bg-red-500/20 text-red-700 border-red-300';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Sequence Alignment</span>
          {similarity && (
            <Badge className={`${getSimilarityColor(similarity.overallScore)}`}>
              {similarity.overallScore.toFixed(1)}% {similarity.description}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Alignment of candidate peptide with reference structure
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted p-3 rounded-lg">
            <div className="text-xs text-muted-foreground">Alignment Length</div>
            <div className="text-lg font-semibold">{stats.alignmentLength}</div>
          </div>
          <div className="bg-muted p-3 rounded-lg">
            <div className="text-xs text-muted-foreground">Identity</div>
            <div className="text-lg font-semibold">{stats.identityPercent.toFixed(1)}%</div>
          </div>
          <div className="bg-muted p-3 rounded-lg">
            <div className="text-xs text-muted-foreground">Gaps</div>
            <div className="text-lg font-semibold">{stats.gapPercent.toFixed(1)}%</div>
          </div>
          {rmsd && (
            <div className="bg-muted p-3 rounded-lg">
              <div className="text-xs text-muted-foreground">RMSD</div>
              <div className="text-lg font-semibold">{rmsd.rmsd.toFixed(2)} Å</div>
            </div>
          )}
        </div>

        {/* Detailed Scores */}
        {similarity && (
          <div className="grid grid-cols-3 gap-3">
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Sequence Similarity</div>
              <div className="text-2xl font-bold text-blue-600">
                {similarity.sequenceSimilarity.toFixed(1)}%
              </div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Structural Similarity</div>
              <div className="text-2xl font-bold text-green-600">
                {similarity.structuralSimilarity.toFixed(1)}%
              </div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Overall Score</div>
              <div className="text-2xl font-bold text-purple-600">
                {similarity.overallScore.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Alignment Tabs */}
        <Tabs defaultValue="alignment" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="alignment">Alignment</TabsTrigger>
            <TabsTrigger value="sequences">Sequences</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* Alignment View */}
          <TabsContent value="alignment" className="space-y-2">
            <ColoredAlignmentDisplay alignment={alignment} />
          </TabsContent>

          {/* Sequences View */}
          <TabsContent value="sequences" className="space-y-3">
            <div className="space-y-2">
              <div className="text-sm font-semibold">Candidate Sequence</div>
              <ScrollArea className="w-full h-20 border rounded-lg p-3 bg-muted/50">
                <code className="text-xs font-mono break-all">
                  <PeptideLink sequence={alignment.seq1} />
                </code>
              </ScrollArea>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold">Reference Sequence</div>
              <ScrollArea className="w-full h-20 border rounded-lg p-3 bg-muted/50">
                <code className="text-xs font-mono break-all">
                  <PeptideLink sequence={alignment.seq2} />
                </code>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Details View */}
          <TabsContent value="details" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Alignment Score</div>
                <div className="text-xl font-semibold">{alignment.score}</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Identical Positions</div>
                <div className="text-xl font-semibold">
                  {alignment.identity}/{stats.alignmentLength}
                </div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Gap Count</div>
                <div className="text-xl font-semibold">{stats.gapCount}</div>
              </div>
              {rmsd && (
                <div className="border rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">Aligned Length</div>
                  <div className="text-xl font-semibold">{rmsd.alignedLength}</div>
                </div>
              )}
            </div>

            {similarity && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="font-semibold mb-2">Interpretation</div>
                <p className="text-sm text-muted-foreground">
                  {similarity.description}. The candidate peptide shows{' '}
                  <span className="font-semibold">
                    {similarity.sequenceSimilarity.toFixed(1)}%
                  </span>{' '}
                  sequence similarity and{' '}
                  <span className="font-semibold">
                    {similarity.structuralSimilarity.toFixed(1)}%
                  </span>{' '}
                  structural similarity to the reference structure.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Legend */}
        <div className="border-t pt-3 text-xs text-muted-foreground">
          <div className="font-semibold mb-2">Legend:</div>
          <ul className="space-y-1">
            <li>
              <span className="font-mono">|</span> = identical residues
            </li>
            <li>
              <span className="font-mono">:</span> = similar residues
            </li>
            <li>
              <span className="font-mono">-</span> = gaps/insertions/deletions
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
