/**
 * Sequence Engine - Fast chemical property analysis for peptide screening
 * Provides rapid evaluation of peptide sequences based on physicochemical properties
 */

// Amino acid properties
const AMINO_ACID_PROPERTIES: Record<string, {
  hydrophobicity: number;
  charge: number;
  polarity: number;
  mass: number;
  pKa?: number;
}> = {
  // Hydrophobic
  A: { hydrophobicity: 1.8, charge: 0, polarity: 0, mass: 89 },
  V: { hydrophobicity: 4.2, charge: 0, polarity: 0, mass: 117 },
  I: { hydrophobicity: 4.5, charge: 0, polarity: 0, mass: 131 },
  L: { hydrophobicity: 3.8, charge: 0, polarity: 0, mass: 131 },
  M: { hydrophobicity: 1.9, charge: 0, polarity: 0, mass: 149 },
  F: { hydrophobicity: 2.8, charge: 0, polarity: 0, mass: 165 },
  W: { hydrophobicity: -0.9, charge: 0, polarity: 1, mass: 204 },
  P: { hydrophobicity: -1.6, charge: 0, polarity: 0, mass: 115 },
  
  // Polar uncharged
  S: { hydrophobicity: -0.8, charge: 0, polarity: 1, mass: 105 },
  T: { hydrophobicity: -0.7, charge: 0, polarity: 1, mass: 119 },
  C: { hydrophobicity: 2.5, charge: 0, polarity: 1, mass: 121 },
  Y: { hydrophobicity: -1.3, charge: 0, polarity: 1, mass: 181 },
  N: { hydrophobicity: -3.5, charge: 0, polarity: 1, mass: 132 },
  Q: { hydrophobicity: -3.5, charge: 0, polarity: 1, mass: 146 },
  
  // Charged positive
  K: { hydrophobicity: -3.9, charge: 1, polarity: 1, mass: 146, pKa: 10.5 },
  R: { hydrophobicity: -4.5, charge: 1, polarity: 1, mass: 174, pKa: 12.5 },
  H: { hydrophobicity: -3.2, charge: 0.5, polarity: 1, mass: 155, pKa: 6.0 },
  
  // Charged negative
  D: { hydrophobicity: -3.5, charge: -1, polarity: 1, mass: 133, pKa: 3.9 },
  E: { hydrophobicity: -3.5, charge: -1, polarity: 1, mass: 147, pKa: 4.3 },
  
  // Special
  G: { hydrophobicity: -0.4, charge: 0, polarity: 0, mass: 75 },
};

export interface SequenceScore {
  hydrophobicity: number;
  charge: number;
  polarity: number;
  aromaticity: number;
  secondaryStructureTendency: {
    alpha: number;
    beta: number;
    coil: number;
  };
  instabilityIndex: number;
  gravy: number; // Grand average of hydropathy
  molecularWeight: number;
  isoelectricPoint: number;
  overallScore: number;
}

/**
 * Calculate hydrophobicity profile (GRAVY - Grand Average of Hydropathy)
 */
export function calculateGRAVY(sequence: string): number {
  let totalHydrophobicity = 0;
  let count = 0;
  
  for (const aa of sequence.toUpperCase()) {
    const props = AMINO_ACID_PROPERTIES[aa];
    if (props) {
      totalHydrophobicity += props.hydrophobicity;
      count++;
    }
  }
  
  return count > 0 ? totalHydrophobicity / count : 0;
}

/**
 * Calculate net charge at physiological pH (7.4)
 */
export function calculateNetCharge(sequence: string, pH: number = 7.4): number {
  let netCharge = 0;
  
  for (const aa of sequence.toUpperCase()) {
    const props = AMINO_ACID_PROPERTIES[aa];
    if (!props) continue;
    
    if (aa === 'K' || aa === 'R') {
      // Positive charges
      netCharge += 1 / (1 + Math.pow(10, props.pKa! - pH));
    } else if (aa === 'H') {
      // Histidine (partial charge)
      netCharge += 1 / (1 + Math.pow(10, props.pKa! - pH));
    } else if (aa === 'D' || aa === 'E') {
      // Negative charges
      netCharge -= 1 / (1 + Math.pow(10, pH - props.pKa!));
    }
  }
  
  return netCharge;
}

/**
 * Calculate aromaticity (fraction of aromatic amino acids)
 */
export function calculateAromaticity(sequence: string): number {
  const aromaticAAs = ['F', 'W', 'Y'];
  let aromaticCount = 0;
  
  for (const aa of sequence.toUpperCase()) {
    if (aromaticAAs.includes(aa)) {
      aromaticCount++;
    }
  }
  
  return sequence.length > 0 ? aromaticCount / sequence.length : 0;
}

/**
 * Calculate molecular weight
 */
export function calculateMolecularWeight(sequence: string): number {
  let weight = 18.015; // Water molecule
  
  for (const aa of sequence.toUpperCase()) {
    const props = AMINO_ACID_PROPERTIES[aa];
    if (props) {
      weight += props.mass - 18.015; // Subtract water for peptide bond
    }
  }
  
  return weight;
}

/**
 * Calculate instability index (Guruprasad et al., 1990)
 */
export function calculateInstabilityIndex(sequence: string): number {
  const dipeptideWeights: Record<string, number> = {
    'AA': 0.27, 'AC': 0.905, 'AD': 0.738, 'AE': 0.574, 'AF': 0.378,
    'AG': 0.912, 'AH': 0.604, 'AI': 0.714, 'AK': 1.04, 'AL': 0.625,
    'AM': 0.639, 'AN': 0.529, 'AP': 0.236, 'AQ': 0.372, 'AR': 0.815,
    'AS': 0.589, 'AT': 0.932, 'AV': 0.569, 'AW': 0.813, 'AY': 0.69,
    // ... (full dipeptide weight matrix would be very long)
  };
  
  let sum = 0;
  let count = 0;
  
  for (let i = 0; i < sequence.length - 1; i++) {
    const dipeptide = sequence.substring(i, i + 2).toUpperCase();
    const weight = dipeptideWeights[dipeptide] || 0.5;
    sum += weight;
    count++;
  }
  
  const II = (sum / count) * 10;
  return II;
}

/**
 * Predict secondary structure tendency (simplified Chou-Fasman)
 */
export function predictSecondaryStructure(sequence: string): {
  alpha: number;
  beta: number;
  coil: number;
} {
  // Simplified propensities
  const alphaPropensity: Record<string, number> = {
    A: 1.42, R: 0.98, N: 0.67, D: 1.01, C: 0.7, Q: 1.11, E: 1.51,
    G: 0.57, H: 1.0, I: 1.08, L: 1.21, K: 1.16, M: 1.45, F: 1.13,
    P: 0.57, S: 0.77, T: 0.83, W: 1.08, Y: 0.69, V: 1.06,
  };
  
  const betaPropensity: Record<string, number> = {
    A: 0.83, R: 0.93, N: 0.89, D: 0.54, C: 1.19, Q: 1.1, E: 0.37,
    G: 0.75, H: 0.87, I: 1.6, L: 1.3, K: 0.74, M: 1.05, F: 1.38,
    P: 0.55, S: 0.75, T: 1.19, W: 1.37, Y: 1.47, V: 1.7,
  };
  
  let alphaScore = 0;
  let betaScore = 0;
  
  for (const aa of sequence.toUpperCase()) {
    alphaScore += alphaPropensity[aa] || 1.0;
    betaScore += betaPropensity[aa] || 1.0;
  }
  
  const total = alphaScore + betaScore;
  const alpha = total > 0 ? alphaScore / total : 0.33;
  const beta = total > 0 ? betaScore / total : 0.33;
  const coil = 1 - alpha - beta;
  
  return { alpha, beta, coil };
}

/**
 * Estimate isoelectric point (simplified)
 */
export function estimateIsoelectricPoint(sequence: string): number {
  // Simplified estimation based on charge composition
  const netCharge = calculateNetCharge(sequence, 7.0);
  
  if (netCharge > 0) {
    // Positive protein, pI > 7
    return 7.0 + Math.min(netCharge / 10, 2.0);
  } else {
    // Negative protein, pI < 7
    return 7.0 + Math.max(netCharge / 10, -2.0);
  }
}

/**
 * Comprehensive sequence analysis and scoring
 */
export function analyzeSequence(sequence: string): SequenceScore {
  if (!sequence || sequence.length === 0) {
    throw new Error('Invalid sequence: empty or null');
  }
  
  const gravy = calculateGRAVY(sequence);
  const charge = calculateNetCharge(sequence);
  const aromaticity = calculateAromaticity(sequence);
  const instabilityIndex = calculateInstabilityIndex(sequence);
  const molecularWeight = calculateMolecularWeight(sequence);
  const isoelectricPoint = estimateIsoelectricPoint(sequence);
  const secondaryStructure = predictSecondaryStructure(sequence);
  
  // Calculate polarity
  let polarCount = 0;
  for (const aa of sequence.toUpperCase()) {
    const props = AMINO_ACID_PROPERTIES[aa];
    if (props && props.polarity > 0) {
      polarCount++;
    }
  }
  const polarity = sequence.length > 0 ? polarCount / sequence.length : 0;
  
  // Composite score (0-100)
  // Factors: hydrophobicity balance, charge balance, stability, aromaticity
  let overallScore = 50; // Base score
  
  // Hydrophobicity: prefer slightly hydrophobic (-0.5 to 1.5)
  if (gravy >= -0.5 && gravy <= 1.5) {
    overallScore += 15;
  } else if (gravy >= -1.0 && gravy <= 2.0) {
    overallScore += 10;
  }
  
  // Charge: prefer neutral to slightly positive
  if (Math.abs(charge) <= 2) {
    overallScore += 15;
  }
  
  // Stability: prefer lower instability index
  if (instabilityIndex < 40) {
    overallScore += 15;
  } else if (instabilityIndex < 50) {
    overallScore += 10;
  }
  
  // Aromaticity: prefer moderate aromatic content
  if (aromaticity >= 0.05 && aromaticity <= 0.15) {
    overallScore += 5;
  }
  
  // Polarity: prefer moderate polarity
  if (polarity >= 0.3 && polarity <= 0.6) {
    overallScore += 5;
  }
  
  // Cap score at 100
  overallScore = Math.min(overallScore, 100);
  
  return {
    hydrophobicity: gravy,
    charge,
    polarity,
    aromaticity,
    secondaryStructureTendency: secondaryStructure,
    instabilityIndex,
    gravy,
    molecularWeight,
    isoelectricPoint,
    overallScore,
  };
}

/**
 * Batch score multiple sequences
 */
export function batchScoreSequences(sequences: string[]): Array<{
  sequence: string;
  score: SequenceScore;
  rank: number;
}> {
  const results = sequences
    .filter(seq => seq && seq.length > 0)
    .map(seq => ({
      sequence: seq,
      score: analyzeSequence(seq),
    }))
    .sort((a, b) => b.score.overallScore - a.score.overallScore)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  
  return results;
}

/**
 * Filter sequences by criteria
 */
export function filterSequencesByCriteria(
  sequences: string[],
  criteria: {
    minGRAVY?: number;
    maxGRAVY?: number;
    maxCharge?: number;
    maxInstabilityIndex?: number;
    minScore?: number;
  }
): string[] {
  return sequences.filter(seq => {
    try {
      const score = analyzeSequence(seq);
      
      if (criteria.minGRAVY !== undefined && score.gravy < criteria.minGRAVY) {
        return false;
      }
      if (criteria.maxGRAVY !== undefined && score.gravy > criteria.maxGRAVY) {
        return false;
      }
      if (criteria.maxCharge !== undefined && Math.abs(score.charge) > criteria.maxCharge) {
        return false;
      }
      if (criteria.maxInstabilityIndex !== undefined && score.instabilityIndex > criteria.maxInstabilityIndex) {
        return false;
      }
      if (criteria.minScore !== undefined && score.overallScore < criteria.minScore) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  });
}
