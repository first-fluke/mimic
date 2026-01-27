import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { InsightService } from './InsightService';

/**
 * ActivityWatcher: Real-time Shell Event Perception
 *
 * Watches ~/.mimic/events.jsonl for new command entries
 * and triggers reactions based on patterns detected.
 */

const DEFAULT_THRESHOLD = 100;

interface ShellEvent {
    ts: number;      // Unix timestamp
    cmd: string;     // Command executed
    cwd: string;     // Working directory
    exit: number;    // Exit code
    dur: number;     // Duration in seconds
}

export class ActivityWatcher implements vscode.Disposable {
    private readonly eventsPath: string;
    private watcher: fs.FSWatcher | null = null;
    private lastPosition: number = 0;
    private outputChannel: vscode.OutputChannel;
    private disposables: vscode.Disposable[] = [];

    // Insight formation
    private eventCount: number = 0;
    private insightService: InsightService;

    // Events
    private _onDidDetectError = new vscode.EventEmitter<string>();
    public readonly onDidDetectError = this._onDidDetectError.event;

    private _onDidDetectEvent = new vscode.EventEmitter<void>();
    public readonly onDidDetectEvent = this._onDidDetectEvent.event;

    constructor(outputChannel: vscode.OutputChannel, eventsPath: string, insightService: InsightService) {
        // Use injected path for consistency
        this.eventsPath = eventsPath;
        this.outputChannel = outputChannel;
        this.insightService = insightService;
    }

    public async start(): Promise<void> {
        this.outputChannel.appendLine('[ActivityWatcher] Starting real-time perception...');

        // Ensure directory exists
        const dir = path.dirname(this.eventsPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Initialize file if it doesn't exist
        if (!fs.existsSync(this.eventsPath)) {
            fs.writeFileSync(this.eventsPath, '');
        }

        // 1. Log Rotation Check
        await this.rotateLogIfNeeded();

        // 2. Initial Count (Stream-based)
        this.eventCount = await this.countLinesStream(this.eventsPath);

        // Get initial file size to skip existing content
        const stats = await fs.promises.stat(this.eventsPath);
        this.lastPosition = stats.size;

        // 3. Watch for file changes
        // Use fs.watch (non-blocking)
        try {
            this.watcher = fs.watch(this.eventsPath, (eventType) => {
                if (eventType === 'change' || eventType === 'rename') {
                    // Check if file still exists on rename (log rotation or deletion)
                    if (fs.existsSync(this.eventsPath)) {
                        this.processNewEvents();
                    }
                }
            });
            this.outputChannel.appendLine(`[ActivityWatcher] Watching: ${this.eventsPath}`);
        } catch (e) {
            this.outputChannel.appendLine(`[ActivityWatcher] Watch Error: ${e}`);
        }

        // Check for retroactive insight formation
        const threshold = this.getThreshold();
        if (this.eventCount >= threshold && (await this.insightService.getInsightCount()) === 0) {
            this.outputChannel.appendLine(`[ActivityWatcher] 🧠 Retroactive analysis: Threshold reached (${this.eventCount}). Forming insight...`);
            this.insightService.formInsight().then(() => {
                this.outputChannel.appendLine('[ActivityWatcher] Retroactive analysis request sent.');
            });
        }
    }

    private async rotateLogIfNeeded(): Promise<void> {
        try {
            const stats = await fs.promises.stat(this.eventsPath);
            const MAX_SIZE_MB = 10;
            if (stats.size > MAX_SIZE_MB * 1024 * 1024) {
                const date = new Date().toISOString().split('T')[0];
                const backupPath = path.join(path.dirname(this.eventsPath), `events.${date}.jsonl`);
                await fs.promises.rename(this.eventsPath, backupPath);
                await fs.promises.writeFile(this.eventsPath, '');
                this.outputChannel.appendLine(`[ActivityWatcher] 🔄 Log Rotated: ${this.eventsPath} -> ${backupPath}`);
            }
        } catch (e) {
            // Ignore if file doesn't exist or error
        }
    }

    private async countLinesStream(filePath: string): Promise<number> {
        return new Promise((resolve) => {
            let count = 0;
            const stream = fs.createReadStream(filePath);
            stream.on('data', (chunk) => {
                for (let i = 0; i < chunk.length; ++i) {
                    if (chunk[i] === 10) count++; // 10 is newline
                }
            });
            stream.on('end', () => resolve(count));
            stream.on('error', () => resolve(0));
        });
    }

    private async processNewEvents(): Promise<void> {
        try {
            const stats = await fs.promises.stat(this.eventsPath);
            this.outputChannel.appendLine(`[ActivityWatcher] Check: Size ${stats.size} vs Last ${this.lastPosition}`);
            if (stats.size <= this.lastPosition) {
                // File truncated or rotated? Reset position
                if (stats.size < this.lastPosition) {
                    this.lastPosition = 0;
                }
                return;
            }

            const stream = fs.createReadStream(this.eventsPath, {
                start: this.lastPosition,
                end: stats.size - 1,
                encoding: 'utf-8'
            });

            this.lastPosition = stats.size;
            let buffer = '';

            stream.on('data', (chunk) => {
                buffer += chunk;
            });

            stream.on('end', () => {
                const lines = buffer.split('\n').filter(line => line.trim());
                for (const line of lines) {
                    try {
                        const event: ShellEvent = JSON.parse(line);
                        this.handleEvent(event);
                    } catch {
                        // Skip malformed
                    }
                }
            });

        } catch (error) {
            this.outputChannel.appendLine(`[ActivityWatcher] Error: ${error}`);
        }
    }

    private getThreshold(): number {
        return vscode.workspace.getConfiguration('mimic').get<number>('insightThreshold', 100);
    }

    private handleEvent(event: ShellEvent): void {
        this.eventCount++;

        this.outputChannel.appendLine(
            `[ActivityWatcher] Event #${this.eventCount}: ${event.cmd} (exit: ${event.exit}, dur: ${event.dur}s)`
        );

        // React to errors
        // Ignore exit 130 (SIGINT/Ctrl+C) and exit 2 (Misuse of shell builtins, sometimes used for interruption)
        if (event.exit !== 0 && event.exit !== 130 && event.exit !== 2) {
            this.outputChannel.appendLine(
                `[ActivityWatcher] ⚠️ Command failed: ${event.cmd}`
            );
            this._onDidDetectError.fire(event.cmd);
        }

        // Emit generic event for UI refresh
        this._onDidDetectEvent.fire();

        // Threshold-based Insight Formation (Silent, Background)
        const threshold = this.getThreshold();
        if (this.eventCount % threshold === 0) {
            this.outputChannel.appendLine(`[ActivityWatcher] 🧠 Threshold reached (${this.eventCount}). Forming insight...`);
            this.insightService.formInsight();
        }
    }

    public getEventCount(): number {
        return this.eventCount;
    }

    public getInsightService(): InsightService {
        return this.insightService;
    }

    public getEventsPath(): string {
        return this.eventsPath;
    }

    public stop(): void {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        this.outputChannel.appendLine('[ActivityWatcher] Stopped.');
    }

    public dispose(): void {
        this.stop();
        this.disposables.forEach(d => d.dispose());
    }
}


