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
exports.LocalAntigravityService = void 0;
const cp = __importStar(require("child_process"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
/**
 * LocalAntigravityService: Implements the "Process Hijacking" technique
 * to access Antigravity's internal local API directly.
 */
class LocalAntigravityService {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
    }
    /**
     * Attempt to generate completion using the hijacked local API.
     */
    async generateCompletion(prompt) {
        try {
            this.outputChannel.appendLine('[LocalAntigravityService] Starting process scan...');
            const info = await this.findAntigravityProcess();
            if (!info) {
                this.outputChannel.appendLine('[LocalAntigravityService] Failed to find active Antigravity process.');
                return null;
            }
            this.outputChannel.appendLine(`[LocalAntigravityService] Target acquired: PID=${info.pid}, Port=${info.port}`);
            return await this.queryLocalServer(info, prompt);
        }
        catch (error) {
            this.outputChannel.appendLine(`[LocalAntigravityService] Error: ${error}`);
            return null;
        }
    }
    async findAntigravityProcess() {
        return new Promise((resolve) => {
            // macOS/Linux specific command (based on user logs)
            cp.exec('pgrep -fl language_server_', async (err, stdout) => {
                if (err || !stdout) {
                    resolve(null);
                    return;
                }
                const lines = stdout.trim().split('\n');
                // Find the process with the necessary args
                const targetLine = lines.find(line => line.includes('--extension_server_port') &&
                    line.includes('--csrf_token'));
                if (!targetLine) {
                    resolve(null);
                    return;
                }
                // Extract PID and Args
                const parts = targetLine.trim().split(' ');
                const pid = parseInt(parts[0], 10);
                // Extract Token
                const tokenMatch = targetLine.match(/--csrf_token\s+([a-zA-Z0-9-]+)/);
                const csrfToken = tokenMatch ? tokenMatch[1] : '';
                // Extract Port (Optional hint)
                let port = 0;
                const portMatch = targetLine.match(/--extension_server_port\s+(\d+)/);
                if (portMatch) {
                    port = parseInt(portMatch[1], 10);
                }
                if (pid && csrfToken) {
                    // Note: We might be missing the port here, but queryLocalServer will scan all ports via PID
                    resolve({ pid, port, csrfToken });
                }
                else {
                    resolve(null);
                }
            });
        });
    }
    async queryLocalServer(info, prompt) {
        this.outputChannel.appendLine(`[LocalAntigravityService] Scanning ports for PID ${info.pid}...`);
        let ports = await this.findListeningPorts(info.pid);
        // Also try the port from args if it's not in the list (just in case lsof missed it or logic differs)
        if (info.port && !ports.includes(info.port)) {
            ports.push(info.port);
        }
        this.outputChannel.appendLine(`[LocalAntigravityService] Found ports: ${ports.join(', ')}`);
        if (ports.length === 0) {
            this.outputChannel.appendLine('[LocalAntigravityService] No ports found. Aborting Fallback.');
            return null;
        }
        const candidates = [];
        // Scan all ports
        const scanPromises = ports.map(async (port) => {
            // Try HTTPS
            const statusHttps = await this.probeConnection(port, info.csrfToken, true);
            if (statusHttps !== -1) {
                // Heuristic scoring:
                // 200: Perfect (100 pts)
                // 403: Forbidden (Likely Auth fail but correct server) (80 pts)
                // 404: Not Found (Endpoint wrong but server exists) (50 pts)
                // Other: (10 pts)
                let score = 10;
                if (statusHttps === 200)
                    score = 100;
                else if (statusHttps === 403)
                    score = 80;
                else if (statusHttps === 404)
                    score = 50;
                candidates.push({ port, useHttps: true, score, status: statusHttps });
                this.outputChannel.appendLine(`[LocalAntigravityService] Candidate found: Port ${port} (HTTPS) - Status ${statusHttps}`);
            }
            // Try HTTP (Lower priority than HTTPS if both work)
            const statusHttp = await this.probeConnection(port, info.csrfToken, false);
            if (statusHttp !== -1) {
                let score = 5; // Slightly lower base score for HTTP
                if (statusHttp === 200)
                    score = 90; // If 200 OK on HTTP, it's very good, but HTTPS 200 is better (100)
                else if (statusHttp === 403)
                    score = 70;
                else if (statusHttp === 404)
                    score = 40;
                candidates.push({ port, useHttps: false, score, status: statusHttp });
                this.outputChannel.appendLine(`[LocalAntigravityService] Candidate found: Port ${port} (HTTP) - Status ${statusHttp}`);
            }
        });
        await Promise.all(scanPromises);
        if (candidates.length === 0) {
            this.outputChannel.appendLine('[LocalAntigravityService] Probe failed: Could not establish connection on any port.');
            return null;
        }
        // Sort by score descending
        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];
        this.outputChannel.appendLine(`[LocalAntigravityService] Selected Best Candidate: Port ${best.port} (${best.useHttps ? 'HTTPS' : 'HTTP'}) - Score ${best.score}`);
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({
                prompt: prompt,
                stream: false
            });
            const protocol = best.useHttps ? 'https' : 'http';
            const options = {
                hostname: '127.0.0.1',
                port: best.port,
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'X-Csrf-Token': info.csrfToken,
                    'Origin': `${protocol}://127.0.0.1:${best.port}`,
                    'Referer': `${protocol}://127.0.0.1:${best.port}/`
                },
                rejectUnauthorized: false
            };
            const requestLib = best.useHttps ? https : http;
            const req = requestLib.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.message?.content || parsed.completion || data;
                            resolve(content);
                        }
                        catch {
                            resolve(data);
                        }
                    }
                    else {
                        this.outputChannel.appendLine(`[LocalAntigravityService] Chat API Error ${res.statusCode}: ${data.substring(0, 100)}`);
                        resolve(null);
                    }
                });
            });
            req.on('error', (e) => {
                this.outputChannel.appendLine(`[LocalAntigravityService] Request Failed: ${e.message}`);
                resolve(null);
            });
            req.write(postData);
            req.end();
        });
    }
    /**
     * Probes the server to verify connectivity.
     * Returns Status Code (e.g., 200, 403, 404). Returns -1 if connection failed completely.
     */
    async probeConnection(port, token, useHttps) {
        return new Promise((resolve) => {
            const protocol = useHttps ? 'https' : 'http';
            const options = {
                hostname: '127.0.0.1',
                port: port,
                path: '/exa.language_server_pb.LanguageServerService/GetUnleashData', // Known working endpoint or just root?
                // Note: GetUnleashData is good because it exists. Root might 404. 
                // We'll stick with GetUnleashData but honestly checking '/' might be safer for finding "Is it a server?"
                // Let's stick to the known endpoint as it validates it's the RIGHT server (LanguageServerService).
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Csrf-Token': token,
                    'Origin': `${protocol}://127.0.0.1:${port}`,
                },
                rejectUnauthorized: false,
                timeout: 2000 // 2s timeout
            };
            const requestLib = useHttps ? https : http;
            const req = requestLib.request(options, (res) => {
                // We accept any status as a sign of life.
                resolve(res.statusCode || 0);
            });
            req.on('error', (e) => {
                // Log verbose for debugging
                // Accessing outputChannel here might be race-y if not bound, but since we are in async arrow func it should be fine.
                // However, avoiding excessive spam: call site logs if it finds something.
                // We will return -1.
                resolve(-1);
            });
            req.on('timeout', () => {
                req.destroy();
                resolve(-1);
            });
            req.end();
        });
    }
    async findListeningPorts(pid) {
        return new Promise((resolve) => {
            cp.exec(`lsof -nP -a -iTCP -sTCP:LISTEN -p ${pid}`, (err, stdout) => {
                if (err || !stdout) {
                    resolve([]);
                    return;
                }
                const ports = [];
                const lines = stdout.split('\n');
                lines.forEach(line => {
                    const match = line.match(/:(\d+)\s+\(LISTEN\)/);
                    if (match) {
                        ports.push(parseInt(match[1], 10));
                    }
                });
                resolve(ports);
            });
        });
    }
}
exports.LocalAntigravityService = LocalAntigravityService;
//# sourceMappingURL=LocalAntigravityService.js.map