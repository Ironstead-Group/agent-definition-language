/**
 * Tool: explain_concept — look up and return an ADL concept explanation.
 */

import { concepts, type ConceptEntry } from "../knowledge/concepts.js";

export interface ExplainConceptInput {
  concept: string;
}

export interface ExplainConceptResult {
  found: boolean;
  concept: string;
  entry?: ConceptEntry;
  available_concepts?: string[];
}

/**
 * Look up a concept by key or fuzzy-match against titles.
 */
export function explainConcept(input: ExplainConceptInput): ExplainConceptResult {
  const key = normalizeKey(input.concept);

  // Direct key match
  if (concepts[key]) {
    return { found: true, concept: key, entry: concepts[key] };
  }

  // Fuzzy match against titles and keys
  const match = Object.entries(concepts).find(([k, v]) => {
    const lowerConcept = input.concept.toLowerCase();
    return (
      k.includes(lowerConcept) ||
      v.title.toLowerCase().includes(lowerConcept) ||
      lowerConcept.includes(k.replace(/_/g, " "))
    );
  });

  if (match) {
    return { found: true, concept: match[0], entry: match[1] };
  }

  return {
    found: false,
    concept: input.concept,
    available_concepts: Object.keys(concepts),
  };
}

function normalizeKey(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");
}
