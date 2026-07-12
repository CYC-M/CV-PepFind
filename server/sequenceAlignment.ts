/**
 * Sequence Alignment and Structure Comparison Utilities
 * Implements Smith-Waterman alignment, RMSD calculation, and similarity scoring
 */

/**
 * Amino acid similarity matrix (BLOSUM62 simplified)
 */
const BLOSUM62: Record<string, Record<string, number>> = {
  A: { A: 4, R: -1, N: -2, D: -2, C: 0, Q: -1, E: -1, G: 0, H: -2, I: -1, L: -1, K: -1, M: -1, F: -2, P: -1, S: 1, T: 0, W: -3, Y: -2, V: 0 },
  R: { A: -1, R: 5, N: 0, D: -2, C: -3, Q: 1, E: 0, G: -2, H: 0, I: -3, L: -2, K: 2, M: -1, F: -3, P: -2, S: -1, T: -1, W: -3, Y: -2, V: -3 },
  N: { A: -2, R: 0, N: 6, D: 1, C: -3, Q: 0, E: 0, G: 0, H: 1, I: -3, L: -3, K: 0, M: -2, F: -3, P: -2, S: 1, T: 0, W: -4, Y: -2, V: -3 },
  D: { A: -2, R: -2, N: 1, D: 6, C: -3, Q: 0, E: 2, G: -1, H: -1, I: -3, L: -4, K: -1, M: -3, F: -3, P: -1, S: 0, T: -1, W: -4, Y: -3, V: -3 },
  C: { A: 0, R: -3, N: -3, D: -3, C: 9, Q: -3, E: -4, G: -3, H: -3, I: -1, L: -1, K: -3, M: -1, F: -2, P: -3, S: -1, T: -1, W: -2, Y: -2, V: -1 },
  Q: { A: -1, R: 1, N: 0, D: 0, C: -3, Q: 5, E: 2, G: -2, H: 0, I: -3, L: -2, K: 1, M: 0, F: -3, P: -1, S: 0, T: -1, W: -2, Y: -1, V: -2 },
  E: { A: -1, R: 0, N: 0, D: 2, C: -4, Q: 2, E: 5, G: -2, H: 0, I: -3, L: -3, K: 1, M: -2, F: -3, P: -1, S: 0, T: -1, W: -3, Y: -2, V: -2 },
  G: { A: 0, R: -2, N: 0, D: -1, C: -3, Q: -2, E: -2, G: 6, H: -2, I: -4, L: -4, K: -2, M: -3, F: -3, P: -2, S: 0, T: -2, W: -2, Y: -3, V: -3 },
  H: { A: -2, R: 0, N: 1, D: -1, C: -3, Q: 0, E: 0, G: -2, H: 8, I: -3, L: -3, K: -1, M: -2, F: -1, P: -2, S: -1, T: -2, W: -2, Y: 2, V: -3 },
  I: { A: -1, R: -3, N: -3, D: -3, C: -1, Q: -3, E: -3, G: -4, H: -3, I: 4, L: 2, K: -3, M: 1, F: 0, P: -3, S: -2, T: -1, W: -3, Y: -1, V: 3 },
  L: { A: -1, R: -2, N: -3, D: -4, C: -1, Q: -2, E: -3, G: -4, H: -3, I: 2, L: 4, K: -2, M: 2, F: 0, P: -3, S: -2, T: -1, W: -2, Y: -1, V: 1 },
  K: { A: -1, R: 2, N: 0, D: -1, C: -3, Q: 1, E: 1, G: -2, H: -1, I: -3, L: -2, K: 5, M: -1, F: -3, P: -1, S: 0, T: -1, W: -3, Y: -2, V: -2 },
  M: { A: -1, R: -1, N: -2, D: -3, C: -1, Q: 0, E: -2, G: -3, H: -2, I: 1, L: 2, K: -1, M: 5, F: 0, P: -2, S: -1, T: -1, W: -1, Y: -1, V: 1 },
  F: { A: -2, R: -3, N: -3, D: -3, C: -2, Q: -3, E: -3, G: -3, H: -1, I: 0, L: 0, K: -3, M: 0, F: 6, P: -4, S: -2, T: -2, W: 1, Y: 3, V: -1 },
  P: { A: -1, R: -2, N: -2, D: -1, C: -3, Q: -1, E: -1, G: -2, H: -2, I: -3, L: -3, K: -1, M: -2, F: -4, P: 7, S: -1, T: -1, W: -4, Y: -3, V: -2 },
  S: { A: 1, R: -1, N: 1, D: 0, C: -1, Q: 0, E: 0, G: 0, H: -1, I: -2, L: -2, K: 0, M: -1, F: -2, P: -1, S: 4, T: 1, W: -3, Y: -2, V: -2 },
  T: { A: 0, R: -1, N: 0, D: -1, C: -1, Q: -1, E: -1, G: -2, H: -2, I: -1, L: -1, K: -1, M: -1, F: -2, P: -1, S: 1, T: 5, W: -2, Y: -2, V: 0 },
  W: { A: -3, R: -3, N: -4, D: -4, C: -2, Q: -2, E: -3, G: -2, H: -2, I: -3, L: -2, K: -3, M: -1, F: 1, P: -4, S: -3, T: -2, W: 11, Y: 2, V: -3 },
  Y: { A: -2, R: -2, N: -2, D: -3, C: -2, Q: -1, E: -2, G: -3, H: 2, I: -1, L: -1, K: -2, M: -1, F: 3, P: -3, S: -2, T: -2, W: 2, Y: 7, V: -1 },
  V: { A: 0, R: -3, N: -3, D: -3, C: -1, Q: -2, E: -2, G: -3, H: -3, I: 3, L: 1, K: -2, M: 1, F: -1, P: -2, S: -2, T: 0, W: -3, Y: -1, V: 4 },
};

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
 * Smith-Waterman local sequence alignment
 */
export function smithWatermanAlignment(
  seq1: string,
  seq2: string,
  gapPenalty: number = -2,
  extendPenalty: number = -1
): AlignmentResult {
  const m = seq1.length;
  const n = seq2.length;

  // Initialize scoring matrix
  const H: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  let maxScore = 0;
  let maxI = 0;
  let maxJ = 0;

  // Fill scoring matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const match = seq1[i - 1] === seq2[j - 1] ? 2 : -1;
      const diag = H[i - 1][j - 1] + match;
      const up = H[i - 1][j] + gapPenalty;
      const left = H[i][j - 1] + gapPenalty;

      H[i][j] = Math.max(0, diag, up, left);

      if (H[i][j] > maxScore) {
        maxScore = H[i][j];
        maxI = i;
        maxJ = j;
      }
    }
  }

  // Traceback to get alignment
  let alignment1 = '';
  let alignment2 = '';
  let matchPositions: number[] = [];
  let i = maxI;
  let j = maxJ;
  let matchCount = 0;

  while (i > 0 && j > 0 && H[i][j] > 0) {
    const match = seq1[i - 1] === seq2[j - 1] ? 2 : -1;
    const diag = H[i - 1][j - 1] + match;
    const up = H[i - 1][j] + gapPenalty;
    const left = H[i][j - 1] + gapPenalty;

    if (H[i][j] === diag) {
      alignment1 = seq1[i - 1] + alignment1;
      alignment2 = seq2[j - 1] + alignment2;
      if (seq1[i - 1] === seq2[j - 1]) {
        matchPositions.push(matchCount);
      }
      matchCount++;
      i--;
      j--;
    } else if (H[i][j] === up) {
      alignment1 = seq1[i - 1] + alignment1;
      alignment2 = '-' + alignment2;
      matchCount++;
      i--;
    } else {
      alignment1 = '-' + alignment1;
      alignment2 = seq2[j - 1] + alignment2;
      matchCount++;
      j--;
    }
  }

  const identity = matchPositions.length;
  const alignmentLength = alignment1.length;
  const gapCount = (alignment1.match(/-/g) || []).length;

  return {
    seq1,
    seq2,
    alignment1,
    alignment2,
    score: maxScore,
    identity,
    similarity: alignmentLength > 0 ? (identity / alignmentLength) * 100 : 0,
    gaps: gapCount,
    matchPositions,
  };
}

/**
 * Calculate RMSD (Root Mean Square Deviation) between two coordinate sets
 */
export function calculateRMSD(
  coords1: Array<{ x: number; y: number; z: number }>,
  coords2: Array<{ x: number; y: number; z: number }>
): RMSDResult {
  if (coords1.length !== coords2.length || coords1.length === 0) {
    return {
      rmsd: 0,
      alignedLength: 0,
      mismatchCount: 0,
      identityPercent: 0,
    };
  }

  // Calculate centroid
  const centroid1 = calculateCentroid(coords1);
  const centroid2 = calculateCentroid(coords2);

  // Translate to origin
  const translated1 = coords1.map((c) => ({
    x: c.x - centroid1.x,
    y: c.y - centroid1.y,
    z: c.z - centroid1.z,
  }));

  const translated2 = coords2.map((c) => ({
    x: c.x - centroid2.x,
    y: c.y - centroid2.y,
    z: c.z - centroid2.z,
  }));

  // Calculate sum of squared distances
  let sumSquaredDist = 0;
  for (let i = 0; i < translated1.length; i++) {
    const dx = translated1[i].x - translated2[i].x;
    const dy = translated1[i].y - translated2[i].y;
    const dz = translated1[i].z - translated2[i].z;
    sumSquaredDist += dx * dx + dy * dy + dz * dz;
  }

  const rmsd = Math.sqrt(sumSquaredDist / coords1.length);

  return {
    rmsd,
    alignedLength: coords1.length,
    mismatchCount: 0,
    identityPercent: 100 - (rmsd * 10), // Rough estimate
  };
}

/**
 * Calculate centroid of coordinate set
 */
function calculateCentroid(coords: Array<{ x: number; y: number; z: number }>): {
  x: number;
  y: number;
  z: number;
} {
  const sum = coords.reduce(
    (acc, c) => ({
      x: acc.x + c.x,
      y: acc.y + c.y,
      z: acc.z + c.z,
    }),
    { x: 0, y: 0, z: 0 }
  );

  return {
    x: sum.x / coords.length,
    y: sum.y / coords.length,
    z: sum.z / coords.length,
  };
}

/**
 * Calculate similarity score based on sequence alignment and RMSD
 */
export function calculateSimilarityScore(
  alignment: AlignmentResult,
  rmsd: RMSDResult
): SimilarityScore {
  // Sequence similarity (0-100)
  const sequenceSimilarity = alignment.similarity;

  // Structural similarity based on RMSD (0-100)
  // Lower RMSD = higher similarity
  const structuralSimilarity = Math.max(0, 100 - rmsd.rmsd * 10);

  // Overall score (weighted average)
  const overallScore = sequenceSimilarity * 0.6 + structuralSimilarity * 0.4;

  let description = '';
  if (overallScore >= 80) {
    description = 'Very similar';
  } else if (overallScore >= 60) {
    description = 'Similar';
  } else if (overallScore >= 40) {
    description = 'Moderately similar';
  } else if (overallScore >= 20) {
    description = 'Weakly similar';
  } else {
    description = 'Dissimilar';
  }

  return {
    sequenceSimilarity,
    structuralSimilarity,
    overallScore,
    description,
  };
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
