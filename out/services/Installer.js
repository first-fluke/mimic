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
exports.Installer = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/**
 * Installer: Manages the installation of MIMIC Shell Hooks.
 *
 * Checks if the hook is sourced in .zshrc and offers to install it if missing.
 */
class Installer {
    constructor(context) {
        // Path to the hook script included in the extension
        this.hookPath = path.join(context.extensionPath, 'resources', 'hooks', 'mimic-zsh.sh');
        this.zshrcPath = path.join(os.homedir(), '.zshrc');
    }
    async manageHook() {
        if (!fs.existsSync(this.zshrcPath)) {
            return;
        }
        const config = vscode.workspace.getConfiguration('mimic');
        const enabled = config.get('enableRealtimePerception', true);
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
                }
                catch (error) {
                    vscode.window.showErrorMessage(`MIMIC: Failed to install hook: ${error}`);
                }
            }
        }
        else {
            // UNINSTALL
            if (hasAnyMimicHook) {
                try {
                    const newContent = zshrcContent.split('\n').filter(line => {
                        return !line.includes('mimic-zsh.sh') && !line.includes(marker);
                    }).join('\n');
                    fs.writeFileSync(this.zshrcPath, newContent, 'utf-8');
                    vscode.window.showInformationMessage('MIMIC: "Real-time Perception" deactivated.');
                }
                catch (error) {
                    vscode.window.showErrorMessage(`MIMIC: Failed to remove hook: ${error}`);
                }
            }
        }
    }
    async forceInstall() {
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
        }
        catch (error) {
            vscode.window.showErrorMessage(`MIMIC: Failed to install hook: ${error}`);
        }
    }
    async checkGitignore() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders)
            return;
        for (const folder of workspaceFolders) {
            const gitignorePath = path.join(folder.uri.fsPath, '.gitignore');
            if (fs.existsSync(gitignorePath)) {
                try {
                    const content = fs.readFileSync(gitignorePath, 'utf-8');
                    if (!content.includes('.mimic/')) {
                        const selection = await vscode.window.showInformationMessage(`MIMIC: Add ".mimic/" to .gitignore for workspace "${folder.name}"?`, 'Yes', 'No');
                        if (selection === 'Yes') {
                            const newContent = content.trimEnd() + '\n\n# MIMIC local data\n.mimic/\n';
                            fs.writeFileSync(gitignorePath, newContent, 'utf-8');
                            vscode.window.showInformationMessage(`MIMIC: Added .mimic/ to .gitignore in "${folder.name}"`);
                        }
                    }
                }
                catch (error) {
                    // Ignore errors
                }
            }
            else {
                // If .gitignore doesn't exist, we might not want to create it automatically 
                // as it might not be a git repo. 
                // Or we could check for .git folder.
                const gitDir = path.join(folder.uri.fsPath, '.git');
                if (fs.existsSync(gitDir)) {
                    const selection = await vscode.window.showInformationMessage(`MIMIC: Create .gitignore with ".mimic/" for workspace "${folder.name}"?`, 'Yes', 'No');
                    if (selection === 'Yes') {
                        fs.writeFileSync(gitignorePath, '# MIMIC local data\n.mimic/\n', 'utf-8');
                        vscode.window.showInformationMessage(`MIMIC: Created .gitignore in "${folder.name}"`);
                    }
                }
            }
        }
    }
}
exports.Installer = Installer;
//# sourceMappingURL=Installer.js.map