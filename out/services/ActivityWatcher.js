"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityWatcher = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * ActivityWatcher: Real-time Shell Event Perception
 *
 * Watches ~/.mimic/events.jsonl for new command entries
 * and triggers reactions based on patterns detected.
 */
const DEFAULT_THRESHOLD = 100;
class ActivityWatcher {
    constructor(outputChannel, eventsPath, insightService) {
        this.watcher = null;
        this.lastPosition = 0;
        this.disposables = [];
        // Insight formation
        this.eventCount = 0;
        // Events
        this._onDidDetectError = new vscode.EventEmitter();
        this.onDidDetectError = this._onDidDetectError.event;
        this._onDidDetectEvent = new vscode.EventEmitter();
        this.onDidDetectEvent = this._onDidDetectEvent.event;
        // Use injected path for consistency
        this.eventsPath = eventsPath;
        this.outputChannel = outputChannel;
        this.insightService = insightService;
    }
    async start() {
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
        }
        catch (e) {
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
    async rotateLogIfNeeded() {
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
        }
        catch (e) {
            // Ignore if file doesn't exist or error
        }
    }
    async countLinesStream(filePath) {
        return new Promise((resolve) => {
            let count = 0;
            const stream = fs.createReadStream(filePath);
            stream.on('data', (chunk) => {
                for (let i = 0; i < chunk.length; ++i) {
                    if (chunk[i] === 10)
                        count++; // 10 is newline
                }
            });
            stream.on('end', () => resolve(count));
            stream.on('error', () => resolve(0));
        });
    }
    async processNewEvents() {
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
                        const event = JSON.parse(line);
                        this.handleEvent(event);
                    }
                    catch {
                        // Skip malformed
                    }
                }
            });
        }
        catch (error) {
            this.outputChannel.appendLine(`[ActivityWatcher] Error: ${error}`);
        }
    }
    getThreshold() {
        return vscode.workspace.getConfiguration('mimic').get('insightThreshold', 100);
    }
    handleEvent(event) {
        this.eventCount++;
        this.outputChannel.appendLine(`[ActivityWatcher] Event #${this.eventCount}: ${event.cmd} (exit: ${event.exit}, dur: ${event.dur}s)`);
        // React to errors
        // Ignore exit 130 (SIGINT/Ctrl+C) and exit 2 (Misuse of shell builtins, sometimes used for interruption)
        if (event.exit !== 0 && event.exit !== 130 && event.exit !== 2) {
            this.outputChannel.appendLine(`[ActivityWatcher] ⚠️ Command failed: ${event.cmd}`);
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
    getEventCount() {
        return this.eventCount;
    }
    getInsightService() {
        return this.insightService;
    }
    getEventsPath() {
        return this.eventsPath;
    }
    stop() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        this.outputChannel.appendLine('[ActivityWatcher] Stopped.');
    }
    dispose() {
        this.stop();
        this.disposables.forEach(d => d.dispose());
    }
}
exports.ActivityWatcher = ActivityWatcher;
//# sourceMappingURL=ActivityWatcher.js.map