import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generatePeptideSequences,
  refineSequences,
  SequenceGenerationRequest,
} from "./llmSequenceGenerator";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";

describe("LLM Sequence Generator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generatePeptideSequences", () => {
    it("should generate valid peptide sequences from LLM response", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  sequence: "YPWMKGGGS",
                  rationale: "Hydrophobic aromatic with flexible linker",
                  confidence: 0.85,
                },
                {
                  sequence: "WFYLKRKR",
                  rationale: "Aromatic cluster with cationic tail",
                  confidence: 0.78,
                },
              ]),
            },
          },
        ],
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

      const request: SequenceGenerationRequest = {
        targetProtein: "HER2",
        count: 2,
      };

      const result = await generatePeptideSequences(request);

      expect(result).toHaveLength(2);
      expect(result[0].sequence).toBe("YPWMKGGGS");
      expect(result[0].confidence).toBe(0.85);
      expect(result[1].sequence).toBe("WFYLKRKR");
    });

    it("should filter out invalid sequences", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  sequence: "YPWMKGGGS",
                  rationale: "Valid sequence",
                  confidence: 0.85,
                },
                {
                  sequence: "INVALID123", // Invalid - contains numbers
                  rationale: "Invalid sequence",
                  confidence: 0.5,
                },
                {
                  sequence: "WFYLKRKR",
                  rationale: "Valid sequence",
                  confidence: 0.78,
                },
              ]),
            },
          },
        ],
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

      const request: SequenceGenerationRequest = {
        targetProtein: "HER2",
        count: 3,
      };

      const result = await generatePeptideSequences(request);

      expect(result).toHaveLength(2);
      expect(result.every((seq) => /^[ACDEFGHIKLMNPQRSTVWY]+$/.test(seq.sequence))).toBe(
        true
      );
    });

    it("should respect length constraints", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  sequence: "YPWMKGGGS",
                  rationale: "Valid length",
                  confidence: 0.85,
                },
                {
                  sequence: "TOOLONGSEQUENCEFORPEPTIDE", // Too long
                  rationale: "Too long",
                  confidence: 0.5,
                },
              ]),
            },
          },
        ],
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

      const request: SequenceGenerationRequest = {
        targetProtein: "HER2",
        count: 2,
        constraints: {
          minLength: 5,
          maxLength: 15,
        },
      };

      const result = await generatePeptideSequences(request);

      expect(result).toHaveLength(1);
      expect(result[0].sequence.length).toBeLessThanOrEqual(15);
      expect(result[0].sequence.length).toBeGreaterThanOrEqual(5);
    });

    it("should generate fallback sequences on LLM failure", async () => {
      vi.mocked(invokeLLM).mockRejectedValue(new Error("LLM error"));

      const request: SequenceGenerationRequest = {
        targetProtein: "HER2",
        count: 3,
      };

      const result = await generatePeptideSequences(request);

      expect(result).toHaveLength(3);
      expect(result.every((seq) => /^[ACDEFGHIKLMNPQRSTVWY]+$/.test(seq.sequence))).toBe(
        true
      );
      expect(result.every((seq) => seq.confidence <= 0.6)).toBe(true);
    });

    it("should handle empty LLM response", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "",
            },
          },
        ],
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

      const request: SequenceGenerationRequest = {
        targetProtein: "HER2",
        count: 2,
      };

      const result = await generatePeptideSequences(request);

      expect(result).toHaveLength(2);
      expect(result.every((seq) => /^[ACDEFGHIKLMNPQRSTVWY]+$/.test(seq.sequence))).toBe(
        true
      );
    });

    it("should handle malformed JSON response", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "This is not valid JSON at all",
            },
          },
        ],
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

      const request: SequenceGenerationRequest = {
        targetProtein: "HER2",
        count: 2,
      };

      const result = await generatePeptideSequences(request);

      expect(result).toHaveLength(2);
      expect(result.every((seq) => /^[ACDEFGHIKLMNPQRSTVWY]+$/.test(seq.sequence))).toBe(
        true
      );
    });

    it("should limit results to requested count", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([
                { sequence: "YPWMKGGGS", rationale: "1", confidence: 0.85 },
                { sequence: "WFYLKRKR", rationale: "2", confidence: 0.78 },
                { sequence: "EDEDEDED", rationale: "3", confidence: 0.72 },
                { sequence: "KRKRKRKR", rationale: "4", confidence: 0.68 },
              ]),
            },
          },
        ],
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

      const request: SequenceGenerationRequest = {
        targetProtein: "HER2",
        count: 2,
      };

      const result = await generatePeptideSequences(request);

      expect(result).toHaveLength(2);
    });

    it("should include target sequence in prompt when provided", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([
                { sequence: "YPWMKGGGS", rationale: "Similar to target", confidence: 0.85 },
              ]),
            },
          },
        ],
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

      const request: SequenceGenerationRequest = {
        targetProtein: "HER2",
        targetSequence: "MKKFFVSLLLALLTAFSSAYSCRG",
        count: 1,
      };

      await generatePeptideSequences(request);

      expect(invokeLLM).toHaveBeenCalled();
      const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
      const prompt = (callArgs.messages[1].content as string).toLowerCase();
      expect(prompt).toContain("target sequence");
    });
  });

  describe("refineSequences", () => {
    it("should refine sequences based on criteria", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  sequence: "YPWMKGGGS",
                  rationale: "Improved hydrophobicity",
                  confidence: 0.9,
                },
                {
                  sequence: "WFYLKRKR",
                  rationale: "Enhanced binding",
                  confidence: 0.88,
                },
              ]),
            },
          },
        ],
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

      const sequences = ["YPWMK", "WFYLK"];
      const result = await refineSequences(
        sequences,
        "HER2",
        "Increase hydrophobicity and binding affinity"
      );

      expect(result).toHaveLength(2);
      expect(result[0].sequence).toBe("YPWMKGGGS");
      expect(result[0].confidence).toBe(0.9);
    });

    it("should handle refinement failures gracefully", async () => {
      vi.mocked(invokeLLM).mockRejectedValue(new Error("Refinement failed"));

      const sequences = ["YPWMK", "WFYLK"];
      const result = await refineSequences(sequences, "HER2", "Increase binding");

      expect(result).toHaveLength(2);
      expect(result[0].sequence).toBe("YPWMK");
      expect(result[0].confidence).toBeLessThanOrEqual(0.3);
    });

    it("should filter invalid sequences after refinement", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([
                { sequence: "YPWMKGGGS", rationale: "Valid", confidence: 0.9 },
                { sequence: "INVALID", rationale: "Invalid", confidence: 0.5 },
              ]),
            },
          },
        ],
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

      const sequences = ["YPWMK", "WFYLK"];
      const result = await refineSequences(sequences, "HER2", "Improve");

      // When refinement returns mixed valid/invalid (1 valid + 1 invalid),
      // the condition filtered.length (1) < result.length (2) is TRUE,
      // so we return originals to preserve data
      expect(result).toHaveLength(2);
      expect(result[0].sequence).toBe("YPWMK");
      expect(result[1].sequence).toBe("WFYLK");
    });

    it("should return original sequences if refinement returns empty", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([]),
            },
          },
        ],
      };

      vi.mocked(invokeLLM).mockResolvedValue(mockResponse as any);

      const sequences = ["YPWMK", "WFYLK"];
      const result = await refineSequences(sequences, "HER2", "Improve");

      expect(result).toHaveLength(2);
      expect(result[0].sequence).toBe("YPWMK");
      expect(result[1].sequence).toBe("WFYLK");
    });
  });

  describe("Fallback sequence generation", () => {
    it("should generate diverse fallback sequences", async () => {
      vi.mocked(invokeLLM).mockRejectedValue(new Error("LLM unavailable"));

      const request: SequenceGenerationRequest = {
        targetProtein: "HER2",
        count: 5,
        constraints: {
          minLength: 8,
          maxLength: 15,
        },
      };

      const result = await generatePeptideSequences(request);

      expect(result).toHaveLength(5);

      // Check all are valid
      result.forEach((seq) => {
        expect(/^[ACDEFGHIKLMNPQRSTVWY]+$/.test(seq.sequence)).toBe(true);
        expect(seq.sequence.length).toBeGreaterThanOrEqual(8);
        expect(seq.sequence.length).toBeLessThanOrEqual(15);
      });

      // Check diversity (not all identical)
      const uniqueSequences = new Set(result.map((s) => s.sequence));
      expect(uniqueSequences.size).toBeGreaterThan(1);
    });
  });
});
