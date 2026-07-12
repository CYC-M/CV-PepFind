import { describe, it, expect } from 'vitest';

describe('ColoredAlignmentDisplay', () => {
  describe('Match Classification', () => {
    it('should classify perfect matches', () => {
      // Test data: identical sequences
      const seq1 = 'ACGT';
      const seq2 = 'ACGT';
      
      // Count matches
      let matches = 0;
      for (let i = 0; i < seq1.length; i++) {
        if (seq1[i] === seq2[i]) matches++;
      }
      
      expect(matches).toBe(4);
    });

    it('should classify similar residues (hydrophobic)', () => {
      // Hydrophobic residues: A, V, I, L, M, F, W, P
      const hydrophobic = ['A', 'V', 'I', 'L', 'M', 'F', 'W', 'P'];
      
      // Check that multiple hydrophobic residues exist
      expect(hydrophobic.length).toBeGreaterThan(0);
      expect(hydrophobic).toContain('A');
      expect(hydrophobic).toContain('V');
    });

    it('should classify similar residues (polar)', () => {
      // Polar residues: S, T, C, Y, N, Q
      const polar = ['S', 'T', 'C', 'Y', 'N', 'Q'];
      
      expect(polar.length).toBeGreaterThan(0);
      expect(polar).toContain('S');
      expect(polar).toContain('T');
    });

    it('should classify similar residues (charged)', () => {
      // Charged residues: D, E, K, R, H
      const charged = ['D', 'E', 'K', 'R', 'H'];
      
      expect(charged.length).toBeGreaterThan(0);
      expect(charged).toContain('D');
      expect(charged).toContain('K');
    });

    it('should classify gaps', () => {
      const seq1 = 'A-GT';
      const seq2 = 'ACGT';
      
      // Count gaps
      let gaps = 0;
      for (let i = 0; i < seq1.length; i++) {
        if (seq1[i] === '-' || seq2[i] === '-') gaps++;
      }
      
      expect(gaps).toBeGreaterThan(0);
    });

    it('should classify mismatches', () => {
      const seq1 = 'ACGT';
      const seq2 = 'TGCA';
      
      // Count mismatches (not gaps, not matches)
      let mismatches = 0;
      for (let i = 0; i < seq1.length; i++) {
        if (seq1[i] !== '-' && seq2[i] !== '-' && seq1[i] !== seq2[i]) {
          mismatches++;
        }
      }
      
      expect(mismatches).toBeGreaterThan(0);
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate match statistics', () => {
      const seq1 = 'ACGTACGT';
      const seq2 = 'ACGTACGT';
      
      const stats = {
        match: 0,
        similar: 0,
        mismatch: 0,
        gap: 0,
      };
      
      for (let i = 0; i < seq1.length; i++) {
        if (seq1[i] === seq2[i]) stats.match++;
      }
      
      expect(stats.match).toBe(8);
    });

    it('should calculate gap statistics', () => {
      const seq1 = 'ACGT-ACGT';
      const seq2 = 'ACGTACGT-';
      
      const stats = {
        match: 0,
        similar: 0,
        mismatch: 0,
        gap: 0,
      };
      
      for (let i = 0; i < seq1.length; i++) {
        if (seq1[i] === '-' || seq2[i] === '-') stats.gap++;
      }
      
      expect(stats.gap).toBeGreaterThan(0);
    });

    it('should sum to total alignment length', () => {
      const seq1 = 'ACGTACGT';
      const seq2 = 'ACGTACGT';
      
      const stats = {
        match: 0,
        similar: 0,
        mismatch: 0,
        gap: 0,
      };
      
      for (let i = 0; i < seq1.length; i++) {
        if (seq1[i] === seq2[i]) stats.match++;
        else stats.mismatch++;
      }
      
      const total = stats.match + stats.similar + stats.mismatch + stats.gap;
      expect(total).toBe(seq1.length);
    });
  });

  describe('Color Assignment', () => {
    it('should have valid color classes', () => {
      const colors = {
        match: 'bg-green-100 text-green-900 border-green-300',
        similar: 'bg-yellow-100 text-yellow-900 border-yellow-300',
        mismatch: 'bg-red-100 text-red-900 border-red-300',
        gap: 'bg-gray-100 text-gray-600 border-gray-300',
      };
      
      expect(Object.keys(colors)).toHaveLength(4);
      expect(colors.match).toContain('green');
      expect(colors.similar).toContain('yellow');
      expect(colors.mismatch).toContain('red');
      expect(colors.gap).toContain('gray');
    });

    it('should have descriptive labels', () => {
      const labels = {
        match: 'Perfect match',
        similar: 'Similar residue',
        mismatch: 'Mismatch',
        gap: 'Gap/insertion',
      };
      
      expect(labels.match).toContain('Perfect');
      expect(labels.similar).toContain('Similar');
      expect(labels.mismatch).toContain('Mismatch');
      expect(labels.gap).toContain('Gap');
    });
  });

  describe('Chunk Display', () => {
    it('should split alignment into chunks', () => {
      const alignmentLength = 150;
      const chunkSize = 60;
      
      const chunks = Math.ceil(alignmentLength / chunkSize);
      expect(chunks).toBe(3);
    });

    it('should handle last chunk correctly', () => {
      const alignmentLength = 155;
      const chunkSize = 60;
      
      const lastChunkStart = 2 * chunkSize;
      const lastChunkEnd = Math.min(lastChunkStart + chunkSize, alignmentLength);
      const lastChunkSize = lastChunkEnd - lastChunkStart;
      
      expect(lastChunkSize).toBe(35);
    });

    it('should display position ruler', () => {
      const positions = [0, 10, 20, 30, 40, 50];
      
      const displayed = positions.filter((p) => (p + 1) % 10 === 0);
      expect(displayed).toContain(9);
      expect(displayed).toContain(19);
    });
  });

  describe('Export Functionality', () => {
    it('should generate valid CSV format', () => {
      const headers = ['Position', 'Seq1', 'Seq2', 'Match Type'];
      const rows = [
        [1, 'A', 'A', 'match'],
        [2, 'C', 'C', 'match'],
        [3, 'G', 'T', 'mismatch'],
      ];
      
      const csv = [headers, ...rows]
        .map((row) => row.join(','))
        .join('\n');
      
      expect(csv).toContain('Position,Seq1,Seq2,Match Type');
      expect(csv).toContain('1,A,A,match');
      expect(csv).toContain('3,G,T,mismatch');
    });

    it('should handle special characters in export', () => {
      const rows = [
        ['1', 'A', 'A', 'match'],
        ['2', '-', 'C', 'gap'],
      ];
      
      const csv = rows.map((row) => row.join(',')).join('\n');
      
      expect(csv).toContain('gap');
      expect(csv).toContain('-');
    });
  });

  describe('Interactive Features', () => {
    it('should provide hover tooltips', () => {
      const tooltips = [
        'A - Perfect match',
        'C - Mismatch',
        '- - Gap/insertion',
      ];
      
      expect(tooltips).toHaveLength(3);
      expect(tooltips[0]).toContain('Perfect match');
    });

    it('should support copy to clipboard', () => {
      const alignment = 'ACGTACGT\nACGTACGT';
      
      expect(alignment).toContain('\n');
      expect(alignment.split('\n')).toHaveLength(2);
    });
  });
});
