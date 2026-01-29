import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Instinct } from "@/types";

const GLOBAL_PROFILE_PATH = join(homedir(), ".config", "opencode", "mimic-global-profile.json");

export interface GlobalProfile {
  version: string;
  globalInstincts: Instinct[];
  lastSync: string;
  totalProjects: number;
}

export async function loadGlobalProfile(): Promise<GlobalProfile> {
  if (!existsSync(GLOBAL_PROFILE_PATH)) {
    return {
      version: "0.1.0",
      globalInstincts: [],
      lastSync: new Date().toISOString(),
      totalProjects: 0,
    };
  }

  try {
    const content = await readFile(GLOBAL_PROFILE_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return {
      version: "0.1.0",
      globalInstincts: [],
      lastSync: new Date().toISOString(),
      totalProjects: 0,
    };
  }
}

export async function saveGlobalProfile(profile: GlobalProfile): Promise<void> {
  const dir = join(homedir(), ".config", "opencode");
  if (!existsSync(dir)) {
    await import("node:fs/promises").then((fs) => fs.mkdir(dir, { recursive: true }));
  }
  await writeFile(GLOBAL_PROFILE_PATH, JSON.stringify(profile, null, 2));
}

export function shouldPromoteToGlobal(instinct: Instinct): boolean {
  // Promote instincts that are:
  // 1. High confidence (>= 0.8)
  // 2. Domain-agnostic (tooling, git)
  // 3. Approved status
  return (
    instinct.confidence >= 0.8 &&
    instinct.status === "approved" &&
    (instinct.domain === "tooling" || instinct.domain === "git")
  );
}

export async function syncInstinctsToGlobal(
  projectInstincts: Instinct[],
  projectName: string
): Promise<Instinct[]> {
  const profile = await loadGlobalProfile();
  const promoted: Instinct[] = [];

  for (const instinct of projectInstincts) {
    if (shouldPromoteToGlobal(instinct)) {
      // Check if already exists globally
      const exists = profile.globalInstincts.some(
        (gi) => gi.title === instinct.title && gi.description === instinct.description
      );

      if (!exists) {
        const globalInstinct: Instinct = {
          ...instinct,
          id: `global-${instinct.id}`,
          evidence: {
            ...instinct.evidence,
            patternIDs: [...instinct.evidence.patternIDs, `project:${projectName}`],
          },
        };
        profile.globalInstincts.push(globalInstinct);
        promoted.push(globalInstinct);
      }
    }
  }

  profile.totalProjects += 1;
  profile.lastSync = new Date().toISOString();
  await saveGlobalProfile(profile);

  return promoted;
}

export async function getGlobalInstincts(): Promise<Instinct[]> {
  const profile = await loadGlobalProfile();
  return profile.globalInstincts;
}
