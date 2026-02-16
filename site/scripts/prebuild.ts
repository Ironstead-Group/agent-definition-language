/**
 * Prebuild script for ADL documentation site
 *
 * Converts YAML source files to JSON for:
 * 1. Downloadable examples in static/examples/
 * 2. Code snippets embedded in documentation
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import { parse as parseYaml } from "yaml";

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
 * Ensure directory exists
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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
 * Process example YAML files
 * Converts _yaml-sources/examples/*.yaml -> static/examples/*.adl.json (for downloads)
 * Also generates _yaml-sources/examples/*.json (for CodeTabs component)
 */
async function processExamples(): Promise<ConversionResult[]> {
  const results: ConversionResult[] = [];
  const examplesDir = path.join(YAML_SOURCES, "examples");

  if (!fs.existsSync(examplesDir)) {
    console.log("  No examples directory found, skipping...");
    return results;
  }

  const yamlFiles = await glob("*.yaml", { cwd: examplesDir });

  for (const file of yamlFiles) {
    const yamlPath = path.join(examplesDir, file);

    // Generate JSON for static downloads
    const staticJsonFile = file.replace(/\.yaml$/, ".adl.json");
    const staticJsonPath = path.join(STATIC_EXAMPLES, staticJsonFile);
    const staticResult = convertYamlToJson(yamlPath, staticJsonPath);
    results.push(staticResult);

    // Generate JSON alongside YAML for CodeTabs imports
    const codeTabsJsonPath = yamlPath.replace(/\.yaml$/, ".json");
    const codeTabsResult = convertYamlToJson(yamlPath, codeTabsJsonPath);
    results.push(codeTabsResult);
  }

  return results;
}

/**
 * Process snippet YAML files
 * Converts _yaml-sources/snippets/**\/*.yaml -> _yaml-sources/snippets/**\/*.json
 * These are kept alongside YAML for the CodeTabs component to import
 */
async function processSnippets(): Promise<ConversionResult[]> {
  const results: ConversionResult[] = [];
  const snippetsDir = path.join(YAML_SOURCES, "snippets");

  if (!fs.existsSync(snippetsDir)) {
    console.log("  No snippets directory found, skipping...");
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

  // Process examples
  console.log("Processing examples...");
  const exampleResults = await processExamples();
  for (const result of exampleResults) {
    const status = result.success ? "OK" : `ERROR: ${result.error}`;
    console.log(`  ${path.basename(result.source)} -> ${status}`);
  }

  // Process snippets
  console.log("\nProcessing snippets...");
  const snippetResults = await processSnippets();
  for (const result of snippetResults) {
    const status = result.success ? "OK" : `ERROR: ${result.error}`;
    console.log(`  ${path.basename(result.source)} -> ${status}`);
  }

  // Summary
  const allResults = [...exampleResults, ...snippetResults];
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
