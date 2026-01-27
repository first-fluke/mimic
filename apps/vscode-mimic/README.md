# MIMIC: The Shadow Agent

<p align="center">
  <strong>🧠 An AI agent that learns from your workflow and evolves with you.</strong>
</p>

<p align="center">
  <a href="#core-features">Core Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#mimic-architecture">MIMIC Architecture</a> •
  <a href="#precautions">Precautions</a> •
  <a href="./README.ko.md">한국어</a>
</p>

---

## Introduction

**MIMIC** is an **Autonomous Evolutionary Agent** that observes your terminal and IDE patterns like a shadow, identifying inefficiencies and proposing automated solutions.

It's not just a command wrapper. It understands *how* you work and proactively suggests:
*"Why not alias this long command?"* or *"I see your build failed—want me to create a fix shortcut?"*

---

## Core Features

### 1. 🔍 Live Observation (Real-time Perception)
- **Zero Config**: Starts observing Zsh and IDE activities immediately upon installation.
- **Micro-Second Precision**: Detects shell events usage instantly and updates the UI in real-time.
- **Privacy First**: All data is stored **locally (`~/.mimic/`)** and never leaves your machine.

### 2. ⚡ Adaptive Quick Actions
- **Smart Curation**: Automatically identifies your most frequently used project commands (5+ executions).
- **Instant Access**: Provides **One-Click Buttons** in the sidebar for rapid execution.
- **Customizable Control**:
  - **Threshold**: Only commands used 5+ times appear.
  - **Exclusion**: Remove unwanted commands via the wastebin icon or **VS Code Settings** (`mimic.ignoredPatterns` for keywords like `password`, `secret`).
  - **Project Aware**: Shows commands relevant to your current workspace.

### 3. 🧠 Autonomous Insight & Synthesis
- **AI Analysis**: Analyzes your **Micro-Habits** using Gemini/GPT based on accumulated local logs.
- **Skill Evolution**:
  1. **Analyze**: Click **$(sparkle) Analyze Patterns** to generate habit reports (`~/.mimic/insights/`).
  2. **Synthesize**:
     - **$(terminal) Shell Script**: Auto-generates shell aliases/functions based on your habits.
     - **$(hubot) Agent Skill**: Generates high-level skills for Antigravity agents to automate complex workflows.
  3. **Share**: Save synthesized skills globally (`~/.mimic/skills`) or locally (`.mimic/skills`) to share with your team.

---

## 🕹️ User Interface Guide

Control MIMIC via the Sidebar or Command Palette (`Cmd+Shift+P`).

| Button / Command                 | Description                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **$(sparkle) Analyze Patterns**  | **[Manual Analysis]** Trigger immediate AI analysis of collected logs.                                |
| **$(lightbulb) View Insights**   | **[View Insights]** Open the folder containing AI-generated habit reports.                            |
| **$(terminal) Synthesize Shell** | **[Shell Synth]** Create instant terminal aliases (`.sh`) based on insights.                          |
| **$(hubot) Synthesize Agent**    | **[Agent Synth]** Generate high-level skills for Antigravity to execute.                              |
| **$(play) Run Quick Action**     | **[Quick Run]** Execute frequently used commands instantly.                                           |
| **$(trash) Remove / Ignore**     | **[Exclude]** Remove a command from Quick Actions or add a keyword to `ignoredPatterns` in Settings.  |
| **$(file-code) Open Skill**      | **[Inspect Skill]** View and edit the created Skill details.                                          |
| **$(tools) Install Skill**       | **[Register Command]** Register a `.sh` skill to your `.zshrc` or link an Agent Skill to the project. |

---

## Installation

### From VSIX (Recommended)
1. Download `mimic-1.0.0.vsix`
2. Open VS Code / Antigravity
3. `Cmd+Shift+P` → "Extensions: Install from VSIX..."
4. Select the downloaded file
5. Reload window
6. **Important**: Restart your terminal to enable the shell hook.

### From Source
```bash
git clone https://github.com/mimic-agent/mimic.git
cd mimic
npm install
npm run compile
npx vsce package
```

---

## MIMIC Architecture

MIMIC follows a **Cognitive Architecture** mimicking human cognitive processes:

1. **Perception (`ActivityWatcher`)**: Senses shell and editor events in real-time via `~/.mimic/events.jsonl`.
2. **Memory (`EventLog`)**: Accumulates time-series data locally.
3. **Analysis (`InsightService`)**: Discovers patterns in the background using LLMs.
4. **Action (`QuickActionService`)**: Delivers optimized tools (Buttons, Scripts) to the user.

---

## Precautions

### ⚠️ Data Privacy
MIMIC stores all activity logs as text files in **`~/.mimic/`**.
- **Sensitive Info**: Avoid typing passwords or API keys directly into the terminal.
- **Exclusion**: Use `mimic.ignoredPatterns` setting to auto-hide commands containing sensitive keywords.
- **Data Cleanup**: You can wipe all memory anytime by running `rm -rf ~/.mimic`.

### ⚠️ AI Model Usage
- MIMIC leverages LLMs (Gemini/OpenAI) for analysis.
- **Antigravity IDE Users**: Uses the built-in Pro model automatically for free. (Recommended)
- **Standard VS Code Users**: May need to configure `mimic.geminiApiKey` or `mimic.openaiApiKey`.

### ⚠️ Performance
MIMIC employs **Debouncing** to minimize performance impact. 
It is designed to remain lightweight even during heavy script execution or load testing. If you encounter any issues, please file a report.

---

## License

MIT License - Free to modify and distribute. See [LICENSE](./LICENSE.txt).

<p align="center">
  Made with ❤️ by the MIMIC Team
</p>
