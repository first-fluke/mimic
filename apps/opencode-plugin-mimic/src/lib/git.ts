import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function getGitHistory(directory: string, limit = 50): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`git log --oneline -n ${limit}`, {
      cwd: directory,
      encoding: "utf-8",
    });
    return stdout.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export async function getRecentlyModifiedFiles(directory: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync(
      "git diff --name-only HEAD~10 HEAD 2>/dev/null || git diff --name-only",
      {
        cwd: directory,
        encoding: "utf-8",
      },
    );
    return stdout.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export async function getCommitMessages(directory: string, limit = 20): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`git log --format=%s -n ${limit}`, {
      cwd: directory,
      encoding: "utf-8",
    });
    return stdout.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export function detectCommitPatterns(messages: string[]): Map<string, number> {
  const patterns = new Map<string, number>();
  for (const msg of messages) {
    const normalized = msg.toLowerCase().replace(/\s+/g, " ").trim();
    patterns.set(normalized, (patterns.get(normalized) || 0) + 1);
  }
  return patterns;
}

export async function getGitDiff(directory: string): Promise<string> {
  try {
    const { stdout: stagedDiff } = await execAsync("git diff --cached", {
      cwd: directory,
      encoding: "utf-8",
    });

    if (stagedDiff.trim().length > 0) {
      return stagedDiff.trim();
    }

    const { stdout } = await execAsync("git diff", {
      cwd: directory,
      encoding: "utf-8",
    });
    return stdout.trim();
  } catch {
    return "";
  }
}

export async function getStagedFiles(directory: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync("git diff --cached --name-only", {
      cwd: directory,
      encoding: "utf-8",
    });
    return stdout.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}
