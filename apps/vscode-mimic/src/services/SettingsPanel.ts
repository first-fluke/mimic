import * as vscode from 'vscode';

export class SettingsPanel {
  public static currentPanel: SettingsPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view state changes
    this._panel.onDidChangeViewState(
      (_e) => {
        if (this._panel.visible) {
          this._update();
        }
      },
      null,
      this._disposables,
    );

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'alert':
            vscode.window.showErrorMessage(message.text);
            return;
          case 'save':
            await this._saveSettings(message.data);
            return;
        }
      },
      null,
      this._disposables,
    );
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (SettingsPanel.currentPanel) {
      SettingsPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      'mimicSettings',
      'MIMIC Settings',
      column || vscode.ViewColumn.One,
      {
        // Enable javascript in the webview
        enableScripts: true,
        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources')],
      },
    );

    SettingsPanel.currentPanel = new SettingsPanel(panel, extensionUri);
  }

  public dispose() {
    SettingsPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private async _saveSettings(data: any) {
    try {
      const config = vscode.workspace.getConfiguration('mimic');

      if (data.geminiApiKey !== undefined)
        await config.update(
          'geminiApiKey',
          data.geminiApiKey,
          vscode.ConfigurationTarget.Global,
        );
      if (data.openaiApiKey !== undefined)
        await config.update(
          'openaiApiKey',
          data.openaiApiKey,
          vscode.ConfigurationTarget.Global,
        );
      if (data.anthropicApiKey !== undefined)
        await config.update(
          'anthropicApiKey',
          data.anthropicApiKey,
          vscode.ConfigurationTarget.Global,
        );

      // For OAuth Credentials, we might need to store them in secrets or config?
      // The command `mimic.setGoogleCredentials` stores them somewhere.
      // Let's check AntigravityOAuth usage. It uses `context.secrets` or `antigravityOAuth.setCustomCredentials`.
      // But from here I can't access that instance easily unless I inject it.
      // For now, let's stick to the Keys in configuration.
      // If the user wants OAuth credentials aligned, I might need to send a message to extension host to handle it.

      vscode.window.showInformationMessage('MIMIC: Settings saved!');
      this._panel.dispose();
    } catch (e) {
      vscode.window.showErrorMessage(`Failed to save settings: ${e}`);
    }
  }

  private _update() {
    const webview = this._panel.webview;
    this._panel.title = 'MIMIC Settings';
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const config = vscode.workspace.getConfiguration('mimic');
    const geminiKey = config.get('geminiApiKey', '');
    const openaiKey = config.get('openaiApiKey', '');
    const anthropicKey = config.get('anthropicApiKey', '');

    // nonce for security
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MIMIC Settings</title>
    <style>
        body { padding: 20px; color: var(--vscode-foreground); font-family: var(--vscode-font-family); background-color: var(--vscode-editor-background); }
        .container { max-width: 600px; margin: 0 auto; }
        .section { margin-bottom: 30px; padding: 20px; background: var(--vscode-sideBar-background); border-radius: 6px; border: 1px solid var(--vscode-panel-border); }
        h2 { font-size: 1.1em; margin-top: 0; margin-bottom: 20px; border-bottom: 1px solid var(--vscode-input-border); padding-bottom: 10px; color: var(--vscode-textLink-activeForeground); }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.9em; }
        input[type="password"], input[type="text"] { 
            width: 100%; 
            padding: 8px; 
            background: var(--vscode-input-background); 
            color: var(--vscode-input-foreground); 
            border: 1px solid var(--vscode-input-border); 
            border-radius: 2px;
            box-sizing: border-box;
        }
        input:focus { border-color: var(--vscode-focusBorder); outline: none; }
        .actions { margin-top: 20px; text-align: right; }
        button { 
            padding: 8px 16px; 
            background: var(--vscode-button-background); 
            color: var(--vscode-button-foreground); 
            border: none; 
            cursor: pointer; 
            border-radius: 2px;
            font-size: 0.9em;
        }
        button:hover { background: var(--vscode-button-hoverBackground); }
    </style>
</head>
<body>
    <div class="container">
        <div class="section">
            <h2>Google Gemini</h2>
            <div class="form-group">
                <label for="geminiApiKey">API Key</label>
                <input type="password" id="geminiApiKey" value="${geminiKey}" placeholder="AIza..." />
            </div>
        </div>

        <div class="section">
            <h2>OpenAI</h2>
            <div class="form-group">
                <label for="openaiApiKey">API Key</label>
                <input type="password" id="openaiApiKey" value="${openaiKey}" placeholder="sk-..." />
            </div>
        </div>

        <div class="section">
            <h2>Anthropic</h2>
            <div class="form-group">
                <label for="anthropicApiKey">API Key</label>
                <input type="password" id="anthropicApiKey" value="${anthropicKey}" placeholder="sk-ant-..." />
            </div>
        </div>

        <div class="actions">
            <button id="saveBtn">Save Settings</button>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        document.getElementById('saveBtn').addEventListener('click', () => {
            vscode.postMessage({
                command: 'save',
                data: {
                    geminiApiKey: document.getElementById('geminiApiKey').value,
                    openaiApiKey: document.getElementById('openaiApiKey').value,
                    anthropicApiKey: document.getElementById('anthropicApiKey').value
                }
            });
        });
    </script>
</body>
</html>`;
  }
}

function getNonce() {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
