/**
 * CV-PepFind Peptide Database Retrieval Service
 *
 * Implements real peptide database retrieval using:
 * - UniProt REST API (https://rest.uniprot.org) - reviewed/SwissProt entries
 * - APD3-inspired keyword mapping for antimicrobial peptides
 *
 * Replaces the previous LLM-simulated retrieval with actual database lookups.
 */

export interface PeptideEntry {
  accession: string;
  name: string;
  sequence: string;
  length: number;
  organism?: string;
  function?: string;
  keywords?: string[];
  source: 'UniProt';
}

export interface RetrievalResult {
  query: string;
  total: number;
  peptides: PeptideEntry[];
  source: string;
  retrievedAt: string;
}

/**
 * Map biological function keywords to UniProt query terms
 */
const FUNCTION_KEYWORD_MAP: Record<string, string> = {
  // Antimicrobial
  'antimicrobial': 'antimicrobial peptide',
  'antibacterial': 'antibacterial peptide',
  'antifungal': 'antifungal peptide',
  'antiviral': 'antiviral peptide',
  // Cell-penetrating
  'cell-penetrating': 'cell-penetrating peptide',
  'cpp': 'cell-penetrating peptide',
  'tat': 'TAT peptide',
  // Anticancer
  'anticancer': 'anticancer peptide',
  'antitumor': 'antitumor peptide',
  // Signaling
  'neuropeptide': 'neuropeptide',
  'hormone': 'peptide hormone',
  'insulin': 'insulin',
  // Structural
  'coiled-coil': 'coiled-coil',
  'alpha-helix': 'alpha-helical peptide',
  // General
  'peptide': 'peptide',
  'bioactive': 'bioactive peptide',
};

/**
 * Build a UniProt search query from a natural language description
 */
function buildUniProtQuery(description: string, maxLength = 50): string {
  const lower = description.toLowerCase();

  // Find matching keywords
  const matchedTerms: string[] = [];
  for (const [key, term] of Object.entries(FUNCTION_KEYWORD_MAP)) {
    if (lower.includes(key)) {
      matchedTerms.push(term);
      break; // Use first match to keep query focused
    }
  }

  const baseQuery = matchedTerms.length > 0
    ? matchedTerms[0]
    : 'bioactive peptide';

  // Add length constraint for peptides (5-50 aa)
  return `${baseQuery} AND reviewed:true AND length:[5 TO ${maxLength}]`;
}

/**
 * Parse UniProt JSON response into PeptideEntry array
 */
function parseUniProtResults(data: Record<string, unknown>): PeptideEntry[] {
  const results = (data.results as Record<string, unknown>[]) ?? [];

  return results.map((r: Record<string, unknown>) => {
    const seqObj = (r.sequence as Record<string, unknown>) ?? {};
    const protDesc = (r.proteinDescription as Record<string, unknown>) ?? {};
    const recName = (protDesc.recommendedName as Record<string, unknown>) ?? {};
    const fullName = (recName.fullName as Record<string, unknown>) ?? {};

    // Extract organism
    const organism = (r.organism as Record<string, unknown>) ?? {};
    const orgName = (organism.scientificName as string) ?? undefined;

    // Extract keywords
    const keywords = ((r.keywords as Record<string, unknown>[]) ?? [])
      .map((k: Record<string, unknown>) => k.name as string)
      .filter(Boolean)
      .slice(0, 5);

    // Extract function from comments
    const comments = (r.comments as Record<string, unknown>[]) ?? [];
    const funcComment = comments.find((c: Record<string, unknown>) => c.commentType === 'FUNCTION');
    const funcText = funcComment
      ? ((funcComment.texts as Record<string, unknown>[])?.[0]?.value as string ?? undefined)
      : undefined;

    const sequence = (seqObj.value as string) ?? '';
    const length = (seqObj.length as number) ?? sequence.length;

    return {
      accession: (r.primaryAccession as string) ?? 'UNKNOWN',
      name: (fullName.value as string) ?? 'Unknown peptide',
      sequence,
      length,
      organism: orgName,
      function: funcText ? funcText.substring(0, 200) : undefined,
      keywords,
      source: 'UniProt' as const,
    };
  }).filter(p => p.sequence.length >= 3 && p.sequence.length <= 100);
}

/**
 * Retrieve peptides from UniProt REST API
 * @param description - Natural language description of desired peptide function
 * @param limit - Maximum number of results (default: 10)
 * @param maxLength - Maximum peptide length in amino acids (default: 50)
 */
export async function retrievePeptidesFromUniProt(
  description: string,
  limit = 10,
  maxLength = 50,
): Promise<RetrievalResult> {
  const query = buildUniProtQuery(description, maxLength);
  const encodedQuery = encodeURIComponent(query);
  const fields = 'accession,protein_name,sequence,length,organism_name,cc_function,keyword';
  const url = `https://rest.uniprot.org/uniprotkb/search?query=${encodedQuery}&format=json&size=${limit}&fields=${fields}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CV-PepFind/1.0 (peptide-screening-platform; contact@cv-pepfind.manus.space)',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      throw new Error(`UniProt API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const peptides = parseUniProtResults(data);

    return {
      query: description,
      total: peptides.length,
      peptides,
      source: `UniProt REST API (query: "${query}")`,
      retrievedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[PeptideRetrieval] UniProt API error:', error);
    throw new Error(`Failed to retrieve peptides from UniProt: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Search peptides by sequence similarity (exact subsequence match)
 * Uses UniProt sequence search endpoint
 */
export async function searchPeptidesBySequence(
  sequence: string,
  limit = 5,
): Promise<RetrievalResult> {
  // Search for proteins containing this exact sequence
  const encodedSeq = encodeURIComponent(sequence);
  const url = `https://rest.uniprot.org/uniprotkb/search?query=sequence:${encodedSeq}+AND+reviewed:true&format=json&size=${limit}&fields=accession,protein_name,sequence,length,organism_name`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CV-PepFind/1.0 (peptide-screening-platform)',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      // Fallback: search by keyword if sequence search fails
      return retrievePeptidesFromUniProt(sequence, limit);
    }

    const data = await response.json() as Record<string, unknown>;
    const peptides = parseUniProtResults(data);

    return {
      query: sequence,
      total: peptides.length,
      peptides,
      source: 'UniProt sequence search',
      retrievedAt: new Date().toISOString(),
    };
  } catch (error) {
    // Fallback to keyword search
    return retrievePeptidesFromUniProt(sequence, limit);
  }
}

/**
 * Format retrieval results as a Markdown string for AI context injection
 */
export function formatRetrievalResultsForLLM(result: RetrievalResult): string {
  if (result.peptides.length === 0) {
    return `## Database Retrieval Results\n\nNo peptides found in UniProt for query: "${result.query}".\n`;
  }

  const lines = [
    `## Real Peptide Database Results (UniProt)`,
    `Query: "${result.query}" | Found: ${result.total} peptides | Retrieved: ${result.retrievedAt}`,
    '',
  ];

  result.peptides.forEach((p, i) => {
    lines.push(`### ${i + 1}. ${p.name} (${p.accession})`);
    lines.push(`- **Sequence**: \`${p.sequence}\``);
    lines.push(`- **Length**: ${p.length} aa`);
    if (p.organism) lines.push(`- **Organism**: *${p.organism}*`);
    if (p.keywords && p.keywords.length > 0) lines.push(`- **Keywords**: ${p.keywords.join(', ')}`);
    if (p.function) lines.push(`- **Function**: ${p.function}`);
    lines.push('');
  });

  lines.push(`*Source: ${result.source}*`);
  return lines.join('\n');
}
