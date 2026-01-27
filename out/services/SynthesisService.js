"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SynthesisService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/**
 * SynthesisService: Skill Generation from Insights
 *
 * Reads accumulated insights and generates executable shell scripts/aliases.
 * Requires user approval before saving to skills directory.
 */
const SYNTHESIS_PROMPT = `You are a developer productivity expert.

Analyze the following insights (patterns observed from user's shell history) and synthesize them into a SINGLE shell script that the user can add to their ~/.zshrc or ~/.bashrc.

INSIGHTS:
[INSIGHTS_PLACEHOLDER]

Generate a clean, well-commented shell script with:
1. Useful aliases based on the patterns
2. Helper functions if needed
3. Clear comments explaining each item

Respond with ONLY the shell script content (no markdown, no explanation outside code).
Start with: #!/bin/bash
`;
const AGENT_SKILL_PROMPT = `You are a specialized Agentic Skill Architect.
Analyze the following insights (user workflow patterns) and create a highly structured "Antigravity Skill" that an AI agent can read and execute.

INSIGHTS:
[INSIGHTS_PLACEHOLDER]

Output Format: A single markdown file named SKILL.md.
Structure:
---
name: [skill-name-kebab-case]
description: [Short 1-sentence description]
---
# [Skill Name]

## Description
[Detailed description of what this skill does and when to use it]

## Usage
[Instructions on how the agent should use this skill]

## Workflow
[Step-by-step instructions or scripts]
\`\`\`bash
# Shell commands or scripts
\`\`\`

Respond with ONLY the content of the SKILL.md file. 
DO NOT include \`\`\`markdown code fences around the entire response. Start directly with "---".
`;
class SynthesisService {
    constructor(outputChannel, workspaceRoot) {
        const mimicDir = path.join(workspaceRoot, '.mimic');
        this.skillsDir = path.join(mimicDir, 'skills');
        this.insightsDir = path.join(mimicDir, 'insights');
        this.statePath = path.join(mimicDir, 'state.json');
        this.outputChannel = outputChannel;
        // Ensure skills directory exists
        if (!fs.existsSync(this.skillsDir)) {
            fs.mkdirSync(this.skillsDir, { recursive: true });
        }
    }
    /**
     * Check if synthesis is ready (5+ insights).
     */
    /**
     * Check if synthesis is ready (5+ insights).
     */
    async checkReadiness() {
        const insights = await this.listInsights();
        const threshold = vscode.workspace.getConfiguration('mimic').get('synthesisThreshold', 5);
        const ready = insights.length >= threshold;
        this.updateState({ readyToSynthesize: ready });
        return { ready, insightCount: insights.length };
    }
    /**
     * Legacy method alias for Shell Script synthesis (for backward compatibility if needed)
     */
    async proposeSkill() {
        return this.proposeShellScript();
    }
    /**
     * Synthesize a SHELL SCRIPT (Standard MIMIC Skill)
     */
    async proposeShellScript(selectedFiles) {
        this.outputChannel.appendLine('[SynthesisService] Starting SHELL SCRIPT synthesis...');
        return this.synthesize(SYNTHESIS_PROMPT, selectedFiles);
    }
    /**
     * Synthesize an AGENT SKILL (Antigravity SKILL.md)
     */
    async proposeAgentSkill(selectedFiles) {
        this.outputChannel.appendLine('[SynthesisService] Starting AGENT SKILL synthesis...');
        return this.synthesize(AGENT_SKILL_PROMPT, selectedFiles);
    }
    /**
     * Synthesize an AGENT SKILL (Antigravity SKILL.md)
     */
    async listInsights() {
        if (!fs.existsSync(this.insightsDir)) {
            return [];
        }
        try {
            const files = await fs.promises.readdir(this.insightsDir);
            return files
                .filter(f => f.endsWith('.md'))
                .map(f => path.join(this.insightsDir, f));
        }
        catch {
            return [];
        }
    }
    async synthesize(promptTemplate, selectedFiles) {
        // Use selected files if provided, otherwise list all
        const insights = selectedFiles && selectedFiles.length > 0 ? selectedFiles : await this.listInsights();
        // If no files selected (and no files exist), check readiness
        if (insights.length === 0) {
            // ... existing readiness check logic slightly modified ...
            const allInsights = await this.listInsights();
            const threshold = vscode.workspace.getConfiguration('mimic').get('synthesisThreshold', 5);
            if (allInsights.length < threshold) {
                vscode.window.showWarningMessage(`MIMIC: Need ${threshold - allInsights.length} more insights.`);
                return null;
            }
        }
        // Read files
        const insightContents = await Promise.all(insights.map(async (filepath) => {
            try {
                return await fs.promises.readFile(filepath, 'utf-8');
            }
            catch {
                return '';
            }
        }));
        const validContents = insightContents.filter(Boolean);
        if (validContents.length === 0) {
            vscode.window.showWarningMessage('MIMIC: No valid insight content found.');
            return null;
        }
        const prompt = promptTemplate.replace('[INSIGHTS_PLACEHOLDER]', validContents.join('\n\n---\n\n'));
        try {
            const result = await this.callLLM(prompt);
            if (result) {
                this.outputChannel.appendLine('[SynthesisService] ✅ Synthesis complete.');
                return result;
            }
        }
        catch (error) {
            this.outputChannel.appendLine(`[SynthesisService] Error: ${error}`);
        }
        return null;
    }
    /**
     * Save approved shell script to global or local skills directory.
     */
    async saveSkill(content, isGlobal = false, name) {
        const timestamp = Date.now();
        const skillName = name || `skill_${timestamp}`;
        const filename = `${skillName}.sh`;
        let targetDir = this.skillsDir; // Default: Local (.mimic/skills)
        if (isGlobal) {
            targetDir = path.join(os.homedir(), '.mimic', 'skills');
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
        }
        const filepath = path.join(targetDir, filename);
        await fs.promises.writeFile(filepath, content, 'utf-8');
        this.outputChannel.appendLine(`[SynthesisService] Saved shell skill (${isGlobal ? 'Global' : 'Local'}): ${filepath}`);
        this.updateStats();
        return filepath;
    }
    /**
     * Save approved Agent Skill (SKILL.md) to Project .agent/skills directory
     */
    async saveAgentSkill(content, isGlobal = false, name) {
        // Parse name from yaml if not provided, or fallback
        let finalName = name || `generated-skill-${Date.now()}`;
        const match = content.match(/^name:\s*(.+)$/m);
        if (!name && match) {
            finalName = match[1].trim();
        }
        let targetDir = '';
        if (isGlobal) {
            // Global Agent Skill: ~/.mimic/agent/skills/[name]/SKILL.md
            targetDir = path.join(os.homedir(), '.mimic', 'agent', 'skills', finalName);
        }
        else {
            // Local: Project .agent/skills/[name]/SKILL.md
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                // Determine if we should fallback to global or error?
                // If user insisted on local but no workspace, error.
                throw new Error('No workspace open to save Local Agent Skill.');
            }
            const projectRoot = workspaceFolders[0].uri.fsPath;
            targetDir = path.join(projectRoot, '.agent', 'skills', finalName);
        }
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        const filepath = path.join(targetDir, 'SKILL.md');
        await fs.promises.writeFile(filepath, content, 'utf-8');
        this.outputChannel.appendLine(`[SynthesisService] Saved Agent Skill (${isGlobal ? 'Global' : 'Local'}): ${filepath}`);
        this.updateStats();
        return filepath;
    }
    updateStats() {
        const state = this.loadState();
        state.skillCount = (state.skillCount || 0) + 1;
        state.lastSynthesis = Date.now();
        this.updateState(state);
    }
    /**
     * Call LLM using vscode.lm API or fallback.
     */
    async callLLM(prompt) {
        try {
            const models = await vscode.lm.selectChatModels();
            if (models.length > 0) {
                const model = models[0];
                this.outputChannel.appendLine(`[SynthesisService] Using native model: ${model.name || model.id}`);
                const messages = [vscode.LanguageModelChatMessage.User(prompt)];
                const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
                let result = '';
                for await (const chunk of response.text) {
                    result += chunk;
                }
                return result;
            }
        }
        catch (error) {
            this.outputChannel.appendLine(`[SynthesisService] Native LM failed: ${error}`);
        }
        // Fallback to API key
        const config = vscode.workspace.getConfiguration('mimic');
        const apiKey = config.get('openaiApiKey');
        if (apiKey) {
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'user', content: prompt }],
                    }),
                });
                if (response.ok) {
                    const data = await response.json();
                    return data.choices[0]?.message?.content || null;
                }
            }
            catch (error) {
                this.outputChannel.appendLine(`[SynthesisService] API Key fallback failed: ${error}`);
            }
        }
        return null;
    }
    loadState() {
        try {
            if (fs.existsSync(this.statePath)) {
                return JSON.parse(fs.readFileSync(this.statePath, 'utf-8'));
            }
        }
        catch {
            // Ignore
        }
        return { lastSynthesis: 0, readyToSynthesize: false, skillCount: 0 };
    }
    updateState(partial) {
        const state = { ...this.loadState(), ...partial };
        fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2), 'utf-8');
    }
    getSkillsDir() {
        return this.skillsDir;
    }
}
exports.SynthesisService = SynthesisService;
//# sourceMappingURL=SynthesisService.js.map