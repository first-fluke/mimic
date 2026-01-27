import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

interface SynthesisState {
    lastSynthesis: number;
    readyToSynthesize: boolean;
    skillCount: number;
}

export class SynthesisService {
    private readonly skillsDir: string;
    private readonly insightsDir: string;
    private readonly statePath: string;
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel, workspaceRoot: string) {
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
    public async checkReadiness(): Promise<{ ready: boolean; insightCount: number }> {
        const insights = await this.listInsights();
        const threshold = vscode.workspace.getConfiguration('mimic').get<number>('synthesisThreshold', 5);
        const ready = insights.length >= threshold;

        this.updateState({ readyToSynthesize: ready });

        return { ready, insightCount: insights.length };
    }

    /**
     * Legacy method alias for Shell Script synthesis (for backward compatibility if needed)
     */
    public async proposeSkill(): Promise<string | null> {
        return this.proposeShellScript();
    }

    /**
     * Synthesize a SHELL SCRIPT (Standard MIMIC Skill)
     */
    public async proposeShellScript(selectedFiles?: string[]): Promise<string | null> {
        this.outputChannel.appendLine('[SynthesisService] Starting SHELL SCRIPT synthesis...');
        return this.synthesize(SYNTHESIS_PROMPT, selectedFiles);
    }

    /**
     * Synthesize an AGENT SKILL (Antigravity SKILL.md)
     */
    public async proposeAgentSkill(selectedFiles?: string[]): Promise<string | null> {
        this.outputChannel.appendLine('[SynthesisService] Starting AGENT SKILL synthesis...');
        return this.synthesize(AGENT_SKILL_PROMPT, selectedFiles);
    }

    /**
     * Synthesize an AGENT SKILL (Antigravity SKILL.md)
     */
    public async listInsights(): Promise<string[]> {
        if (!fs.existsSync(this.insightsDir)) {
            return [];
        }

        try {
            const files = await fs.promises.readdir(this.insightsDir);
            return files
                .filter(f => f.endsWith('.md'))
                .map(f => path.join(this.insightsDir, f));
        } catch {
            return [];
        }
    }

    private async synthesize(promptTemplate: string, selectedFiles?: string[]): Promise<string | null> {
        // Use selected files if provided, otherwise list all
        const insights = selectedFiles && selectedFiles.length > 0 ? selectedFiles : await this.listInsights();

        // If no files selected (and no files exist), check readiness
        if (insights.length === 0) {
            // ... existing readiness check logic slightly modified ...
            const allInsights = await this.listInsights();
            const threshold = vscode.workspace.getConfiguration('mimic').get<number>('synthesisThreshold', 5);
            if (allInsights.length < threshold) {
                vscode.window.showWarningMessage(`MIMIC: Need ${threshold - allInsights.length} more insights.`);
                return null;
            }
        }

        // Read files
        const insightContents = await Promise.all(insights.map(async (filepath: string) => {
            try {
                return await fs.promises.readFile(filepath, 'utf-8');
            } catch {
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
        } catch (error) {
            this.outputChannel.appendLine(`[SynthesisService] Error: ${error}`);
        }

        return null;
    }

    /**
     * Save approved shell script to global or local skills directory.
     */
    public async saveSkill(content: string, isGlobal: boolean = false, name?: string): Promise<string> {
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
    public async saveAgentSkill(content: string, isGlobal: boolean = false, name?: string): Promise<string> {
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
        } else {
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

    private updateStats() {
        const state = this.loadState();
        state.skillCount = (state.skillCount || 0) + 1;
        state.lastSynthesis = Date.now();
        this.updateState(state);
    }

    /**
     * Call LLM using vscode.lm API or fallback.
     */
    private async callLLM(prompt: string): Promise<string | null> {
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
        } catch (error) {
            this.outputChannel.appendLine(`[SynthesisService] Native LM failed: ${error}`);
        }

        // Fallback to API key
        const config = vscode.workspace.getConfiguration('mimic');
        const apiKey = config.get<string>('openaiApiKey');

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
                    const data = await response.json() as { choices: { message: { content: string } }[] };
                    return data.choices[0]?.message?.content || null;
                }
            } catch (error) {
                this.outputChannel.appendLine(`[SynthesisService] API Key fallback failed: ${error}`);
            }
        }

        return null;
    }



    private loadState(): SynthesisState {
        try {
            if (fs.existsSync(this.statePath)) {
                return JSON.parse(fs.readFileSync(this.statePath, 'utf-8'));
            }
        } catch {
            // Ignore
        }
        return { lastSynthesis: 0, readyToSynthesize: false, skillCount: 0 };
    }

    private updateState(partial: Partial<SynthesisState>): void {
        const state = { ...this.loadState(), ...partial };
        fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2), 'utf-8');
    }

    public getSkillsDir(): string {
        return this.skillsDir;
    }
}
