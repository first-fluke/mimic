import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as vscode from 'vscode'; // Mocked
import { ActivityWatcher } from '../services/ActivityWatcher';

describe('ActivityWatcher Integration Test', () => {
  const tempDir = path.join(os.tmpdir(), 'mimic-test-env');
  const eventsPath = path.join(tempDir, 'events.jsonl');
  let watcher: ActivityWatcher;
  // biome-ignore lint/suspicious/noExplicitAny: Mock object
  let outputChannel: any;
  // biome-ignore lint/suspicious/noExplicitAny: Mock object
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
      append: () => {},
      appendLine: (msg: string) => console.log(msg),
      replace: () => {},
      clear: () => {},
      show: () => {},
      hide: () => {},
      dispose: () => {},
    };

    // Mock InsightService
    insightService = {
      getInsightCount: async () => 0,
      formInsight: async () => {},
      onDidStartAnalysis: new vscode.EventEmitter().event,
      onDidEndAnalysis: new vscode.EventEmitter().event,
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
    const event = {
      ts: Date.now(),
      cmd: 'echo test',
      cwd: '/tmp',
      exit: 0,
      dur: 0.1,
    };
    fs.appendFileSync(eventsPath, `${JSON.stringify(event)}\n`);

    // Wait for watcher (debounce/async) - give it a bit
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Manual trigger because fs.watch on macOS /var/folders is flaky in test env
    // Using cast to any to access private method if needed, though public in test logic
    // biome-ignore lint/suspicious/noExplicitAny: Accessing private method for test
    await (watcher as any).processNewEvents();

    // Wait for stream to finish processing (it's async internally)
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify count
    expect(watcher.getEventCount()).toBe(1);
  });
});
