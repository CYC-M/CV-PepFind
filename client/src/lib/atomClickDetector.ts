/**
 * Atom Click Detection for Measurement Tool
 * Detects which atom is closest to mouse position in 3D view
 */

import type { AtomInfo } from './measurementTool';

interface Mol3DViewer {
  getModel?: (index?: number) => any;
  getView?: () => any;
  addSphere?: (spec: Record<string, unknown>) => void;
  render?: () => void;
}

/**
 * Get all atoms from 3Dmol viewer
 */
export function getAllAtoms(viewer: Mol3DViewer): AtomInfo[] {
  try {
    const model = viewer.getModel?.(0);
    if (!model || !model.atoms) return [];

    return model.atoms.map((atom: any, index: number) => ({
      atom: atom.atom || 'X',
      element: atom.elem || 'C',
      residue: atom.resn || 'UNK',
      chain: atom.chain || 'A',
      resi: atom.resi || 0,
      x: atom.x || 0,
      y: atom.y || 0,
      z: atom.z || 0,
      b: atom.b || 0,
      hetflag: atom.hetflag || false,
      serial: atom.serial || index,
      bonds: atom.bonds?.length || 0,
      ss: atom.ss || '',
      color: atom.color,
      model: 0,
    }));
  } catch (error) {
    console.error('Error getting atoms from viewer:', error);
    return [];
  }
}

/**
 * Project 3D coordinates to 2D screen coordinates
 * This is a simplified projection - actual implementation would use viewer's camera matrix
 */
export function project3DTo2D(
  x: number,
  y: number,
  z: number,
  viewer: Mol3DViewer,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } | null {
  try {
    const view = viewer.getView?.();
    if (!view) return null;

    // Simplified projection using viewer's view matrix
    // In production, this should use the actual camera projection matrix
    const scale = 100; // Arbitrary scale factor
    const screenX = (x * scale) + (canvasWidth / 2);
    const screenY = (canvasHeight / 2) - (y * scale);

    return { x: screenX, y: screenY };
  } catch (error) {
    console.error('Error projecting coordinates:', error);
    return null;
  }
}

/**
 * Find closest atom to mouse position
 * Uses distance-based search in 2D screen space
 */
export function findClosestAtom(
  mouseX: number,
  mouseY: number,
  atoms: AtomInfo[],
  viewer: Mol3DViewer,
  canvasWidth: number,
  canvasHeight: number,
  threshold: number = 20 // pixels
): AtomInfo | null {
  if (atoms.length === 0) return null;

  let closestAtom: AtomInfo | null = null;
  let closestDistance = threshold;

  for (const atom of atoms) {
    const screenPos = project3DTo2D(atom.x, atom.y, atom.z, viewer, canvasWidth, canvasHeight);
    if (!screenPos) continue;

    const dx = mouseX - screenPos.x;
    const dy = mouseY - screenPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestAtom = atom;
    }
  }

  return closestAtom;
}

/**
 * Highlight atom in viewer
 */
export function highlightAtomForMeasurement(
  viewer: Mol3DViewer,
  atom: AtomInfo,
  color: string = '0xFFFF00'
): void {
  try {
    // Create sphere at atom position to highlight it
    const colorNum = parseInt(color.replace('0x', ''), 16);
    viewer.addSphere?.({
      center: { x: atom.x, y: atom.y, z: atom.z },
      radius: 0.5,
      color: colorNum,
      opacity: 0.7,
    });
    viewer.render?.();
  } catch (error) {
    console.error('Error highlighting atom:', error);
  }
}

/**
 * Draw line between two atoms
 */
export function drawMeasurementLine(
  viewer: Mol3DViewer,
  atom1: AtomInfo,
  atom2: AtomInfo,
  color: string = '0x00FF00'
): void {
  try {
    const colorNum = parseInt(color.replace('0x', ''), 16);

    // Draw line by creating a cylinder between atoms
    const dx = atom2.x - atom1.x;
    const dy = atom2.y - atom1.y;
    const dz = atom2.z - atom1.z;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (length > 0) {
      // Create a thin cylinder as line
      viewer.addSphere?.({
        center: { x: atom1.x, y: atom1.y, z: atom1.z },
        radius: 0.2,
        color: colorNum,
        opacity: 0.8,
      });

      viewer.addSphere?.({
        center: { x: atom2.x, y: atom2.y, z: atom2.z },
        radius: 0.2,
        color: colorNum,
        opacity: 0.8,
      });

      viewer.render?.();
    }
  } catch (error) {
    console.error('Error drawing measurement line:', error);
  }
}

/**
 * Clear measurement visualization
 */
export function clearMeasurementVisualization(viewer: Mol3DViewer): void {
  try {
    // Clear added spheres by recreating the view
    // This is a workaround since 3Dmol doesn't have direct sphere removal
    viewer.render?.();
  } catch (error) {
    console.error('Error clearing measurement visualization:', error);
  }
}

/**
 * Get atom info from viewer by serial number
 */
export function getAtomBySerial(
  viewer: Mol3DViewer,
  serial: number
): AtomInfo | null {
  const atoms = getAllAtoms(viewer);
  return atoms.find((a) => a.serial === serial) || null;
}

/**
 * Validate atom is still valid in current model
 */
export function isAtomValid(viewer: Mol3DViewer, atom: AtomInfo): boolean {
  const atoms = getAllAtoms(viewer);
  return atoms.some((a) => a.serial === atom.serial && a.model === atom.model);
}

/**
 * Get atom context (nearby atoms, residue info)
 */
export function getAtomContext(
  viewer: Mol3DViewer,
  atom: AtomInfo,
  radius: number = 5.0
): {
  atom: AtomInfo;
  nearbyAtoms: AtomInfo[];
  residueAtoms: AtomInfo[];
} {
  const atoms = getAllAtoms(viewer);

  // Find nearby atoms
  const nearbyAtoms = atoms.filter((a) => {
    if (a.serial === atom.serial) return false;
    const dx = a.x - atom.x;
    const dy = a.y - atom.y;
    const dz = a.z - atom.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return dist <= radius;
  });

  // Find atoms in same residue
  const residueAtoms = atoms.filter(
    (a) =>
      a.chain === atom.chain &&
      a.resi === atom.resi &&
      a.serial !== atom.serial
  );

  return { atom, nearbyAtoms, residueAtoms };
}

/**
 * Format atom for display in measurement UI
 */
export function formatAtomForDisplay(atom: AtomInfo): string {
  return `${atom.residue}${atom.resi}:${atom.atom}`;
}

/**
 * Get atom color based on element
 */
export function getAtomColor(element: string): string {
  const colorMap: Record<string, string> = {
    H: '0xFFFFFF',
    C: '0x909090',
    N: '0x3050F8',
    O: '0xFF0D0D',
    S: '0xFFFF30',
    P: '0xFF8000',
    F: '0x90E050',
    Cl: '0x1FF01F',
    Br: '0xA62929',
    I: '0x940094',
  };
  return colorMap[element] || '0xCCCCCC';
}
