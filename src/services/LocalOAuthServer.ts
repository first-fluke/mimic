import * as http from 'http';
import * as url from 'url';

export class LocalOAuthServer {
    private server: http.Server | undefined;

    /**
     * Start a local server on a random port and wait for the auth code.
     * Returns the redirect URI and a promise that resolves to the code.
     */
    public start(): Promise<{ redirectUri: string, codePromise: Promise<string> }> {
        return new Promise((resolve, reject) => {
            let codeResolver: (code: string) => void;
            let codeRejector: (err: Error) => void;

            const codePromise = new Promise<string>((res, rej) => {
                codeResolver = res;
                codeRejector = rej;
            });

            this.server = http.createServer((req, res) => {
                try {
                    if (!req.url) return;
                    const parsedUrl = url.parse(req.url, true);

                    if (parsedUrl.pathname === '/callback') {
                        const code = parsedUrl.query.code as string;
                        if (code) {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end('<h1>Login Successful!</h1><p>You can close this tab and return to VS Code.</p><script>window.close()</script>');
                            codeResolver(code);
                        } else {
                            res.writeHead(400);
                            res.end('No code found.');
                            codeRejector(new Error('No code found in callback.'));
                        }
                    } else {
                        res.writeHead(404);
                        res.end();
                    }
                } catch (e: any) {
                    res.writeHead(500);
                    res.end(String(e));
                    codeRejector(e instanceof Error ? e : new Error(String(e)));
                } finally {
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
                } else {
                    reject(new Error('Failed to get server address'));
                }
            });
        });
    }

    public stop() {
        if (this.server) {
            this.server.close();
            this.server = undefined;
        }
    }
}
