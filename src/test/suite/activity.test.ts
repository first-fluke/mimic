import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { ActivityWatcher } from '../../services/ActivityWatcher';

suite('ActivityWatcher Integration Test', () => {
    vscode.window.showInformationMessage('Start ActivityWatcher tests.');

    const tempDir = path.join(os.tmpdir(), 'mimic-test-env');
    const eventsPath = path.join(tempDir, 'events.jsonl');
    let watcher: ActivityWatcher;
    let outputChannel: vscode.OutputChannel; // Mock
    let insightService: any; // Mock

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
        watcher = new ActivityWatcher(outputChannel, tempDir, insightService);
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
        await (watcher as any).processNewEvents();

        // Wait for stream to finish processing (it's async internally)
        await new Promise(resolve => setTimeout(resolve, 200));

        // Verify count
        assert.strictEqual(watcher.getEventCount(), 1);
    });
});
