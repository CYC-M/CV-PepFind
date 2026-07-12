import React, { useMemo, useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AlignmentResult } from '@/lib/sequenceAlignment';

interface MatchType {
  type: 'match' | 'similar' | 'mismatch' | 'gap';
  seq1: string;
  seq2: string;
  index: number;
}

interface ColoredAlignmentDisplayProps {
  alignment: AlignmentResult;
  chunkSize?: number;
}

const MATCH_COLORS = {
  match: 'bg-green-100 text-green-900 border-green-300',
  similar: 'bg-yellow-100 text-yellow-900 border-yellow-300',
  mismatch: 'bg-red-100 text-red-900 border-red-300',
  gap: 'bg-gray-100 text-gray-600 border-gray-300',
};

const MATCH_LABELS = {
  match: 'Perfect match',
  similar: 'Similar residue',
  mismatch: 'Mismatch',
  gap: 'Gap/insertion',
};

/**
 * Classify match type between two residues
 */
function classifyMatch(seq1Char: string, seq2Char: string): MatchType['type'] {
  if (seq1Char === '-' || seq2Char === '-') {
    return 'gap';
  }
  if (seq1Char === seq2Char) {
    return 'match';
  }

  // Simple similarity check (same chemical property)
  const hydrophobic = ['A', 'V', 'I', 'L', 'M', 'F', 'W', 'P'];
  const polar = ['S', 'T', 'C', 'Y', 'N', 'Q'];
  const charged = ['D', 'E', 'K', 'R', 'H'];

  const groups = [hydrophobic, polar, charged];
  for (const group of groups) {
    if (group.includes(seq1Char) && group.includes(seq2Char)) {
      return 'similar';
    }
  }

  return 'mismatch';
}

/**
 * Generate match classification for alignment
 */
function generateMatchClassification(alignment: AlignmentResult): MatchType[] {
  const matches: MatchType[] = [];
  for (let i = 0; i < alignment.alignment1.length; i++) {
    const seq1Char = alignment.alignment1[i];
    const seq2Char = alignment.alignment2[i];
    const type = classifyMatch(seq1Char, seq2Char);

    matches.push({
      type,
      seq1: seq1Char,
      seq2: seq2Char,
      index: i,
    });
  }
  return matches;
}

export function ColoredAlignmentDisplay({
  alignment,
  chunkSize = 60,
}: ColoredAlignmentDisplayProps) {
  const [copied, setCopied] = useState(false);

  const matches = useMemo(() => generateMatchClassification(alignment), [alignment]);

  const statistics = useMemo(() => {
    const stats = {
      match: 0,
      similar: 0,
      mismatch: 0,
      gap: 0,
    };
    for (const m of matches) {
      stats[m.type]++;
    }
    return stats;
  }, [matches]);

  const handleCopyAlignment = () => {
    const text = `Seq1: ${alignment.alignment1}\nSeq2: ${alignment.alignment2}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAlignment = () => {
    const csv = [
      ['Position', 'Seq1', 'Seq2', 'Match Type'],
      ...matches.map((m) => [m.index + 1, m.seq1, m.seq2, m.type]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alignment.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-4 gap-2">
        <div className={`p-2 rounded border ${MATCH_COLORS.match}`}>
          <div className="text-xs font-semibold">Perfect</div>
          <div className="text-lg font-bold">{statistics.match}</div>
        </div>
        <div className={`p-2 rounded border ${MATCH_COLORS.similar}`}>
          <div className="text-xs font-semibold">Similar</div>
          <div className="text-lg font-bold">{statistics.similar}</div>
        </div>
        <div className={`p-2 rounded border ${MATCH_COLORS.mismatch}`}>
          <div className="text-xs font-semibold">Mismatch</div>
          <div className="text-lg font-bold">{statistics.mismatch}</div>
        </div>
        <div className={`p-2 rounded border ${MATCH_COLORS.gap}`}>
          <div className="text-xs font-semibold">Gaps</div>
          <div className="text-lg font-bold">{statistics.gap}</div>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {(Object.entries(MATCH_COLORS) as Array<[keyof typeof MATCH_COLORS, string]>).map(
          ([type, color]) => (
            <div key={type} className={`p-2 rounded border ${color}`}>
              {MATCH_LABELS[type as keyof typeof MATCH_LABELS]}
            </div>
          )
        )}
      </div>

      {/* Colored Alignment Display */}
      <div className="border rounded-lg p-4 bg-muted/30 space-y-3 font-mono text-sm">
        {Array.from({ length: Math.ceil(alignment.alignment1.length / chunkSize) }).map(
          (_, chunkIdx) => {
            const start = chunkIdx * chunkSize;
            const end = Math.min(start + chunkSize, alignment.alignment1.length);
            const chunkMatches = matches.slice(start, end);

            return (
              <div key={chunkIdx} className="space-y-1">
                {/* Seq1 */}
                <div className="flex flex-wrap gap-0.5">
                  <span className="text-xs text-muted-foreground w-12">Seq1:</span>
                  {chunkMatches.map((m) => (
                    <div
                      key={`seq1-${m.index}`}
                      className={`px-1 py-0.5 rounded border ${MATCH_COLORS[m.type]} cursor-help`}
                      title={`${m.seq1} - ${MATCH_LABELS[m.type]}`}
                    >
                      {m.seq1}
                    </div>
                  ))}
                </div>

                {/* Match Line */}
                <div className="flex flex-wrap gap-0.5">
                  <span className="text-xs text-muted-foreground w-12">Match:</span>
                  {chunkMatches.map((m) => (
                    <div key={`match-${m.index}`} className="px-1 py-0.5 text-muted-foreground">
                      {m.type === 'match' ? '|' : m.type === 'similar' ? ':' : ' '}
                    </div>
                  ))}
                </div>

                {/* Seq2 */}
                <div className="flex flex-wrap gap-0.5">
                  <span className="text-xs text-muted-foreground w-12">Seq2:</span>
                  {chunkMatches.map((m) => (
                    <div
                      key={`seq2-${m.index}`}
                      className={`px-1 py-0.5 rounded border ${MATCH_COLORS[m.type]} cursor-help`}
                      title={`${m.seq2} - ${MATCH_LABELS[m.type]}`}
                    >
                      {m.seq2}
                    </div>
                  ))}
                </div>

                {/* Position Ruler */}
                <div className="flex flex-wrap gap-0.5 text-xs text-muted-foreground">
                  <span className="w-12"></span>
                  {chunkMatches.map((m) => (
                    <div key={`pos-${m.index}`} className="px-1 py-0.5 w-7 text-center">
                      {(m.index + 1) % 10 === 0 ? m.index + 1 : ''}
                    </div>
                  ))}
                </div>
              </div>
            );
          }
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopyAlignment}
          className="gap-2"
        >
          <Copy className="w-4 h-4" />
          {copied ? 'Copied!' : 'Copy Alignment'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDownloadAlignment}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}
