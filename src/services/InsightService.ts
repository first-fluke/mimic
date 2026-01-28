import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { AuthService } from './AuthService';

/**
 * InsightService: Background Pattern Analysis & Insight Formation
 *
 * Analyzes collected events to form "Insights" (micro-behaviors)
 * and saves them as Markdown files for future skill synthesis.
 */

const INSIGHT_PROMPT = `You are a behavioral pattern analyst for developer workflows.

Analyze the following shell command history and identify ONE specific, actionable pattern:

[EVENTS_PLACEHOLDER]

Create an "Insight" - a micro-observation about the user's workflow.

Respond in this EXACT Markdown format:
---
trigger: "<exact command or pattern>"
frequency: <number of times observed>
confidence: <0-100>
---

# Insight: <short-name>

## Observation
<1-2 sentences describing what you noticed>

## Suggestion
<1-2 sentences with a specific, actionable recommendation>
Example: "Create alias \`gcam='git commit -am'\` to save keystrokes."

## Code (if applicable)
\`\`\`bash
<shell alias or function code>
\`\`\`
`;

interface InsightMetadata {
  trigger: string;
  frequency: number;
  confidence: number;
  createdAt: string;
}

export class InsightService {
  private readonly insightsDir: string;
  private readonly eventsPath: string;
  private outputChannel: vscode.OutputChannel;
  private authService: AuthService;

  constructor(
    outputChannel: vscode.OutputChannel,
    workspaceRoot: string,
    eventsPath: string,
  ) {
    const mimicDir = path.join(workspaceRoot, '.mimic');
    this.insightsDir = path.join(mimicDir, 'insights');
    this.eventsPath = eventsPath; // Now passed in, shared with ActivityWatcher logic
    this.outputChannel = outputChannel;
    this.authService = new AuthService(outputChannel);

    // Ensure insights directory exists
    if (!fs.existsSync(this.insightsDir)) {
      fs.mkdirSync(this.insightsDir, { recursive: true });
    }
  }

  // Events
  private _onDidStartAnalysis = new vscode.EventEmitter<void>();
  public readonly onDidStartAnalysis = this._onDidStartAnalysis.event;

  private _onDidEndAnalysis = new vscode.EventEmitter<void>();
  public readonly onDidEndAnalysis = this._onDidEndAnalysis.event;

  private isAnalysisInProgress = false;
  private debounceTimer: NodeJS.Timeout | undefined;

  /**
   * Form a new Insight by analyzing recent events.
   * Called automatically when event threshold is reached.
   */
  public async formInsight(): Promise<void> {
    // Debounce: Wait for 2 seconds of silence before triggering analysis
    // This effectively "gathers" multiple events occurring in a burst.
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      await this.performAnalysis();
    }, 2000);
  }

  private async performAnalysis(): Promise<void> {
    if (this.isAnalysisInProgress) {
      this.outputChannel.appendLine(
        '[InsightService] Analysis already in progress. Skipping.',
      );
      return;
    }

    this.isAnalysisInProgress = true;
    this._onDidStartAnalysis.fire();
    this.outputChannel.appendLine(
      '[InsightService] Forming new insight (background)...',
    );

    try {
      const events = await this.getRecentEvents(50);
      if (events.length < 5) {
        this.outputChannel.appendLine(
          '[InsightService] Not enough events to analyze.',
        );
        return;
      }

      const prompt = INSIGHT_PROMPT.replace(
        '[EVENTS_PLACEHOLDER]',
        JSON.stringify(events, null, 2),
      );

      const analysis = await this.callLLM(prompt);
      if (analysis) {
        await this.saveInsight(analysis);
        this.outputChannel.appendLine(
          '[InsightService] ✅ New insight formed and saved.',
        );
      }
    } catch (error) {
      this.outputChannel.appendLine(
        `[InsightService] Error forming insight: ${error}`,
      );
    } finally {
      this.isAnalysisInProgress = false;
      this._onDidEndAnalysis.fire();
    }
  }

  /**
   * Call LLM using vscode.lm API (Antigravity/Copilot) or fallback to API key.
   */
  private async callLLM(prompt: string): Promise<string | null> {
    // Priority 1: Native vscode.lm API
    try {
      // Retry logic: Models might not be registered immediately on startup
      let models: vscode.LanguageModelChat[] = [];
      // Increase retries to 30 (approx 30 seconds) to handle slow startup/auth
      for (let i = 0; i < 30; i++) {
        models = await vscode.lm.selectChatModels();
        if (models.length > 0) break;

        // Log every 5th retry to reduce noise, but always log first few
        if (i < 5 || i % 5 === 0) {
          this.outputChannel.appendLine(
            `[InsightService] No models found yet. Retrying (${i + 1}/30)...`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (models.length > 0) {
        // Prioritize 'flash' models (cheapest/fastest) as requested
        const preferred = models.find(
          (m) =>
            m.name.toLowerCase().includes('flash') ||
            m.id.toLowerCase().includes('flash'),
        );
        // Fallback to other Gemini/GPT-4 models
        const fallback = models.find(
          (m) => m.family.includes('gemini') || m.family.includes('gpt-4'),
        );
        const model = preferred || fallback || models[0];

        this.outputChannel.appendLine(
          `[InsightService] Using native model: ${model.name || model.id} (Family: ${model.family})`,
        );

        const messages = [vscode.LanguageModelChatMessage.User(prompt)];
        const response = await model.sendRequest(
          messages,
          {},
          new vscode.CancellationTokenSource().token,
        );

        let result = '';
        for await (const chunk of response.text) {
          result += chunk;
        }

        // Extra cleanup: Remove markdown code fences if model wrapped response in them
        result = result
          .replace(/^```markdown\n/, '')
          .replace(/^```\n/, '')
          .replace(/\n```$/, '');

        return result;
      } else {
        this.outputChannel.appendLine(
          '[InsightService] Native LM failed: No models found after retries.',
        );
      }
    } catch (error) {
      this.outputChannel.appendLine(
        `[InsightService] Native LM failed: ${error}`,
      );
    }

    // Priority 2: Antigravity Local RPC (Bridge - Preferred Fallback)
    // Note: Needs access to the global bridge instance.
    // We will try to dynamically acquire it from AnalystService if possible, or use a new logic.
    // For now, let's try to use the Cloud API if Native fails, as Bridge requires instance injection.

    // Priority 2: Google Login (Antigravity/Cloud Quota)
    try {
      const token = await this.authService.getToken();
      if (token) {
        this.outputChannel.appendLine(
          '[InsightService] Using Google Token (Antigravity Quota)...',
        );
        const analysis = await this.callGoogleCloudAPI(token, prompt);
        if (analysis) return analysis;
      }
    } catch (e) {
      this.outputChannel.appendLine(
        `[InsightService] Google Login failed: ${e}`,
      );
    }

    // Priority 3: Custom API Key
    const config = vscode.workspace.getConfiguration('mimic');
    const apiKey = config.get<string>('openaiApiKey');

    if (apiKey) {
      try {
        const response = await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: prompt }],
            }),
          },
        );

        if (response.ok) {
          const data = (await response.json()) as {
            choices: { message: { content: string } }[];
          };
          return data.choices[0]?.message?.content || null;
        }
      } catch (error) {
        this.outputChannel.appendLine(
          `[InsightService] API Key fallback failed: ${error}`,
        );
      }
    }

    this.outputChannel.appendLine(
      '[InsightService] No LLM available. Skipping insight formation.',
    );
    return null;
  }

  /**
   * Call Google Internal/Cloud API using OAuth Token
   * Mimics "Antigravity IDE" behavior via Cloud Code PA API.
   */
  private async callGoogleCloudAPI(
    token: string,
    prompt: string,
  ): Promise<string | null> {
    // Target: Daily Cloud Code PA (Internal/Dogfood endpoint often used by internal extensions)
    // Note: If this fails, we might need to fallback to standard Vertex AI for public users.
    const endpoint =
      'https://daily-cloudcode-pa.googleapis.com/v1/chat/completions';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          // Model ID might vary. Using a generic Gemni pointer often accepted by this endpoint.
          model: 'gemini-1.5-pro-preview-0409',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        // Parse response based on likely schema (standard Google Chat API style)
        return (
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          data.choices?.[0]?.message?.content ||
          null
        );
      } else {
        this.outputChannel.appendLine(
          `[InsightService] Cloud API Error ${response.status}: ${response.statusText}`,
        );
        if (response.status === 403) {
          this.outputChannel.appendLine(
            '[InsightService] 403 Forbidden. Your account may not be allowlisted for daily-cloudcode-pa.',
          );
        }
      }
    } catch (e) {
      this.outputChannel.appendLine(
        `[InsightService] Cloud API Request failed: ${e}`,
      );
    }
    return null;
  }

  /**
   * Save the insight analysis as a Markdown file.
   */
  private async saveInsight(content: string): Promise<void> {
    const timestamp = Date.now();
    const filename = `insight_${timestamp}.md`;
    const filepath = path.join(this.insightsDir, filename);

    await fs.promises.writeFile(filepath, content, 'utf-8');
    this.outputChannel.appendLine(`[InsightService] Saved: ${filepath}`);
  }

  /**
   * Get recent events from the JSONL log file.
   */
  private async getRecentEvents(count: number): Promise<object[]> {
    if (!fs.existsSync(this.eventsPath)) {
      return [];
    }

    try {
      // Optimization: Read mainly the end of the file
      // For now, let's keep it simple with async readFile.
      // Future improvement: Read only last N KB using fs.open + fs.read
      const content = await fs.promises.readFile(this.eventsPath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());
      const recentLines = lines.slice(-count);

      return recentLines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * List all saved insights.
   */
  public async listInsights(): Promise<string[]> {
    if (!fs.existsSync(this.insightsDir)) {
      return [];
    }

    try {
      const files = await fs.promises.readdir(this.insightsDir);
      return files
        .filter((f) => f.endsWith('.md'))
        .map((f) => path.join(this.insightsDir, f));
    } catch {
      return [];
    }
  }

  /**
   * Get the count of saved insights.
   */
  public async getInsightCount(): Promise<number> {
    return (await this.listInsights()).length;
  }

  /**
   * Get insights directory path.
   */
  public getInsightsDir(): string {
    return this.insightsDir;
  }
}
