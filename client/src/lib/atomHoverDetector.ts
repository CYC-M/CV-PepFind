/**
 * Atom Hover Detection for 3Dmol.js
 * Handles mouse hover detection and atom/residue information extraction
 */

export interface AtomInfo {
  atom: string;
  element: string;
  residue: string;
  chain: string;
  resi: number;
  x: number;
  y: number;
  z: number;
  b: number; // B-factor
  hetflag: boolean;
  serial: number;
  bonds: number;
  ss: string; // secondary structure
  color?: string;
  model?: number;
}

export interface HoverData {
  atom: AtomInfo | null;
  position: { x: number; y: number };
  distance?: number;
}

export interface Mol3DViewer {
  getModel: (index?: number) => any;
  getSelectedAtoms: (sel: any) => AtomInfo[];
  setHoverDist: (dist: number) => void;
  setStyle: (sel: any, style: any) => void;
  render: () => void;
  getView: () => any;
  setView: (view: any) => void;
}

/**
 * Standard amino acid residues mapping
 */
const AMINO_ACIDS: Record<string, string> = {
  ALA: 'Alanine',
  ARG: 'Arginine',
  ASN: 'Asparagine',
  ASP: 'Aspartic acid',
  CYS: 'Cysteine',
  GLN: 'Glutamine',
  GLU: 'Glutamic acid',
  GLY: 'Glycine',
  HIS: 'Histidine',
  ILE: 'Isoleucine',
  LEU: 'Leucine',
  LYS: 'Lysine',
  MET: 'Methionine',
  PHE: 'Phenylalanine',
  PRO: 'Proline',
  SER: 'Serine',
  THR: 'Threonine',
  TRP: 'Tryptophan',
  TYR: 'Tyrosine',
  VAL: 'Valine',
  // Non-standard
  MSE: 'Selenomethionine',
  HYP: 'Hydroxyproline',
  MLY: 'Dimethyl-lysine',
  ALY: 'Acetyl-lysine',
  M3L: 'Trimethyl-lysine',
  PTR: 'Phosphotyrosine',
  SEP: 'Phosphoserine',
  TPO: 'Phosphothreonine',
};

/**
 * Get full name of amino acid from 3-letter code
 */
export function getAminoAcidName(residue: string): string {
  return AMINO_ACIDS[residue.toUpperCase()] || residue;
}

/**
 * Format atom information for display
 */
export function formatAtomInfo(atom: AtomInfo): {
  title: string;
  details: Array<{ label: string; value: string }>;
} {
  const residueName = getAminoAcidName(atom.residue);
  const title = `${atom.residue} ${atom.resi}${atom.chain ? ` (Chain ${atom.chain})` : ''}`;

  const details = [
    { label: 'Atom', value: atom.atom },
    { label: 'Element', value: atom.element },
    { label: 'Residue', value: `${residueName} (${atom.residue})` },
    { label: 'Position', value: `(${atom.x.toFixed(2)}, ${atom.y.toFixed(2)}, ${atom.z.toFixed(2)})` },
    { label: 'B-factor', value: atom.b.toFixed(2) },
    { label: 'Serial', value: atom.serial.toString() },
  ];

  if (atom.chain) {
    details.splice(3, 0, { label: 'Chain', value: atom.chain });
  }

  if (atom.ss) {
    details.push({ label: 'Secondary Structure', value: atom.ss });
  }

  if (atom.hetflag) {
    details.push({ label: 'Type', value: 'Heteroatom' });
  }

  return { title, details };
}

/**
 * Get atom closest to screen coordinates
 * Uses approximate picking by finding nearest atom in 3D space
 * @param viewer 3Dmol viewer instance
 * @param x Screen X coordinate (relative to viewer)
 * @param y Screen Y coordinate (relative to viewer)
 * @param maxDistance Maximum distance in pixels to consider
 */
export function getAtomAtCoordinates(
  viewer: Mol3DViewer,
  x: number,
  y: number,
  maxDistance: number = 20
): AtomInfo | null {
  try {
    const model = viewer.getModel?.();
    if (!model || !model.atoms) return null;

    const atoms = model.atoms as AtomInfo[];
    if (atoms.length === 0) return null;

    // Get viewer dimensions and camera info
    const view = viewer.getView?.();
    if (!view) return null;

    // Find atom closest to mouse position
    // This is a simplified approach - proper implementation would use raycasting
    // For now, we return the first atom within reasonable distance
    // In production, integrate Three.js raycaster for accurate picking
    
    let closestAtom: AtomInfo | null = null;
    let closestDistance = maxDistance;

    for (const atom of atoms) {
      // Approximate distance (simplified - doesn't account for perspective)
      const dist = Math.sqrt(Math.pow(x - atom.x, 2) + Math.pow(y - atom.y, 2));
      
      if (dist < closestDistance) {
        closestDistance = dist;
        closestAtom = atom;
      }
    }

    return closestAtom;
  } catch (error) {
    console.error('Failed to get atom at coordinates:', error);
    return null;
  }
}

/**
 * Highlight atom/residue with proper style restoration
 * @param viewer 3Dmol viewer instance
 * @param atom Atom to highlight
 * @param currentStyle Current rendering style to restore later
 */
export function highlightAtom(
  viewer: Mol3DViewer,
  atom: AtomInfo | null,
  currentStyle?: string
): void {
  try {
    if (!atom) {
      // Clear highlight - restore to default or current style
      const style = currentStyle === 'surface' 
        ? { surface: { colorscheme: 'Jmol' } }
        : currentStyle === 'stick'
        ? { stick: { colorscheme: 'Jmol' } }
        : currentStyle === 'sphere'
        ? { sphere: { colorscheme: 'Jmol' } }
        : currentStyle === 'line'
        ? { line: { colorscheme: 'Jmol' } }
        : { cartoon: { color: 'spectrum' } };
      
      viewer.setStyle({}, style);
      viewer.render();
      return;
    }

    // Highlight the specific atom and its residue
    const sel = {
      resi: atom.resi,
      chain: atom.chain,
    };

    viewer.setStyle(sel, {
      stick: { colorscheme: 'Jmol', radius: 0.3 },
      cartoon: { color: 'yellow' },
    });

    // Also highlight the specific atom
    viewer.setStyle(
      { serial: atom.serial },
      { sphere: { colorscheme: 'Jmol', scale: 1.5 } }
    );

    viewer.render();
  } catch (error) {
    console.error('Failed to highlight atom:', error);
  }
}

/**
 * Clear atom highlight and restore to specified style
 * @param viewer 3Dmol viewer instance
 * @param renderingStyle Current rendering style to restore
 */
export function clearAtomHighlight(viewer: Mol3DViewer, renderingStyle: string = 'cartoon'): void {
  try {
    const styleMap: Record<string, Record<string, any>> = {
      cartoon: { cartoon: { color: 'spectrum' } },
      surface: { surface: { colorscheme: 'Jmol' } },
      stick: { stick: { colorscheme: 'Jmol' } },
      sphere: { sphere: { colorscheme: 'Jmol' } },
      line: { line: { colorscheme: 'Jmol' } },
    };

    const style = styleMap[renderingStyle] || styleMap.cartoon;
    viewer.setStyle({}, style);
    viewer.render();
  } catch (error) {
    console.error('Failed to clear highlight:', error);
  }
}

/**
 * Get atom information from model
 */
export function getAtomFromModel(
  viewer: Mol3DViewer,
  serial: number
): AtomInfo | null {
  try {
    const model = viewer.getModel?.();
    if (!model || !model.atoms) return null;

    const atom = (model.atoms as AtomInfo[]).find((a) => a.serial === serial);
    return atom || null;
  } catch (error) {
    console.error('Failed to get atom from model:', error);
    return null;
  }
}

/**
 * Get residue information
 */
export function getResidueInfo(
  viewer: Mol3DViewer,
  resi: number,
  chain?: string
): AtomInfo[] {
  try {
    const model = viewer.getModel?.();
    if (!model || !model.atoms) return [];

    return (model.atoms as AtomInfo[]).filter((a) => {
      if (a.resi !== resi) return false;
      if (chain && a.chain !== chain) return false;
      return true;
    });
  } catch (error) {
    console.error('Failed to get residue info:', error);
    return [];
  }
}

/**
 * Calculate distance between two atoms
 */
export function calculateDistance(
  atom1: AtomInfo,
  atom2: AtomInfo
): number {
  const dx = atom1.x - atom2.x;
  const dy = atom1.y - atom2.y;
  const dz = atom1.z - atom2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Get nearby atoms within a distance threshold
 */
export function getNearbyAtoms(
  viewer: Mol3DViewer,
  atom: AtomInfo,
  distanceThreshold: number = 4.0
): AtomInfo[] {
  try {
    const model = viewer.getModel?.();
    if (!model || !model.atoms) return [];

    return (model.atoms as AtomInfo[]).filter((a) => {
      if (a.serial === atom.serial) return false;
      const dist = calculateDistance(atom, a);
      return dist <= distanceThreshold;
    });
  } catch (error) {
    console.error('Failed to get nearby atoms:', error);
    return [];
  }
}

/**
 * Calculate tooltip position with boundary checking
 * @param x Mouse X coordinate (relative to viewer)
 * @param y Mouse Y coordinate (relative to viewer)
 * @param containerRect Bounding rect of viewer container
 * @param tooltipWidth Estimated tooltip width in pixels
 * @param tooltipHeight Estimated tooltip height in pixels
 */
export function calculateTooltipPosition(
  x: number,
  y: number,
  containerRect: DOMRect,
  tooltipWidth: number = 300,
  tooltipHeight: number = 200
): { x: number; y: number } {
  // Convert relative coordinates to absolute page coordinates
  const absoluteX = containerRect.left + x;
  const absoluteY = containerRect.top + y;

  let finalX = absoluteX + 12;
  let finalY = absoluteY + 12;

  // Prevent tooltip from going off-screen (right edge)
  if (finalX + tooltipWidth > window.innerWidth) {
    finalX = window.innerWidth - tooltipWidth - 12;
  }

  // Prevent tooltip from going off-screen (bottom edge)
  if (finalY + tooltipHeight > window.innerHeight) {
    finalY = window.innerHeight - tooltipHeight - 12;
  }

  // Prevent tooltip from going off-screen (left edge)
  if (finalX < 12) {
    finalX = 12;
  }

  // Prevent tooltip from going off-screen (top edge)
  if (finalY < 12) {
    finalY = 12;
  }

  return { x: finalX, y: finalY };
}
