/**
 * Convert JSON Schema objects into TypeScript type strings for code generation.
 */

/**
 * Convert a JSON Schema definition to a TypeScript type string.
 */
export function jsonSchemaToType(
  schema: Record<string, unknown> | null | undefined,
): string {
  if (!schema) return "unknown";

  const type = schema.type as string | undefined;

  if (!type) return "unknown";

  switch (type) {
    case "string":
      return "string";
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "array":
      return jsonSchemaToArrayType(schema);
    case "object":
      return jsonSchemaToObjectType(schema);
    default:
      return "unknown";
  }
}

function jsonSchemaToArrayType(schema: Record<string, unknown>): string {
  const items = schema.items as Record<string, unknown> | undefined;
  if (!items) return "unknown[]";
  return `${jsonSchemaToType(items)}[]`;
}

function jsonSchemaToObjectType(schema: Record<string, unknown>): string {
  const properties = schema.properties as
    | Record<string, Record<string, unknown>>
    | undefined;

  if (!properties) return "Record<string, unknown>";

  const required = (schema.required as string[]) ?? [];
  const entries = Object.entries(properties);

  if (entries.length === 0) return "Record<string, unknown>";

  const fields = entries.map(([key, propSchema]) => {
    const optional = required.includes(key) ? "" : "?";
    const typeStr = jsonSchemaToType(propSchema);
    return `${key}${optional}: ${typeStr}`;
  });

  return `{ ${fields.join("; ")} }`;
}

/**
 * Generate a TypeScript interface declaration from a JSON Schema object type.
 * Returns the interface source code as a string.
 */
export function jsonSchemaToInterface(
  name: string,
  schema: Record<string, unknown> | null | undefined,
): string {
  if (!schema) return `export interface ${name} {}`;

  const properties = schema.properties as
    | Record<string, Record<string, unknown>>
    | undefined;

  if (!properties) return `export interface ${name} {}`;

  const required = (schema.required as string[]) ?? [];
  const entries = Object.entries(properties);

  const fields = entries.map(([key, propSchema]) => {
    const optional = required.includes(key) ? "" : "?";
    const typeStr = jsonSchemaToType(propSchema);
    return `  ${key}${optional}: ${typeStr};`;
  });

  return `export interface ${name} {\n${fields.join("\n")}\n}`;
}
