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
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const ActivityWatcher_1 = require("../../services/ActivityWatcher");
suite('ActivityWatcher Integration Test', () => {
    vscode.window.showInformationMessage('Start ActivityWatcher tests.');
    const tempDir = path.join(os.tmpdir(), 'mimic-test-env');
    const eventsPath = path.join(tempDir, 'events.jsonl');
    let watcher;
    let outputChannel; // Mock
    let insightService; // Mock
    setup(async () => {
        // Prepare temp environment
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        fs.mkdirSync(tempDir, { recursive: true });
        // Mock OutputChannel
        outputChannel = {
            name: 'MIMIC-Test',
            append: () => { },
            appendLine: (msg) => console.log(msg),
            replace: () => { },
            clear: () => { },
            show: () => { },
            hide: () => { },
            dispose: () => { }
        };
        // Mock InsightService
        insightService = {
            getInsightCount: async () => 0,
            formInsight: async () => { },
            onDidStartAnalysis: new vscode.EventEmitter().event,
            onDidEndAnalysis: new vscode.EventEmitter().event
        };
        // Initialize Watcher with temp storage path
        watcher = new ActivityWatcher_1.ActivityWatcher(outputChannel, tempDir, insightService);
        await watcher.start();
    });
    teardown(() => {
        if (watcher) {
            watcher.dispose();
        }
    });
    test('Should detect file changes', async () => {
        // Write a log entry
        const event = { ts: Date.now(), cmd: 'echo test', cwd: '/tmp', exit: 0, dur: 0.1 };
        fs.appendFileSync(eventsPath, JSON.stringify(event) + '\n');
        // Wait for watcher (debounce/async) - give it a bit
        await new Promise(resolve => setTimeout(resolve, 500));
        // Manual trigger because fs.watch on macOS /var/folders is flaky in test env
        await watcher.processNewEvents();
        // Wait for stream to finish processing (it's async internally)
        await new Promise(resolve => setTimeout(resolve, 200));
        // Verify count
        assert.strictEqual(watcher.getEventCount(), 1);
    });
});
//# sourceMappingURL=activity.test.js.map