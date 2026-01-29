import { describe, expect, it } from "vitest";
import { detectCommitPatterns } from "@/lib/git";

describe("git", () => {
  describe("detectCommitPatterns", () => {
    it("counts repeated messages", () => {
      const messages = ["Fix bug", "fix bug", "Feature A", "fix bug "];
      const patterns = detectCommitPatterns(messages);

      expect(patterns.get("fix bug")).toBe(3);
      expect(patterns.get("feature a")).toBe(1);
    });

    it("handles empty messages", () => {
      const patterns = detectCommitPatterns([]);
      expect(patterns.size).toBe(0);
    });

    it("normalizes whitespace", () => {
      const messages = ["fix   bug", "fix bug", "fix  bug"];
      const patterns = detectCommitPatterns(messages);
      expect(patterns.get("fix bug")).toBe(3);
    });
  });
});
