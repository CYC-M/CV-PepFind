import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAminoAcidName,
  formatAtomInfo,
  getAtomAtCoordinates,
  highlightAtom,
  clearAtomHighlight,
  getAtomFromModel,
  getResidueInfo,
  calculateDistance,
  getNearbyAtoms,
  calculateTooltipPosition,
  type AtomInfo,
  type Mol3DViewer,
} from './atomHoverDetector';

// Mock atom data
const mockAtom: AtomInfo = {
  atom: 'CA',
  element: 'C',
  residue: 'ALA',
  chain: 'A',
  resi: 10,
  x: 0,
  y: 0,
  z: 0,
  b: 20.0,
  hetflag: false,
  serial: 1,
  bonds: 4,
  ss: 'H',
};

const mockAtom2: AtomInfo = {
  ...mockAtom,
  atom: 'CB',
  x: 1.5,
  y: 1.5,
  z: 1.5,
  serial: 2,
  resi: 11,
};

const mockViewer: Partial<Mol3DViewer> = {
  getModel: vi.fn(() => ({
    atoms: [mockAtom, mockAtom2],
  })),
  setStyle: vi.fn(),
  render: vi.fn(),
  getView: vi.fn(() => ({})),
};

describe('atomHoverDetector', () => {
  describe('getAminoAcidName', () => {
    it('should return full name for standard amino acids', () => {
      expect(getAminoAcidName('ALA')).toBe('Alanine');
      expect(getAminoAcidName('GLY')).toBe('Glycine');
      expect(getAminoAcidName('VAL')).toBe('Valine');
    });

    it('should return residue code for unknown amino acids', () => {
      expect(getAminoAcidName('XYZ')).toBe('XYZ');
    });

    it('should be case-insensitive', () => {
      expect(getAminoAcidName('ala')).toBe('Alanine');
      expect(getAminoAcidName('AlA')).toBe('Alanine');
    });
  });

  describe('formatAtomInfo', () => {
    it('should format atom information correctly', () => {
      const result = formatAtomInfo(mockAtom);
      expect(result.title).toBe('ALA 10 (Chain A)');
      expect(result.details.length).toBeGreaterThan(0);
    });

    it('should include atom name and element', () => {
      const result = formatAtomInfo(mockAtom);
      const atomDetail = result.details.find((d) => d.label === 'Atom');
      const elementDetail = result.details.find((d) => d.label === 'Element');
      expect(atomDetail?.value).toBe('CA');
      expect(elementDetail?.value).toBe('C');
    });

    it('should include B-factor', () => {
      const result = formatAtomInfo(mockAtom);
      const bFactorDetail = result.details.find((d) => d.label === 'B-factor');
      expect(bFactorDetail?.value).toBe('20.00');
    });

    it('should include secondary structure if present', () => {
      const result = formatAtomInfo(mockAtom);
      const ssDetail = result.details.find((d) => d.label === 'Secondary Structure');
      expect(ssDetail?.value).toBe('H');
    });
  });

  describe('getAtomAtCoordinates', () => {
    it('should return null if no model', () => {
      const viewer = { getModel: vi.fn(() => null) } as any;
      const result = getAtomAtCoordinates(viewer, 0, 0);
      expect(result).toBeNull();
    });

    it('should return null if no atoms', () => {
      const viewer = { getModel: vi.fn(() => ({ atoms: [] })) } as any;
      const result = getAtomAtCoordinates(viewer, 0, 0);
      expect(result).toBeNull();
    });

    it('should return closest atom to coordinates', () => {
      const result = getAtomAtCoordinates(mockViewer as any, 0, 0);
      expect(result).toBeDefined();
    });

    it('should respect maxDistance parameter', () => {
      const result = getAtomAtCoordinates(mockViewer as any, 100, 100, 10);
      // With maxDistance=10 and atoms at (0,0) and (1.5,1.5), should not find anything
      expect(result).toBeNull();
    });
  });

  describe('calculateDistance', () => {
    it('should calculate correct distance between atoms', () => {
      const distance = calculateDistance(mockAtom, mockAtom2);
      const expected = Math.sqrt(1.5 * 1.5 + 1.5 * 1.5 + 1.5 * 1.5);
      expect(distance).toBeCloseTo(expected);
    });

    it('should return 0 for same atom', () => {
      const distance = calculateDistance(mockAtom, mockAtom);
      expect(distance).toBe(0);
    });
  });

  describe('getNearbyAtoms', () => {
    it('should return nearby atoms within threshold', () => {
      const nearby = getNearbyAtoms(mockViewer as any, mockAtom, 3.0);
      expect(nearby.length).toBeGreaterThan(0);
      expect(nearby.some((a) => a.serial === 2)).toBe(true);
    });

    it('should not include the query atom itself', () => {
      const nearby = getNearbyAtoms(mockViewer as any, mockAtom, 10.0);
      expect(nearby.some((a) => a.serial === mockAtom.serial)).toBe(false);
    });

    it('should return empty array if no nearby atoms', () => {
      const nearby = getNearbyAtoms(mockViewer as any, mockAtom, 0.5);
      expect(nearby.length).toBe(0);
    });
  });

  describe('getAtomFromModel', () => {
    it('should return atom by serial number', () => {
      const atom = getAtomFromModel(mockViewer as any, 1);
      expect(atom).toEqual(mockAtom);
    });

    it('should return null if atom not found', () => {
      const atom = getAtomFromModel(mockViewer as any, 999);
      expect(atom).toBeNull();
    });
  });

  describe('getResidueInfo', () => {
    it('should return all atoms in residue', () => {
      const residue = getResidueInfo(mockViewer as any, 10);
      expect(residue.length).toBeGreaterThan(0);
      expect(residue.every((a) => a.resi === 10)).toBe(true);
    });

    it('should filter by chain if specified', () => {
      const residue = getResidueInfo(mockViewer as any, 10, 'A');
      expect(residue.every((a) => a.chain === 'A')).toBe(true);
    });

    it('should return empty array if residue not found', () => {
      const residue = getResidueInfo(mockViewer as any, 999);
      expect(residue.length).toBe(0);
    });
  });

  describe('highlightAtom', () => {
    it('should call setStyle when highlighting atom', () => {
      const viewer = { ...mockViewer, setStyle: vi.fn(), render: vi.fn() } as any;
      highlightAtom(viewer, mockAtom);
      expect(viewer.setStyle).toHaveBeenCalled();
      expect(viewer.render).toHaveBeenCalled();
    });

    it('should restore style when clearing highlight', () => {
      const viewer = { ...mockViewer, setStyle: vi.fn(), render: vi.fn() } as any;
      highlightAtom(viewer, null);
      expect(viewer.setStyle).toHaveBeenCalledWith({}, expect.any(Object));
    });
  });

  describe('clearAtomHighlight', () => {
    it('should restore cartoon style by default', () => {
      const viewer = { ...mockViewer, setStyle: vi.fn(), render: vi.fn() } as any;
      clearAtomHighlight(viewer, 'cartoon');
      expect(viewer.setStyle).toHaveBeenCalledWith({}, { cartoon: { color: 'spectrum' } });
    });

    it('should restore surface style', () => {
      const viewer = { ...mockViewer, setStyle: vi.fn(), render: vi.fn() } as any;
      clearAtomHighlight(viewer, 'surface');
      expect(viewer.setStyle).toHaveBeenCalledWith({}, { surface: { colorscheme: 'Jmol' } });
    });

    it('should restore stick style', () => {
      const viewer = { ...mockViewer, setStyle: vi.fn(), render: vi.fn() } as any;
      clearAtomHighlight(viewer, 'stick');
      expect(viewer.setStyle).toHaveBeenCalledWith({}, { stick: { colorscheme: 'Jmol' } });
    });
  });

  describe('calculateTooltipPosition', () => {
    it('should return offset position by default', () => {
      const containerRect = new DOMRect(100, 100, 500, 500);
      const pos = calculateTooltipPosition(50, 50, containerRect);
      expect(pos.x).toBe(162); // 100 + 50 + 12
      expect(pos.y).toBe(162); // 100 + 50 + 12
    });

    it('should prevent overflow on right edge', () => {
      const containerRect = new DOMRect(0, 0, 500, 500);
      // Set window width to 400 for testing
      const pos = calculateTooltipPosition(350, 50, containerRect, 300, 200);
      expect(pos.x).toBeLessThanOrEqual(window.innerWidth - 300);
    });

    it('should prevent overflow on bottom edge', () => {
      const containerRect = new DOMRect(0, 0, 500, 500);
      const pos = calculateTooltipPosition(50, 450, containerRect, 300, 200);
      expect(pos.y).toBeLessThanOrEqual(window.innerHeight - 200);
    });

    it('should keep minimum padding from edges', () => {
      const containerRect = new DOMRect(0, 0, 500, 500);
      const pos = calculateTooltipPosition(-100, -100, containerRect);
      expect(pos.x).toBeGreaterThanOrEqual(12);
      expect(pos.y).toBeGreaterThanOrEqual(12);
    });
  });
});
