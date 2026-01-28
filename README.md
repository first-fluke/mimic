# MIMIC Monorepo

<p align="center">
  <strong>🧠 An AI agent that learns from your workflow and evolves with you.</strong>
</p>

<p align="center">
  <a href="#packages">Packages</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#development">Development</a> •
  <a href="#release-management">Release</a> •
  <a href="./README.ko.md">한국어</a>
</p>

---

## Introduction

**MIMIC** is an **Autonomous Evolutionary Agent** that observes your terminal and IDE patterns like a shadow, identifying inefficiencies and proposing automated solutions.

This monorepo contains two implementations of the MIMIC agent:
- **VS Code Extension**: Deep IDE integration with real-time shell observation
- **OpenCode Plugin**: AI agent plugin that learns from tool usage patterns

---

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [vscode-mimic](./apps/vscode-mimic) | [![VS Code Version](https://img.shields.io/badge/v1.0.0-blue)](./apps/vscode-mimic) | VS Code extension with real-time shell observation |
| [opencode-plugin-mimic](./apps/opencode-plugin-mimic) | [![npm version](https://img.shields.io/npm/v/opencode-plugin-mimic)](https://www.npmjs.com/package/opencode-plugin-mimic) | OpenCode plugin that learns from tool usage patterns |

### apps/vscode-mimic

A VS Code extension that learns from your workflow through real-time shell observation.

**Key Features:**
- **Live Observation**: Real-time monitoring of Zsh terminal activities via shell hooks
- **Adaptive Quick Actions**: One-click buttons for frequently used commands (5+ executions)
- **Autonomous Insight & Synthesis**: AI-powered analysis (Gemini/GPT) to generate shell aliases and agent skills
- **Privacy First**: Stores data locally in `.mimic/` (project) or `~/.mimic/` (global)

[Learn more →](./apps/vscode-mimic/README.md)

### apps/opencode-plugin-mimic

An OpenCode plugin that learns from your patterns and adapts to your workflow.

**Key Features:**
- **Pattern Detection**: Automatically detects repeated tool usage, file edits, and git patterns
- **Instinct Learning**: Learns behavioral "instincts" (rules of thumb) from project history
- **Identity Evolution**: Develops its own personality and stats as it learns
- **Session Memory**: Remembers observations and milestones across sessions
- **Skill Generation**: Automatically creates declarative skills based on project context

[Learn more →](./apps/opencode-plugin-mimic/README.md)

---

## Architecture

Both implementations follow a **Cognitive Architecture** mimicking human cognitive processes:

```
┌─────────────────────────────────────────────────────────────┐
│                    MIMIC Architecture                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Perception  │───▶│    Memory    │───▶│   Analysis   │  │
│  │  (Observe)   │    │   (Store)    │    │  (Pattern)   │  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘  │
│         ▲                                        │         │
│         │                                        ▼         │
│         │                               ┌──────────────┐  │
│         └───────────────────────────────│    Action    │  │
│                                         │  (Suggest)   │  │
│                                         └──────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

1. **Perception**: Observes user activities (shell commands, tool calls, file edits)
2. **Memory**: Stores time-series data locally (JSONL format)
3. **Analysis**: Discovers patterns using AI/ML or rule-based systems
4. **Action**: Suggests optimizations (aliases, shortcuts, skills)

---

## Development

### Prerequisites

- [Bun](https://bun.sh/)
- Node.js 24+

### Setup

```bash
# Clone the repository
git clone https://github.com/mimic-agent/mimic.git
cd mimic

# Install root dependencies
npm install
```

### VS Code Extension

```bash
cd apps/vscode-mimic
bun install
bun run compile
bun test
```

### OpenCode Plugin

```bash
cd apps/opencode-plugin-mimic
bun install
bun run build
bun run test
bun run typecheck
```

---

## Release Management

This repository uses [Release Please](https://github.com/googleapis/release-please) for automated versioning and releases.

### Conventional Commits

Use conventional commit messages to trigger version bumps:

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `feat:` | Minor | `feat: add new pattern detector` |
| `fix:` | Patch | `fix: resolve memory leak in watcher` |
| `feat!:` or `BREAKING CHANGE:` | Major | `feat!: redesign API surface` |

### Package Tags

- VS Code Extension: `vscode-mimic@v{version}`
- OpenCode Plugin: `opencode-plugin-mimic@v{version}`

---

## License

MIT License

---

## Sponsors

If this project helped you, please consider buying me a coffee!

<a href="https://www.buymeacoffee.com/firstfluke" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

Or leave a star:

```bash
gh api --method PUT /user/starred/first-fluke/mimic
```
