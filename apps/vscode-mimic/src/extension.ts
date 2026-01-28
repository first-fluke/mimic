import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { ActivityWatcher } from './services/ActivityWatcher';
import {
  analyzePatterns,
  setBridgeService,
  setOAuthService,
} from './services/AnalystService';
import { AntigravityBridge } from './services/AntigravityBridge';
import { AntigravityOAuth } from './services/AntigravityOAuth';
import { InsightService } from './services/InsightService';
import { Installer } from './services/Installer';
import { QuickActionService } from './services/QuickActionService';
import { SettingsPanel } from './services/SettingsPanel';
import { SidebarProvider } from './services/SidebarProvider';
import { SynthesisService } from './services/SynthesisService';

export async function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('MIMIC');
  outputChannel.appendLine('MIMIC: Activating...');

  // 0. Auto-Install Hooks (Automation)
  // 0. Auto-Install/Uninstall Hooks based on Config
  const installer = new Installer(context);
  await installer.manageHook();

  // Check .gitignore for .mimic folder
  await installer.checkGitignore();

  // Monitor Config Changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration('mimic.enableRealtimePerception')) {
        await installer.manageHook();
      }
    }),
  );

  // Register manual install command
  const installHookCommand = vscode.commands.registerCommand(
    'mimic.installHook',
    async () => {
      await installer.forceInstall();
    },
  );
  context.subscriptions.push(installHookCommand);

  // 1. Initialize Services
  // Determine paths
  // Priority: Workspace Root > Global Home
  let mimicDir: string;
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (workspaceFolder) {
    // Workspace mode: Store in <root>/.mimic
    mimicDir = path.join(workspaceFolder.uri.fsPath, '.mimic');
  } else {
    // Global/Single-file mode: Store in ~/.mimic
    mimicDir = path.join(os.homedir(), '.mimic');
  }

  if (!fs.existsSync(mimicDir)) {
    fs.mkdirSync(mimicDir, { recursive: true });
  }

  const eventsPath = path.join(mimicDir, 'events.jsonl');

  // For services that might need the workspace root specifically (like InsightService scanning)
  const workspaceRoot = workspaceFolder ? workspaceFolder.uri.fsPath : mimicDir;

  const insightService = new InsightService(
    outputChannel,
    workspaceRoot,
    eventsPath,
  );
  const activityWatcher = new ActivityWatcher(
    outputChannel,
    eventsPath,
    insightService,
  );
  const synthesisService = new SynthesisService(outputChannel, workspaceRoot);
  const quickActionService = new QuickActionService(outputChannel, eventsPath);
  const antigravityOAuth = new AntigravityOAuth(context, outputChannel);

  // Wire OAuth into AnalystService for Cloud API calls
  setOAuthService(antigravityOAuth);

  // 4. Initialize Antigravity Bridge (Local RPC)
  const antigravityBridge = new AntigravityBridge(outputChannel);
  setBridgeService(antigravityBridge);

  // 2. Initialize Sidebar with service references
  const sidebarProvider = new SidebarProvider(
    outputChannel,
    antigravityBridge,
    antigravityOAuth,
  );
  sidebarProvider.setWatcher(activityWatcher);
  sidebarProvider.setQuickActionService(quickActionService);
  vscode.window.registerTreeDataProvider('mimic-tree-view', sidebarProvider);

  // Refresh sidebar periodically (UI update)
  const uiRefreshInterval = setInterval(() => sidebarProvider.refresh(), 5000);
  context.subscriptions.push({
    dispose: () => clearInterval(uiRefreshInterval),
  });

  // Refresh Quota periodically (every 60s)
  const quotaRefreshInterval = setInterval(
    () => sidebarProvider.refreshQuota(),
    60000,
  );
  context.subscriptions.push({
    dispose: () => clearInterval(quotaRefreshInterval),
  });

  // Initial Quota fetch using the bridge instance
  sidebarProvider.refreshQuota();

  // 3. Register Commands
  const analyzeCommand = vscode.commands.registerCommand(
    'mimic.analyzePatterns',
    async () => {
      await analyzePatterns(outputChannel);
    },
  );

  const viewInsightsCommand = vscode.commands.registerCommand(
    'mimic.viewInsights',
    async () => {
      const workspaceRoot =
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.tmpdir();
      const insightsDir = path.join(workspaceRoot, '.mimic', 'insights');
      const uri = vscode.Uri.file(insightsDir);
      try {
        await vscode.commands.executeCommand('revealFileInOS', uri);
        vscode.window.showInformationMessage(`MIMIC: Insights folder opened.`);
      } catch {
        vscode.window.showWarningMessage(`MIMIC: No insights found yet.`);
      }
    },
  );

  const synthesizeCommand = vscode.commands.registerCommand(
    'mimic.synthesize',
    async () => {
      await handleSynthesis(
        synthesisService,
        sidebarProvider,
        outputChannel,
        'shell',
      );
    },
  );

  const synthesizeAgentCommand = vscode.commands.registerCommand(
    'mimic.synthesizeAgent',
    async () => {
      await handleSynthesis(
        synthesisService,
        sidebarProvider,
        outputChannel,
        'agent',
      );
    },
  );

  // Quick Action: Run command in terminal
  const runQuickActionCommand = vscode.commands.registerCommand(
    'mimic.runQuickAction',
    async (command: string) => {
      await quickActionService.executeCommand(command);
    },
  );

  // Open Skill file in editor
  const openSkillCommand = vscode.commands.registerCommand(
    'mimic.openSkill',
    async (skillPath: string) => {
      const doc = await vscode.workspace.openTextDocument(skillPath);
      await vscode.window.showTextDocument(doc);
    },
  );

  // Install Skill to shell config
  const installSkillCommand = vscode.commands.registerCommand(
    'mimic.installSkill',
    async (arg: string | vscode.TreeItem) => {
      let skillPath: string | undefined;

      if (typeof arg === 'string') {
        skillPath = arg;
      } else if (arg instanceof vscode.TreeItem && arg.resourceUri) {
        skillPath = arg.resourceUri.fsPath;
      } else if (arg && (arg as any).tooltip) {
        // Fallback if resourceUri missing
        skillPath = (arg as any).tooltip;
      }

      if (skillPath) {
        if (skillPath.endsWith('.md')) {
          await installAgentSkill(skillPath, outputChannel);
        } else {
          await installSkillToZshrc(skillPath, outputChannel);
        }
      } else {
        vscode.window.showErrorMessage(
          'MIMIC: Could not determine skill path.',
        );
      }
    },
  );

  // Remove Quick Action (Ignore)
  const removeQuickActionCommand = vscode.commands.registerCommand(
    'mimic.removeQuickAction',
    (item: vscode.TreeItem) => {
      const cmd = item.label;
      if (cmd && typeof cmd === 'string') {
        quickActionService.ignoreCommand(cmd);
        sidebarProvider.refresh();
        vscode.window.showInformationMessage(
          `MIMIC: Removed "${cmd}" from Quick Actions.`,
        );
      }
    },
  );

  // Add Ignore Pattern (Settings)
  const addIgnorePatternCommand = vscode.commands.registerCommand(
    'mimic.addIgnorePattern',
    async () => {
      const pattern = await vscode.window.showInputBox({
        prompt: 'Enter a keyword or pattern to exclude from Quick Actions',
        placeHolder: 'e.g. password, secret, test',
        ignoreFocusOut: true,
      });

      if (pattern) {
        await quickActionService.addIgnorePattern(pattern);
        sidebarProvider.refresh();
        vscode.window.showInformationMessage(
          `MIMIC: Added "${pattern}" to ignored patterns.`,
        );
      }
    },
  );

  // Login to Antigravity (OAuth with Pro-tier scopes)
  const loginAntigravityCommand = vscode.commands.registerCommand(
    'mimic.loginAntigravity',
    async () => {
      await antigravityOAuth.login(false);
      sidebarProvider.refresh();
    },
  );

  const switchAntigravityAccountCommand = vscode.commands.registerCommand(
    'mimic.switchAntigravityAccount',
    async () => {
      await antigravityOAuth.login(true);
      sidebarProvider.refresh();
    },
  );

  const openSettingsCommand = vscode.commands.registerCommand(
    'mimic.openSettings',
    () => {
      SettingsPanel.createOrShow(context.extensionUri);
    },
  );

  // Set Gemini API Key
  const setApiKeyCommand = vscode.commands.registerCommand(
    'mimic.setApiKey',
    async () => {
      const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your Google Gemini API Key (from aistudio.google.com)',
        placeHolder: 'AIza...',
        password: true,
        ignoreFocusOut: true,
      });

      if (apiKey) {
        await vscode.workspace
          .getConfiguration('mimic')
          .update('googleApiKey', apiKey, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('MIMIC: Gemini API Key saved! ✅');
      }
    },
  );

  // Set Google OAuth Credentials (Custom Client ID for "Open Code" style)
  const setGoogleCredentialsCommand = vscode.commands.registerCommand(
    'mimic.setGoogleCredentials',
    async () => {
      const clientId = await vscode.window.showInputBox({
        prompt: 'Enter your Google Cloud Client ID (OAuth 2.0 Client ID)',
        placeHolder: 'xxx.apps.googleusercontent.com',
        ignoreFocusOut: true,
      });
      if (!clientId) return;

      const clientSecret = await vscode.window.showInputBox({
        prompt: 'Enter your Google Cloud Client Secret',
        placeHolder: 'GOCSPX-xxx',
        password: true,
        ignoreFocusOut: true,
      });
      if (!clientSecret) return;

      await antigravityOAuth.setCustomCredentials(clientId, clientSecret);
      vscode.window.showInformationMessage(
        'MIMIC: Google Credentials saved! Please run "MIMIC: Login (Antigravity OAuth)" again.',
      );
    },
  );

  // Refresh Quota (manual)
  const refreshQuotaCommand = vscode.commands.registerCommand(
    'mimic.refreshQuota',
    async () => {
      outputChannel.appendLine('[MIMIC] Manual Quota refresh requested...');
      await sidebarProvider.refreshQuota();
      sidebarProvider.refresh();
      vscode.window.showInformationMessage('MIMIC: Quota refreshed!');
    },
  );

  // 4. Error Handler
  activityWatcher.onDidDetectError(async (cmd) => {
    if (quickActionService.isIgnored(cmd)) {
      return;
    }

    const selection = await vscode.window.showInformationMessage(
      `MIMIC: "${cmd}" failed. Analyze?`,
      'Analyze',
      'Ignore',
    );
    if (selection === 'Analyze') {
      await analyzePatterns(outputChannel);
    } else if (selection === 'Ignore') {
      quickActionService.ignoreCommand(cmd);
      vscode.window.showInformationMessage(
        `MIMIC: Ignored "${cmd}" from future notifications.`,
      );
      sidebarProvider.refresh();
    }
  });

  // Real-time Sidebar Refresh on new events
  activityWatcher.onDidDetectEvent(() => {
    sidebarProvider.refresh();
  });

  // 5. Start Watcher
  activityWatcher.start();

  // 6. Status Bar Integration (UX)
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.text = '$(eye) MIMIC';
  statusBarItem.tooltip = 'MIMIC: Real-time Perception Active';
  statusBarItem.command = 'mimic.viewInsights';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Bind Status Bar to Analysis Events
  // Reuse existing insightService instance created at start of activate
  insightService.onDidStartAnalysis(() => {
    statusBarItem.text = '$(sync~spin) MIMIC: Learning...';
    statusBarItem.tooltip = 'Analyzing shell patterns...';
  });
  insightService.onDidEndAnalysis(() => {
    statusBarItem.text = '$(eye) MIMIC';
    statusBarItem.tooltip = 'MIMIC: Real-time Perception Active';
    // Flash to indicate success?
    setTimeout(() => {
      statusBarItem.text = '$(check) MIMIC: Learned!';
    }, 100);
    setTimeout(() => {
      statusBarItem.text = '$(eye) MIMIC';
    }, 3000);
  });

  // Refresh sidebar manually
  const refreshSidebarCommand = vscode.commands.registerCommand(
    'mimic.refreshSidebar',
    () => {
      sidebarProvider.refresh();
    },
  );

  // Initial refresh with delay to ensure UI is ready
  setTimeout(() => {
    sidebarProvider.refresh();
    outputChannel.appendLine('[MIMIC] Sidebar refreshed (initial)');
  }, 1000);

  context.subscriptions.push(
    analyzeCommand,
    viewInsightsCommand,
    synthesizeCommand,
    synthesizeAgentCommand,
    runQuickActionCommand,
    removeQuickActionCommand,
    addIgnorePatternCommand,
    openSkillCommand,
    installSkillCommand,
    setApiKeyCommand,
    setGoogleCredentialsCommand,
    loginAntigravityCommand,
    openSettingsCommand,
    switchAntigravityAccountCommand,
    refreshQuotaCommand,
    refreshSidebarCommand,
    activityWatcher,
    insightService,
    quickActionService,
    outputChannel,
  );
  outputChannel.appendLine('MIMIC: Ready. ✨');
}

export function deactivate() {
  // Cleanup if needed
}

// Helper: Common Synthesis Handler
async function handleSynthesis(
  service: SynthesisService,
  sidebar: SidebarProvider,
  outputChannel: vscode.OutputChannel,
  type: 'shell' | 'agent',
) {
  // 1. Get all available insights
  const allInsights = await service.listInsights();
  if (allInsights.length === 0) {
    vscode.window.showWarningMessage(
      'MIMIC: No insights available to synthesize.',
    );
    return;
  }

  // 2. QuickPick for Selective Synthesis
  // Map files to QuickPickItems
  const items = allInsights.map((filepath) => {
    const name = path.basename(filepath);
    return {
      label: name,
      description: new Date(
        parseInt(name.split('_')[1] || '0', 10),
      ).toLocaleString(),
      picked: true, // Default to select all
      filepath: filepath,
    };
  });

  const selected = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    title: `Select Insights for ${type === 'shell' ? 'Shell Script' : 'Agent Skill'} Synthesis`,
    placeHolder: 'Choose patterns to include...',
  });

  if (!selected || selected.length === 0) {
    return; // User cancelled
  }

  const selectedFiles = selected.map((item) => item.filepath);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `MIMIC: Synthesizing ${type === 'shell' ? 'Shell Script' : 'Agent Skill'}...`,
      cancellable: false,
    },
    async () => {
      // Pass selected files to service
      const content =
        type === 'shell'
          ? await service.proposeShellScript(selectedFiles)
          : await service.proposeAgentSkill(selectedFiles);

      if (!content) {
        vscode.window.showErrorMessage('MIMIC: Synthesis failed.');
        return;
      }

      const doc = await vscode.workspace.openTextDocument({
        content: content,
        language: type === 'shell' ? 'shellscript' : 'markdown',
      });
      await vscode.window.showTextDocument(doc, { preview: true });

      // Ask for Save options
      const options = [
        'Save to Project (Local)',
        'Save to User (Global)',
        'Cancel',
      ];
      const choice = await vscode.window.showInformationMessage(
        `MIMIC: Where should this ${type === 'shell' ? 'Shell Script' : 'Agent Skill'} be saved?`,
        ...options,
      );

      if (choice === 'Save to Project (Local)') {
        if (type === 'shell') {
          const filepath = await service.saveSkill(content, false); // isGlobal = false
          // Shell scripts: Ask to install to .zshrc if local?
          // Local scripts might be project-specific env vars.
          // Usually we source them manually or direnv.
          // For now, just save.
          vscode.window.showInformationMessage(`Saved to project: ${filepath}`);
        } else {
          await service.saveAgentSkill(content, false);
          vscode.window.showInformationMessage(
            'Saved Agent Skill to .agent/skills (Local)',
          );
        }
        sidebar.refresh();
      } else if (choice === 'Save to User (Global)') {
        if (type === 'shell') {
          const filepath = await service.saveSkill(content, true); // isGlobal = true
          await installSkillToZshrc(filepath, outputChannel);
        } else {
          await service.saveAgentSkill(content, true);
          vscode.window.showInformationMessage(
            'Saved Agent Skill to ~/.mimic/agent/skills (Global)',
          );
        }
        sidebar.refresh();
      }
    },
  );
}

// Helper: Get project skills directory
function _getProjectSkillsDir(): string | null {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return null;
  return path.join(workspaceFolder.uri.fsPath, '.mimic', 'skills');
}

// Helper: Install skill to ~/.zshrc
async function installSkillToZshrc(
  skillPath: string,
  outputChannel: vscode.OutputChannel,
): Promise<void> {
  const zshrcPath = path.join(os.homedir(), '.zshrc');
  const sourceLine = `\n# MIMIC Skill\nsource "${skillPath}"\n`;

  try {
    // Backup first
    if (fs.existsSync(zshrcPath)) {
      const backupPath = `${zshrcPath}.mimic-backup`;
      fs.copyFileSync(zshrcPath, backupPath);
      outputChannel.appendLine(`[MIMIC] Backed up ~/.zshrc to ${backupPath}`);
    }

    // Check if already installed
    const zshrcContent = fs.existsSync(zshrcPath)
      ? fs.readFileSync(zshrcPath, 'utf-8')
      : '';
    if (zshrcContent.includes(skillPath)) {
      vscode.window.showInformationMessage(
        'MIMIC: Skill already installed in ~/.zshrc',
      );
      return;
    }

    // Append source line
    fs.appendFileSync(zshrcPath, sourceLine, 'utf-8');
    vscode.window.showInformationMessage(
      `MIMIC: Skill installed! Restart terminal or run: source ~/.zshrc`,
    );
    outputChannel.appendLine(`[MIMIC] Installed skill: ${skillPath}`);
  } catch (error) {
    vscode.window.showErrorMessage(`MIMIC: Failed to install skill: ${error}`);
    outputChannel.appendLine(`[MIMIC] Install error: ${error}`);
  }
}

async function installAgentSkill(
  sourcePath: string,
  outputChannel: vscode.OutputChannel,
): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage(
      'MIMIC: No project open to install Agent Skill.',
    );
    return;
  }

  const projectRoot = workspaceFolder.uri.fsPath;
  const agentSkillsDir = path.join(projectRoot, '.agent', 'skills');

  // Determine skill name from parent folder or filename
  let skillName = path.basename(path.dirname(sourcePath));
  if (skillName === 'skills' || skillName === '.') {
    skillName = path.basename(sourcePath, '.md');
  }

  const targetDir = path.join(agentSkillsDir, skillName);
  const targetPath = path.join(targetDir, 'SKILL.md');

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Check if target already exists
    if (fs.existsSync(targetPath)) {
      const stat = fs.lstatSync(targetPath);
      if (stat.isSymbolicLink()) {
        // Check if it points to the same place
        const linkTarget = fs.readlinkSync(targetPath);
        if (linkTarget === sourcePath) {
          vscode.window.showInformationMessage(
            `MIMIC: Agent Skill "${skillName}" is already linked.`,
          );
          return;
        }
      }

      // Ask to overwrite
      const overwrite = await vscode.window.showWarningMessage(
        `MIMIC: Skill "${skillName}" already exists in this project. Overwrite?`,
        'Overwrite',
        'Cancel',
      );
      if (overwrite !== 'Overwrite') return;

      fs.unlinkSync(targetPath);
    }

    // Create Symlink
    fs.symlinkSync(sourcePath, targetPath);
    vscode.window.showInformationMessage(
      `MIMIC: Agent Skill "${skillName}" successfully linked to project!`,
    );
    outputChannel.appendLine(
      `[MIMIC] Symlinked Agent Skill: ${sourcePath} -> ${targetPath}`,
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `MIMIC: Failed to link Agent Skill: ${error}`,
    );
    outputChannel.appendLine(`[MIMIC] Link error: ${error}`);
  }
}
