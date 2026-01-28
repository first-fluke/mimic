import * as vscode from 'vscode';
import type { AntigravityBridge } from './AntigravityBridge';
import type { AntigravityOAuth } from './AntigravityOAuth';
import { AuthService } from './AuthService';

// Global references (set by extension.ts)
let globalOAuth: AntigravityOAuth | null = null;
let globalBridge: AntigravityBridge | null = null;

export function setOAuthService(oauth: AntigravityOAuth): void {
  globalOAuth = oauth;
}

export function setBridgeService(bridge: AntigravityBridge): void {
  globalBridge = bridge;
}

/**
 * AnalystService: Triple Hybrid Pattern Analysis
 *
 * Priority 1: Editor Native (vscode.lm) - Gemini/GPT-4/Copilot
 * Priority 2: Antigravity Local RPC (Bridge - No Login Required)
 * Priority 3: Antigravity Cloud API (OAuth - Uses Quota)
 * Priority 4: Google Token (Native OAuth - Personal Quota)
 * Priority 5: Custom API Key (OpenAI)
 * Priority 6: Manual Handoff (Clipboard)
 */

const ANALYSIS_PROMPT = `You are an expert Developer Productivity Analyst.
Your goal is to help me save time and improve my workflow based on my recent activity.

[PATTERNS_PLACEHOLDER]

Based on this data, please provide:
1. **Insight**: One major observation about my current habits.
2. **Actionable Instincts**: 2-3 specific habits I should adopt immediately.
3. **Skill Suggetions**: 2 Ideas for automated scripts or "Skills" (using standard shell commands) that could replace my manual tasks.

Keep it concise, encouraging, and highly technical. Format in Markdown.`;

export async function analyzePatterns(
  outputChannel: vscode.OutputChannel,
): Promise<void> {
  outputChannel.appendLine('[AnalystService] Starting pattern analysis...');

  // Fetch actual patterns from storage (scoped to workspace)
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const patterns = await getRecentPatterns(workspaceFolder);
  if (patterns.length === 0) {
    vscode.window.showInformationMessage(
      'MIMIC: Not enough data for analysis yet. Keep working!',
    );
    return;
  }

  const prompt = ANALYSIS_PROMPT.replace(
    '[PATTERNS_PLACEHOLDER]',
    JSON.stringify(patterns, null, 2),
  );

  // Try Priority 1: Editor Native (vscode.lm)
  const nativeResult = await tryEditorNative(prompt, outputChannel);
  if (nativeResult) {
    await handleAnalysisResult(nativeResult, outputChannel);
    return;
  }

  // Try Priority 2: Antigravity Local RPC (Bridge - Preferred because no login needed)
  const bridgeResult = await tryAntigravityBridge(prompt, outputChannel);
  if (bridgeResult) {
    await handleAnalysisResult(bridgeResult, outputChannel);
    return;
  }

  // Try Priority 3: Antigravity Cloud API (OAuth - Uses Quota)
  const cloudResult = await tryAntigravityCloud(prompt, outputChannel);
  if (cloudResult) {
    await handleAnalysisResult(cloudResult, outputChannel);
    return;
  }

  // Priority 4: Google Token (Native OAuth)
  const googleResult = await tryGoogleToken(prompt, outputChannel);
  if (googleResult) {
    await handleAnalysisResult(googleResult, outputChannel);
    return;
  }

  // Priority 5: Custom API Key (Google Gemini / OpenAI) - Preferred Fallback
  const apiKeyResult = await tryCustomApiKey(prompt, outputChannel);
  if (apiKeyResult) {
    await handleAnalysisResult(apiKeyResult, outputChannel);
    return;
  }

  // Priority 6: Manual Handoff (Clipboard)
  await fallbackToClipboard(prompt, outputChannel);
}

async function handleAnalysisResult(
  markdown: string,
  outputChannel: vscode.OutputChannel,
): Promise<void> {
  // 1. Save to insights directory (so it counts toward synthesis)
  const insightsDir = path.join(os.homedir(), '.mimic', 'insights');
  if (!fs.existsSync(insightsDir)) {
    fs.mkdirSync(insightsDir, { recursive: true });
  }
  const timestamp = Date.now();
  const filepath = path.join(insightsDir, `insight_${timestamp}.md`);
  fs.writeFileSync(filepath, markdown, 'utf-8');
  outputChannel.appendLine(`[AnalystService] Saved analysis to: ${filepath}`);

  // 2. Show Result in Editor
  await showResult(markdown);

  // 3. Trigger Sidebar Refresh (IMPORTANT: The UI needs to know about the new file)
  vscode.commands.executeCommand('mimic.refreshSidebar');
}

async function tryAntigravityBridge(
  prompt: string,
  outputChannel: vscode.OutputChannel,
): Promise<string | null> {
  outputChannel.appendLine(
    '[AnalystService] Trying Antigravity Local RPC (Bridge)...',
  );

  if (!globalBridge) {
    outputChannel.appendLine(
      '[AnalystService] Bridge service not initialized.',
    );
    return null;
  }

  try {
    // Reuse existing connection if possible, or connect now
    let connection = globalBridge.getConnection();
    if (!connection) {
      outputChannel.appendLine(
        '[AnalystService] No active bridge connection. Connecting...',
      );
      connection = await globalBridge.connect();
    }

    if (!connection) {
      outputChannel.appendLine(
        '[AnalystService] ❌ Failed to connect to Antigravity Bridge.',
      );
      return null;
    }

    outputChannel.appendLine(
      '[AnalystService] ✅ Bridge connected, sending chat request...',
    );
    const result = await globalBridge.sendChatMessage(connection, prompt);

    if (result) {
      outputChannel.appendLine(
        '[AnalystService] ✅ Local RPC response received!',
      );
      return result;
    }

    outputChannel.appendLine(
      '[AnalystService] ❌ Local RPC returned no content.',
    );
    return null;
  } catch (e: any) {
    outputChannel.appendLine(
      `[AnalystService] Bridge analysis failed: ${e.message}`,
    );
    return null;
  }
}

async function tryAntigravityCloud(
  prompt: string,
  outputChannel: vscode.OutputChannel,
): Promise<string | null> {
  outputChannel.appendLine(
    '[AnalystService] Trying Antigravity Cloud API (OAuth)...',
  );

  if (!globalOAuth) {
    outputChannel.appendLine('[AnalystService] OAuth service not initialized.');
    return null;
  }

  try {
    const isLoggedIn = await globalOAuth.isLoggedIn();
    if (!isLoggedIn) {
      outputChannel.appendLine(
        '[AnalystService] Not logged in to Antigravity OAuth.',
      );
      return null;
    }

    outputChannel.appendLine(
      '[AnalystService] ✅ OAuth authenticated, calling Cloud API...',
    );

    const result = await globalOAuth.generateContent(prompt);
    if (result) {
      outputChannel.appendLine(
        '[AnalystService] ✅ Cloud API response received!',
      );
      return result;
    }

    return null;
  } catch (e: any) {
    outputChannel.appendLine(
      `[AnalystService] Cloud API analysis failed: ${e.message}`,
    );
  }

  return null;
}

async function tryEditorNative(
  prompt: string,
  outputChannel: vscode.OutputChannel,
): Promise<string | null> {
  outputChannel.appendLine(
    '[AnalystService] Trying Editor Native (vscode.lm)...',
  );

  try {
    const allModels = await vscode.lm.selectChatModels();
    outputChannel.appendLine(`[DEBUG] Found ${allModels.length} models total.`);

    if (allModels.length === 0) {
      outputChannel.appendLine(
        '[AnalystService] No LM models available via vscode.lm.',
      );
      return null;
    }

    // Log available models for debugging
    allModels.forEach((m) => {
      outputChannel.appendLine(
        `   - [${m.vendor}] ${m.family} (${m.name}) id:${m.id}`,
      );
    });

    // Priority Strategy:
    // 1. Specific High-Quality Families (Gemini, GPT-4, Claude)
    // 2. Vendor Specific (Copilot)
    // 3. ANY available model

    const preferredFamilies = [
      'gemini-1.5-pro',
      'gemini',
      'gpt-4o',
      'claude-3-5-sonnet',
      'claude-3-opus',
    ];

    // 1. Try finding a preferred model first
    let bestModel = allModels.find((m) =>
      preferredFamilies.some((f) => m.family.includes(f) || m.id.includes(f)),
    );

    // 2. If not found, try Copilot
    if (!bestModel) {
      bestModel = allModels.find((m) => m.vendor === 'copilot');
    }

    // 3. Fallback: Just take the first one (often the most capable default)
    if (!bestModel) {
      bestModel = allModels[0];
      outputChannel.appendLine(
        '[AnalystService] No preferred model found. Using default available model.',
      );
    }

    if (bestModel) {
      return await sendToModel(bestModel, prompt, outputChannel);
    }

    return null;
  } catch (error) {
    outputChannel.appendLine(`[AnalystService] vscode.lm error: ${error}`);
    return null;
  }
}

async function tryGoogleToken(
  prompt: string,
  outputChannel: vscode.OutputChannel,
): Promise<string | null> {
  const authService = new AuthService(outputChannel);
  const token = await authService.getToken();

  if (!token) {
    return null;
  }

  outputChannel.appendLine(
    '[AnalystService] Trying Google Token (Native Auth)...',
  );

  // Target: Public Gemini API (v1beta)
  // Note: This relies on the user's Google Account quota/free tier.
  const endpoint =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as any;
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (result) {
        outputChannel.appendLine(
          '[AnalystService] Analysis complete via Gemini API.',
        );
        const badge = `> ⚡ **Analysis by Gemini 1.5 Flash (Google Account)**\n\n---\n\n`;
        return badge + result;
      }
    } else {
      outputChannel.appendLine(
        `[AnalystService] Gemini API Error ${response.status}: ${response.statusText}`,
      );
      if (response.status === 403) {
        outputChannel.appendLine(
          '[AnalystService] Hint: Enabling "Generative Language API" in Google Cloud Console may be required.',
        );
      }
    }
  } catch (e) {
    outputChannel.appendLine(
      `[AnalystService] Gemini API Request failed: ${e}`,
    );
  }
  return null;
}

async function sendToModel(
  model: vscode.LanguageModelChat,
  prompt: string,
  outputChannel: vscode.OutputChannel,
): Promise<string> {
  outputChannel.appendLine(
    `[AnalystService] Sending request to model: ${model.name} (${model.id})...`,
  );

  try {
    const messages = [vscode.LanguageModelChatMessage.User(prompt)];
    const cancellationToken = new vscode.CancellationTokenSource().token;
    const response = await model.sendRequest(messages, {}, cancellationToken);

    let result = '';
    for await (const chunk of response.text) {
      result += chunk;
    }

    outputChannel.appendLine(
      '[AnalystService] Analysis complete via Editor Native.',
    );

    const badge = `> ⚡ **Analysis by ${model.name}**\n\n---\n\n`;
    return badge + result;
  } catch (err) {
    outputChannel.appendLine(
      `[AnalystService] Error during model request: ${err}`,
    );
    throw err;
  }
}

async function tryCustomApiKey(
  prompt: string,
  outputChannel: vscode.OutputChannel,
): Promise<string | null> {
  const config = vscode.workspace.getConfiguration('mimic');
  const googleKey = config.get<string>('googleApiKey'); // Prefer Google Key
  const openaiKey = config.get<string>('openaiApiKey');

  if (googleKey) {
    outputChannel.appendLine('[AnalystService] Using Google Gemini API Key...');
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${googleKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as any;
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (content) {
        outputChannel.appendLine(
          '[AnalystService] ✅ Analysis complete via Gemini API.',
        );
        return content;
      }
    } catch (e: any) {
      outputChannel.appendLine(
        `[AnalystService] Gemini API failed: ${e.message}`,
      );
    }
  }

  if (openaiKey) {
    outputChannel.appendLine('[AnalystService] Using OpenAI API Key...');
    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`OpenAI API returned ${response.status}`);
      }

      const data = (await response.json()) as {
        choices: { message: { content: string } }[];
      };
      outputChannel.appendLine(
        '[AnalystService] ✅ Analysis complete via OpenAI API.',
      );
      return data.choices[0]?.message?.content || null;
    } catch (error) {
      outputChannel.appendLine(`[AnalystService] OpenAI API failed: ${error}`);
    }
  }

  outputChannel.appendLine(
    '[AnalystService] No valid custom API key configured (Google/OpenAI).',
  );
  return null;
}

async function fallbackToClipboard(
  prompt: string,
  outputChannel: vscode.OutputChannel,
): Promise<void> {
  outputChannel.appendLine('[AnalystService] Falling back to Clipboard...');

  await vscode.env.clipboard.writeText(prompt);
  vscode.window.showInformationMessage(
    'MIMIC: 프롬프트가 복사되었습니다. AI 채팅창에 붙여넣으세요!',
    'OK',
  );
}

async function showResult(markdown: string): Promise<void> {
  const doc = await vscode.workspace.openTextDocument({
    content: markdown,
    language: 'markdown',
  });
  await vscode.window.showTextDocument(doc, { preview: true });
  vscode.commands.executeCommand('markdown.showPreview', doc.uri);
}

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

interface PatternData {
  command: string;
  count: number;
  failures: number;
  avgDuration: number;
  lastContext_cwd: string;
}

async function getRecentPatterns(workspacePath?: string): Promise<object[]> {
  const eventsPath = path.join(os.homedir(), '.mimic', 'events.jsonl');

  if (!fs.existsSync(eventsPath)) {
    return [];
  }

  try {
    // Read file content and process lines
    const content = fs.readFileSync(eventsPath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    // We want to analyze a reasonable window of recent history.
    // If workspacePath is provided, we need to scan backwards to find enough relevant events.
    // Reading the last 1000 lines should be sufficient to find 100 project-specific events.
    const recentLines = lines.slice(-1000);

    const stats: Record<string, PatternData> = {};
    let relevantEventCount = 0;

    for (let i = recentLines.length - 1; i >= 0; i--) {
      const line = recentLines[i];
      // Stop if we found enough relevant events (e.g., analyze last 100 relevant events)
      if (relevantEventCount >= 100) break;

      try {
        const event = JSON.parse(line);
        const cmd = event.cmd;
        const cwd = event.cwd;

        // Filter by workspace if provided
        if (workspacePath && cwd && !cwd.startsWith(workspacePath)) {
          continue;
        }

        relevantEventCount++;

        if (!stats[cmd]) {
          stats[cmd] = {
            command: cmd,
            count: 0,
            failures: 0,
            avgDuration: 0,
            lastContext_cwd: event.cwd,
          };
        }

        stats[cmd].count++;
        if (event.exit !== 0) stats[cmd].failures++;
        // Running average for duration
        stats[cmd].avgDuration =
          (stats[cmd].avgDuration * (stats[cmd].count - 1) + event.dur) /
          stats[cmd].count;
        stats[cmd].lastContext_cwd = event.cwd;
      } catch (_e) {
        // Ignore malformed lines
      }
    }

    // Sort by frequency
    return Object.values(stats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Return top 10 most frequent patterns
  } catch (error) {
    console.error('Failed to read events.jsonl:', error);
    return [];
  }
}
