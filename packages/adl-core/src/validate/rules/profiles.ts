/**
 * Semantic rules: ADL-3001, ADL-3002
 * Validates profile declarations and known profile requirements.
 */

import type { ADLDocument } from "../../types/document.js";
import { createError, type ADLError } from "../../types/errors.js";

/**
 * Known standard profiles from the ADL Profile Registry (spec Section 17.2).
 */
const KNOWN_STANDARD_PROFILES = new Set([
  "urn:adl:profile:governance:1.0",
  "urn:adl:profile:portfolio:1.0",
  "urn:adl:profile:healthcare:1.0",
  "urn:adl:profile:financial:1.0",
]);

/**
 * Check if a profile identifier looks like a standard profile
 * (uses urn:adl:profile: namespace) but is not in the known registry.
 */
function isUnknownStandardProfile(id: string): boolean {
  return id.startsWith("urn:adl:profile:") && !KNOWN_STANDARD_PROFILES.has(id);
}

export function checkProfiles(doc: ADLDocument): ADLError[] {
  const errors: ADLError[] = [];
  if (!doc.profiles || doc.profiles.length === 0) return errors;

  for (let i = 0; i < doc.profiles.length; i++) {
    const profileId = doc.profiles[i];

    // ADL-3002: Unknown profile in urn:adl:profile: namespace
    if (isUnknownStandardProfile(profileId)) {
      errors.push(
        createError(
          "ADL-3002",
          `Unknown standard profile "${profileId}". Known profiles: ${[...KNOWN_STANDARD_PROFILES].join(", ")}`,
          { pointer: `/profiles/${i}` },
        ),
      );
    }

    // ADL-3001: Profile requirements not satisfied
    // Check known profile requirements
    if (profileId === "urn:adl:profile:governance:1.0") {
      errors.push(...checkGovernanceRequirements(doc, i));
    }
  }

  return errors;
}

/**
 * Check governance profile requirements.
 * The governance profile requires compliance_framework and autonomy at minimum.
 * These are profile-specific top-level members added via schema composition.
 */
function checkGovernanceRequirements(
  doc: ADLDocument,
  profileIndex: number,
): ADLError[] {
  const errors: ADLError[] = [];
  const raw = doc as unknown as Record<string, unknown>;

  if (!raw.compliance_framework) {
    errors.push(
      createError(
        "ADL-3001",
        'Governance profile requires "compliance_framework" member',
        { pointer: `/profiles/${profileIndex}` },
      ),
    );
  }

  if (!raw.autonomy) {
    errors.push(
      createError(
        "ADL-3001",
        'Governance profile requires "autonomy" member',
        { pointer: `/profiles/${profileIndex}` },
      ),
    );
  }

  return errors;
}
