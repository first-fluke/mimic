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
exports.AntigravityOAuth = void 0;
const vscode = __importStar(require("vscode"));
const http = __importStar(require("http"));
const crypto = __importStar(require("crypto"));
const os = __importStar(require("os"));
/**
 * AntigravityOAuth: OAuth2 authentication for Cloud Code Assist API
 *
 * Uses Antigravity's official OAuth Client ID/Secret to authenticate
 * with Google Cloud and access the Cloud Code Assist API.
 */
// Antigravity OAuth Constants (from opencode-antigravity-auth)
// DEFAULT credentials (shared/public) - subject to rate limits
const DEFAULT_CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com';
const DEFAULT_CLIENT_SECRET = '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';
const ANTIGRAVITY_REDIRECT_URI = 'http://localhost:51121/oauth-callback';
const ANTIGRAVITY_SCOPES = [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/cclog', // Required for Cloud Code logging
    'https://www.googleapis.com/auth/experimentsandconfigs', // Required for Pro tier access
];
// Cloud API Endpoints
const CLOUD_API_ENDPOINT_PROD = 'https://cloudcode-pa.googleapis.com';
const CLOUD_API_ENDPOINT_DAILY = 'https://daily-cloudcode-pa.sandbox.googleapis.com';
// Token storage keys
const TOKEN_STORAGE_KEY = 'mimic.antigravity.tokens';
const CUSTOM_CREDENTIALS_KEY = 'mimic.antigravity.custom_credentials';
class AntigravityOAuth {
    constructor(context, outputChannel) {
        this.callbackServer = null;
        this.context = context;
        this.outputChannel = outputChannel;
    }
    /**
     * Get OAuth credentials (custom if set, otherwise default)
     */
    async getClientCredentials() {
        try {
            const stored = await this.context.secrets.get(CUSTOM_CREDENTIALS_KEY);
            if (stored) {
                const creds = JSON.parse(stored);
                if (creds.clientId && creds.clientSecret) {
                    this.outputChannel.appendLine('[AntigravityOAuth] Using CUSTOM Client ID.');
                    return {
                        clientId: creds.clientId,
                        clientSecret: creds.clientSecret
                    };
                }
            }
        }
        catch (e) {
            // Ignore error, fallback to default
        }
        this.outputChannel.appendLine('[AntigravityOAuth] Using DEFAULT (Shared) Client ID.');
        return {
            clientId: DEFAULT_CLIENT_ID,
            clientSecret: DEFAULT_CLIENT_SECRET
        };
    }
    /**
     * Save custom credentials
     */
    async setCustomCredentials(clientId, clientSecret) {
        await this.context.secrets.store(CUSTOM_CREDENTIALS_KEY, JSON.stringify({ clientId, clientSecret }));
        this.outputChannel.appendLine('[AntigravityOAuth] Custom credentials saved.');
    }
    /**
     * Clear custom credentials
     */
    async clearCustomCredentials() {
        await this.context.secrets.delete(CUSTOM_CREDENTIALS_KEY);
        this.outputChannel.appendLine('[AntigravityOAuth] Custom credentials cleared. Reverted to default.');
    }
    /**
     * Generate PKCE code verifier and challenge
     */
    generatePKCE() {
        // Generate random verifier (43-128 chars)
        const verifier = crypto.randomBytes(32).toString('base64url');
        // SHA256 hash of verifier, base64url encoded
        const challenge = crypto
            .createHash('sha256')
            .update(verifier)
            .digest('base64url');
        return { verifier, challenge };
    }
    /**
     * Build OAuth authorization URL with PKCE
     */
    async buildAuthUrl(forceSwitch) {
        const pkce = this.generatePKCE();
        const creds = await this.getClientCredentials();
        const params = {
            client_id: creds.clientId,
            response_type: 'code',
            redirect_uri: ANTIGRAVITY_REDIRECT_URI,
            scope: ANTIGRAVITY_SCOPES.join(' '),
            code_challenge: pkce.challenge,
            code_challenge_method: 'S256',
            access_type: 'offline',
        };
        // Only force account chooser if explicitly requested
        if (forceSwitch) {
            params.prompt = 'select_account consent';
        }
        else {
            // Ensure we get a refresh token on first login, but don't force account chooser
            params.prompt = 'consent';
        }
        const url = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams(params).toString()}`;
        return { url, verifier: pkce.verifier };
    }
    /**
     * Start OAuth flow: open browser and wait for callback
     */
    async login(forceSwitch = false) {
        this.outputChannel.appendLine('[AntigravityOAuth] Starting OAuth login flow...');
        const { url, verifier } = await this.buildAuthUrl(forceSwitch);
        // Start callback server (don't await yet, it resolves when code is received)
        const authCodePromise = this.startCallbackServer();
        // Open browser for login
        await vscode.env.openExternal(vscode.Uri.parse(url));
        this.outputChannel.appendLine('[AntigravityOAuth] Opened browser for Google login...');
        try {
            const code = await authCodePromise;
            this.outputChannel.appendLine('[AntigravityOAuth] Received authorization code.');
            // Exchange code for tokens
            const creds = await this.getClientCredentials();
            const tokens = await this.exchangeToken(code, verifier, creds);
            if (tokens) {
                await this.saveTokens(tokens);
                this.outputChannel.appendLine(`[AntigravityOAuth] ✅ Login successful! (${tokens.email})`);
                vscode.window.showInformationMessage(`MIMIC: Logged in as ${tokens.email}`);
                return true;
            }
        }
        catch (e) {
            this.outputChannel.appendLine(`[AntigravityOAuth] Login failed: ${e.message}`);
            vscode.window.showErrorMessage(`MIMIC: Login failed - ${e.message}`);
        }
        return false;
    }
    /**
     * Start local HTTP server to receive OAuth callback
     */
    startCallbackServer() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.stopCallbackServer();
                reject(new Error('OAuth timeout (60s)'));
            }, 60000);
            this.callbackServer = http.createServer((req, res) => {
                const url = new URL(req.url || '', `http://localhost:51121`);
                if (url.pathname === '/oauth-callback') {
                    const code = url.searchParams.get('code');
                    const error = url.searchParams.get('error');
                    if (error) {
                        res.writeHead(400, { 'Content-Type': 'text/html' });
                        res.end('<h1>Login Failed</h1><p>You can close this window.</p>');
                        clearTimeout(timeout);
                        this.stopCallbackServer();
                        reject(new Error(error));
                        return;
                    }
                    if (code) {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end('<h1>Login Successful!</h1><p>You can close this window and return to VS Code.</p>');
                        clearTimeout(timeout);
                        this.stopCallbackServer();
                        resolve(code);
                        return;
                    }
                }
                res.writeHead(404);
                res.end();
            });
            this.callbackServer.listen(51121, '127.0.0.1', () => {
                this.outputChannel.appendLine('[AntigravityOAuth] Callback server listening on port 51121');
            });
            this.callbackServer.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }
    stopCallbackServer() {
        if (this.callbackServer) {
            this.callbackServer.close();
            this.callbackServer = null;
        }
    }
    /**
     * Exchange authorization code for access/refresh tokens
     */
    async exchangeToken(code, verifier, creds) {
        const startTime = Date.now();
        const body = new URLSearchParams({
            client_id: creds.clientId,
            client_secret: creds.clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: ANTIGRAVITY_REDIRECT_URI,
            code_verifier: verifier,
        });
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token exchange failed: ${errorText}`);
        }
        const data = await response.json();
        // Get user info
        let email;
        try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
                headers: { Authorization: `Bearer ${data.access_token}` },
            });
            if (userInfoRes.ok) {
                const userInfo = await userInfoRes.json();
                email = userInfo.email;
            }
        }
        catch (e) {
            // Ignore user info errors
        }
        // Get project context (project ID and tier ID)
        let projectId;
        let tierId;
        try {
            const context = await this.fetchProjectContext(data.access_token);
            projectId = context.projectId;
            tierId = context.tierId;
        }
        catch (e) {
            this.outputChannel.appendLine(`[AntigravityOAuth] Project context fetch failed, using defaults.`);
        }
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: startTime + (data.expires_in * 1000),
            email,
            projectId: projectId || 'rising-fact-p41fc', // Default project ID
        };
    }
    /**
     * Fetch Cloud AI Companion project ID
     * Mirrors loadManagedProject logic from opencode-antigravity-auth/src/plugin/project.ts
     */
    async fetchProjectContext(accessToken) {
        this.outputChannel.appendLine('[AntigravityOAuth] Fetching managed project context...');
        // Endpoints to try for loading project config (prod first, then others)
        const endpoints = [
            'https://cloudcode-pa.googleapis.com',
            'https://daily-cloudcode-pa.sandbox.googleapis.com',
            'https://autopush-cloudcode-pa.sandbox.googleapis.com'
        ];
        const metadata = {
            ideType: 'IDE_UNSPECIFIED',
            platform: 'PLATFORM_UNSPECIFIED',
            pluginType: 'GEMINI',
        };
        for (const endpoint of endpoints) {
            try {
                const url = `${endpoint}/v1internal:loadCodeAssist`;
                this.outputChannel.appendLine(`[AntigravityOAuth] Trying loadCodeAssist: ${url}`);
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'User-Agent': 'antigravity/1.11.5 darwin/arm64',
                        'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
                        'Client-Metadata': JSON.stringify(metadata),
                    },
                    body: JSON.stringify({ metadata }),
                });
                if (response.ok) {
                    const data = await response.json();
                    this.outputChannel.appendLine(`[AntigravityOAuth] loadCodeAssist success via ${endpoint}`);
                    this.outputChannel.appendLine(`[AntigravityOAuth] Payload: ${JSON.stringify(data).substring(0, 500)}`);
                    // Extract project ID
                    let projectId;
                    if (data.cloudaicompanionProject) {
                        projectId = typeof data.cloudaicompanionProject === 'string'
                            ? data.cloudaicompanionProject
                            : data.cloudaicompanionProject.id;
                    }
                    // Extract tier ID - prefer Pro tier from allowedTiers, fallback to currentTier
                    let tierId;
                    let selectedTierIsPro = false;
                    // Check allowedTiers for Pro/Premium tier
                    if (data.allowedTiers && Array.isArray(data.allowedTiers)) {
                        this.outputChannel.appendLine(`[AntigravityOAuth] Found ${data.allowedTiers.length} allowed tiers`);
                        for (const tier of data.allowedTiers) {
                            const tierName = tier.name?.toLowerCase() || '';
                            const tierIdStr = tier.id?.toLowerCase() || '';
                            this.outputChannel.appendLine(`[AntigravityOAuth]   Tier: ${tier.id} (${tier.name})`);
                            // Prefer Pro/Premium tier (Antigravity 'Pro' or similar)
                            if (tierName.includes('pro') || tierIdStr.includes('pro') ||
                                tierName.includes('premium') || tierIdStr.includes('premium')) {
                                tierId = tier.id;
                                selectedTierIsPro = true;
                                this.outputChannel.appendLine(`[AntigravityOAuth] ✅ Selected Pro tier candidate: ${tierId}`);
                                break;
                            }
                            // If default, mark as candidate but don't claim it's "Pro" yet
                            if (tier.isDefault && !tierId) {
                                tierId = tier.id;
                                this.outputChannel.appendLine(`[AntigravityOAuth] Selected default tier candidate: ${tierId}`);
                            }
                        }
                    }
                    // Fallback to currentTier
                    if (!tierId && data.currentTier?.id) {
                        tierId = data.currentTier.id;
                        this.outputChannel.appendLine(`[AntigravityOAuth] Using currentTier: ${tierId}`);
                    }
                    // If we selected a Pro tier candidate but currentTier is NOT it, try to ONBOARD
                    const currentTierId = data.currentTier?.id;
                    if (selectedTierIsPro && tierId && currentTierId !== tierId) {
                        this.outputChannel.appendLine(`[AntigravityOAuth] Current tier (${currentTierId}) != Candidate (${tierId}). Attempting onboardUser...`);
                        const onboardedProjectId = await this.onboardUser(accessToken, tierId, projectId);
                        if (onboardedProjectId) {
                            projectId = onboardedProjectId;
                            this.outputChannel.appendLine(`[AntigravityOAuth] ✅ Onboard complete. Switch to: ${projectId}`);
                        }
                    }
                    if (projectId || tierId) {
                        this.outputChannel.appendLine(`[AntigravityOAuth] ✅ Project: ${projectId}, Tier: ${tierId}`);
                        return { projectId, tierId };
                    }
                }
                else {
                    const errorText = await response.text();
                    this.outputChannel.appendLine(`[AntigravityOAuth] loadCodeAssist failed (${endpoint}): ${response.status} - ${errorText.substring(0, 200)}`);
                }
            }
            catch (e) {
                this.outputChannel.appendLine(`[AntigravityOAuth] loadCodeAssist error (${endpoint}): ${e.message}`);
            }
        }
        this.outputChannel.appendLine('[AntigravityOAuth] ⚠️ Failed to load project context. Using fallbacks.');
        return {};
    }
    /**
     * Activate a specific tier for the user (onboardManagedProject equivalent)
     */
    async onboardUser(accessToken, tierId, projectId) {
        const endpoints = [
            'https://cloudcode-pa.googleapis.com',
            'https://daily-cloudcode-pa.sandbox.googleapis.com',
        ];
        const metadata = {
            ideType: 'IDE_UNSPECIFIED',
            platform: 'PLATFORM_UNSPECIFIED',
            pluginType: 'GEMINI',
        };
        const body = {
            tierId,
            metadata,
        };
        for (const endpoint of endpoints) {
            try {
                const url = `${endpoint}/v1internal:onboardUser`;
                this.outputChannel.appendLine(`[AntigravityOAuth] Calling onboardUser: ${url} (Tier: ${tierId})`);
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'User-Agent': 'antigravity/1.11.5 darwin/arm64',
                        'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
                        'Client-Metadata': JSON.stringify(metadata),
                    },
                    body: JSON.stringify(body),
                });
                if (response.ok) {
                    const data = await response.json();
                    // Check completion
                    if (data.done) {
                        const pid = data.response?.cloudaicompanionProject?.id;
                        if (pid) {
                            return pid;
                        }
                        if (projectId)
                            return projectId; // Return existing if unchanged
                    }
                }
                else {
                    this.outputChannel.appendLine(`[AntigravityOAuth] onboardUser failed: ${response.status}`);
                }
            }
            catch (e) {
                this.outputChannel.appendLine(`[AntigravityOAuth] onboardUser error: ${e.message}`);
            }
        }
        return undefined;
    }
    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken() {
        const tokens = await this.getTokens();
        if (!tokens?.refreshToken)
            return false;
        const creds = await this.getClientCredentials();
        const startTime = Date.now();
        const body = new URLSearchParams({
            client_id: creds.clientId,
            client_secret: creds.clientSecret,
            refresh_token: tokens.refreshToken,
            grant_type: 'refresh_token',
        });
        try {
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString(),
            });
            if (!response.ok)
                return false;
            const data = await response.json();
            await this.saveTokens({
                ...tokens,
                accessToken: data.access_token,
                expiresAt: startTime + (data.expires_in * 1000),
            });
            return true;
        }
        catch (e) {
            return false;
        }
    }
    /**
     * Get valid access token (refreshing if needed)
     */
    async getValidAccessToken() {
        const tokens = await this.getTokens();
        if (!tokens)
            return null;
        // Check if token is expired (with 5 min buffer)
        if (tokens.expiresAt < Date.now() + 300000) {
            this.outputChannel.appendLine('[AntigravityOAuth] Token expired, refreshing...');
            const refreshed = await this.refreshAccessToken();
            if (!refreshed) {
                this.outputChannel.appendLine('[AntigravityOAuth] Token refresh failed.');
                return null;
            }
            const newTokens = await this.getTokens();
            return newTokens?.accessToken || null;
        }
        return tokens.accessToken;
    }
    /**
     * Check if user is logged in
     */
    async isLoggedIn() {
        const tokens = await this.getTokens();
        return tokens !== null;
    }
    /**
     * Get current user email
     */
    async getUserEmail() {
        const tokens = await this.getTokens();
        return tokens?.email || null;
    }
    /**
     * Get project ID (from cache or fetch dynamically)
     */
    async getProjectId() {
        // First check cached value
        const tokens = await this.getTokens();
        if (tokens?.projectId) {
            return tokens.projectId;
        }
        // No cached value, try to fetch dynamically
        const accessToken = await this.getValidAccessToken();
        if (!accessToken) {
            return null;
        }
        const context = await this.fetchProjectContext(accessToken);
        if (context.projectId) {
            // Cache for future use
            const updatedTokens = tokens || {};
            updatedTokens.projectId = context.projectId;
            if (tokens) {
                await this.saveTokens({ ...tokens, projectId: context.projectId });
            }
        }
        return context.projectId || null;
    }
    /**
     * Logout - clear stored tokens
     */
    async logout() {
        await this.context.secrets.delete(TOKEN_STORAGE_KEY);
        this.outputChannel.appendLine('[AntigravityOAuth] Logged out.');
        vscode.window.showInformationMessage('MIMIC: Logged out from Antigravity.');
    }
    /**
     * Save tokens to secure storage
     */
    async saveTokens(tokens) {
        await this.context.secrets.store(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    }
    /**
     * Load tokens from secure storage
     */
    async getTokens() {
        const stored = await this.context.secrets.get(TOKEN_STORAGE_KEY);
        if (!stored)
            return null;
        try {
            return JSON.parse(stored);
        }
        catch {
            return null;
        }
    }
    /**
     * Call Cloud Code Assist API to generate content
     * Uses Antigravity internal API: /v1internal:generateContent
     * Body format: { project, model, request: { contents, ... } }
     */
    async generateContent(prompt, model = 'gemini-2.0-flash') {
        const accessToken = await this.getValidAccessToken();
        if (!accessToken) {
            this.outputChannel.appendLine('[AntigravityOAuth] No valid access token.');
            return null;
        }
        // ALWAYS fetch fresh project context from loadCodeAssist (cached value may be stale)
        const context = await this.fetchProjectContext(accessToken);
        const projectId = context.projectId || 'rising-fact-p41fc';
        const tierId = context.tierId;
        this.outputChannel.appendLine(`[AntigravityOAuth] Calling Cloud API (project: ${projectId}, tier: ${tierId}, model: ${model})...`);
        // Cloud Code Assist API endpoints (fallback order: prod → daily → autopush)
        const endpoints = [
            'https://cloudcode-pa.googleapis.com',
            'https://daily-cloudcode-pa.sandbox.googleapis.com',
            'https://autopush-cloudcode-pa.sandbox.googleapis.com',
        ];
        // Antigravity-style headers (Mimicking official Cloud Code for VS Code)
        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'CloudCode/1.0.0',
            'X-Goog-Api-Client': 'vscode-cloud-code/1.0.1',
            'Client-Metadata': JSON.stringify({
                ideType: 'VS_CODE',
                platform: os.platform() === 'darwin' ? 'MACOS' : (os.platform() === 'win32' ? 'WINDOWS' : 'LINUX'),
                pluginType: 'GEMINI',
                version: '1.25.0'
            }),
        };
        // Wrapped body format as used by opencode-antigravity-auth
        const wrappedBody = {
            project: projectId,
            model: model,
            request: {
                contents: [
                    { role: 'user', parts: [{ text: prompt }] }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 4096,
                },
            },
        };
        for (const endpoint of endpoints) {
            try {
                // Correct URL format: /v1internal:generateContent (from opencode-antigravity-auth request.ts)
                const url = `${endpoint}/v1internal:generateContent`;
                this.outputChannel.appendLine(`[AntigravityOAuth] Trying: ${url}`);
                const response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(wrappedBody),
                });
                if (response.ok) {
                    const data = await response.json();
                    // Standard response format
                    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                        const text = data.candidates[0].content.parts[0].text;
                        this.outputChannel.appendLine(`[AntigravityOAuth] ✅ Response received (${text.length} chars)`);
                        return text;
                    }
                    // Wrapped response format (response.candidates)
                    if (data.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
                        const text = data.response.candidates[0].content.parts[0].text;
                        this.outputChannel.appendLine(`[AntigravityOAuth] ✅ Response received (${text.length} chars)`);
                        return text;
                    }
                    // Streaming response format (array)
                    if (Array.isArray(data)) {
                        const text = data
                            .map((chunk) => chunk.candidates?.[0]?.content?.parts?.[0]?.text || '')
                            .join('');
                        if (text) {
                            this.outputChannel.appendLine(`[AntigravityOAuth] ✅ Response received (${text.length} chars)`);
                            return text;
                        }
                    }
                    this.outputChannel.appendLine(`[AntigravityOAuth] Unexpected response format: ${JSON.stringify(data).substring(0, 300)}`);
                }
                else {
                    const errorText = await response.text();
                    this.outputChannel.appendLine(`[AntigravityOAuth] API error (${response.status}): ${errorText.substring(0, 500)}`);
                    // Don't try other endpoints if auth failed
                    if (response.status === 401 || response.status === 403) {
                        this.outputChannel.appendLine('[AntigravityOAuth] Auth error - may need to re-login');
                        return null;
                    }
                    // Continue to next endpoint for other errors (404, 500, etc.)
                }
            }
            catch (e) {
                this.outputChannel.appendLine(`[AntigravityOAuth] Endpoint ${endpoint} failed: ${e.message}`);
            }
        }
        return null;
    }
}
exports.AntigravityOAuth = AntigravityOAuth;
//# sourceMappingURL=AntigravityOAuth.js.map