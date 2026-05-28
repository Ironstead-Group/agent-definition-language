/**
 * Client for the ADL discovery protocol (spec §6.4).
 *
 *   GET {baseUrl}/.well-known/adl-agents → DiscoveryDocument
 *   GET {agent.adl_document}             → ADL passport (YAML or JSON)
 *
 * Per the verification proposal §1.1.1, retrieval over the discovery
 * endpoint establishes a starting trust anchor (the discovery domain's
 * TLS authority) for the listed agents. The fetched results carry the
 * authority forward so downstream verification can use it.
 */

import { parseADL } from "../parse/parser.js";
import type { ADLDocument } from "../types/document.js";

export interface DiscoveryAgent {
  id: string;
  adl_document: string;
  name?: string;
  version?: string;
  description?: string;
  status?: string;
}

export interface DiscoveryDocument {
  /** Discovery protocol version, e.g. "1.0" */
  adl_discovery?: string;
  agents: DiscoveryAgent[];
}

export interface DiscoveredPassport {
  entry: DiscoveryAgent;
  passport: ADLDocument;
  /** Raw bytes as served, for canonical-bytes verification (§1.1.3) */
  rawBytes: Uint8Array;
  /** Domain authority that served the discovery document (§1.1.1) */
  discoveryAuthority: string;
}

export async function fetchDiscoveryDocument(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ doc: DiscoveryDocument; authority: string }> {
  const url = `${baseUrl}/.well-known/adl-agents`;
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(`Discovery endpoint returned HTTP ${res.status}`);
  }
  const doc = (await res.json()) as DiscoveryDocument;
  if (!doc.agents || !Array.isArray(doc.agents)) {
    throw new Error("Discovery document missing required 'agents' array");
  }
  return { doc, authority: new URL(url).host };
}

export async function fetchPassportFromUrl(
  entry: DiscoveryAgent,
  discoveryAuthority: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DiscoveredPassport> {
  const res = await fetchImpl(entry.adl_document);
  if (!res.ok) {
    throw new Error(
      `Passport fetch returned HTTP ${res.status} for ${entry.adl_document}`,
    );
  }
  const text = await res.text();
  const format = text.trimStart().startsWith("{") ? "json" : "yaml";

  const { document, errors } = parseADL(text, format);
  if (!document) {
    throw new Error(
      `Failed to parse passport for ${entry.id}: ${errors.map((e) => e.detail).join(", ")}`,
    );
  }

  return {
    entry,
    passport: document,
    rawBytes: new TextEncoder().encode(text),
    discoveryAuthority,
  };
}

export async function discoverAndFetchAll(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DiscoveredPassport[]> {
  const { doc, authority } = await fetchDiscoveryDocument(baseUrl, fetchImpl);
  const results: DiscoveredPassport[] = [];
  for (const entry of doc.agents) {
    try {
      results.push(await fetchPassportFromUrl(entry, authority, fetchImpl));
    } catch (e) {
      // Skip individual failures rather than aborting the whole discovery
      // pass. Callers can inspect the returned list and compare to the
      // discovery doc to detect skipped entries.
      void e;
    }
  }
  return results;
}
