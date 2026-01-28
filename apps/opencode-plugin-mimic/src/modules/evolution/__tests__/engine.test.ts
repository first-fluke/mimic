import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultState, StateManager } from "@/core/state";
import { createI18n } from "@/lib/i18n";
import {
  evolveCapability,
  formatEvolutionResult,
  getEvolutionSuggestions,
  suggestEvolution,
} from "@/modules/evolution/engine";

const mockedExistsSync = vi.fn();
const mockedReadFile = vi.fn();
const mockedWriteFile = vi.fn();
const mockedMkdir = vi.fn();

vi.mock("node:fs", () => ({
  existsSync: (...args: unknown[]) => mockedExistsSync(...args),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: (...args: unknown[]) => mockedMkdir(...args),
  readFile: (...args: unknown[]) => mockedReadFile(...args),
  writeFile: (...args: unknown[]) => mockedWriteFile(...args),
}));

vi.mock("@/core/state", () => ({
  createDefaultState: vi.fn((name: string) => ({
    version: "0.1.0",
    project: {
      name,
      creatorLevel: null,
      firstSession: Date.now(),
      stack: [],
      focus: undefined,
      identity: undefined,
    },
    journey: {
      observations: [],
      milestones: [],
      sessionCount: 0,
      lastSession: null,
    },
    patterns: [],
    evolution: {
      capabilities: [],
      lastEvolution: null,
      pendingSuggestions: [],
      lastObserverRun: null,
      evolvedDomains: {},
      instinctIndex: {},
    },
    preferences: {
      suggestionEnabled: true,
      learningEnabled: true,
      minPatternCount: 3,
    },
    statistics: {
      totalSessions: 0,
      totalToolCalls: 0,
      filesModified: {},
      lastSessionId: null,
      toolSequences: [],
    },
  })),
  StateManager: vi.fn(),
}));

describe("evolution", () => {
  const i18n = createI18n("en-US");
  let manager: StateManager;
  const makeCtx = (directory = "/tmp/project") => ({
    stateManager: manager,
    directory,
    i18n,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockedExistsSync.mockReset();
    mockedReadFile.mockReset();
    mockedWriteFile.mockReset();
    mockedMkdir.mockReset();
    (StateManager as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      function StateManager() {
        return {
          read: vi.fn(),
          save: vi.fn(),
          addMilestone: vi.fn(),
        };
      },
    );
    manager = new StateManager("/tmp/test");
  });

  describe("suggestEvolution", () => {
    it("suggests tool shortcut for frequent tool usage", () => {
      const pattern = {
        id: "1",
        type: "tool" as const,
        description: "read_file",
        count: 10,
        firstSeen: 0,
        lastSeen: 0,
        surfaced: false,
        examples: [],
      };
      const suggestion = suggestEvolution(pattern, makeCtx());
      expect(suggestion?.type).toBe("shortcut");
      expect(suggestion?.name).toBe("quick-read-file");
    });

    it("does not suggest shortcut for builtin tools", () => {
      const builtinTools = ["bash", "read", "write", "edit", "grep", "glob"];
      builtinTools.forEach((toolName) => {
        const pattern = {
          id: "1",
          type: "tool" as const,
          description: toolName,
          count: 10,
          firstSeen: 0,
          lastSeen: 0,
          surfaced: false,
          examples: [],
        };
        const suggestion = suggestEvolution(pattern, makeCtx());
        expect(suggestion).toBeNull();
      });
    });

    it("suggests hook for file modifications", () => {
      const pattern = {
        id: "2",
        type: "file" as const,
        description: "src/config.ts",
        count: 5,
        firstSeen: 0,
        lastSeen: 0,
        surfaced: false,
        examples: [],
      };
      const suggestion = suggestEvolution(pattern, makeCtx());
      expect(suggestion?.type).toBe("hook");
      expect(suggestion?.name).toBe("watch-config-ts");
    });

    it("suggests command for commit patterns", () => {
      const pattern = {
        id: "1",
        type: "commit" as const,
        description: "fix bug",
        count: 3,
        firstSeen: 0,
        lastSeen: 0,
        surfaced: false,
        examples: [],
      };
      const suggestion = suggestEvolution(pattern, makeCtx());
      expect(suggestion?.type).toBe("command");
      expect(suggestion?.name).toBe("commit-fix-bug");
    });

    it("suggests agent for complex sequence", () => {
      const pattern = {
        id: "1",
        type: "sequence" as const,
        description: "complex-flow",
        count: 5,
        firstSeen: 0,
        lastSeen: 0,
        surfaced: false,
        examples: [],
      };
      const suggestion = suggestEvolution(pattern, makeCtx());
      expect(suggestion?.type).toBe("agent");
    });

    it("suggests skill for simple sequence", () => {
      const pattern = {
        id: "1",
        type: "sequence" as const,
        description: "simple-flow",
        count: 3,
        firstSeen: 0,
        lastSeen: 0,
        surfaced: false,
        examples: [],
      };
      const suggestion = suggestEvolution(pattern, makeCtx());
      expect(suggestion?.type).toBe("skill");
    });

    it("returns null if thresholds not met", () => {
      const pattern = {
        id: "1",
        type: "tool" as const,
        description: "read_file",
        count: 2,
        firstSeen: 0,
        lastSeen: 0,
        surfaced: false,
        examples: [],
      };
      expect(suggestEvolution(pattern, makeCtx())).toBeNull();
    });
  });

  describe("evolveCapability", () => {
    it("creates shortcut capability and saves file", async () => {
      const state = createDefaultState("test");
      state.patterns = [
        {
          id: "p1",
          type: "tool",
          description: "my-tool",
          count: 10,
          firstSeen: 0,
          lastSeen: 0,
          surfaced: false,
          examples: [],
        },
      ];
      (manager.read as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(state);

      const suggestion = {
        type: "shortcut" as const,
        name: "my-shortcut",
        description: "desc",
        reason: "reason",
        pattern: state.patterns[0],
      };

      await evolveCapability(makeCtx("/tmp/project"), suggestion);

      expect(mockedWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("my-shortcut.js"),
        expect.stringContaining("export const my_shortcut"),
        "utf-8",
      );
      expect(manager.save).toHaveBeenCalled();
      expect(state.evolution.capabilities).toHaveLength(1);
      expect(state.patterns[0].surfaced).toBe(true);
    });

    it("creates agent capability and saves markdown file", async () => {
      const state = createDefaultState("test");
      (manager.read as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(state);

      const suggestion = {
        type: "agent" as const,
        name: "my-agent",
        description: "desc",
        reason: "reason",
        pattern: {
          id: "p1",
          type: "sequence" as const,
          description: "seq",
          count: 10,
          firstSeen: 0,
          lastSeen: 0,
          surfaced: false,
          examples: [],
        },
      };

      await evolveCapability(makeCtx("/tmp/project"), suggestion);

      expect(mockedWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("my-agent.md"),
        expect.stringContaining("mode: subagent"),
        "utf-8",
      );
    });

    it("creates mcp capability and updates opencode.json", async () => {
      const state = createDefaultState("test");
      (manager.read as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(state);
      mockedExistsSync.mockReturnValue(true);
      mockedReadFile.mockResolvedValue(JSON.stringify({ mcp: {} }));

      const suggestion = {
        type: "mcp" as const,
        name: "my-mcp",
        description: "desc",
        reason: "reason",
        pattern: {
          id: "p1",
          type: "tool" as const,
          description: "tool",
          count: 10,
          firstSeen: 0,
          lastSeen: 0,
          surfaced: false,
          examples: [],
        },
      };

      await evolveCapability(makeCtx("/tmp/project"), suggestion);

      expect(mockedWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("opencode.json"),
        expect.stringContaining("my-mcp"),
        "utf-8",
      );
    });

    it("handles corrupt opencode.json", async () => {
      const state = createDefaultState("test");
      (manager.read as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(state);
      mockedExistsSync.mockReturnValue(true);
      mockedReadFile.mockResolvedValue("invalid-json");

      const suggestion = {
        type: "mcp" as const,
        name: "my-mcp",
        description: "desc",
        reason: "reason",
        pattern: {
          id: "p1",
          type: "tool" as const,
          description: "tool",
          count: 10,
          firstSeen: 0,
          lastSeen: 0,
          surfaced: false,
          examples: [],
        },
      };

      await evolveCapability(makeCtx("/tmp/project"), suggestion);

      expect(mockedWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("opencode.json"),
        expect.stringContaining("my-mcp"),
        "utf-8",
      );
    });
  });

  describe("getEvolutionSuggestions", () => {
    it("returns suggestions for unsurfaced patterns", async () => {
      const state = createDefaultState("test");
      state.patterns = [
        {
          id: "p1",
          type: "tool",
          description: "my-tool",
          count: 10,
          firstSeen: 0,
          lastSeen: 0,
          surfaced: false,
          examples: [],
        },
      ];
      (manager.read as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(state);

      const suggestions = await getEvolutionSuggestions(makeCtx());
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].name).toContain("my-tool");
    });
  });

  describe("formatEvolutionResult", () => {
    it("formats all types", () => {
      const types = ["command", "hook", "skill", "agent", "mcp", "shortcut"] as const;
      types.forEach((type) => {
        const cap = {
          id: "1",
          type,
          name: "test",
          description: "desc",
          createdAt: "",
        };
        const res = formatEvolutionResult(makeCtx(), cap, "/path");
        expect(res).toBeTruthy();
        expect(res).toContain("test");
      });
    });
  });
});
