/**
 * Schema version registry — maps ADL spec versions to their JSON Schema.
 */

import schema010 from "./0.1.0.json";
import schema020 from "./0.2.0.json";

const SCHEMAS: Record<string, object> = {
  "0.1.0": schema010,
  "0.2.0": schema020,
};

export const SUPPORTED_VERSIONS = Object.keys(SCHEMAS);

export function getSchema(version: string): object | undefined {
  return SCHEMAS[version];
}

export function isSupportedVersion(version: string): boolean {
  return version in SCHEMAS;
}
