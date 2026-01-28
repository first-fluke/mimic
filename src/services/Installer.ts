import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Installer: Manages the installation of MIMIC Shell Hooks.
 *
 * Checks if the hook is sourced in .zshrc and offers to install it if missing.
 */
export class Installer {
    private readonly hookPath: string;
    private readonly zshrcPath: string;
    private readonly outputChannel: vscode.OutputChannel; // Add logging capability

    constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
        // Path to the hook script included in the extension
        this.hookPath = path.join(context.extensionPath, 'resources', 'hooks', 'mimic-zsh.sh');
        this.zshrcPath = path.join(os.homedir(), '.zshrc');
        this.outputChannel = outputChannel;
    }

    public async manageHook(): Promise<void> {
        if (!fs.existsSync(this.zshrcPath)) {
            return;
        }

        const config = vscode.workspace.getConfiguration('mimic');
        const enabled = config.get<boolean>('enableRealtimePerception', true);
        const zshrcContent = fs.readFileSync(this.zshrcPath, 'utf-8');
        const marker = '# MIMIC Hook';
        const currentSourceLine = `source "${this.hookPath}"`;

        // Check if ANY mimic-zsh.sh is present
        const hasAnyMimicHook = zshrcContent.includes('mimic-zsh.sh');
        // Check if the CURRENT version is present
        const hasCurrentHook = zshrcContent.includes(this.hookPath);

        if (enabled) {
            if (!hasCurrentHook) {
                try {
                    // 1. Clean up ALL old mimic references first
                    let newContent = zshrcContent.split('\n').filter(line => {
                        return !line.includes('mimic-zsh.sh') && !line.includes(marker);
                    }).join('\n');

                    // 2. Backup if not already done
                    const backupPath = `${this.zshrcPath}.mimic-backup`;
                    if (!fs.existsSync(backupPath)) {
                        fs.copyFileSync(this.zshrcPath, backupPath);
                    }

                    // 3. Append current version
                    newContent = newContent.trimEnd() + `\n\n${marker}\n${currentSourceLine}\n`;
                    fs.writeFileSync(this.zshrcPath, newContent, 'utf-8');

                    vscode.window.showInformationMessage('MIMIC: "Real-time Perception" updated/activated. Please restart your terminal.');
                    this.outputChannel.appendLine('[MIMIC] Hook installed/updated.');
                } catch (error) {
                    vscode.window.showErrorMessage(`MIMIC: Failed to install hook: ${error}`);
                    this.outputChannel.appendLine(`[MIMIC] Hook install error: ${error}`);
                }
            }
        } else {
            // UNINSTALL
            if (hasAnyMimicHook) {
                try {
                    const newContent = zshrcContent.split('\n').filter(line => {
                        return !line.includes('mimic-zsh.sh') && !line.includes(marker);
                    }).join('\n');

                    fs.writeFileSync(this.zshrcPath, newContent, 'utf-8');
                    vscode.window.showInformationMessage('MIMIC: "Real-time Perception" deactivated.');
                    this.outputChannel.appendLine('[MIMIC] Hook removed.');
                } catch (error) {
                    vscode.window.showErrorMessage(`MIMIC: Failed to remove hook: ${error}`);
                    this.outputChannel.appendLine(`[MIMIC] Hook removal error: ${error}`);
                }
            }
        }
    }

    public async forceInstall(): Promise<void> {
        if (!fs.existsSync(this.zshrcPath)) {
            vscode.window.showErrorMessage('MIMIC: ~/.zshrc not found. Automatic installation is only supported for Zsh.');
            return;
        }

        const zshrcContent = fs.readFileSync(this.zshrcPath, 'utf-8');
        const marker = '# MIMIC Hook';
        const currentSourceLine = `source "${this.hookPath}"`;

        try {
            // Clean up ALL old mimic references first
            let newContent = zshrcContent.split('\n').filter(line => {
                return !line.includes('mimic-zsh.sh') && !line.includes(marker);
            }).join('\n');

            // Append current version
            newContent = newContent.trimEnd() + `\n\n${marker}\n${currentSourceLine}\n`;
            fs.writeFileSync(this.zshrcPath, newContent, 'utf-8');

            vscode.window.showInformationMessage('MIMIC: Hook installed/updated! Please restart your terminal.');
            this.outputChannel.appendLine('[MIMIC] Hook force-installed.');
        } catch (error) {
            vscode.window.showErrorMessage(`MIMIC: Failed to install hook: ${error}`);
            this.outputChannel.appendLine(`[MIMIC] Hook force-install error: ${error}`);
        }
    }

    public async checkGitignore(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            this.outputChannel.appendLine('[MIMIC] checkGitignore: No workspace folders open.');
            return;
        }

        for (const folder of workspaceFolders) {
            this.outputChannel.appendLine(`[MIMIC] Checking .gitignore for workspace: ${folder.name}`);

            // Ensure local .mimic directory exists (Default to Project-Local Storage)
            const mimicDir = path.join(folder.uri.fsPath, '.mimic');
            if (!fs.existsSync(mimicDir)) {
                try {
                    fs.mkdirSync(mimicDir, { recursive: true });
                    this.outputChannel.appendLine(`[MIMIC] Initialized local storage: ${mimicDir}`);
                } catch (e) {
                    this.outputChannel.appendLine(`[MIMIC] Failed to create local directory: ${e}`);
                }
            }

            const gitignorePath = path.join(folder.uri.fsPath, '.gitignore');

            if (fs.existsSync(gitignorePath)) {
                try {
                    const content = fs.readFileSync(gitignorePath, 'utf-8');
                    if (!content.includes('.mimic/')) {
                        this.outputChannel.appendLine(`[MIMIC] .mimic/ missing in .gitignore. Prompting user...`);
                        const selection = await vscode.window.showInformationMessage(
                            `MIMIC: Add ".mimic/" to .gitignore for workspace "${folder.name}"?`,
                            'Yes', 'No'
                        );

                        if (selection === 'Yes') {
                            const newContent = content.trimEnd() + '\n\n# MIMIC local data\n.mimic/\n';
                            fs.writeFileSync(gitignorePath, newContent, 'utf-8');
                            vscode.window.showInformationMessage(`MIMIC: Added .mimic/ to .gitignore in "${folder.name}"`);
                            this.outputChannel.appendLine(`[MIMIC] Added .mimic/ to .gitignore.`);
                        } else {
                            this.outputChannel.appendLine(`[MIMIC] User chose No/Ignored for .gitignore update.`);
                        }
                    } else {
                        this.outputChannel.appendLine(`[MIMIC] .mimic/ already exists in .gitignore.`);
                    }
                } catch (error) {
                    this.outputChannel.appendLine(`[MIMIC] Error reading/writing .gitignore: ${error}`);
                }
            } else {
                // If .gitignore doesn't exist, check for .git folder
                const gitDir = path.join(folder.uri.fsPath, '.git');
                if (fs.existsSync(gitDir)) {
                    this.outputChannel.appendLine(`[MIMIC] No .gitignore found, but .git exists. Prompting creation...`);
                    const selection = await vscode.window.showInformationMessage(
                        `MIMIC: Create .gitignore with ".mimic/" for workspace "${folder.name}"?`,
                        'Yes', 'No'
                    );
                    if (selection === 'Yes') {
                        fs.writeFileSync(gitignorePath, '# MIMIC local data\n.mimic/\n', 'utf-8');
                        vscode.window.showInformationMessage(`MIMIC: Created .gitignore in "${folder.name}"`);
                        this.outputChannel.appendLine(`[MIMIC] Created new .gitignore with .mimic/.`);
                    } else {
                        this.outputChannel.appendLine(`[MIMIC] User chose No/Ignored for creation.`);
                    }
                } else {
                    // Even if no git, we recommend keeping the .mimic folder local
                    this.outputChannel.appendLine(`[MIMIC] No .gitignore and no .git folder. Local .mimic dir created.`);
                }
            }
        }
    }
}
