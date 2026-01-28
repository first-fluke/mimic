import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultState, StateManager } from "@/core/state";

const mockedExistsSync = vi.fn();
const mockedMkdir = vi.fn();
const mockedReadFile = vi.fn();
const mockedWriteFile = vi.fn();

vi.mock("node:fs", () => ({
  existsSync: (...args: unknown[]) => mockedExistsSync(...args),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: (...args: unknown[]) => mockedMkdir(...args),
  readFile: (...args: unknown[]) => mockedReadFile(...args),
  writeFile: (...args: unknown[]) => mockedWriteFile(...args),
}));

describe("StateManager", () => {
  const testDir = "/tmp/test-project";
  let manager: StateManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedExistsSync.mockReset();
    mockedMkdir.mockReset();
    mockedReadFile.mockReset();
    mockedWriteFile.mockReset();
    manager = new StateManager(testDir);
  });

  describe("initialize", () => {
    it("creates directories and default state if not exist", async () => {
      mockedExistsSync.mockReturnValue(false);
      await manager.initialize();

      expect(mockedMkdir).toHaveBeenCalledTimes(6); // mimic, sessions, instincts, errorPatterns, macros, save ensure
      expect(mockedWriteFile).toHaveBeenCalledTimes(2);

      const gitIgnoreCall = mockedWriteFile.mock.calls[0];
      expect(gitIgnoreCall[0]).toContain(".gitignore");
      expect(gitIgnoreCall[1]).toContain(".opencode/mimic/");

      const stateCall = mockedWriteFile.mock.calls[1];
      const writtenState = JSON.parse(stateCall[1] as string);
      expect(writtenState.project.name).toBe("test-project");
    });

    it("does not create if exists", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFile.mockResolvedValue(".opencode/mimic/");
      await manager.initialize();
      expect(mockedMkdir).not.toHaveBeenCalled();
      expect(mockedWriteFile).not.toHaveBeenCalled();
    });
  });

  describe("ensureGitIgnore", () => {
    it("creates .gitignore with mimic wildcard line if file does not exist", async () => {
      mockedExistsSync.mockReturnValue(false);
      await manager.ensureGitIgnore();

      expect(mockedWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(".gitignore"),
        ".opencode/mimic/\n",
        "utf-8",
      );
    });

    it("appends mimic wildcard line to existing .gitignore if not present", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFile.mockResolvedValue("node_modules/\n.env\n");
      await manager.ensureGitIgnore();

      expect(mockedWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(".gitignore"),
        "node_modules/\n.env\n\n.opencode/mimic/\n",
        "utf-8",
      );
    });

    it("does not append if mimic wildcard line already exists", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFile.mockResolvedValue(".opencode/mimic/\n");
      await manager.ensureGitIgnore();

      expect(mockedWriteFile).not.toHaveBeenCalled();
    });

    it("ignores whitespace when checking for existing entry", async () => {
      mockedExistsSync.mockReturnValue(true);
      mockedReadFile.mockResolvedValue("  .opencode/mimic/  \n");
      // biome-ignore lint/suspicious/noExplicitAny: Accessing private method for testing
      await (manager as any).ensureGitIgnore();

      expect(mockedWriteFile).not.toHaveBeenCalled();
    });
  });

  describe("read", () => {
    it("reads and parses state", async () => {
      const mockData = createDefaultState("test");
      mockedReadFile.mockResolvedValue(JSON.stringify(mockData));

      const state = await manager.read();
      expect(state.project.name).toBe(mockData.project.name);
    });
  });

  describe("addObservation", () => {
    it("adds observation and saves", async () => {
      const mockData = createDefaultState("test");
      mockedReadFile.mockResolvedValue(JSON.stringify(mockData));

      await manager.addObservation("test observation");

      expect(mockedWriteFile).toHaveBeenCalled();
      // Get the last call since cleanupState may call save multiple times
      const lastCall = mockedWriteFile.mock.calls[mockedWriteFile.mock.calls.length - 1];
      const writtenState = JSON.parse(lastCall[1] as string);
      expect(writtenState.journey.observations).toHaveLength(1);
      expect(writtenState.journey.observations[0].observation).toBe("test observation");
    });

    it("trims observations to 100", async () => {
      const mockData = createDefaultState("test");
      mockData.journey.observations = Array(100).fill({ observation: "old", timestamp: "" });
      mockedReadFile.mockResolvedValue(JSON.stringify(mockData));

      await manager.addObservation("new");

      // Get the last call since cleanupState may call save multiple times
      const lastCall = mockedWriteFile.mock.calls[mockedWriteFile.mock.calls.length - 1];
      const writtenState = JSON.parse(lastCall[1] as string);
      expect(writtenState.journey.observations).toHaveLength(100);
      expect(writtenState.journey.observations[99].observation).toBe("new");
    });
  });

  describe("addMilestone", () => {
    it("adds milestone and saves", async () => {
      const mockData = createDefaultState("test");
      mockedReadFile.mockResolvedValue(JSON.stringify(mockData));

      await manager.addMilestone("v1.0");

      expect(mockedWriteFile).toHaveBeenCalled();
      // Get the last call since cleanupState may call save multiple times
      const lastCall = mockedWriteFile.mock.calls[mockedWriteFile.mock.calls.length - 1];
      const writtenState = JSON.parse(lastCall[1] as string);
      expect(writtenState.journey.milestones).toHaveLength(1);
      expect(writtenState.journey.milestones[0].milestone).toBe("v1.0");
    });
  });

  describe("saveSession", () => {
    it("saves session data", async () => {
      await manager.saveSession("session-1", { foo: "bar" });
      expect(mockedWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("session-1.json"),
        expect.stringContaining('"foo": "bar"'),
      );
    });
  });

  describe("getters", () => {
    it("returns paths and names", () => {
      expect(manager.getProjectName()).toBe("test-project");
      expect(manager.getSessionsDir()).toContain("/tmp/test-project/.opencode/mimic/sessions");
      expect(manager.getStatePath()).toContain("/tmp/test-project/.opencode/mimic/state.json");
    });
  });
});
