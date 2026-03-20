/**
 * ADL -> A2A Agent Card converter (spec Section 15.1)
 */

import type { ADLDocument } from "../types/document.js";
import type {
  A2AAgentCard,
  A2AAuthentication,
  A2AProvider,
  A2ASkill,
} from "../types/converters.js";

export function convertToA2A(doc: ADLDocument): A2AAgentCard {
  const card: A2AAgentCard = {
    name: doc.name,
    description: doc.description,
    version: doc.version,
  };

  // DID -> id
  if (doc.cryptographic_identity?.did) {
    card.id = doc.cryptographic_identity.did;
  } else if (doc.id) {
    card.id = doc.id;
  }

  // Provider
  if (doc.provider) {
    card.provider = {
      organization: doc.provider.name,
      url: doc.provider.url,
    };
  }

  // Tools -> skills
  if (doc.tools && doc.tools.length > 0) {
    card.skills = doc.tools.map((tool): A2ASkill => {
      const skill: A2ASkill = {
        id: tool.name,
        name: tool.name,
        description: tool.description,
      };

      if (tool.parameters) {
        skill.inputSchema = tool.parameters;
      }
      if (tool.returns) {
        skill.outputSchema = tool.returns;
      }

      const tags: string[] = [];
      if (tool.read_only) tags.push("read-only");
      if (tool.idempotent) tags.push("idempotent");
      if (tags.length > 0) skill.tags = tags;

      return skill;
    });
  }

  // Security.authentication
  if (doc.security?.authentication) {
    const auth = doc.security.authentication;
    const a2aAuth: A2AAuthentication = {};
    if (auth.type && auth.type !== "none") {
      a2aAuth.schemes = [auth.type];
    }
    if (auth.scopes) {
      a2aAuth.scopes = auth.scopes;
    }
    if (a2aAuth.schemes || a2aAuth.scopes) {
      card.authentication = a2aAuth;
    }
  }

  // Metadata
  if (doc.metadata?.documentation) {
    card.documentationUrl = doc.metadata.documentation;
  }

  return card;
}
