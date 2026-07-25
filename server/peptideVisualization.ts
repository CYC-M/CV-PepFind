/**
 * Peptide visualization service
 * Provides 3D structure prediction, sequence property analysis, and secondary structure prediction
 */

// Hydrophobicity scale (Kyte-Doolittle)
const HYDROPHOBICITY_SCALE: Record<string, number> = {
  A: 1.8, R: -4.5, N: -3.5, D: -3.5, C: 2.5, Q: -3.5, E: -3.5, G: -0.4, H: -3.2,
  I: 4.5, L: 3.8, K: -3.9, M: 1.9, F: 2.8, P: -1.6, S: -0.8, T: -0.7, W: -0.9,
  Y: -1.3, V: 4.2,
};

// Charge at pH 7
const CHARGE_SCALE: Record<string, number> = {
  A: 0, R: 1, N: 0, D: -1, C: 0, Q: 0, E: -1, G: 0, H: 0.1, I: 0, L: 0, K: 1,
  M: 0, F: 0, P: 0, S: 0, T: 0, W: 0, Y: 0, V: 0,
};

// Polarity
const POLARITY_SCALE: Record<string, number> = {
  A: 0, R: 1, N: 1, D: 1, C: 0, Q: 1, E: 1, G: 0, H: 0.5, I: 0, L: 0, K: 1,
  M: 0, F: 0, P: 0, S: 1, T: 1, W: 0, Y: 0.5, V: 0,
};

// Aromaticity
const AROMATICITY_SCALE: Record<string, number> = {
  A: 0, R: 0, N: 0, D: 0, C: 0, Q: 0, E: 0, G: 0, H: 1, I: 0, L: 0, K: 0,
  M: 0, F: 1, P: 0, S: 0, T: 0, W: 1, Y: 1, V: 0,
};

export interface PeptideProperties {
  hydrophobicity: number[];
  charge: number[];
  polarity: number[];
  aromaticity: number[];
  avgHydrophobicity: number;
  avgCharge: number;
  isoelectricPoint: number;
}

export interface SecondaryStructure {
  helix: number;
  sheet: number;
  coil: number;
  prediction: string;
}

export interface StructurePrediction {
  sequence: string;
  pdbContent?: string;
  confidence: number;
  method: string;
}

export interface PeptideVisualization {
  sequence: string;
  properties: PeptideProperties;
  secondaryStructure: SecondaryStructure;
  structure3d?: StructurePrediction;
  timestamp: number;
}

/**
 * Calculate sequence properties using standard biochemical scales
 */
export function calculateSequenceProperties(sequence: string): PeptideProperties {
  const seq = sequence.toUpperCase();
  const hydrophobicity: number[] = [];
  const charge: number[] = [];
  const polarity: number[] = [];
  const aromaticity: number[] = [];

  let totalHydro = 0;
  let totalCharge = 0;

  for (let i = 0; i < seq.length; i++) {
    const aa = seq[i];
    const hydro = HYDROPHOBICITY_SCALE[aa] || 0;
    const ch = CHARGE_SCALE[aa] || 0;
    const pol = POLARITY_SCALE[aa] || 0;
    const arom = AROMATICITY_SCALE[aa] || 0;

    hydrophobicity.push(hydro);
    charge.push(ch);
    polarity.push(pol);
    aromaticity.push(arom);

    totalHydro += hydro;
    totalCharge += ch;
  }

  const isoelectricPoint = 7 - totalCharge / seq.length;

  return {
    hydrophobicity,
    charge,
    polarity,
    aromaticity,
    avgHydrophobicity: totalHydro / seq.length,
    avgCharge: totalCharge / seq.length,
    isoelectricPoint: Math.max(3, Math.min(11, isoelectricPoint)),
  };
}

/**
 * Predict secondary structure using simple heuristics
 */
export function predictSecondaryStructure(sequence: string): SecondaryStructure {
  const seq = sequence.toUpperCase();
  let prediction = "";

  const helixFormers = new Set(["A", "E", "L", "M"]);
  const sheetFormers = new Set(["V", "I", "Y", "F", "W"]);

  for (let i = 0; i < seq.length; i++) {
    const aa = seq[i];
    if (helixFormers.has(aa)) {
      prediction += "H";
    } else if (sheetFormers.has(aa)) {
      prediction += "E";
    } else {
      prediction += "C";
    }
  }

  const helixCount = (prediction.match(/H/g) || []).length;
  const sheetCount = (prediction.match(/E/g) || []).length;
  const coilCount = (prediction.match(/C/g) || []).length;

  return {
    helix: helixCount / seq.length,
    sheet: sheetCount / seq.length,
    coil: coilCount / seq.length,
    prediction,
  };
}

/**
 * Generate placeholder PDB content for visualization
 */
function generatePlaceholderPDB(sequence: string): string {
  let pdbContent = "HEADER    PEPTIDE STRUCTURE\n";
  pdbContent += `TITLE     PEPTIDE STRUCTURE FOR ${sequence}\n`;
  pdbContent += "REMARK    This is a placeholder structure\n";

  const seq = sequence.toUpperCase();
  let atomNum = 1;

  for (let i = 0; i < Math.min(seq.length, 50); i++) {
    const x = i * 3.6;
    const y = Math.cos((i * 2 * Math.PI) / 3.6) * 2.3;
    const z = Math.sin((i * 2 * Math.PI) / 3.6) * 2.3;

    pdbContent += `ATOM  ${String(atomNum).padStart(5, " ")}  CA  ${seq[i]}   A${String(i + 1).padStart(4, " ")}    ${x.toFixed(3).padStart(8, " ")} ${y.toFixed(3).padStart(8, " ")} ${z.toFixed(3).padStart(8, " ")}  1.00  0.00           C\n`;
    atomNum++;
  }

  pdbContent += "END\n";
  return pdbContent;
}

/**
 * Predict 3D structure
 */
export async function predict3DStructure(sequence: string): Promise<StructurePrediction> {
  return {
    sequence,
    confidence: 0.7,
    method: "esm-fold-placeholder",
    pdbContent: generatePlaceholderPDB(sequence),
  };
}

/**
 * Get complete peptide visualization data
 */
export async function getPeptideVisualization(
  sequence: string
): Promise<PeptideVisualization> {
  const properties = calculateSequenceProperties(sequence);
  const secondaryStructure = predictSecondaryStructure(sequence);
  const structure3d = await predict3DStructure(sequence);

  return {
    sequence,
    properties,
    secondaryStructure,
    structure3d,
    timestamp: Date.now(),
  };
}

/**
 * Validate peptide sequence
 */
export function isValidPeptideSequence(sequence: string): boolean {
  const validAA = /^[ACDEFGHIKLMNPQRSTVWY]+$/i;
  return validAA.test(sequence) && sequence.length >= 3 && sequence.length <= 100;
}
