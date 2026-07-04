import { describe, it, expect } from 'vitest';
import {
  calculateDistance,
  createMeasurement,
  formatDistance,
  getMeasurementDescription,
  convertMeasurement,
  isSameAtom,
  addAtomToSelection,
  removeAtomFromSelection,
  calculateMidpoint,
  isValidMeasurement,
  getNearbyAtoms,
  initializeMeasurementState,
  toggleMeasurementMode,
  addMeasurement,
  clearMeasurements,
  getMeasurementStats,
  exportMeasurementsAsText,
  type AtomInfo,
} from './measurementTool';

// Mock atom data
const mockAtom1: AtomInfo = {
  atom: 'CA',
  element: 'C',
  residue: 'ALA',
  chain: 'A',
  resi: 10,
  x: 0,
  y: 0,
  z: 0,
  b: 0,
  hetflag: false,
  serial: 1,
  bonds: 0,
  ss: 'H',
};

const mockAtom2: AtomInfo = {
  atom: 'CB',
  element: 'C',
  residue: 'ALA',
  chain: 'A',
  resi: 10,
  x: 3,
  y: 4,
  z: 0,
  b: 0,
  hetflag: false,
  serial: 2,
  bonds: 0,
  ss: 'H',
};

const mockAtom3: AtomInfo = {
  atom: 'N',
  element: 'N',
  residue: 'GLY',
  chain: 'A',
  resi: 11,
  x: 5,
  y: 0,
  z: 0,
  b: 0,
  hetflag: false,
  serial: 3,
  bonds: 0,
  ss: 'C',
};

describe('measurementTool', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two atoms', () => {
      const distance = calculateDistance(mockAtom1, mockAtom2);
      expect(distance).toBeCloseTo(5, 1); // 3-4-5 triangle
    });

    it('should convert to nanometers', () => {
      const distance = calculateDistance(mockAtom1, mockAtom2, 'nanometer');
      expect(distance).toBeCloseTo(0.5, 1);
    });

    it('should return 0 for same atom', () => {
      const distance = calculateDistance(mockAtom1, mockAtom1);
      expect(distance).toBe(0);
    });
  });

  describe('createMeasurement', () => {
    it('should create a measurement object', () => {
      const measurement = createMeasurement(mockAtom1, mockAtom2);
      expect(measurement.distance).toBeCloseTo(5, 1);
      expect(measurement.unit).toBe('angstrom');
      expect(measurement.timestamp).toBeGreaterThan(0);
    });
  });

  describe('formatDistance', () => {
    it('should format distance with Angstrom symbol', () => {
      const formatted = formatDistance(5.123, 'angstrom', 2);
      expect(formatted).toBe('5.12 Å');
    });

    it('should format distance with nanometer symbol', () => {
      const formatted = formatDistance(0.5123, 'nanometer', 2);
      expect(formatted).toBe('0.51 nm');
    });
  });

  describe('getMeasurementDescription', () => {
    it('should return formatted description', () => {
      const measurement = createMeasurement(mockAtom1, mockAtom2);
      const desc = getMeasurementDescription(measurement);
      expect(desc).toContain('ALA10:CA');
      expect(desc).toContain('ALA10:CB');
      expect(desc).toContain('Å');
    });
  });

  describe('convertMeasurement', () => {
    it('should convert from angstrom to nanometer', () => {
      const measurement = createMeasurement(mockAtom1, mockAtom2, 'angstrom');
      const converted = convertMeasurement(measurement, 'nanometer');
      expect(converted.unit).toBe('nanometer');
      expect(converted.distance).toBeCloseTo(0.5, 1);
    });

    it('should convert from nanometer to angstrom', () => {
      const measurement = createMeasurement(mockAtom1, mockAtom2, 'nanometer');
      const converted = convertMeasurement(measurement, 'angstrom');
      expect(converted.unit).toBe('angstrom');
      expect(converted.distance).toBeCloseTo(5, 1);
    });

    it('should return same measurement if unit unchanged', () => {
      const measurement = createMeasurement(mockAtom1, mockAtom2, 'angstrom');
      const same = convertMeasurement(measurement, 'angstrom');
      expect(same).toEqual(measurement);
    });
  });

  describe('isSameAtom', () => {
    it('should identify same atoms', () => {
      expect(isSameAtom(mockAtom1, mockAtom1)).toBe(true);
    });

    it('should identify different atoms', () => {
      expect(isSameAtom(mockAtom1, mockAtom2)).toBe(false);
    });
  });

  describe('addAtomToSelection', () => {
    it('should add atom to empty selection', () => {
      const selection = addAtomToSelection([], mockAtom1);
      expect(selection).toHaveLength(1);
      expect(selection[0]).toEqual(mockAtom1);
    });

    it('should not add duplicate atoms', () => {
      const selection = addAtomToSelection([mockAtom1], mockAtom1);
      expect(selection).toHaveLength(1);
    });

    it('should replace oldest when limit reached', () => {
      const selection = addAtomToSelection([mockAtom1, mockAtom2], mockAtom3, 2);
      expect(selection).toHaveLength(2);
      expect(selection[0]).toEqual(mockAtom2);
      expect(selection[1]).toEqual(mockAtom3);
    });
  });

  describe('removeAtomFromSelection', () => {
    it('should remove atom from selection', () => {
      const selection = removeAtomFromSelection([mockAtom1, mockAtom2], mockAtom1);
      expect(selection).toHaveLength(1);
      expect(selection[0]).toEqual(mockAtom2);
    });

    it('should handle removing non-existent atom', () => {
      const selection = removeAtomFromSelection([mockAtom1], mockAtom2);
      expect(selection).toHaveLength(1);
    });
  });

  describe('calculateMidpoint', () => {
    it('should calculate midpoint between atoms', () => {
      const midpoint = calculateMidpoint(mockAtom1, mockAtom2);
      expect(midpoint.x).toBe(1.5);
      expect(midpoint.y).toBe(2);
      expect(midpoint.z).toBe(0);
    });
  });

  describe('isValidMeasurement', () => {
    it('should validate reasonable measurements', () => {
      const measurement = createMeasurement(mockAtom1, mockAtom2);
      expect(isValidMeasurement(measurement)).toBe(true);
    });

    it('should reject very small distances', () => {
      const atom1 = { ...mockAtom1, x: 0 };
      const atom2 = { ...mockAtom1, x: 0.01 };
      const measurement = createMeasurement(atom1, atom2);
      expect(isValidMeasurement(measurement)).toBe(false);
    });
  });

  describe('getNearbyAtoms', () => {
    it('should find nearby atoms within threshold', () => {
      const atoms = [mockAtom1, mockAtom2, mockAtom3];
      const nearby = getNearbyAtoms(mockAtom1, atoms, 3.5);
      expect(nearby).toHaveLength(1);
      expect(nearby[0]).toEqual(mockAtom2);
    });

    it('should not include the atom itself', () => {
      const atoms = [mockAtom1, mockAtom2];
      const nearby = getNearbyAtoms(mockAtom1, atoms, 10);
      expect(nearby).not.toContainEqual(mockAtom1);
    });
  });

  describe('initializeMeasurementState', () => {
    it('should create initial state', () => {
      const state = initializeMeasurementState();
      expect(state.isActive).toBe(false);
      expect(state.selectedAtoms).toHaveLength(0);
      expect(state.measurements).toHaveLength(0);
      expect(state.lastMeasurement).toBeNull();
    });
  });

  describe('toggleMeasurementMode', () => {
    it('should toggle measurement mode', () => {
      const state = initializeMeasurementState();
      const toggled = toggleMeasurementMode(state);
      expect(toggled.isActive).toBe(true);
    });

    it('should clear selection when disabling', () => {
      const state = {
        ...initializeMeasurementState(),
        isActive: true,
        selectedAtoms: [mockAtom1],
      };
      const toggled = toggleMeasurementMode(state);
      expect(toggled.isActive).toBe(false);
      expect(toggled.selectedAtoms).toHaveLength(0);
    });
  });

  describe('addMeasurement', () => {
    it('should add measurement to state', () => {
      const state = initializeMeasurementState();
      const measurement = createMeasurement(mockAtom1, mockAtom2);
      const updated = addMeasurement(state, measurement);
      expect(updated.measurements).toHaveLength(1);
      expect(updated.lastMeasurement).toEqual(measurement);
    });
  });

  describe('clearMeasurements', () => {
    it('should clear all measurements', () => {
      let state = initializeMeasurementState();
      state = addMeasurement(state, createMeasurement(mockAtom1, mockAtom2));
      state = addMeasurement(state, createMeasurement(mockAtom2, mockAtom3));
      const cleared = clearMeasurements(state);
      expect(cleared.measurements).toHaveLength(0);
      expect(cleared.lastMeasurement).toBeNull();
    });
  });

  describe('getMeasurementStats', () => {
    it('should calculate statistics', () => {
      const measurements = [
        createMeasurement(mockAtom1, mockAtom2), // 5 Å
        createMeasurement(mockAtom2, mockAtom3), // 2 Å
      ];
      const stats = getMeasurementStats(measurements);
      expect(stats.count).toBe(2);
      expect(stats.min).toBeLessThan(stats.average);
      expect(stats.average).toBeLessThan(stats.max);
    });

    it('should handle empty measurements', () => {
      const stats = getMeasurementStats([]);
      expect(stats.count).toBe(0);
      expect(stats.average).toBe(0);
    });
  });

  describe('exportMeasurementsAsText', () => {
    it('should export measurements as text', () => {
      const measurements = [createMeasurement(mockAtom1, mockAtom2)];
      const text = exportMeasurementsAsText(measurements);
      expect(text).toContain('Molecular Distance Measurements');
      expect(text).toContain('ALA10:CA');
      expect(text).toContain('Total Measurements: 1');
    });
  });
});
