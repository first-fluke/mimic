import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultState, StateManager } from "@/core/state";
import { detectCommitPatterns, getCommitMessages } from "@/lib/git";
import { createI18n } from "@/lib/i18n";
import { detectPatterns, surfacePatterns } from "@/modules/observation/patterns";

const mockedGetCommitMessages = vi.fn();
const mockedDetectCommitPatterns = vi.fn();

vi.mock("@/lib/git", () => ({
  getCommitMessages: (...args: unknown[]) => mockedGetCommitMessages(...args),
  detectCommitPatterns: (...args: unknown[]) => mockedDetectCommitPatterns(...args),
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

describe("patterns", () => {
  const i18n = createI18n("en-US");
  let manager: StateManager;
  // biome-ignore lint/suspicious/noExplicitAny: Test mock - client not used in these tests
  const mockClient = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCommitMessages.mockReset();
    mockedDetectCommitPatterns.mockReset();
    (StateManager as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      function StateManager() {
        return {
          read: vi.fn(),
          save: vi.fn(),
        };
      },
    );
    manager = new StateManager("/tmp/test");
  });

  describe("detectPatterns", () => {
    it("detects new commit patterns", async () => {
      const state = createDefaultState("test");
      (manager.read as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(state);

      mockedGetCommitMessages.mockReturnValue(["fix bug", "fix bug", "fix bug"]);
      mockedDetectCommitPatterns.mockReturnValue(new Map([["fix bug", 3]]));

      const newPatterns = await detectPatterns({
        stateManager: manager,
        directory: "/tmp/test",
        i18n,
        client: mockClient,
      });

      expect(newPatterns).toHaveLength(1);
      expect(newPatterns[0].type).toBe("commit");
      expect(newPatterns[0].description).toBe("fix bug");
      expect(newPatterns[0].count).toBe(3);
    });

    it("ignores existing patterns", async () => {
      const state = createDefaultState("test");
      state.patterns.push({
        id: "1",
        type: "commit",
        description: "fix bug",
        count: 5,
        firstSeen: 0,
        lastSeen: 0,
        surfaced: false,
        examples: [],
      });
      (manager.read as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(state);

      mockedGetCommitMessages.mockReturnValue(["fix bug"]);
      mockedDetectCommitPatterns.mockReturnValue(new Map([["fix bug", 3]]));

      const newPatterns = await detectPatterns({
        stateManager: manager,
        directory: "/tmp/test",
        i18n,
        client: mockClient,
      });
      expect(newPatterns).toHaveLength(0);
    });

    it("detects file patterns", async () => {
      const state = createDefaultState("test");
      state.statistics.filesModified = { "src/main.ts": 5 };
      (manager.read as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(state);

      mockedDetectCommitPatterns.mockReturnValue(new Map());

      const newPatterns = await detectPatterns({
        stateManager: manager,
        directory: "/tmp/test",
        i18n,
        client: mockClient,
      });

      expect(newPatterns).toHaveLength(1);
      expect(newPatterns[0].type).toBe("file");
      expect(newPatterns[0].description).toBe("src/main.ts");
    });
  });

  describe("surfacePatterns", () => {
    it("surfaces unsurfaced patterns above threshold", async () => {
      const state = createDefaultState("test");
      state.patterns = [
        {
          id: "1",
          type: "tool",
          description: "my-tool",
          count: 5,
          firstSeen: 0,
          lastSeen: 0,
          surfaced: false,
          examples: [],
        },
        {
          id: "2",
          type: "file",
          description: "my-file",
          count: 2, // below threshold 3
          firstSeen: 0,
          lastSeen: 0,
          surfaced: false,
          examples: [],
        },
        {
          id: "3",
          type: "sequence",
          description: "A -> B",
          count: 5,
          firstSeen: 0,
          lastSeen: 0,
          surfaced: false,
          examples: [],
        },
        {
          id: "4",
          type: "commit",
          description: "fix",
          count: 5,
          firstSeen: 0,
          lastSeen: 0,
          surfaced: false,
          examples: [],
        },
        {
          id: "5",
          type: "file",
          description: "file.ts",
          count: 5,
          firstSeen: 0,
          lastSeen: 0,
          surfaced: false,
          examples: [],
        },
      ];
      (manager.read as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(state);

      const suggestions = await surfacePatterns({
        stateManager: manager,
        directory: "/tmp/test",
        i18n,
        client: mockClient,
      });
      expect(suggestions).toHaveLength(4); // tool, sequence, commit, file
      expect(suggestions.join("")).toContain("my-tool");
      expect(suggestions.join("")).toContain("A -> B");
    });

    it("ignores surfaced patterns", async () => {
      const state = createDefaultState("test");
      state.patterns = [
        {
          id: "1",
          type: "tool",
          description: "my-tool",
          count: 5,
          firstSeen: 0,
          lastSeen: 0,
          surfaced: true,
          examples: [],
        },
      ];
      (manager.read as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(state);

      const suggestions = await surfacePatterns({
        stateManager: manager,
        directory: "/tmp/test",
        i18n,
        client: mockClient,
      });
      expect(suggestions).toHaveLength(0);
    });
  });
});
