export type PeptideMetrics = {
  length: number;
  molecularWeight: number;
  netCharge: number;
  hydrophobicity: number;
  isoelectricPoint: number;
  stabilityIndex: number;
  aromaticity: number;
  secondaryStructure: {
    helix: number;
    sheet: number;
    coil: number;
    dominant: 'α-螺旋' | 'β-折叠' | '无规卷曲';
  };
};

const RESIDUE_MASS: Record<string, number> = {
  A: 71.08, R: 156.19, N: 114.10, D: 115.09, C: 103.15,
  E: 129.12, Q: 128.13, G: 57.05, H: 137.14, I: 113.16,
  L: 113.16, K: 128.17, M: 131.19, F: 147.18, P: 97.12,
  S: 87.08, T: 101.11, W: 186.21, Y: 163.18, V: 99.13,
};

const HYDROPATHY: Record<string, number> = {
  A: 1.8, R: -4.5, N: -3.5, D: -3.5, C: 2.5,
  E: -3.5, Q: -3.5, G: -0.4, H: -3.2, I: 4.5,
  L: 3.8, K: -3.9, M: 1.9, F: 2.8, P: -1.6,
  S: -0.8, T: -0.7, W: -0.9, Y: -1.3, V: 4.2,
};

const HELIX_RESIDUES = new Set(['A', 'L', 'M', 'Q', 'E', 'K', 'R', 'H']);
const SHEET_RESIDUES = new Set(['V', 'I', 'Y', 'F', 'W', 'T', 'C']);
const COIL_RESIDUES = new Set(['G', 'P', 'S', 'N', 'D']);
const AROMATIC_RESIDUES = new Set(['F', 'W', 'Y']);

function count(sequence: string, residues: Set<string>) {
  return sequence.split('').filter((residue) => residues.has(residue)).length;
}

/**
 * Calculates client-safe, deterministic peptide descriptors for ranking details.
 * Values are screening estimates and are intentionally labelled as such in the UI.
 */
export function calculatePeptideMetrics(input: string): PeptideMetrics {
  const sequence = input.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
  const length = sequence.length;

  if (length === 0) {
    return {
      length: 0,
      molecularWeight: 0,
      netCharge: 0,
      hydrophobicity: 0,
      isoelectricPoint: 7,
      stabilityIndex: 0,
      aromaticity: 0,
      secondaryStructure: { helix: 0, sheet: 0, coil: 0, dominant: '无规卷曲' },
    };
  }

  const residues = sequence.split('');
  const residueCounts = residues.reduce<Record<string, number>>((accumulator, residue) => {
    accumulator[residue] = (accumulator[residue] ?? 0) + 1;
    return accumulator;
  }, {});
  const totalMass = residues.reduce((sum, residue) => sum + RESIDUE_MASS[residue], 18.015) - (length - 1) * 18.015;
  const hydrophobicity = residues.reduce((sum, residue) => sum + HYDROPATHY[residue], 0) / length;
  const netCharge = (residueCounts.K ?? 0) + (residueCounts.R ?? 0) + (residueCounts.H ?? 0) * 0.1
    - (residueCounts.D ?? 0) - (residueCounts.E ?? 0);
  const isoelectricPoint = Math.max(2, Math.min(12, 7 + netCharge * 0.42));
  const aromaticity = count(sequence, AROMATIC_RESIDUES) / length;
  const helix = count(sequence, HELIX_RESIDUES) / length;
  const sheet = count(sequence, SHEET_RESIDUES) / length;
  const coil = count(sequence, COIL_RESIDUES) / length;
  const dominant = helix >= sheet && helix >= coil ? 'α-螺旋' : sheet >= coil ? 'β-折叠' : '无规卷曲';
  const chargedFraction = ((residueCounts.K ?? 0) + (residueCounts.R ?? 0) + (residueCounts.D ?? 0) + (residueCounts.E ?? 0)) / length;
  const stabilityIndex = Math.max(0, Math.min(100, 76 - Math.abs(hydrophobicity) * 7 - chargedFraction * 18 + aromaticity * 9));

  return {
    length,
    molecularWeight: totalMass,
    netCharge,
    hydrophobicity,
    isoelectricPoint,
    stabilityIndex,
    aromaticity,
    secondaryStructure: { helix, sheet, coil, dominant },
  };
}
