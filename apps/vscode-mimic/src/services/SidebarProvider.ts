import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { ActivityWatcher } from './ActivityWatcher';
import type { AntigravityBridge, QuotaSnapshot } from './AntigravityBridge';
import type { AntigravityOAuth } from './AntigravityOAuth';
import type { QuickActionService } from './QuickActionService';

/**
 * SidebarProvider: Provides the UI for the MIMIC Activity Bar View
 */
export class SidebarProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    vscode.TreeItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private outputChannel: vscode.OutputChannel;
  private watcher: ActivityWatcher | null = null;
  private quickActionService: QuickActionService | null = null;
  private quotaCache: QuotaSnapshot | null = null;
  private oauthService: AntigravityOAuth | null = null;
  private bridge: AntigravityBridge;

  constructor(
    outputChannel: vscode.OutputChannel,
    bridge: AntigravityBridge,
    oauthService?: AntigravityOAuth,
  ) {
    this.outputChannel = outputChannel;
    this.bridge = bridge;
    this.oauthService = oauthService || null;
  }

  public setWatcher(watcher: ActivityWatcher): void {
    this.watcher = watcher;
  }

  public setQuickActionService(service: QuickActionService): void {
    this.quickActionService = service;
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  // ... (rest of class)

  public async refreshQuota(): Promise<void> {
    // Reuse the injected bridge instance
    const connection = await this.bridge.connect();
    if (connection) {
      this.quotaCache = await this.bridge.getQuota(connection);
      this.refresh();
    }
  }

  async getTreeItem(element: vscode.TreeItem): Promise<vscode.TreeItem> {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (element) {
      // Handle nested items
      if (element.contextValue === 'quickActionsGroup') {
        return this.getQuickActionItems();
      }
      if (element.contextValue === 'skillsGroup') {
        return this.getSkillListItems();
      }
      if (element.contextValue === 'quotaAccountGroup') {
        return this.getQuotaAccountItems();
      }
      // Fallback for older logic
      if (typeof element.label === 'string') {
        if (element.label.startsWith('Quick Actions')) {
          return this.getQuickActionItems();
        }
        if (element.label.startsWith('Skills')) {
          return this.getSkillListItems();
        }
      }
      return Promise.resolve([]);
    }

    const items: vscode.TreeItem[] = [];

    // 1. Action: Analyze Now
    const analysisItem = new vscode.TreeItem('Analyze Patterns');
    analysisItem.iconPath = new vscode.ThemeIcon('sparkle');
    analysisItem.command = {
      command: 'mimic.analyzePatterns',
      title: 'Analyze Patterns',
    };
    items.push(analysisItem);

    // 2. Info: Insights Count
    const insightCount =
      this.watcher?.getInsightService()?.getInsightCount() ?? 0;
    const insightItem = new vscode.TreeItem(`Insights: ${insightCount}`);
    insightItem.iconPath = new vscode.ThemeIcon('lightbulb');
    insightItem.command = {
      command: 'mimic.viewInsights',
      title: 'View Insights',
    };
    items.push(insightItem);

    const config = vscode.workspace.getConfiguration('mimic');
    const synthesisThreshold = config.get<number>('synthesisThreshold', 5);
    const _quickActionLimit = config.get<number>('quickActionLimit', 10);

    if (this.watcher) {
      const insightService = this.watcher.getInsightService();
      // Assuming getInsightCount is async. If it's sync, remove await.
      // Previous error said "number | Promise<number>".
      // Let's force await just in case, or handle both.
      // But wait, if previous error said "number | Promise<number>", it means TS is confused or it IS a union.
      // Looking at InsightService, it returns Promise<number> usually for file ops.
      // Let's await it.
      const countOrPromise = insightService.getInsightCount();
      const insightCount =
        typeof countOrPromise === 'number'
          ? countOrPromise
          : await countOrPromise;

      const canSynthesize = insightCount >= synthesisThreshold;

      // Show Synthesis buttons only if threshold met, or show disabled/status?
      // Let's show them but indicate status in tooltip

      const synthShellItem = new vscode.TreeItem(
        `Synthesize Shell Script`,
        vscode.TreeItemCollapsibleState.None,
      );
      synthShellItem.command = {
        command: 'mimic.synthesize',
        title: 'Synthesize Shell Script',
      };
      synthShellItem.iconPath = new vscode.ThemeIcon('terminal');
      synthShellItem.contextValue = 'action';
      if (!canSynthesize) {
        synthShellItem.description = `(${insightCount}/${synthesisThreshold})`;
        synthShellItem.tooltip = `Need ${synthesisThreshold - insightCount} more insights.`;
      }

      const synthAgentItem = new vscode.TreeItem(
        `Synthesize Agent Skill`,
        vscode.TreeItemCollapsibleState.None,
      );
      synthAgentItem.command = {
        command: 'mimic.synthesizeAgent',
        title: 'Synthesize Agent Skill',
      };
      synthAgentItem.iconPath = new vscode.ThemeIcon('hubot');
      synthAgentItem.contextValue = 'action';
      if (!canSynthesize) {
        synthAgentItem.description = `(${insightCount}/${synthesisThreshold})`;
        synthAgentItem.tooltip = `Need ${synthesisThreshold - insightCount} more insights.`;
      }

      items.push(synthShellItem, synthAgentItem);
    }
    // 4. Quick Actions (Collapsible)
    const quickActionsItem = new vscode.TreeItem(
      'Quick Actions',
      vscode.TreeItemCollapsibleState.Expanded,
    );
    quickActionsItem.contextValue = 'quickActionsGroup';
    quickActionsItem.iconPath = new vscode.ThemeIcon('zap');
    items.push(quickActionsItem);

    // 5. Skill List (Collapsible)
    const skillCount = this.getSkillCount();
    const skillListItem = new vscode.TreeItem(
      `Skills (${skillCount})`,
      vscode.TreeItemCollapsibleState.Collapsed,
    );
    skillListItem.contextValue = 'skillsGroup';
    skillListItem.iconPath = new vscode.ThemeIcon('package');
    items.push(skillListItem);

    // 6. Info: Event Counter
    const eventCount = this.watcher?.getEventCount() ?? 0;
    const statusItem = new vscode.TreeItem(`Events: ${eventCount}`);
    statusItem.iconPath = new vscode.ThemeIcon('pulse');
    items.push(statusItem);

    // 7. Quota & Account (Collapsible Group)
    const quotaGroupItem = new vscode.TreeItem(
      'Quota & Account',
      vscode.TreeItemCollapsibleState.Expanded,
    );
    quotaGroupItem.contextValue = 'quotaAccountGroup';
    quotaGroupItem.iconPath = new vscode.ThemeIcon('account');
    items.push(quotaGroupItem);

    return Promise.resolve(items);
  }

  private async getQuotaAccountItems(): Promise<vscode.TreeItem[]> {
    const items: vscode.TreeItem[] = [];

    // 1. Account / Login
    if (this.oauthService) {
      const isLoggedIn = await this.oauthService.isLoggedIn();
      if (isLoggedIn) {
        const email = await this.oauthService.getUserEmail();
        const oauthItem = new vscode.TreeItem(`🔗 ${email || 'Connected'}`);
        oauthItem.iconPath = new vscode.ThemeIcon('verified');
        oauthItem.tooltip = 'Antigravity OAuth connected. Cloud API enabled.';
        items.push(oauthItem);
      } else {
        const loginItem = new vscode.TreeItem('🔑 Login with Antigravity');
        loginItem.iconPath = new vscode.ThemeIcon('sign-in');
        loginItem.command = {
          command: 'mimic.loginAntigravity',
          title: 'Login with Antigravity',
        };
        loginItem.tooltip = 'Click to login with Google for AI analysis';
        items.push(loginItem);
      }
    }

    // 2. Refresh Button
    const refreshQuotaItem = new vscode.TreeItem('🔄 Refresh Quota');
    refreshQuotaItem.iconPath = new vscode.ThemeIcon('refresh');
    refreshQuotaItem.command = {
      command: 'mimic.refreshQuota',
      title: 'Refresh Quota',
    };
    items.push(refreshQuotaItem);

    // 3. Plan & Models
    if (this.quotaCache) {
      const q = this.quotaCache;

      // Plan Info
      const planItem = new vscode.TreeItem(`📊 Plan: ${q.planName}`);
      planItem.iconPath = new vscode.ThemeIcon('dashboard');
      planItem.tooltip = `User: ${q.userName}\nPlan: ${q.planName}\nUpdated: ${q.timestamp.toLocaleTimeString()}`;
      items.push(planItem);

      // Models
      for (const model of q.models) {
        const percent = Math.round(model.remainingPercent);
        const icon = model.isExhausted
          ? 'warning'
          : percent < 50
            ? 'pie-chart'
            : 'check';
        const resetInfo = model.isExhausted
          ? ` (Reset: ${model.timeUntilReset})`
          : '';

        const modelItem = new vscode.TreeItem(
          `${model.label}: ${percent}%${resetInfo}`,
        );
        modelItem.iconPath = new vscode.ThemeIcon(icon);
        modelItem.tooltip = `Model: ${model.modelId}\n${percent}% remaining\nReset: ${model.timeUntilReset}`;
        items.push(modelItem);
      }
    } else {
      const noQuotaItem = new vscode.TreeItem('No quota info (Click Refresh)');
      noQuotaItem.iconPath = new vscode.ThemeIcon('info');
      items.push(noQuotaItem);
    }

    const settingsItem = new vscode.TreeItem('⚙️ Settings');
    settingsItem.command = {
      command: 'mimic.openSettings',
      title: 'MIMIC: Settings',
    };
    settingsItem.iconPath = new vscode.ThemeIcon('settings-gear');
    items.push(settingsItem);

    return items;
  }

  private async getQuickActionItems(): Promise<vscode.TreeItem[]> {
    if (!this.quickActionService) {
      return [];
    }

    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const commands = workspacePath
      ? this.quickActionService.getProjectTopCommands(workspacePath, 5)
      : this.quickActionService.getTopCommands(5);

    return commands.map((cmd) => {
      const item = new vscode.TreeItem(`${cmd.cmd}`);
      item.description = `(${cmd.count}회)`;
      item.iconPath = new vscode.ThemeIcon('play');
      item.command = {
        command: 'mimic.runQuickAction',
        title: 'Run Command',
        arguments: [cmd.cmd],
      };
      item.tooltip = `Click to run: ${cmd.cmd}`;
      item.contextValue = 'quickAction';
      return item;
    });
  }

  private getSkillListItems(): Promise<vscode.TreeItem[]> {
    const skills = this.listSkills();

    const items = skills.map((skillPath) => {
      let label = path.basename(skillPath);
      if (label === 'SKILL.md') {
        const parentDir = path.basename(path.dirname(skillPath));
        label = `${parentDir} (Skill)`;
      }

      const item = new vscode.TreeItem(label);
      item.resourceUri = vscode.Uri.file(skillPath);
      item.iconPath = new vscode.ThemeIcon(
        skillPath.endsWith('.md') ? 'book' : 'file-code',
      );
      item.command = {
        command: 'mimic.openSkill',
        title: 'Open Skill',
        arguments: [skillPath],
      };
      item.tooltip = skillPath;

      // Distinguish shell scripts from markdown skills
      item.contextValue = skillPath.endsWith('.sh') ? 'skill_sh' : 'skill_md';

      return item;
    });

    if (items.length === 0) {
      const emptyItem = new vscode.TreeItem('No skills yet');
      emptyItem.iconPath = new vscode.ThemeIcon('info');
      return Promise.resolve([emptyItem]);
    }

    return Promise.resolve(items);
  }

  private getSkillCount(): number {
    return this.listSkills().length;
  }

  private listSkills(): string[] {
    const globalSkillsDir = path.join(os.homedir(), '.mimic', 'skills');
    const projectSkillsDir = vscode.workspace.workspaceFolders?.[0]
      ? path.join(
          vscode.workspace.workspaceFolders[0].uri.fsPath,
          '.mimic',
          'skills',
        )
      : null;
    const agentWorkflowsDir = vscode.workspace.workspaceFolders?.[0]
      ? path.join(
          vscode.workspace.workspaceFolders[0].uri.fsPath,
          '.agent',
          'workflows',
        )
      : null;
    const agentSkillsDir = vscode.workspace.workspaceFolders?.[0]
      ? path.join(
          vscode.workspace.workspaceFolders[0].uri.fsPath,
          '.agent',
          'skills',
        )
      : null;

    const skills: string[] = [];

    // Agent Skills (.agent/skills/*/SKILL.md)
    if (agentSkillsDir && fs.existsSync(agentSkillsDir)) {
      try {
        const subdirs = fs.readdirSync(agentSkillsDir);
        for (const subdir of subdirs) {
          const skillMdPath = path.join(agentSkillsDir, subdir, 'SKILL.md');
          if (fs.existsSync(skillMdPath)) {
            skills.push(skillMdPath);
          }
        }
      } catch (e) {
        console.error('Failed to read agent skills', e);
      }
    }

    // Agent Workflows (Antigravity)
    if (agentWorkflowsDir && fs.existsSync(agentWorkflowsDir)) {
      try {
        const workflows = fs
          .readdirSync(agentWorkflowsDir)
          .filter((f) => f.endsWith('.md'))
          .map((f) => path.join(agentWorkflowsDir, f));
        skills.push(...workflows);
      } catch (e) {
        console.error('Failed to read agent workflows', e);
      }
    }

    // Project skills
    if (projectSkillsDir && fs.existsSync(projectSkillsDir)) {
      const projectSkills = fs
        .readdirSync(projectSkillsDir)
        .filter((f) => f.endsWith('.sh'))
        .map((f) => path.join(projectSkillsDir, f));
      skills.push(...projectSkills);
    }

    // Global skills
    if (fs.existsSync(globalSkillsDir)) {
      const globalSkills = fs
        .readdirSync(globalSkillsDir)
        .filter((f) => f.endsWith('.sh'))
        .map((f) => path.join(globalSkillsDir, f));
      skills.push(...globalSkills);
    }

    return skills;
  }
}
