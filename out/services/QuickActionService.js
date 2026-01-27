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
exports.QuickActionService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class QuickActionService {
    constructor(outputChannel, eventsPath) {
        this.ignoredPatterns = [];
        const mimicDir = path.join(os.homedir(), '.mimic');
        this.eventsPath = eventsPath || path.join(mimicDir, 'events.jsonl');
        this.ignoredPath = path.join(mimicDir, 'ignored_commands.json');
        this.outputChannel = outputChannel;
        this.ignoredCommands = new Set(['cd', 'ls', 'pwd', 'clear', 'exit']);
        this.loadIgnoredCommands();
        this.loadIgnoredPatterns();
        // Reload on config change
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('mimic.ignoredPatterns')) {
                this.loadIgnoredPatterns();
            }
        });
    }
    loadIgnoredPatterns() {
        const config = vscode.workspace.getConfiguration('mimic');
        this.ignoredPatterns = config.get('ignoredPatterns', []);
    }
    loadIgnoredCommands() {
        if (fs.existsSync(this.ignoredPath)) {
            try {
                const content = fs.readFileSync(this.ignoredPath, 'utf-8');
                const list = JSON.parse(content);
                if (Array.isArray(list)) {
                    list.forEach(cmd => this.ignoredCommands.add(cmd));
                }
            }
            catch (error) {
                console.error('Failed to load ignored commands', error);
            }
        }
    }
    saveIgnoredCommands() {
        try {
            const list = Array.from(this.ignoredCommands);
            fs.writeFileSync(this.ignoredPath, JSON.stringify(list, null, 2));
        }
        catch (error) {
            console.error('Failed to save ignored commands', error);
        }
    }
    ignoreCommand(cmd) {
        this.ignoredCommands.add(cmd);
        this.saveIgnoredCommands();
    }
    /**
     * Add a pattern to the Global configuration.
     */
    async addIgnorePattern(pattern) {
        const config = vscode.workspace.getConfiguration('mimic');
        const current = config.get('ignoredPatterns', []);
        if (!current.includes(pattern)) {
            await config.update('ignoredPatterns', [...current, pattern], vscode.ConfigurationTarget.Global);
        }
    }
    /**
     * Check if a command is ignored.
     */
    isIgnored(cmd) {
        const normalized = this.normalizeCommand(cmd);
        if (this.ignoredCommands.has(normalized))
            return true;
        if (this.ignoredPatterns.some(pattern => normalized.includes(pattern)))
            return true;
        return false;
    }
    /**
     * Get the top N most frequently used commands.
     */
    getTopCommands(limit = 5, minCount = 5) {
        const events = this.readEvents();
        const frequency = {};
        for (const event of events) {
            const cmd = event.cmd;
            if (!cmd)
                continue;
            // Normalize command (remove arguments for git commit -m etc.)
            const normalizedCmd = this.normalizeCommand(cmd);
            if (this.ignoredCommands.has(normalizedCmd))
                continue;
            // Check against ignored patterns (keywords)
            if (this.ignoredPatterns.some(pattern => normalizedCmd.includes(pattern)))
                continue;
            if (!frequency[normalizedCmd]) {
                frequency[normalizedCmd] = { cmd: normalizedCmd, count: 0, lastUsed: 0 };
            }
            frequency[normalizedCmd].count++;
            frequency[normalizedCmd].lastUsed = Math.max(frequency[normalizedCmd].lastUsed, event.ts || 0);
        }
        // Sort by frequency, then by recency, and filter by minCount
        return Object.values(frequency)
            .filter(item => item.count >= minCount)
            .sort((a, b) => {
            if (b.count !== a.count)
                return b.count - a.count;
            return b.lastUsed - a.lastUsed;
        })
            .slice(0, limit);
    }
    /**
     * Execute a command in the active terminal.
     */
    async executeCommand(command) {
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
    readEvents() {
        if (!fs.existsSync(this.eventsPath)) {
            return [];
        }
        try {
            const content = fs.readFileSync(this.eventsPath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            return lines.map(line => {
                try {
                    return JSON.parse(line);
                }
                catch {
                    return null;
                }
            }).filter(Boolean);
        }
        catch {
            return [];
        }
    }
    /**
     * Normalize command for frequency counting.
     * e.g., "git commit -m 'message'" → "git commit -m"
     */
    normalizeCommand(cmd) {
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
    getProjectTopCommands(workspacePath, limit = 5, minCount = 5) {
        const events = this.readEvents();
        const frequency = {};
        for (const event of events) {
            const cmd = event.cmd;
            const cwd = event.cwd;
            if (!cmd)
                continue;
            // Filter by workspace path
            if (cwd && !cwd.startsWith(workspacePath))
                continue;
            const normalizedCmd = this.normalizeCommand(cmd);
            if (this.ignoredCommands.has(normalizedCmd))
                continue;
            if (!frequency[normalizedCmd]) {
                frequency[normalizedCmd] = { cmd: normalizedCmd, count: 0, lastUsed: 0 };
            }
            frequency[normalizedCmd].count++;
            frequency[normalizedCmd].lastUsed = Math.max(frequency[normalizedCmd].lastUsed, event.ts || 0);
        }
        return Object.values(frequency)
            .filter(item => item.count >= minCount)
            .sort((a, b) => {
            if (b.count !== a.count)
                return b.count - a.count;
            return b.lastUsed - a.lastUsed;
        })
            .slice(0, limit);
    }
}
exports.QuickActionService = QuickActionService;
//# sourceMappingURL=QuickActionService.js.map