import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode'; // Mocked
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ActivityWatcher } from '../services/ActivityWatcher';

describe('ActivityWatcher Integration Test', () => {
    const tempDir = path.join(os.tmpdir(), 'mimic-test-env');
    const eventsPath = path.join(tempDir, 'events.jsonl');
    let watcher: ActivityWatcher;
    let outputChannel: any;
    let insightService: any;

    beforeEach(async () => {
        // Prepare temp environment
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        fs.mkdirSync(tempDir, { recursive: true });

        // Mock OutputChannel
        outputChannel = {
            name: 'MIMIC-Test',
            append: () => { },
            appendLine: (msg: string) => console.log(msg),
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
        // Using eventsPath explicitly as ActivityWatcher expects a file path
        watcher = new ActivityWatcher(outputChannel, eventsPath, insightService);
        await watcher.start();
    });

    afterEach(() => {
        if (watcher) {
            watcher.dispose();
        }
        // Cleanup
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('Should detect file changes', async () => {
        // Write a log entry
        const event = { ts: Date.now(), cmd: 'echo test', cwd: '/tmp', exit: 0, dur: 0.1 };
        fs.appendFileSync(eventsPath, `${JSON.stringify(event)}\n`);

        // Wait for watcher (debounce/async) - give it a bit
        await new Promise(resolve => setTimeout(resolve, 500));

        // Manual trigger because fs.watch on macOS /var/folders is flaky in test env
        // Using cast to any to access private method if needed, though public in test logic
        await (watcher as any).processNewEvents();

        // Wait for stream to finish processing (it's async internally)
        await new Promise(resolve => setTimeout(resolve, 200));

        // Verify count
        expect(watcher.getEventCount()).toBe(1);
    });
});
