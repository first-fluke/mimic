import * as vscode from 'vscode';
import * as https from 'https';
import * as crypto from 'crypto';
import { LocalOAuthServer } from './LocalOAuthServer';

export class AuthService {
    private outputChannel: vscode.OutputChannel;
    private static manualToken: string | undefined;

    // GCloud SDK Public Client (Standard for local auth)
    private static readonly CLIENT_ID = '32555940559.apps.googleusercontent.com';
    private static readonly CLIENT_SECRET = 'ZmssLNjJy2998hD4CTg2ejr2';

    private static readonly SCOPES = [
        'https://www.googleapis.com/auth/userinfo.email',
        'openid',
        'https://www.googleapis.com/auth/cloud-platform'
    ];

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    /**
     * Get session. Uses native flow if no token exists.
     */
    public async getSession(createIfNone: boolean = false): Promise<vscode.AuthenticationSession | undefined> {
        if (AuthService.manualToken) {
            return {
                id: 'native-session',
                accessToken: AuthService.manualToken,
                account: { id: 'me', label: 'Google User' },
                scopes: AuthService.SCOPES
            };
        }

        if (createIfNone) {
            return await this.startNativeLogin();
        }
        return undefined;
    }

    /**
     * Start the native OAuth flow.
     */
    private async startNativeLogin(): Promise<vscode.AuthenticationSession | undefined> {
        this.outputChannel.appendLine('[AuthService] Starting Native OAuth Flow...');
        const server = new LocalOAuthServer();

        try {
            const { redirectUri, codePromise } = await server.start();
            this.outputChannel.appendLine(`[AuthService] Listening on ${redirectUri}`);

            const state = crypto.randomBytes(16).toString('hex');
            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=${AuthService.CLIENT_ID}&` +
                `redirect_uri=${encodeURIComponent(redirectUri)}&` +
                `response_type=code&` +
                `scope=${encodeURIComponent(AuthService.SCOPES.join(' '))}&` +
                `state=${state}&` +
                `access_type=offline&` +
                `code_challenge_method=S256&` + // Recommended practice even if optional
                `prompt=consent`;

            // Note: PKCE challenge would be ideal but omitting for simplicity with this specific client ID first

            await vscode.env.openExternal(vscode.Uri.parse(authUrl));
            this.outputChannel.appendLine('[AuthService] Browser opened. Waiting for callback...');

            const code = await codePromise;
            this.outputChannel.appendLine('[AuthService] Auth Code received. Exchanging for token...');

            const token = await this.exchangeCodeForToken(code, redirectUri);

            if (token) {
                AuthService.manualToken = token;
                vscode.window.showInformationMessage('MIMIC: Login Successful!');
                return {
                    id: 'native-session',
                    accessToken: token,
                    account: { id: 'me', label: 'Google User' },
                    scopes: AuthService.SCOPES
                };
            }
        } catch (e) {
            this.outputChannel.appendLine(`[AuthService] Login failed: ${e}`);
            vscode.window.showErrorMessage(`Login failed: ${e}`);

            // On failure, fallback to manual entry
            return await this.handleManualFallback();
        } finally {
            server.stop();
        }
        return undefined;
    }

    private async handleManualFallback(): Promise<vscode.AuthenticationSession | undefined> {
        const token = await vscode.window.showInputBox({
            title: 'Login Failed. Enter Access Token Manually',
            prompt: 'Native Auth failed. Paste a valid Google Access Token to continue.',
            password: true,
            ignoreFocusOut: true
        });

        if (token) {
            AuthService.manualToken = token;
            vscode.window.showInformationMessage('MIMIC: Using Manual Token.');
            return {
                id: 'manual-session',
                accessToken: AuthService.manualToken,
                account: { id: 'manual', label: 'Manual Token' },
                scopes: []
            };
        }
        return undefined;
    }

    /**
     * Exchange Auth Code for Access Token.
     */
    private async exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const postData = new URLSearchParams({
                code: code,
                client_id: AuthService.CLIENT_ID,
                client_secret: AuthService.CLIENT_SECRET, // Required for 'installed' apps types
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            }).toString();

            const options = {
                hostname: 'oauth2.googleapis.com',
                path: '/token',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': postData.length
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.access_token) {
                            resolve(json.access_token);
                        } else {
                            this.outputChannel.appendLine(`[AuthService] Token Error: ${JSON.stringify(json)}`);
                            reject(new Error(json.error_description || 'No access token in response'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', (e) => reject(e));
            req.write(postData);
            req.end();
        });
    }

    public async login(): Promise<void> {
        // Reset manual token on explicit login attempt to allow refreshing
        AuthService.manualToken = undefined;
        await this.getSession(true);
    }

    public async getToken(): Promise<string | undefined> {
        return AuthService.manualToken;
    }
}
