/**
 * LLM-based peptide sequence generator
 * Generates candidate peptide sequences using Claude AI based on target protein information
 */

import { invokeLLM } from "./_core/llm";

export interface SequenceGenerationRequest {
  targetProtein: string;
  targetSequence?: string;
  count: number;
  constraints?: {
    minLength?: number;
    maxLength?: number;
    allowedAminoAcids?: string[];
    avoidAminoAcids?: string[];
  };
}

export interface GeneratedSequence {
  sequence: string;
  rationale: string;
  confidence: number;
}

// Standard amino acid codes
const AMINO_ACIDS = "ACDEFGHIKLMNPQRSTVWY";

/**
 * Validate that a sequence contains only valid amino acids
 */
function isValidSequence(sequence: string): boolean {
  return /^[ACDEFGHIKLMNPQRSTVWY]+$/.test(sequence.toUpperCase());
}

/**
 * Generate peptide sequences using LLM
 * Generates diverse candidate sequences that may bind to the target protein
 */
export async function generatePeptideSequences(
  request: SequenceGenerationRequest
): Promise<GeneratedSequence[]> {
  const {
    targetProtein,
    targetSequence,
    count,
    constraints = {},
  } = request;

  const minLength = constraints.minLength || 8;
  const maxLength = constraints.maxLength || 20;

  // Build the prompt
  const prompt = `You are an expert peptide chemist and drug discovery scientist. Generate ${count} novel peptide sequences that are likely to bind to the target protein.

Target Protein: ${targetProtein}
${targetSequence ? `Target Sequence: ${targetSequence}` : ""}

Requirements:
- Each sequence should be between ${minLength} and ${maxLength} amino acids long
- Use standard amino acid codes (A, C, D, E, F, G, H, I, K, L, M, N, P, Q, R, S, T, V, W, Y)
- Sequences should have diverse chemical properties (hydrophobic, hydrophilic, charged residues)
- Consider secondary structure preferences for binding
- Avoid sequences with excessive repeats or known problematic motifs

For each sequence, provide:
1. The peptide sequence (uppercase letters only)
2. A brief rationale for why this sequence might bind well
3. A confidence score (0.0-1.0) based on your assessment

Return the response as a JSON array with this structure:
[
  {
    "sequence": "SEQUENCE",
    "rationale": "explanation",
    "confidence": 0.85
  }
]

Generate diverse sequences with varied properties. Focus on quality over quantity.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a peptide design expert. Generate valid peptide sequences in JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "peptide_sequences",
          strict: true,
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                sequence: {
                  type: "string",
                  description: "Peptide sequence in standard amino acid codes",
                },
                rationale: {
                  type: "string",
                  description: "Explanation for this sequence",
                },
                confidence: {
                  type: "number",
                  description: "Confidence score 0.0-1.0",
                  minimum: 0,
                  maximum: 1,
                },
              },
              required: ["sequence", "rationale", "confidence"],
              additionalProperties: false,
            },
          },
        },
      },
    });

    // Parse the response
    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent) {
      throw new Error("No content in LLM response");
    }
    const content = typeof messageContent === "string" ? messageContent : (Array.isArray(messageContent) && messageContent[0] && 'text' in messageContent[0] ? (messageContent[0] as any).text : "");

    let sequences: GeneratedSequence[] = [];

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(content);
      sequences = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // If JSON parsing fails, try to extract sequences from text
      console.warn("Failed to parse JSON response, attempting text extraction");
      sequences = extractSequencesFromText(content);
    }

    // Validate and filter sequences
    const validSequences = sequences.filter((seq) => {
      if (!isValidSequence(seq.sequence)) {
        console.warn(`Invalid sequence: ${seq.sequence}`);
        return false;
      }
      if (
        seq.sequence.length < minLength ||
        seq.sequence.length > maxLength
      ) {
        console.warn(
          `Sequence length out of range: ${seq.sequence.length} (${minLength}-${maxLength})`
        );
        return false;
      }
      return true;
    });

    if (validSequences.length === 0) {
      console.warn("No valid sequences generated, creating fallback sequences");
      return generateFallbackSequences(count, minLength, maxLength);
    }

    return validSequences.slice(0, count);
  } catch (error) {
    console.error("Error generating peptide sequences:", error);
    // Return fallback sequences if LLM fails
    return generateFallbackSequences(count, minLength, maxLength);
  }
}

/**
 * Extract sequences from text if JSON parsing fails
 */
function extractSequencesFromText(text: string): GeneratedSequence[] {
  const sequences: GeneratedSequence[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    // Look for patterns like "SEQUENCE" or "Seq: SEQUENCE"
    const match = line.match(/([A-Z]{5,25})/);
    if (match && isValidSequence(match[1])) {
      sequences.push({
        sequence: match[1],
        rationale: line.substring(0, 100),
        confidence: 0.5,
      });
    }
  }

  return sequences;
}

/**
 * Generate fallback sequences using heuristic approach
 * This is used when LLM generation fails
 */
function generateFallbackSequences(
  count: number,
  minLength: number,
  maxLength: number
): GeneratedSequence[] {
  const sequences: GeneratedSequence[] = [];

  // Predefined motifs that are known to be useful in peptide design
  const motifs = [
    "YPWMK", // Hydrophobic-aromatic-basic
    "WFYL", // Aromatic cluster
    "KRKR", // Cationic
    "EDED", // Anionic
    "GGGS", // Flexible linker
  ];

  for (let i = 0; i < count; i++) {
    // Combine random motifs to create diverse sequences
    const length = minLength + Math.floor(Math.random() * (maxLength - minLength + 1));
    let sequence = "";

    while (sequence.length < length) {
      const motif = motifs[Math.floor(Math.random() * motifs.length)];
      sequence += motif;
    }

    sequence = sequence.substring(0, length);

    sequences.push({
      sequence,
      rationale: `Fallback sequence ${i + 1} combining common peptide motifs`,
      confidence: 0.3 + Math.random() * 0.3, // 0.3-0.6 confidence
    });
  }

  return sequences;
}

/**
 * Refine sequences using LLM
 * Takes a list of sequences and improves them based on specific criteria
 */
export async function refineSequences(
  sequences: string[],
  targetProtein: string,
  criteria: string
): Promise<GeneratedSequence[]> {
  const prompt = `You are a peptide design expert. Refine the following peptide sequences to better meet the specified criteria.

Target Protein: ${targetProtein}
Criteria: ${criteria}

Current Sequences:
${sequences.map((seq, i) => `${i + 1}. ${seq}`).join("\n")}

For each refined sequence, provide:
1. The improved peptide sequence
2. Explanation of improvements made
3. Confidence score (0.0-1.0)

Return as JSON array with structure:
[
  {
    "sequence": "SEQUENCE",
    "rationale": "improvements made",
    "confidence": 0.85
  }
]`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a peptide design expert. Refine sequences in JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent) {
      return sequences.map((seq) => ({
        sequence: seq,
        rationale: "Refinement attempted",
        confidence: 0.5,
      }));
    }
    const content = typeof messageContent === "string" ? messageContent : (Array.isArray(messageContent) && messageContent[0] && 'text' in messageContent[0] ? (messageContent[0] as any).text : "");

    try {
      if (!content) {
        return sequences.map((seq) => ({
          sequence: seq,
          rationale: "Refinement attempted",
          confidence: 0.5,
        }));
      }
      const parsed = JSON.parse(content);
      const result = Array.isArray(parsed) ? parsed : [parsed];
      const filtered = result.filter((seq: any) => isValidSequence(seq.sequence));
      if (filtered.length === 0 || filtered.length < result.length) {
        // If filtering removed any sequences, return originals to preserve data
        return sequences.map((seq) => ({
          sequence: seq,
          rationale: "Refinement attempted",
          confidence: 0.5,
        }));
      }
      return filtered;
    } catch {
      return sequences.map((seq) => ({
        sequence: seq,
        rationale: "Refinement attempted",
        confidence: 0.5,
      }));
    }
  } catch (error) {
    console.error("Error refining sequences:", error);
    return sequences.map((seq) => ({
      sequence: seq,
      rationale: "Refinement failed",
      confidence: 0.3,
    }));
  }
}
