import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';

/**
 * QuickActionService: Detects frequently used commands and provides one-click execution.
 */

interface CommandFrequency {
  cmd: string;
  count: number;
  lastUsed: number;
}

export class QuickActionService {
  private readonly eventsPath: string;
  private readonly ignoredPath: string;
  private outputChannel: vscode.OutputChannel;
  private ignoredCommands: Set<string>;
  private ignoredPatterns: string[] = [];

  constructor(outputChannel: vscode.OutputChannel, eventsPath?: string) {
    const mimicDir = path.join(os.homedir(), '.mimic');
    this.eventsPath = eventsPath || path.join(mimicDir, 'events.jsonl');
    this.ignoredPath = path.join(mimicDir, 'ignored_commands.json');
    this.outputChannel = outputChannel;
    this.ignoredCommands = new Set(['cd', 'ls', 'pwd', 'clear', 'exit']);
    this.loadIgnoredCommands();
    this.loadIgnoredPatterns();

    // Reload on config change
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('mimic.ignoredPatterns')) {
        this.loadIgnoredPatterns();
      }
    });
  }

  private loadIgnoredPatterns() {
    const config = vscode.workspace.getConfiguration('mimic');
    this.ignoredPatterns = config.get<string[]>('ignoredPatterns', []);
  }

  private loadIgnoredCommands() {
    if (fs.existsSync(this.ignoredPath)) {
      try {
        const content = fs.readFileSync(this.ignoredPath, 'utf-8');
        const list = JSON.parse(content);
        if (Array.isArray(list)) {
          list.forEach((cmd) => {
            this.ignoredCommands.add(cmd);
          });
        }
      } catch (error) {
        console.error('Failed to load ignored commands', error);
      }
    }
  }

  private saveIgnoredCommands() {
    try {
      const list = Array.from(this.ignoredCommands);
      fs.writeFileSync(this.ignoredPath, JSON.stringify(list, null, 2));
    } catch (error) {
      console.error('Failed to save ignored commands', error);
    }
  }

  public ignoreCommand(cmd: string) {
    this.ignoredCommands.add(cmd);
    this.saveIgnoredCommands();
  }

  /**
   * Add a pattern to the Global configuration.
   */
  public async addIgnorePattern(pattern: string) {
    const config = vscode.workspace.getConfiguration('mimic');
    const current = config.get<string[]>('ignoredPatterns', []);
    if (!current.includes(pattern)) {
      await config.update(
        'ignoredPatterns',
        [...current, pattern],
        vscode.ConfigurationTarget.Global,
      );
    }
  }

  /**
   * Check if a command is ignored.
   */
  public isIgnored(cmd: string): boolean {
    const normalized = this.normalizeCommand(cmd);
    if (this.ignoredCommands.has(normalized)) return true;
    if (this.ignoredPatterns.some((pattern) => normalized.includes(pattern)))
      return true;
    return false;
  }

  /**
   * Get the top N most frequently used commands.
   */
  public getTopCommands(
    limit: number = 5,
    minCount: number = 5,
  ): CommandFrequency[] {
    const events = this.readEvents();
    const frequency: Record<string, CommandFrequency> = {};

    for (const event of events) {
      const cmd = event.cmd;
      if (!cmd) continue;

      // Normalize command (remove arguments for git commit -m etc.)
      const normalizedCmd = this.normalizeCommand(cmd);

      if (this.ignoredCommands.has(normalizedCmd)) continue;

      // Check against ignored patterns (keywords)
      if (
        this.ignoredPatterns.some((pattern) => normalizedCmd.includes(pattern))
      )
        continue;

      if (!frequency[normalizedCmd]) {
        frequency[normalizedCmd] = {
          cmd: normalizedCmd,
          count: 0,
          lastUsed: 0,
        };
      }
      frequency[normalizedCmd].count++;
      frequency[normalizedCmd].lastUsed = Math.max(
        frequency[normalizedCmd].lastUsed,
        event.ts || 0,
      );
    }

    // Sort by frequency, then by recency, and filter by minCount
    return Object.values(frequency)
      .filter((item) => item.count >= minCount)
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.lastUsed - a.lastUsed;
      })
      .slice(0, limit);
  }

  /**
   * Execute a command in the active terminal.
   */
  public async executeCommand(command: string): Promise<void> {
    let terminal = vscode.window.activeTerminal;

    if (!terminal) {
      terminal = vscode.window.createTerminal('MIMIC');
    }

    terminal.show();
    terminal.sendText(command);

    this.outputChannel.appendLine(`[QuickAction] Executed: ${command}`);
  }

  /**
   * Read events from the JSONL file.
   */
  private readEvents(): Array<{ cmd: string; ts?: number }> {
    if (!fs.existsSync(this.eventsPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.eventsPath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      return lines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Normalize command for frequency counting.
   * e.g., "git commit -m 'message'" → "git commit -m"
   */
  private normalizeCommand(cmd: string): string {
    cmd = cmd.trim();

    // Handle common patterns
    const patterns = [
      /^(git commit -m)\s+.*/, // git commit -m "xxx" → git commit -m
      /^(git commit -am)\s+.*/, // git commit -am "xxx" → git commit -am
      /^(echo)\s+.*/, // echo "xxx" → echo
      /^(cd)\s+.*/, // cd /path → cd
    ];

    for (const pattern of patterns) {
      const match = cmd.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return cmd;
  }

  /**
   * For project-scoped commands, get workspace-specific events.
   */
  public getProjectTopCommands(
    workspacePath: string,
    limit: number = 5,
    minCount: number = 5,
  ): CommandFrequency[] {
    const events = this.readEvents();
    const frequency: Record<string, CommandFrequency> = {};

    for (const event of events) {
      const cmd = event.cmd;
      const cwd = (event as { cwd?: string }).cwd;

      if (!cmd) continue;

      // Filter by workspace path
      if (cwd && !cwd.startsWith(workspacePath)) continue;

      const normalizedCmd = this.normalizeCommand(cmd);

      if (this.ignoredCommands.has(normalizedCmd)) continue;

      if (!frequency[normalizedCmd]) {
        frequency[normalizedCmd] = {
          cmd: normalizedCmd,
          count: 0,
          lastUsed: 0,
        };
      }
      frequency[normalizedCmd].count++;
      frequency[normalizedCmd].lastUsed = Math.max(
        frequency[normalizedCmd].lastUsed,
        (event as { ts?: number }).ts || 0,
      );
    }

    return Object.values(frequency)
      .filter((item) => item.count >= minCount)
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.lastUsed - a.lastUsed;
      })
      .slice(0, limit);
  }
}
