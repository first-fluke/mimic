import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";

export interface ExtractedRule {
  category: string;
  description: string;
  examples?: string[];
}

export interface GeneratedSkillFromDocs {
  name: string;
  description: string;
  rules: ExtractedRule[];
  sourceFiles: string[];
  contentHash?: string;
}

export interface DocSkillMetadata {
  skillName: string;
  contentHash: string;
  generatedAt: string;
  sourceFiles: string[];
}

function computeHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export async function parseReadme(directory: string): Promise<string | null> {
  const readmePaths = ["README.md", "readme.md", "Readme.md"];
  
  for (const filename of readmePaths) {
    const path = join(directory, filename);
    if (existsSync(path)) {
      try {
        return await readFile(path, "utf-8");
      } catch {
        continue;
      }
    }
  }
  
  return null;
}

export async function parseContributing(directory: string): Promise<string | null> {
  const paths = ["CONTRIBUTING.md", "contributing.md", ".github/CONTRIBUTING.md"];
  
  for (const filename of paths) {
    const path = join(directory, filename);
    if (existsSync(path)) {
      try {
        return await readFile(path, "utf-8");
      } catch {
        continue;
      }
    }
  }
  
  return null;
}

export function extractRulesFromDocs(readme: string, contributing?: string): ExtractedRule[] {
  const rules: ExtractedRule[] = [];
  
  // Extract code style section
  const codeStyleMatch = readme.match(/##?\s*(?:Code Style|Coding Standards|Style Guide)([\s\S]*?)(?=##|$)/i);
  if (codeStyleMatch) {
    const lines = codeStyleMatch[1].split("\n").filter((l) => l.trim().startsWith("-") || l.trim().startsWith("*"));
    if (lines.length > 0) {
      rules.push({
        category: "code-style",
        description: "Code style guidelines from README",
        examples: lines.map((l) => l.replace(/^\s*[-*]\s*/, "").trim()).slice(0, 5),
      });
    }
  }
  
  // Extract architecture section
  const archMatch = readme.match(/##?\s*(?:Architecture|Project Structure|Directory Structure)([\s\S]*?)(?=##|$)/i);
  if (archMatch) {
    rules.push({
      category: "architecture",
      description: "Project architecture patterns",
    });
  }
  
  // Extract from contributing guide
  if (contributing) {
    const commitMatch = contributing.match(/##?\s*(?:Commit|Git|Pull Request)([\s\S]*?)(?=##|$)/i);
    if (commitMatch) {
      rules.push({
        category: "git-workflow",
        description: "Git workflow conventions",
      });
    }
  }
  
  return rules;
}

export function generateSkillFromDocs(
  rules: ExtractedRule[],
  projectName: string
): GeneratedSkillFromDocs {
  const skillName = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-conventions`;
  
  return {
    name: skillName,
    description: `Project conventions for ${projectName} extracted from documentation`,
    rules,
    sourceFiles: ["README.md", "CONTRIBUTING.md"].filter(Boolean),
  };
}

export async function saveSkillFromDocs(
  directory: string,
  skill: GeneratedSkillFromDocs
): Promise<string> {
  const skillsDir = join(directory, ".opencode", "skills", skill.name);
  const skillPath = join(skillsDir, "SKILL.md");
  
  const fs = await import("node:fs/promises");
  await fs.mkdir(skillsDir, { recursive: true });
  
  const content = generateSkillMarkdown(skill);
  await writeFile(skillPath, content, "utf-8");
  
  return skillPath;
}

function generateSkillMarkdown(skill: GeneratedSkillFromDocs): string {
  const rulesList = skill.rules
    .map((rule) => {
      const examples = rule.examples ? `\n  - Examples: ${rule.examples.join(", ")}` : "";
      return `- **${rule.category}**: ${rule.description}${examples}`;
    })
    .join("\n");
  
  return `---
name: ${skill.name}
description: ${skill.description}
trigger: auto
domain: conventions
source: documentation
---

# ${skill.name}

This skill was auto-generated from project documentation.

## Conventions

${rulesList}

## Source

Extracted from: ${skill.sourceFiles.join(", ")}

## Usage

This skill provides context about project conventions when working with the codebase.
`;
}

async function loadExistingMetadata(directory: string, skillName: string): Promise<DocSkillMetadata | null> {
  const metadataPath = join(directory, ".opencode", "skills", skillName, "metadata.json");
  if (!existsSync(metadataPath)) return null;
  
  try {
    const content = await readFile(metadataPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function saveMetadata(directory: string, metadata: DocSkillMetadata): Promise<void> {
  const metadataPath = join(directory, ".opencode", "skills", metadata.skillName, "metadata.json");
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}

export interface SkillGenerationOptions {
  enabled?: boolean;
  regenerateOnChange?: boolean;
}

export async function generateInitialSkillsFromDocs(
  directory: string,
  projectName: string,
  options: SkillGenerationOptions = {}
): Promise<{ skill: GeneratedSkillFromDocs; path: string; regenerated: boolean } | null> {
  const { enabled = true, regenerateOnChange = false } = options;
  
  if (!enabled) return null;
  
  const readme = await parseReadme(directory);
  if (!readme) return null;
  
  const contributing = await parseContributing(directory);
  const combinedContent = readme + (contributing || "");
  const contentHash = computeHash(combinedContent);
  
  const rules = extractRulesFromDocs(readme, contributing || undefined);
  if (rules.length === 0) return null;
  
  const skill = generateSkillFromDocs(rules, projectName);
  skill.contentHash = contentHash;
  
  // Check existing skill
  const existingMetadata = await loadExistingMetadata(directory, skill.name);
  if (existingMetadata) {
    // Skill exists - check if content changed
    if (existingMetadata.contentHash === contentHash) {
      // No change - skip generation
      return null;
    }
    
    // Content changed - check if should regenerate
    if (!regenerateOnChange) {
      // Changed but regeneration disabled
      return null;
    }
  }
  
  const path = await saveSkillFromDocs(directory, skill);
  
  // Save metadata
  await saveMetadata(directory, {
    skillName: skill.name,
    contentHash,
    generatedAt: new Date().toISOString(),
    sourceFiles: skill.sourceFiles,
  });
  
  return { skill, path, regenerated: !!existingMetadata };
}
