/**
 * tRPC router for peptide visualization
 */

import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getPeptideVisualization,
  isValidPeptideSequence,
  calculateSequenceProperties,
  predictSecondaryStructure,
  predict3DStructure,
} from "./peptideVisualization";

export const peptideVisualizationRouter = router({
  /**
   * Get complete visualization data for a peptide sequence
   */
  getVisualization: publicProcedure
    .input(
      z.object({
        sequence: z.string().min(3).max(100),
      })
    )
    .query(async ({ input }) => {
      if (!isValidPeptideSequence(input.sequence)) {
        throw new Error("Invalid peptide sequence");
      }

      const visualization = await getPeptideVisualization(input.sequence);
      return visualization;
    }),

  /**
   * Get sequence properties only
   */
  getProperties: publicProcedure
    .input(
      z.object({
        sequence: z.string().min(3).max(100),
      })
    )
    .query(({ input }) => {
      if (!isValidPeptideSequence(input.sequence)) {
        throw new Error("Invalid peptide sequence");
      }

      const properties = calculateSequenceProperties(input.sequence);
      return properties;
    }),

  /**
   * Get secondary structure prediction
   */
  getSecondaryStructure: publicProcedure
    .input(
      z.object({
        sequence: z.string().min(3).max(100),
      })
    )
    .query(({ input }) => {
      if (!isValidPeptideSequence(input.sequence)) {
        throw new Error("Invalid peptide sequence");
      }

      const structure = predictSecondaryStructure(input.sequence);
      return structure;
    }),

  /**
   * Get 3D structure prediction
   */
  get3DStructure: publicProcedure
    .input(
      z.object({
        sequence: z.string().min(3).max(100),
      })
    )
    .query(async ({ input }) => {
      if (!isValidPeptideSequence(input.sequence)) {
        throw new Error("Invalid peptide sequence");
      }

      const structure = await predict3DStructure(input.sequence);
      return structure;
    }),

  /**
   * Validate peptide sequence
   */
  validateSequence: publicProcedure
    .input(
      z.object({
        sequence: z.string(),
      })
    )
    .query(({ input }) => {
      const isValid = isValidPeptideSequence(input.sequence);
      return {
        isValid,
        sequence: input.sequence,
        length: input.sequence.length,
        message: isValid
          ? "Valid peptide sequence"
          : "Invalid peptide sequence (must be 3-100 amino acids)",
      };
    }),
});
