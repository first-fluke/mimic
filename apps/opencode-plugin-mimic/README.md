# opencode-plugin-mimic

[![npm version](https://img.shields.io/npm/v/opencode-plugin-mimic)](https://www.npmjs.com/package/opencode-plugin-mimic)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**English** | [한국어](./README.ko.md)

> An OpenCode plugin that learns from your patterns and adapts to your workflow.

Mimic watches how you work, remembers across sessions, and suggests actions based on what you do repeatedly.

## Features

- **Pattern Detection**: Automatically detects repeated tool usage, file edits, git commit messages, and chat patterns
- **Instinct Learning**: Learns behavioral "instincts" (rules of thumb) from your project history
- **Identity Evolution**: The plugin develops its own personality and stats as it learns more about you
- **Session Memory**: Remembers observations and milestones across sessions with long-term context
- **Journey Tracking**: Narrative storytelling of your project's evolution
- **Skill Generation**: Automatically creates declarative skills based on project context
- **Git & VCS Integration**: Analyzes branches, commit messages, and file modifications
- **Smart Suggestions**: Offers to create shortcuts or evolve capabilities for repeated actions
- **Per-Project State**: Each project gets its own learned patterns and instincts
- **Configurable**: Enable/disable learning and suggestions, adjust thresholds
- **Internationalization**: English or Korean UI based on user config

## How It Works

1. **Track**: Mimic tracks tool calls, file edits, git history, and even user prompts
2. **Detect**: Patterns are categorized by type (tool, file, commit, prompt)
3. **Observe**: Behavioral patterns are logged and analyzed by a background observer
4. **Learn**: Recurring behaviors are distilled into **Instincts** - project-specific rules of thumb
5. **Apply**: Instincts are automatically applied to new sessions to maintain continuity
6. **Evolve**: When patterns reach thresholds, Mimic can evolve them into dedicated tools or skills
7. **Identity**: As you work, Mimic's project identity matures, gaining personality and "awakening" over time


## Installation

### Via npm (Recommended)

```bash
npm install -g opencode-plugin-mimic
```

Then add to your `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-plugin-mimic"]
}
```

## Configuration

Mimic reads `~/.config/opencode/mimic.json` for user-level settings.

```json
{
  "language": "ko-KR"
}
```

Default language is `en-US`.

Project preferences live in `.opencode/mimic/state.json` and can be adjusted via `mimic_configure`:

```
mimic_configure({ learningEnabled: false })
mimic_configure({ suggestionEnabled: false })
mimic_configure({ minPatternCount: 5 })
```

## Flow Diagram (draw.io)

- Diagram file: `docs/mimic_flow.drawio`
- Open it in diagrams.net (draw.io) to view or edit.

## Usage

### Custom Tools

Mimic adds the following tools to OpenCode:

#### `mimic_init`

Initialize or wake up Mimic for this project. Shows welcome message with session stats, recent observations, and potential continuity hints.

#### `mimic_status`

Check current status including session count, pattern stats, recently modified files, and active suggestions.

#### `mimic_journey`

View the narrative story of your project's evolution, including milestones, recent observations, and git activity.

#### `mimic_patterns`

View all detected patterns (Tool, File, Commit, etc.) organized by type and frequency.

#### `mimic_instincts`

View learned behavioral instincts. Instincts are "rules of thumb" that Mimic has learned from your work style.

#### `mimic_apply`

Manually check which instincts apply to the current context (recent tools, modified files, etc.).

#### `mimic_identity`

Check Mimic's project identity, including its personality trait, "awakened" date, and learning stats.

#### `mimic_sequences`

View frequently used tool sequences to understand your common cross-tool workflows.

#### `mimic_observations`

View low-level observation logs (tools, files, sessions) for the current project.

#### `mimic_observe`

Manually add an observation:

```
mimic_observe({ observation: "Refactored auth module for better security" })
```

#### `mimic_milestone`

Record a project milestone:

```
mimic_milestone({ milestone: "v1.0.0 released" })
```

#### `mimic_stats`

View detailed statistics: total sessions, tool calls, pattern/milestone counts, and learning status.

#### `mimic_configure`

Adjust Mimic's behavior:

```
mimic_configure({ learningEnabled: false })     # Stop learning
mimic_configure({ suggestionEnabled: false })   # Stop suggestions
mimic_configure({ minPatternCount: 5 })         # Require 5 repetitions
```

#### `mimic_surface`

Mark a pattern as acknowledged/surfaced.

#### `mimic_reset`

Clear all learned data for the current project.

#### `mimic_grow`

Analyze project direction and growth opportunities based on activity logs.

#### `mimic_evolve`

Suggest and create new capabilities (Shortcuts, Hooks, Commands, Agents, MCP) based on repeated patterns.

#### `mimic_generate-skills`

Analyze project context and automatically generate `.agent/skills` to improve accuracy for future sessions.

#### `mimic_export` / `mimic_import`

Export your learned instincts to a JSON file or import them from another project.

#### `mimic_session-context`

View cross-session context summary and continuity hints.

#### `mimic_level`

Set your technical level (technical, semi-technical, non-technical, chaotic) to personalize Mimic's feedback.

#### `mimic_focus`

Set current project focus or tech stack.

#### `mimic_mcp-search` / `mimic_mcp`

Search for MCP servers and add them to project configuration.

#### `mimic_capabilities`

List all evolved capabilities.

## Pattern Thresholds

| Pattern Type | Threshold | Result |
|--------------|-----------|--------|
| Tool usage | 3+ times (default) | Suggest action |
| Tool usage | 10+ times | Offer shortcut evolution |
| File modified | 5+ times | Offer hook evolution |
| Commit message | 3+ identical | Offer command evolution |

> Note: File/commit patterns are only created after their thresholds. Tool patterns accumulate from the first use.

## Automatic Behaviors

- **Session Start**: Increments session count, analyzes time since last session, and **automatically applies learned instincts** to set the context.
- **Tool Execution**: Tracks every tool call for pattern and sequence detection.
- **File Edit**: Tracks file modification frequency.
- **Background Observation**: Periodically runs an observer to distill patterns into behavioral instincts.
- **Automatic Evolution**: Automatically evolves capabilities when high-confidence patterns emerge in specific domains.
- **Skill Generation**: Automatically generates new skills when new capabilities are evolved.
- **Session Idle**: Analyzes patterns and surfaces suggestions via toasts.
- **Session End**: Records session summary, records continuity memory for next session, and logs major milestones.

> Git-based insights require a git repository. If none is available, git sections will be empty.

## Development

```bash
bun install
bun run build
bun run dev  # watch mode
```

## Inspiration

Heavily inspired by the concepts of [Homunculus](https://github.com/humanplane/homunculus).

## License

MIT
