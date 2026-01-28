import { vi } from 'vitest';

export const window = {
  createOutputChannel: vi.fn().mockReturnValue({
    append: vi.fn(),
    appendLine: vi.fn(),
    clear: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
  }),
  showInformationMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  createStatusBarItem: vi.fn().mockReturnValue({
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
      text: '',
      tooltip: '',
      command: '',
  })
};

export const workspace = {
  getConfiguration: vi.fn().mockReturnValue({
    get: vi.fn((key, defaultValue) => defaultValue),
    update: vi.fn(),
  }),
  workspaceFolders: [],
};

export class EventEmitter {
  private listeners: Function[] = [];
  event = (listener: Function) => {
      this.listeners.push(listener);
      return { dispose: () => {} };
  };
  fire = (data: any) => {
      this.listeners.forEach(l => l(data));
  };
  dispose = vi.fn();
}

export class Disposable {
  dispose = vi.fn();
  static from = vi.fn();
}

export const commands = {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
}

export const Uri = {
    file: vi.fn((f) => ({ fsPath: f })),
    parse: vi.fn(),
}

export enum StatusBarAlignment {
    Left = 1,
    Right = 2
}

export enum ConfigurationTarget {
    Global = 1,
    Workspace = 2,
    WorkspaceFolder = 3
}
