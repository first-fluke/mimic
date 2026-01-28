import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';
import * as https from 'https';

const exec = util.promisify(cp.exec);

interface AntigravityInfo {
    pid: number;
    csrfToken: string;
    port: number;
    availablePorts: number[];
}

export interface ModelQuota {
    label: string;
    modelId: string;
    remainingPercent: number;
    isExhausted: boolean;
    resetTime: Date | null;
    timeUntilReset: string;
}

export interface QuotaSnapshot {
    userName: string;
    email: string;
    planName: string;
    promptCredits?: {
        available: number;
        monthly: number;
        usedPercent: number;
        remainingPercent: number;
    };
    models: ModelQuota[];
    timestamp: Date;
}

export class AntigravityBridge {
    private outputChannel: vscode.OutputChannel;
    private connection: AntigravityInfo | null = null;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    public getConnection(): AntigravityInfo | null {
        return this.connection;
    }

    public async connect(): Promise<AntigravityInfo | null> {
        // Return existing connection if valid
        if (this.connection) {
            return this.connection;
        }

        this.outputChannel.appendLine('[AntigravityBridge] Starting bridge connection...');

        try {
            // 1. Find Process
            const pid = await this.findProcess();
            if (!pid) {
                this.outputChannel.appendLine('[AntigravityBridge] Process not found.');
                return null;
            }
            this.outputChannel.appendLine(`[AntigravityBridge] Found PID: ${pid}`);

            // 2. Extract Credentials (CSRF Token)
            const csrfToken = await this.extractCsrfToken(pid);
            if (!csrfToken) {
                this.outputChannel.appendLine('[AntigravityBridge] CSRF Token not found.');
                return null;
            }
            this.outputChannel.appendLine(`[AntigravityBridge] CSRF Token extracted.`);

            // 3. Find Ports
            const ports = await this.findPorts(pid);
            this.outputChannel.appendLine(`[AntigravityBridge] Found ports: ${ports.join(', ')}`);

            // 4. Verify Connection (Probe all ports)
            for (const port of ports) {
                this.outputChannel.appendLine(`[AntigravityBridge] Probing port ${port}...`);
                const isAlive = await this.probePort(port, csrfToken);
                if (isAlive) {
                    this.outputChannel.appendLine(`[AntigravityBridge] ✅ Bridge established on port ${port}`);
                    this.connection = {
                        pid,
                        csrfToken,
                        port,
                        availablePorts: ports // Store all ports to try for other services
                    };
                    return this.connection;
                }
            }
            this.outputChannel.appendLine(`[AntigravityBridge] ❌ No working ports found.`);

        } catch (e) {
            this.outputChannel.appendLine(`[AntigravityBridge] Connection failed: ${e}`);
        }

        return null;
    }

    private probePort(port: number, csrfToken: string): Promise<boolean> {
        return new Promise(resolve => {
            const options: https.RequestOptions = {
                hostname: '127.0.0.1',
                port,
                path: '/exa.language_server_pb.LanguageServerService/GetUnleashData',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Codeium-Csrf-Token': csrfToken,  // CRITICAL: Correct header name!
                    'Connect-Protocol-Version': '1',    // Required for Connect Protocol
                },
                rejectUnauthorized: false,
                timeout: 5000,
            };

            const req = https.request(options, res => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            JSON.parse(body);
                            resolve(true);
                        } catch {
                            resolve(false);
                        }
                    } else {
                        resolve(false);
                    }
                });
            });

            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });

            req.write(JSON.stringify({ wrapper_data: {} }));  // Correct payload!
            req.end();
        });
    }

    public async getQuota(connection: AntigravityInfo): Promise<QuotaSnapshot | null> {
        this.outputChannel.appendLine('[AntigravityBridge] Fetching Quota (Internal RPC)...');

        try {
            const data = await this.makeRequest(
                connection.port,
                '/exa.language_server_pb.LanguageServerService/GetUserStatus',
                connection.csrfToken,
                {
                    metadata: {
                        ideName: 'antigravity',
                        extensionName: 'antigravity',
                        locale: 'en',
                    }
                }
            );

            this.outputChannel.appendLine(`[AntigravityBridge] Quota Response: ${JSON.stringify(data).substring(0, 300)}...`);
            return this.parseQuota(data);

        } catch (e: any) {
            this.outputChannel.appendLine(`[AntigravityBridge] Quota RPC Error: ${e.message}`);
        }
        return null;
    }

    private parseQuota(data: any): QuotaSnapshot {
        const userStatus = data.userStatus || {};
        const planInfo = userStatus.planStatus?.planInfo || {};
        const availableCredits = userStatus.planStatus?.availablePromptCredits;

        let promptCredits: QuotaSnapshot['promptCredits'];
        if (planInfo.monthlyPromptCredits && availableCredits !== undefined) {
            const monthly = Number(planInfo.monthlyPromptCredits);
            const available = Number(availableCredits);
            if (monthly > 0) {
                promptCredits = {
                    available,
                    monthly,
                    usedPercent: ((monthly - available) / monthly) * 100,
                    remainingPercent: (available / monthly) * 100,
                };
            }
        }

        const rawModels = userStatus.cascadeModelConfigData?.clientModelConfigs || [];
        const models: ModelQuota[] = rawModels
            .filter((m: any) => m.quotaInfo)
            .map((m: any) => {
                const resetTime = m.quotaInfo.resetTime ? new Date(m.quotaInfo.resetTime) : null;
                const now = new Date();
                const diff = resetTime ? resetTime.getTime() - now.getTime() : 0;

                // Log each model's raw quota info for debugging
                this.outputChannel.appendLine(`[AntigravityBridge] Model: ${m.modelOrAlias?.model}, Quota: ${JSON.stringify(m.quotaInfo)}`);

                const remainingFraction = m.quotaInfo.remainingFraction;
                let remainingPercent = 0; // Default to 0 if unknown

                if (remainingFraction !== undefined && remainingFraction !== null) {
                    remainingPercent = remainingFraction * 100;
                } else if (m.quotaInfo.allowed) {
                    // If allowed is true but no fraction, assume 100? Or maybe unlimited?
                    remainingPercent = 100;
                }

                this.outputChannel.appendLine(`[AntigravityBridge]   => Remaining: ${remainingPercent}%`);

                return {
                    label: m.label || 'Unknown',
                    modelId: m.modelOrAlias?.model || 'unknown',
                    remainingPercent,
                    isExhausted: m.quotaInfo.remainingFraction === 0,
                    resetTime,
                    timeUntilReset: this.formatTimeUntilReset(diff),
                };
            });

        return {
            userName: userStatus.name || 'Unknown',
            email: userStatus.email || '',
            planName: planInfo.planName || 'Free',
            promptCredits,
            models,
            timestamp: new Date(),
        };
    }

    private formatTimeUntilReset(ms: number): string {
        if (ms <= 0) return 'Ready';
        const mins = Math.ceil(ms / 60000);
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ${mins % 60}m`;
    }

    /**
     * Send a chat message to Antigravity's AI via internal RPC.
     * This is an experimental feature using the Cascade chat endpoint.
     */
    public async sendChatMessage(connection: AntigravityInfo, prompt: string, modelId?: string): Promise<string | null> {
        this.outputChannel.appendLine('[AntigravityBridge] Sending chat message via RPC...');

        // If no modelId provided, try to find a 'Flash' model from quota
        let targetModel = modelId;
        if (!targetModel) {
            const quota = await this.getQuota(connection);
            if (quota) {
                const flash = quota.models.find(m => m.label.toLowerCase().includes('flash') || m.modelId.toLowerCase().includes('flash'));
                if (flash) {
                    targetModel = flash.modelId;
                    this.outputChannel.appendLine(`[AntigravityBridge] Auto-selected Flash model: ${targetModel}`);
                }
            }
        }

        // Potential endpoints for Antigravity's Cascade Chat
        const endpoints = [
            '/exa.language_server_pb.LanguageServerService/GetChatResponse',
            '/exa.language_server_pb.LanguageServerService/Chat',
            '/exa.chat_pb.ChatService/GetChatResponse',
            '/google.cloud.cloudaicompanion.v1.CloudAICompanionService/GenerateContent',
        ];

        const portsToTry = connection.availablePorts && connection.availablePorts.length > 0
            ? connection.availablePorts
            : [connection.port];

        for (const port of portsToTry) {
            for (const endpoint of endpoints) {
                try {
                    this.outputChannel.appendLine(`[AntigravityBridge] Trying port ${port}, endpoint: ${endpoint}`);

                    // Antigravity/Codeium gRPC-Web-style payload
                    const payload = {
                        metadata: {
                            ideName: 'antigravity',
                            extensionName: 'antigravity',
                            locale: 'en',
                            organizationId: '',
                        },
                        // Both styles because different versions use different fields
                        prompt: prompt,
                        messages: [{ role: 'user', content: prompt }],
                        modelOrAlias: targetModel ? { model: targetModel } : undefined,
                        chat_id: `mimic-${Date.now()}`
                    };

                    const response = await this.makeRequest(
                        port,
                        endpoint,
                        connection.csrfToken,
                        payload
                    );

                    if (response) {
                        this.outputChannel.appendLine('[AntigravityBridge] ✅ Chat RPC Success!');
                        // Extract content from various possible response shapes
                        const content = response.content ||
                            response.response ||
                            response.text ||
                            response.candidates?.[0]?.content?.parts?.[0]?.text ||
                            response.candidates?.[0]?.content ||
                            JSON.stringify(response);
                        return typeof content === 'string' ? content : JSON.stringify(content);
                    }
                } catch (e: any) {
                    // Try next
                }
            }
        }

        this.outputChannel.appendLine('[AntigravityBridge] All chat endpoints failed.');
        return null;
    }

    private makeRequest(port: number, path: string, csrfToken: string, body: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(body);
            const options: https.RequestOptions = {
                hostname: '127.0.0.1',
                port,
                path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                    'Connect-Protocol-Version': '1',
                    'X-Codeium-Csrf-Token': csrfToken,
                },
                rejectUnauthorized: false,
                timeout: 5000,
            };

            const req = https.request(options, res => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(body));
                        } catch {
                            reject(new Error('Invalid JSON response'));
                        }
                    } else {
                        reject(new Error(`Request failed: ${res.statusCode} - ${body}`));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.write(data);
            req.end();
        });
    }

    private async findProcess(): Promise<number | null> {
        try {
            const { stdout } = await exec('pgrep -fl language_server');
            const lines = stdout.split('\n');
            for (const line of lines) {
                if (line.includes('antigravity') || line.includes('language_server')) {
                    const parts = line.trim().split(' ');
                    const pid = parseInt(parts[0]);
                    if (!isNaN(pid)) return pid;
                }
            }
        } catch (e) {
            // pgrep returns exit code 1 if no process found
        }
        return null;
    }

    private async extractCsrfToken(pid: number): Promise<string | null> {
        try {
            const { stdout } = await exec(`ps -p ${pid} -ww -o args`);
            const match = stdout.match(/--csrf_token\s+([a-zA-Z0-9-]+)/);
            if (match && match[1]) {
                return match[1];
            }
        } catch (e) {
            this.outputChannel.appendLine(`[AntigravityBridge] Failed to read args for PID ${pid}: ${e}`);
        }
        return null;
    }

    private async findPorts(pid: number): Promise<number[]> {
        try {
            const { stdout } = await exec(`lsof -nP -a -iTCP -sTCP:LISTEN -p ${pid}`);
            const ports: number[] = [];
            const lines = stdout.split('\n');
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                const match = line.match(/:(\d+)\s+\(LISTEN\)/);
                if (match && match[1]) {
                    ports.push(parseInt(match[1]));
                }
            }
            return ports;
        } catch (e) {
            this.outputChannel.appendLine(`[AntigravityBridge] lsof failed: ${e}`);
        }
        return [];
    }
}
