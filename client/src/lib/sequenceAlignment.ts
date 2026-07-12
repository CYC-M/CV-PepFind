/**
 * Client-side sequence alignment and comparison utilities
 * Re-exports from server for type safety
 */

export interface AlignmentResult {
  seq1: string;
  seq2: string;
  alignment1: string;
  alignment2: string;
  score: number;
  identity: number;
  similarity: number;
  gaps: number;
  matchPositions: number[];
}

export interface RMSDResult {
  rmsd: number;
  alignedLength: number;
  mismatchCount: number;
  identityPercent: number;
}

export interface SimilarityScore {
  sequenceSimilarity: number;
  structuralSimilarity: number;
  overallScore: number;
  description: string;
}

/**
 * Format alignment for display
 */
export function formatAlignmentForDisplay(alignment: AlignmentResult): string {
  const lines: string[] = [];
  const chunkSize = 60;

  for (let i = 0; i < alignment.alignment1.length; i += chunkSize) {
    const chunk1 = alignment.alignment1.substring(i, i + chunkSize);
    const chunk2 = alignment.alignment2.substring(i, i + chunkSize);

    // Create match line
    let matchLine = '';
    for (let j = 0; j < chunk1.length; j++) {
      if (chunk1[j] === chunk2[j]) {
        matchLine += '|';
      } else if (chunk1[j] === '-' || chunk2[j] === '-') {
        matchLine += ' ';
      } else {
        matchLine += ':';
      }
    }

    lines.push(`Seq1: ${chunk1}`);
    lines.push(`      ${matchLine}`);
    lines.push(`Seq2: ${chunk2}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get alignment statistics
 */
export function getAlignmentStats(alignment: AlignmentResult): {
  alignmentLength: number;
  identityCount: number;
  identityPercent: number;
  gapCount: number;
  gapPercent: number;
} {
  const alignmentLength = alignment.alignment1.length;
  const identityCount = alignment.identity;
  const gapCount = alignment.gaps;

  return {
    alignmentLength,
    identityCount,
    identityPercent: alignmentLength > 0 ? (identityCount / alignmentLength) * 100 : 0,
    gapCount,
    gapPercent: alignmentLength > 0 ? (gapCount / alignmentLength) * 100 : 0,
  };
}
