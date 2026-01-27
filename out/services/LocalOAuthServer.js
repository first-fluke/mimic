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
exports.LocalOAuthServer = void 0;
const http = __importStar(require("http"));
const url = __importStar(require("url"));
class LocalOAuthServer {
    /**
     * Start a local server on a random port and wait for the auth code.
     * Returns the redirect URI and a promise that resolves to the code.
     */
    start() {
        return new Promise((resolve, reject) => {
            let codeResolver;
            let codeRejector;
            const codePromise = new Promise((res, rej) => {
                codeResolver = res;
                codeRejector = rej;
            });
            this.server = http.createServer((req, res) => {
                try {
                    if (!req.url)
                        return;
                    const parsedUrl = url.parse(req.url, true);
                    if (parsedUrl.pathname === '/callback') {
                        const code = parsedUrl.query.code;
                        if (code) {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end('<h1>Login Successful!</h1><p>You can close this tab and return to VS Code.</p><script>window.close()</script>');
                            codeResolver(code);
                        }
                        else {
                            res.writeHead(400);
                            res.end('No code found.');
                            codeRejector(new Error('No code found in callback.'));
                        }
                    }
                    else {
                        res.writeHead(404);
                        res.end();
                    }
                }
                catch (e) {
                    res.writeHead(500);
                    res.end(String(e));
                    codeRejector(e instanceof Error ? e : new Error(String(e)));
                }
                finally {
                    // Close server after handling the request (or timeout logic handled in AuthService)
                    this.stop();
                }
            });
            this.server.listen(0, '127.0.0.1', () => {
                const address = this.server?.address();
                if (address && typeof address !== 'string') {
                    const port = address.port;
                    const redirectUri = `http://127.0.0.1:${port}/callback`;
                    resolve({ redirectUri, codePromise });
                }
                else {
                    reject(new Error('Failed to get server address'));
                }
            });
        });
    }
    stop() {
        if (this.server) {
            this.server.close();
            this.server = undefined;
        }
    }
}
exports.LocalOAuthServer = LocalOAuthServer;
//# sourceMappingURL=LocalOAuthServer.js.map