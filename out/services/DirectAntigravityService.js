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
exports.DirectAntigravityService = void 0;
const vscode = __importStar(require("vscode"));
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const crypto = __importStar(require("crypto"));
const url_1 = require("url");
// Constants extracted from Opencode
const ANTIGRAVITY_CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
const ANTIGRAVITY_REDIRECT_PORT = 51121;
const ANTIGRAVITY_REDIRECT_URI = `http://localhost:${ANTIGRAVITY_REDIRECT_PORT}/oauth-callback`;
const ANTIGRAVITY_SCOPES = [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/cclog",
    "https://www.googleapis.com/auth/experimentsandconfigs",
];
const ANTIGRAVITY_ENDPOINT = "https://daily-cloudcode-pa.sandbox.googleapis.com";
const DEFAULT_PROJECT_ID = "rising-fact-p41fc"; // The "magic" project ID
class DirectAntigravityService {
    constructor(context) {
        this.server = null; // Track server instance
        this.tokens = null;
        this.STORAGE_KEY = 'mimic.antigravity.tokens';
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel("MIMIC: Direct Auth");
        this.loadTokens();
    }
    static getInstance(context) {
        if (!DirectAntigravityService.instance) {
            if (!context) {
                throw new Error("DirectAntigravityService not initialized. Call with context first.");
            }
            DirectAntigravityService.instance = new DirectAntigravityService(context);
        }
        return DirectAntigravityService.instance;
    }
    isLoggedIn() {
        // Basic check: do we have tokens? Check expiration lazily or in chat().
        return !!(this.tokens && this.tokens.refreshToken);
    }
    async loadTokens() {
        const stored = await this.context.secrets.get(this.STORAGE_KEY);
        if (stored) {
            try {
                this.tokens = JSON.parse(stored);
                this.outputChannel.appendLine('[DirectAuth] Restored tokens from secure storage.');
            }
            catch (e) {
                this.outputChannel.appendLine('[DirectAuth] Failed to parse stored tokens.');
            }
        }
    }
    async saveTokens(tokens) {
        this.tokens = tokens;
        await this.context.secrets.store(this.STORAGE_KEY, JSON.stringify(tokens));
    }
    /**
     * Starts the OAuth flow. Opens browser and listens on localhost.
     */
    async login() {
        this.outputChannel.show(true);
        this.outputChannel.appendLine('[DirectAuth] Starting OAuth Flow (Impersonating Antigravity)...');
        // Cleanup existing server if any (Fixes EADDRINUSE)
        if (this.server) {
            this.outputChannel.appendLine('[DirectAuth] Closing previous server instance...');
            this.server.close();
            this.server = null;
        }
        const verifier = this.base64UrlEncode(crypto.randomBytes(32));
        const challenge = this.base64UrlEncode(crypto.createHash('sha256').update(verifier).digest());
        const state = this.base64UrlEncode(crypto.randomBytes(16));
        // Start Local Server
        const codePromise = this.startCallbackServer(state);
        // Build Auth URL
        const authUrl = new url_1.URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", ANTIGRAVITY_CLIENT_ID);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("redirect_uri", ANTIGRAVITY_REDIRECT_URI);
        authUrl.searchParams.set("scope", ANTIGRAVITY_SCOPES.join(" "));
        authUrl.searchParams.set("code_challenge", challenge);
        authUrl.searchParams.set("code_challenge_method", "S256");
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("access_type", "offline");
        authUrl.searchParams.set("prompt", "consent");
        const opened = await vscode.env.openExternal(vscode.Uri.parse(authUrl.toString()));
        if (!opened) {
            this.outputChannel.appendLine('[DirectAuth] Failed to open browser.');
            return false;
        }
        try {
            const code = await codePromise;
            this.outputChannel.appendLine('[DirectAuth] Authorization Code received. Exchanging for tokens...');
            // Close server safely
            if (this.server) {
                this.server.close();
                this.server = null;
            }
            const success = await this.exchangeCodeForToken(code, verifier);
            if (success) {
                vscode.window.showInformationMessage("MIMIC: Antigravity Login Successful!");
                return true;
            }
        }
        catch (e) {
            this.outputChannel.appendLine(`[DirectAuth] Login Failed: ${e.message}`);
            vscode.window.showErrorMessage(`Antigravity Login Failed: ${e.message}`);
        }
        // Final cleanup if still running
        if (this.server) {
            try {
                this.server.close();
            }
            catch { }
            this.server = null;
        }
        return false;
    }
    startCallbackServer(expectedState) {
        return new Promise((resolve, reject) => {
            // Explicitly define local variable to avoid TS closure issues with 'this.server'
            let server;
            server = http.createServer((req, res) => {
                const url = new url_1.URL(req.url || '', `http://localhost:${ANTIGRAVITY_REDIRECT_PORT}`);
                if (url.pathname === '/oauth-callback') {
                    const code = url.searchParams.get('code');
                    const state = url.searchParams.get('state');
                    const error = url.searchParams.get('error');
                    if (error) {
                        res.writeHead(400, { 'Content-Type': 'text/html' });
                        res.end('<h1>Login Failed</h1><p>' + error + '</p>');
                        server.close(); // Use local variable
                        reject(new Error(error));
                        return;
                    }
                    if (state !== expectedState) {
                        res.writeHead(400, { 'Content-Type': 'text/html' });
                        res.end('<h1>Invalid State</h1><p>Security Warning: State mismatch.</p>');
                        server.close(); // Use local variable
                        reject(new Error("Invalid State"));
                        return;
                    }
                    if (code) {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end('<h1>Login Successful</h1><p>You can close this window and return to VSCode.</p><script>window.close()</script>');
                        resolve(code);
                    }
                    else {
                        res.writeHead(400);
                        res.end('No code found');
                        server.close(); // Use local variable
                        reject(new Error("No code found"));
                    }
                }
                else {
                    res.writeHead(404);
                    res.end('Not Found');
                }
            });
            this.server = server; // Sync with class property for global cleanup
            // Handle server errors (e.g., port in use)
            server.on('error', (e) => {
                reject(e);
            });
            server.listen(ANTIGRAVITY_REDIRECT_PORT, () => {
                this.outputChannel.appendLine(`[DirectAuth] Listening on port ${ANTIGRAVITY_REDIRECT_PORT}...`);
            });
            // Timeout after 2 minutes
            setTimeout(() => {
                if (server.listening) {
                    server.close();
                }
                if (this.server === server) {
                    this.server = null;
                }
                reject(new Error("Timeout waiting for login"));
            }, 120000);
        });
    }
    async exchangeCodeForToken(code, verifier) {
        const postData = new url_1.URLSearchParams({
            client_id: ANTIGRAVITY_CLIENT_ID,
            // Client secret is technically not needed for PKCE but sometimes required by Google for Installed Apps if defined
            // For extracted web client IDs, usually just Client ID is enough, but Opencode uses it.
            // Using the one from Opencode repo constants:
            client_secret: "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",
            code: code,
            grant_type: "authorization_code",
            redirect_uri: ANTIGRAVITY_REDIRECT_URI,
            code_verifier: verifier,
        }).toString();
        try {
            const data = await this.postRequest('https://oauth2.googleapis.com/token', postData, {
                'Content-Type': 'application/x-www-form-urlencoded'
            });
            if (data.access_token) {
                const now = Date.now();
                this.tokens = {
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token, // Might be undefined if not returned (only on first consent)
                    expiresAt: now + (data.expires_in * 1000),
                    projectId: DEFAULT_PROJECT_ID
                };
                // Keep old refresh token if new one is missing
                if (!this.tokens.refreshToken && this.tokens) {
                    // logic to merge? For now assume clean login gives refresh token
                }
                await this.saveTokens(this.tokens);
                this.outputChannel.appendLine('[DirectAuth] Tokens received and saved.');
                return true;
            }
            else {
                this.outputChannel.appendLine(`[DirectAuth] Token exchange failed. Response: ${JSON.stringify(data)}`);
                return false;
            }
        }
        catch (e) {
            this.outputChannel.appendLine(`[DirectAuth] Exchange Error: ${e.message}`);
            return false;
        }
    }
    async refreshAccessToken() {
        if (!this.tokens || !this.tokens.refreshToken) {
            this.outputChannel.appendLine('[DirectAuth] No refresh token available. User must log in.');
            return false;
        }
        this.outputChannel.appendLine('[DirectAuth] Refreshing Access Token...');
        const postData = new url_1.URLSearchParams({
            client_id: ANTIGRAVITY_CLIENT_ID,
            client_secret: "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",
            refresh_token: this.tokens.refreshToken,
            grant_type: "refresh_token",
        }).toString();
        try {
            const data = await this.postRequest('https://oauth2.googleapis.com/token', postData, {
                'Content-Type': 'application/x-www-form-urlencoded'
            });
            if (data.access_token) {
                this.tokens.accessToken = data.access_token;
                this.tokens.expiresAt = Date.now() + (data.expires_in * 1000);
                await this.saveTokens(this.tokens);
                this.outputChannel.appendLine('[DirectAuth] Token refreshed successfully.');
                return true;
            }
        }
        catch (e) {
            this.outputChannel.appendLine(`[DirectAuth] Refresh Error: ${e.message}`);
        }
        return false;
    }
    /**
     * Executes a chat query directly against the Cloud API.
     */
    async chat(prompt) {
        if (!this.tokens) {
            await this.loadTokens();
        }
        if (!this.tokens) {
            this.outputChannel.appendLine('[DirectAuth] No valid tokens. Please run mimic.loginAntigravity.');
            return null;
        }
        if (Date.now() >= this.tokens.expiresAt - 60000) {
            const refreshed = await this.refreshAccessToken();
            if (!refreshed)
                return null;
        }
        // Use the magic project ID
        const projectId = this.tokens.projectId || DEFAULT_PROJECT_ID;
        // Endpoint: Daily Sandbox
        const url = `${ANTIGRAVITY_ENDPOINT}/v1internal/projects/${projectId}/locations/global/companions/gemini:generateChat?alt=json`;
        // Payload Construction
        const payload = {
            messages: [
                {
                    role: "user",
                    parts: [
                        { text: prompt }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 2048
            }
        };
        this.outputChannel.appendLine('[DirectAuth] Sending Chat Request...');
        const body = JSON.stringify(payload);
        try {
            const response = await this.postRequest(url, body, {
                'Authorization': `Bearer ${this.tokens.accessToken}`,
                'Content-Type': 'application/json',
                'User-Agent': 'antigravity/1.11.5 windows/amd64', // Impersonation
                'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
            });
            // Parse response
            if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
                return response.candidates[0].content.parts[0].text;
            }
            if (response.predictions && response.predictions[0]?.candidates?.[0]?.content?.parts?.[0]?.text) {
                return response.predictions[0].candidates[0].content.parts[0].text;
            }
            this.outputChannel.appendLine(`[DirectAuth] Unknown response format. Keys: ${Object.keys(response)}`);
            return JSON.stringify(response);
        }
        catch (e) {
            this.outputChannel.appendLine(`[DirectAuth] Chat Error: ${e.message}`);
            return null;
        }
    }
    base64UrlEncode(buffer) {
        return buffer.toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
    postRequest(url, body, headers) {
        return new Promise((resolve, reject) => {
            const lib = url.startsWith('https') ? https : http;
            const req = lib.request(url, {
                method: 'POST',
                headers: headers
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        }
                        catch {
                            resolve(data);
                        }
                    }
                    else {
                        reject(new Error(`Status ${res.statusCode}: ${data}`));
                    }
                });
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }
}
exports.DirectAntigravityService = DirectAntigravityService;
//# sourceMappingURL=DirectAntigravityService.js.map