import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { generateId } from "@/utils/id";

/**
 * Observation types for JSONL logging
 */
export type ObservationType =
  | "tool.call"
  | "message.user"
  | "message.assistant"
  | "session.start"
  | "session.end"
  | "file.edit"
  | "command"
  | "vcs.branch"
  | "pattern.detected"
  | "instinct.created"
  | "evolution.triggered";

export interface ObservationEntry {
  id: string;
  type: ObservationType;
  timestamp: string;
  sessionId?: string;
  data: Record<string, unknown>;
}

export interface ObservationQuery {
  types?: ObservationType[];
  startDate?: Date;
  endDate?: Date;
  sessionId?: string;
  limit?: number;
}

const ARCHIVE_THRESHOLD = 5 * 1024 * 1024; // 5MB

/**
 * Manages JSONL-based observation logging for the Mimic plugin.
 * Provides real-time event capture and historical query capabilities.
 */
export class ObservationLog {
  private readonly logPath: string;
  private readonly archiveDir: string;

  constructor(mimicDir: string) {
    this.logPath = join(mimicDir, "observations.jsonl");
    this.archiveDir = join(mimicDir, "archives");
  }

  /**
   * Initialize the observation log directory structure
   */
  async initialize(): Promise<void> {
    const dir = join(this.logPath, "..");
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    if (!existsSync(this.archiveDir)) {
      await mkdir(this.archiveDir, { recursive: true });
    }
  }

  /**
   * Append a new observation entry to the log
   */
  async append(entry: Omit<ObservationEntry, "id" | "timestamp">): Promise<ObservationEntry> {
    const fullEntry: ObservationEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      ...entry,
    };

    const line = `${JSON.stringify(fullEntry)}\n`;
    await appendFile(this.logPath, line, "utf-8");

    // Check if rotation is needed
    await this.maybeRotate();

    return fullEntry;
  }

  /**
   * Log a tool call observation
   */
  async logToolCall(
    tool: string,
    callId: string,
    sessionId: string,
    args?: Record<string, unknown>,
  ): Promise<ObservationEntry> {
    return this.append({
      type: "tool.call",
      sessionId,
      data: { tool, callId, args },
    });
  }

  /**
   * Log a user message observation
   */
  async logUserMessage(
    sessionId: string,
    messageId: string,
    textPreview?: string,
  ): Promise<ObservationEntry> {
    return this.append({
      type: "message.user",
      sessionId,
      data: {
        messageId,
        // Only store first 200 chars to avoid storing sensitive data
        textPreview: textPreview?.slice(0, 200),
      },
    });
  }

  /**
   * Log an assistant message observation
   */
  async logAssistantMessage(
    sessionId: string,
    messageId: string,
    tokensUsed?: number,
  ): Promise<ObservationEntry> {
    return this.append({
      type: "message.assistant",
      sessionId,
      data: { messageId, tokensUsed },
    });
  }

  /**
   * Log a file edit observation
   */
  async logFileEdit(file: string, sessionId?: string): Promise<ObservationEntry> {
    return this.append({
      type: "file.edit",
      sessionId,
      data: { file, extension: file.split(".").pop() },
    });
  }

  /**
   * Log a command execution observation
   */
  async logCommand(command: string, sessionId: string, args?: string): Promise<ObservationEntry> {
    return this.append({
      type: "command",
      sessionId,
      data: { command, args },
    });
  }

  /**
   * Log a VCS branch change observation
   */
  async logBranchChange(branch: string | undefined): Promise<ObservationEntry> {
    return this.append({
      type: "vcs.branch",
      data: { branch },
    });
  }

  /**
   * Log a session start observation
   */
  async logSessionStart(sessionId: string): Promise<ObservationEntry> {
    return this.append({
      type: "session.start",
      sessionId,
      data: {},
    });
  }

  /**
   * Log a session end observation
   */
  async logSessionEnd(
    sessionId: string,
    durationMs: number,
    toolCallCount: number,
  ): Promise<ObservationEntry> {
    return this.append({
      type: "session.end",
      sessionId,
      data: { durationMs, toolCallCount },
    });
  }

  /**
   * Query observations with filters
   */
  async query(options: ObservationQuery = {}): Promise<ObservationEntry[]> {
    if (!existsSync(this.logPath)) {
      return [];
    }

    // If only recent entries are needed, read file from end to avoid loading entire file
    const limit = options.limit;
    const needsReverseChronological = true; // We always sort by timestamp descending
    
    // For small limits, use efficient tail reading instead of loading entire file
    if (limit && limit > 0 && limit <= 1000) {
      const entries = await this.readLastNLines(limit * 2); // Read extra to account for filtering
      return this.filterAndSortEntries(entries, options);
    }

    // Fallback: read entire file (for larger queries or when filtering is complex)
    const content = await readFile(this.logPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    let entries: ObservationEntry[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as ObservationEntry;
        entries.push(entry);
      } catch {
        // Skip malformed lines
      }
    }

    return this.filterAndSortEntries(entries, options);
  }

  /**
   * Read last N lines from log file efficiently without loading entire file
   */
  private async readLastNLines(n: number): Promise<ObservationEntry[]> {
    const stats = await stat(this.logPath);
    const fileSize = stats.size;
    
    // Start with a reasonable buffer size (e.g., average 500 bytes per line)
    let bufferSize = Math.min(n * 500, fileSize);
    let buffer = Buffer.alloc(0);
    let position = fileSize;
    
    while (position > 0 && buffer.toString("utf-8").split("\n").filter(Boolean).length < n) {
      const chunkSize = Math.min(bufferSize, position);
      position -= chunkSize;
      
      const chunk = await this.readFileChunk(position, chunkSize);
      buffer = Buffer.concat([chunk, buffer]);
      
      // Increase buffer size for next iteration if needed
      bufferSize *= 2;
    }

    const lines = buffer.toString("utf-8").split("\n").filter(Boolean);
    const entries: ObservationEntry[] = [];

    for (const line of lines.slice(-n)) {
      try {
        const entry = JSON.parse(line) as ObservationEntry;
        entries.push(entry);
      } catch {
        // Skip malformed lines
      }
    }

    return entries;
  }

  /**
   * Read a chunk of the file at specified position
   */
  private async readFileChunk(position: number, length: number): Promise<Buffer> {
    const fs = await import("node:fs");
    const fd = fs.openSync(this.logPath, "r");
    try {
      const buffer = Buffer.alloc(length);
      fs.readSync(fd, buffer, 0, length, position);
      return buffer;
    } finally {
      fs.closeSync(fd);
    }
  }

  /**
   * Filter and sort entries based on query options
   */
  private filterAndSortEntries(
    entries: ObservationEntry[],
    options: ObservationQuery,
  ): ObservationEntry[] {
    // Apply filters
    let filtered = entries;

    if (options.types && options.types.length > 0) {
      filtered = filtered.filter((e) => options.types!.includes(e.type));
    }

    if (options.sessionId) {
      filtered = filtered.filter((e) => e.sessionId === options.sessionId);
    }

    if (options.startDate) {
      const start = options.startDate.getTime();
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= start);
    }

    if (options.endDate) {
      const end = options.endDate.getTime();
      filtered = filtered.filter((e) => new Date(e.timestamp).getTime() <= end);
    }

    // Sort by timestamp descending (most recent first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (options.limit && options.limit > 0) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Get observations from the last N days
   */
  async getRecentObservations(
    days: number,
    types?: ObservationType[],
  ): Promise<ObservationEntry[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return this.query({ startDate, types });
  }

  /**
   * Get observation count by type
   */
  async getStats(): Promise<Record<ObservationType, number>> {
    const entries = await this.query();
    const stats: Record<string, number> = {};

    for (const entry of entries) {
      stats[entry.type] = (stats[entry.type] || 0) + 1;
    }

    return stats as Record<ObservationType, number>;
  }

  /**
   * Check and rotate log file if it exceeds threshold
   */
  private async maybeRotate(): Promise<boolean> {
    if (!existsSync(this.logPath)) {
      return false;
    }

    const stats = await stat(this.logPath);
    if (stats.size < ARCHIVE_THRESHOLD) {
      return false;
    }

    // Create archive with timestamp
    const archiveName = `observations-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`;
    const archivePath = join(this.archiveDir, archiveName);

    const content = await readFile(this.logPath, "utf-8");
    await writeFile(archivePath, content, "utf-8");

    // Clear current log
    await writeFile(this.logPath, "", "utf-8");

    // Clean up old archives to prevent disk bloat (keep last 10)
    await this.cleanupOldArchives(10);

    return true;
  }

  /**
   * Clean up old archive files, keeping only the most recent N
   */
  private async cleanupOldArchives(keepCount: number): Promise<void> {
    try {
      const { readdir, unlink } = await import("node:fs/promises");
      const files = await readdir(this.archiveDir);

      // Filter for observation archive files and get their stats
      const archiveFiles: { name: string; mtime: Date }[] = [];
      for (const file of files) {
        if (file.startsWith("observations-") && file.endsWith(".jsonl")) {
          const filePath = join(this.archiveDir, file);
          const stats = await stat(filePath);
          archiveFiles.push({ name: file, mtime: stats.mtime });
        }
      }

      // Sort by modification time (oldest first)
      archiveFiles.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

      // Delete old archives if we have more than keepCount
      if (archiveFiles.length > keepCount) {
        const toDelete = archiveFiles.slice(0, archiveFiles.length - keepCount);
        for (const archive of toDelete) {
          const filePath = join(this.archiveDir, archive.name);
          await unlink(filePath);
        }
      }
    } catch {
      // Ignore cleanup errors - don't let cleanup failures break rotation
    }
  }

  /**
   * Prune old observations (keep last N days)
   */
  async prune(keepDays: number): Promise<number> {
    const entries = await this.query();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - keepDays);
    const cutoffTime = cutoff.getTime();

    const keep = entries.filter((e) => new Date(e.timestamp).getTime() >= cutoffTime);
    const pruned = entries.length - keep.length;

    if (pruned > 0) {
      const content = `${keep.map((e) => JSON.stringify(e)).join("\n")}\n`;
      await writeFile(this.logPath, content, "utf-8");
    }

    return pruned;
  }

  /**
   * Get the current log file size in bytes
   */
  async getLogSize(): Promise<number> {
    if (!existsSync(this.logPath)) {
      return 0;
    }
    const stats = await stat(this.logPath);
    return stats.size;
  }
}
