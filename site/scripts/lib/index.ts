/**
 * Shared library for ADL build scripts.
 */

export { ensureDir, cleanDir, copyDir } from "./fs-utils";
export {
  readYamlManifest,
  type VersionInfo,
  type VersionManifest,
  type ProfileInfo,
  type ProfileManifest,
} from "./manifest";
export {
  escapeAutolinks,
  escapeHtmlEntities,
  applyMdxEscaping,
  generateProfileFrontmatter,
  convertProfileBadge,
  convertVersionBadge,
  convertBlockquoteAdmonitions,
  wrapExampleSection,
  wrapValidationSection,
} from "./mdx-transforms";
