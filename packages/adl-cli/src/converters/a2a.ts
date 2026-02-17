/**
 * ADL → A2A Agent Card converter (spec §15.1)
 *
 * Maps: name, description, version, tools→skills,
 * cryptographic_identity.did→id, security.authentication→authentication
 */

interface ADLTool {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
  returns?: Record<string, unknown>;
  read_only?: boolean;
  idempotent?: boolean;
  [key: string]: unknown;
}

export function convertToA2A(
  doc: Record<string, unknown>,
): Record<string, unknown> {
  const card: Record<string, unknown> = {};

  // Core identity
  card.name = doc.name;
  card.description = doc.description;
  card.version = doc.version;

  // DID → id
  const cryptoId = doc.cryptographic_identity as
    | Record<string, unknown>
    | undefined;
  if (cryptoId?.did) {
    card.id = cryptoId.did;
  } else if (doc.id) {
    card.id = doc.id;
  }

  // Provider → provider
  const provider = doc.provider as Record<string, unknown> | undefined;
  if (provider) {
    card.provider = {
      organization: provider.name,
      url: provider.url,
    };
  }

  // Tools → skills
  const tools = doc.tools as ADLTool[] | undefined;
  if (tools && tools.length > 0) {
    card.skills = tools.map((tool) => {
      const skill: Record<string, unknown> = {
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

  // Security.authentication → authentication
  const security = doc.security as Record<string, unknown> | undefined;
  const auth = security?.authentication as
    | Record<string, unknown>
    | undefined;
  if (auth) {
    const a2aAuth: Record<string, unknown> = {};
    if (auth.type && auth.type !== "none") {
      a2aAuth.schemes = [auth.type];
    }
    if (auth.scopes) {
      a2aAuth.scopes = auth.scopes;
    }
    if (Object.keys(a2aAuth).length > 0) {
      card.authentication = a2aAuth;
    }
  }

  // Metadata
  const metadata = doc.metadata as Record<string, unknown> | undefined;
  if (metadata) {
    if (metadata.documentation) {
      card.documentationUrl = metadata.documentation;
    }
  }

  return card;
}
