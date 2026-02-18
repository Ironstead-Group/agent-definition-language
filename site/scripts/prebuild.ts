/**
 * Prebuild script for ADL documentation site
 *
 * Converts YAML source files to JSON for:
 * 1. Downloadable examples in static/examples/
 * 2. Code snippets embedded in documentation (version-scoped)
 *
 * Structure:
 *   _yaml-sources/{versionId}/examples/[name].yaml -> [name].json
 *   _yaml-sources/{versionId}/snippets/[path]/[name].yaml -> [name].json
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import { parse as parseYaml } from "yaml";
import { ensureDir } from "./lib";

const SITE_ROOT = path.resolve(__dirname, "..");
const YAML_SOURCES = path.join(SITE_ROOT, "_yaml-sources");
const STATIC_EXAMPLES = path.join(SITE_ROOT, "static", "examples");

interface ConversionResult {
  source: string;
  destination: string;
  success: boolean;
  error?: string;
}

/**
 * Convert a single YAML file to JSON
 */
function convertYamlToJson(
  yamlPath: string,
  jsonPath: string
): ConversionResult {
  const result: ConversionResult = {
    source: yamlPath,
    destination: jsonPath,
    success: false,
  };

  try {
    const yamlContent = fs.readFileSync(yamlPath, "utf-8");
    const data = parseYaml(yamlContent);
    const jsonContent = JSON.stringify(data, null, 2);

    ensureDir(path.dirname(jsonPath));
    fs.writeFileSync(jsonPath, jsonContent);

    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

/**
 * Get all version directories under _yaml-sources/
 */
function getVersionDirs(): string[] {
  if (!fs.existsSync(YAML_SOURCES)) {
    return [];
  }

  return fs
    .readdirSync(YAML_SOURCES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * Process example YAML files for a specific version
 * Converts _yaml-sources/{versionId}/examples/*.yaml -> *.json
 * Also generates static/examples/*.adl.json for downloads
 */
async function processExamples(versionId: string): Promise<ConversionResult[]> {
  const results: ConversionResult[] = [];
  const examplesDir = path.join(YAML_SOURCES, versionId, "examples");

  if (!fs.existsSync(examplesDir)) {
    return results;
  }

  const yamlFiles = await glob("*.yaml", { cwd: examplesDir });

  for (const file of yamlFiles) {
    const yamlPath = path.join(examplesDir, file);

    // Generate JSON alongside YAML for CodeTabs imports
    const codeTabsJsonPath = yamlPath.replace(/\.yaml$/, ".json");
    const codeTabsResult = convertYamlToJson(yamlPath, codeTabsJsonPath);
    results.push(codeTabsResult);

    // Generate JSON for static downloads (version-agnostic for latest)
    const staticJsonFile = file.replace(/\.yaml$/, ".adl.json");
    const staticJsonPath = path.join(STATIC_EXAMPLES, staticJsonFile);
    const staticResult = convertYamlToJson(yamlPath, staticJsonPath);
    results.push(staticResult);
  }

  return results;
}

/**
 * Process snippet YAML files for a specific version
 * Converts _yaml-sources/{versionId}/snippets/[path]/[name].yaml -> [name].json
 */
async function processSnippets(versionId: string): Promise<ConversionResult[]> {
  const results: ConversionResult[] = [];
  const snippetsDir = path.join(YAML_SOURCES, versionId, "snippets");

  if (!fs.existsSync(snippetsDir)) {
    return results;
  }

  const yamlFiles = await glob("**/*.yaml", { cwd: snippetsDir });

  for (const file of yamlFiles) {
    const yamlPath = path.join(snippetsDir, file);
    const jsonPath = yamlPath.replace(/\.yaml$/, ".json");

    const result = convertYamlToJson(yamlPath, jsonPath);
    results.push(result);
  }

  return results;
}

/**
 * Main prebuild function
 */
async function main(): Promise<void> {
  console.log("ADL Prebuild: Converting YAML to JSON...\n");

  // Ensure output directories exist
  ensureDir(STATIC_EXAMPLES);

  // Get all version directories
  const versionDirs = getVersionDirs();

  if (versionDirs.length === 0) {
    console.log("No version directories found in _yaml-sources/");
    return;
  }

  console.log(`Found ${versionDirs.length} version(s): ${versionDirs.join(", ")}\n`);

  const allResults: ConversionResult[] = [];

  // Process each version
  for (const versionId of versionDirs) {
    console.log(`Processing version ${versionId}...`);

    // Process examples
    const exampleResults = await processExamples(versionId);
    for (const result of exampleResults) {
      const status = result.success ? "OK" : `ERROR: ${result.error}`;
      console.log(`  ${path.basename(result.source)} -> ${status}`);
    }
    allResults.push(...exampleResults);

    // Process snippets
    const snippetResults = await processSnippets(versionId);
    for (const result of snippetResults) {
      const status = result.success ? "OK" : `ERROR: ${result.error}`;
      console.log(`  ${path.basename(result.source)} -> ${status}`);
    }
    allResults.push(...snippetResults);
  }

  // Summary
  const successCount = allResults.filter((r) => r.success).length;
  const failCount = allResults.filter((r) => !r.success).length;

  console.log(`\nPrebuild complete: ${successCount} converted, ${failCount} failed`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Prebuild failed:", error);
  process.exit(1);
});
