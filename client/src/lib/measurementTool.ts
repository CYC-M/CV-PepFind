/**
 * Measurement Tool for 3D Molecular Viewer
 * Handles atom selection, distance calculation, and measurement visualization
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
  b: number;
  hetflag: boolean;
  serial: number;
  bonds: number;
  ss: string;
  color?: string;
  model?: number;
}

export interface Measurement {
  atom1: AtomInfo;
  atom2: AtomInfo;
  distance: number;
  unit: 'angstrom' | 'nanometer';
  timestamp: number;
}

export interface MeasurementState {
  isActive: boolean;
  selectedAtoms: AtomInfo[];
  measurements: Measurement[];
  lastMeasurement: Measurement | null;
}

/**
 * Calculate Euclidean distance between two atoms
 * @param atom1 First atom
 * @param atom2 Second atom
 * @param unit Distance unit (default: angstrom)
 */
export function calculateDistance(
  atom1: AtomInfo,
  atom2: AtomInfo,
  unit: 'angstrom' | 'nanometer' = 'angstrom'
): number {
  const dx = atom1.x - atom2.x;
  const dy = atom1.y - atom2.y;
  const dz = atom1.z - atom2.z;
  const distanceAngstrom = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (unit === 'nanometer') {
    return distanceAngstrom / 10;
  }
  return distanceAngstrom;
}

/**
 * Create a measurement from two atoms
 */
export function createMeasurement(
  atom1: AtomInfo,
  atom2: AtomInfo,
  unit: 'angstrom' | 'nanometer' = 'angstrom'
): Measurement {
  return {
    atom1,
    atom2,
    distance: calculateDistance(atom1, atom2, unit),
    unit,
    timestamp: Date.now(),
  };
}

/**
 * Format distance value for display
 */
export function formatDistance(
  distance: number,
  unit: 'angstrom' | 'nanometer' = 'angstrom',
  decimals: number = 2
): string {
  const symbol = unit === 'angstrom' ? 'Å' : 'nm';
  return `${distance.toFixed(decimals)} ${symbol}`;
}

/**
 * Get measurement description
 */
export function getMeasurementDescription(measurement: Measurement): string {
  const atom1Desc = `${measurement.atom1.residue}${measurement.atom1.resi}:${measurement.atom1.atom}`;
  const atom2Desc = `${measurement.atom2.residue}${measurement.atom2.resi}:${measurement.atom2.atom}`;
  const distance = formatDistance(measurement.distance, measurement.unit);
  return `${atom1Desc} ↔ ${atom2Desc}: ${distance}`;
}

/**
 * Convert measurement unit
 */
export function convertMeasurement(
  measurement: Measurement,
  newUnit: 'angstrom' | 'nanometer'
): Measurement {
  if (measurement.unit === newUnit) {
    return measurement;
  }

  let newDistance = measurement.distance;
  if (newUnit === 'nanometer') {
    newDistance = measurement.distance / 10;
  } else {
    newDistance = measurement.distance * 10;
  }

  return {
    ...measurement,
    distance: newDistance,
    unit: newUnit,
  };
}

/**
 * Check if two atoms are the same
 */
export function isSameAtom(atom1: AtomInfo, atom2: AtomInfo): boolean {
  return atom1.serial === atom2.serial && atom1.model === atom2.model;
}

/**
 * Add atom to selection
 */
export function addAtomToSelection(
  selectedAtoms: AtomInfo[],
  atom: AtomInfo,
  maxSelection: number = 2
): AtomInfo[] {
  // Check if atom already selected
  if (selectedAtoms.some((a) => isSameAtom(a, atom))) {
    return selectedAtoms;
  }

  // Add atom if under limit
  if (selectedAtoms.length < maxSelection) {
    return [...selectedAtoms, atom];
  }

  // Replace oldest if at limit
  return [...selectedAtoms.slice(1), atom];
}

/**
 * Remove atom from selection
 */
export function removeAtomFromSelection(
  selectedAtoms: AtomInfo[],
  atom: AtomInfo
): AtomInfo[] {
  return selectedAtoms.filter((a) => !isSameAtom(a, atom));
}

/**
 * Clear all selections
 */
export function clearSelection(): AtomInfo[] {
  return [];
}

/**
 * Calculate midpoint between two atoms (for label placement)
 */
export function calculateMidpoint(
  atom1: AtomInfo,
  atom2: AtomInfo
): { x: number; y: number; z: number } {
  return {
    x: (atom1.x + atom2.x) / 2,
    y: (atom1.y + atom2.y) / 2,
    z: (atom1.z + atom2.z) / 2,
  };
}

/**
 * Validate measurement (check for reasonable distance)
 */
export function isValidMeasurement(measurement: Measurement): boolean {
  // Distance should be between 0.1 and 100 Angstroms for typical molecular measurements
  const distanceA = measurement.unit === 'angstrom' ? measurement.distance : measurement.distance * 10;
  return distanceA > 0.1 && distanceA < 100;
}

/**
 * Get nearby atoms for context
 */
export function getNearbyAtoms(
  atom: AtomInfo,
  allAtoms: AtomInfo[],
  threshold: number = 3.0
): AtomInfo[] {
  return allAtoms.filter((a) => {
    if (isSameAtom(a, atom)) return false;
    const dist = calculateDistance(atom, a, 'angstrom');
    return dist <= threshold;
  });
}

/**
 * Initialize measurement state
 */
export function initializeMeasurementState(): MeasurementState {
  return {
    isActive: false,
    selectedAtoms: [],
    measurements: [],
    lastMeasurement: null,
  };
}

/**
 * Toggle measurement mode
 */
export function toggleMeasurementMode(state: MeasurementState): MeasurementState {
  return {
    ...state,
    isActive: !state.isActive,
    selectedAtoms: !state.isActive ? [] : state.selectedAtoms,
  };
}

/**
 * Add measurement to history
 */
export function addMeasurement(
  state: MeasurementState,
  measurement: Measurement
): MeasurementState {
  return {
    ...state,
    measurements: [...state.measurements, measurement],
    lastMeasurement: measurement,
  };
}

/**
 * Clear all measurements
 */
export function clearMeasurements(state: MeasurementState): MeasurementState {
  return {
    ...state,
    measurements: [],
    lastMeasurement: null,
    selectedAtoms: [],
  };
}

/**
 * Get measurement statistics
 */
export function getMeasurementStats(measurements: Measurement[]): {
  count: number;
  average: number;
  min: number;
  max: number;
  unit: 'angstrom' | 'nanometer';
} {
  if (measurements.length === 0) {
    return { count: 0, average: 0, min: 0, max: 0, unit: 'angstrom' };
  }

  const distances = measurements.map((m) => m.distance);
  const unit = measurements[0].unit;

  return {
    count: measurements.length,
    average: distances.reduce((a, b) => a + b, 0) / distances.length,
    min: Math.min(...distances),
    max: Math.max(...distances),
    unit,
  };
}

/**
 * Export measurements as text
 */
export function exportMeasurementsAsText(measurements: Measurement[]): string {
  const lines = [
    '# Molecular Distance Measurements',
    `Generated: ${new Date().toISOString()}`,
    `Total Measurements: ${measurements.length}`,
    '',
    '## Measurements',
  ];

  measurements.forEach((m, index) => {
    lines.push(`${index + 1}. ${getMeasurementDescription(m)}`);
  });

  const stats = getMeasurementStats(measurements);
  if (stats.count > 0) {
    lines.push('');
    lines.push('## Statistics');
    lines.push(`Average: ${formatDistance(stats.average, stats.unit)}`);
    lines.push(`Minimum: ${formatDistance(stats.min, stats.unit)}`);
    lines.push(`Maximum: ${formatDistance(stats.max, stats.unit)}`);
  }

  return lines.join('\n');
}
