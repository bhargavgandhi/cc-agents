import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyWebviewCsp, createNonce, webviewCsp } from '../../adapters/vscode/webviewCsp.js';

// Isolated temp HOME: the server writes ~/.pixel-agents/{server.json,servers/}.
let tmpBase: string;

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  return { ...actual, homedir: () => tmpBase };
});

const { PixelAgentsServer } = await import('../src/server.js');
const { AgentStateStore } = await import('../src/agentStateStore.js');

/** Every header the server must set, checked directive by directive. */
function expectSecurityHeaders(res: Response): void {
  expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  const csp = res.headers.get('content-security-policy') ?? '';
  expect(csp).toContain("default-src 'none'");
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("connect-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toContain('unsafe-inline');
  expect(csp).not.toContain('unsafe-eval');
}

describe('HTTP security headers', () => {
  let server: InstanceType<typeof PixelAgentsServer>;

  beforeEach(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'pxl-headers-test-'));
    fs.mkdirSync(path.join(tmpBase, '.pixel-agents'), { recursive: true });
    server = new PixelAgentsServer();
  });

  afterEach(() => {
    server?.stop();
    try {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('sets them on the health endpoint', async () => {
    const { port } = await server.start();
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    expect(res.status).toBe(200);
    expectSecurityHeaders(res);
  });

  it('sets them on error responses (401 hook, 404 route)', async () => {
    const { port } = await server.start();
    const unauthorized = await fetch(`http://127.0.0.1:${port}/api/hooks/claude`, {
      method: 'POST',
      body: '{}',
    });
    expect(unauthorized.status).toBe(401);
    expectSecurityHeaders(unauthorized);

    const missing = await fetch(`http://127.0.0.1:${port}/no/such/route`);
    expect(missing.status).toBe(404);
    expectSecurityHeaders(missing);
  });

  it('sets them on the standalone SPA, its assets and the history fallback', async () => {
    const staticDir = path.join(tmpBase, 'webview');
    fs.mkdirSync(path.join(staticDir, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(staticDir, 'index.html'), '<!doctype html><title>t</title>');
    fs.writeFileSync(path.join(staticDir, 'assets', 'app.js'), 'export {};');
    const { port } = await server.start({
      embedded: false,
      store: new AgentStateStore(),
      staticDir,
    });

    for (const route of ['/', '/assets/app.js', '/deep/link']) {
      const res = await fetch(`http://127.0.0.1:${port}${route}`);
      expect(res.status, route).toBe(200);
      expectSecurityHeaders(res);
    }
  });
});

describe('VS Code webview CSP', () => {
  const cspSource = 'https://*.vscode-cdn.net';
  const builtHtml = [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '    <script type="module" crossorigin src="https://x.vscode-cdn.net/assets/index.js"></script>',
    '    <link rel="stylesheet" crossorigin href="https://x.vscode-cdn.net/assets/index.css">',
    '  </head>',
    '  <body><div id="root"></div></body>',
    '</html>',
  ].join('\n');

  it('allows scripts only by nonce and resources only from the webview source', () => {
    const csp = webviewCsp(cspSource, 'abc123');
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'nonce-abc123'");
    expect(csp).toContain(`style-src ${cspSource}`);
    expect(csp).toContain(`font-src ${cspSource}`);
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('connect-src');
  });

  it('puts the CSP meta tag first in <head> and stamps the nonce on every script', () => {
    const out = applyWebviewCsp(builtHtml, cspSource, 'abc123');
    const head = out.slice(out.indexOf('<head>'));
    expect(head).toMatch(/^<head>\s*<meta http-equiv="Content-Security-Policy"/);
    expect(out).toContain('<script nonce="abc123" type="module"');
    expect(out.match(/<script\b/g)).toHaveLength(out.match(/nonce="abc123"/g)?.length ?? 0);
  });

  it('mints a different nonce every load', () => {
    const a = createNonce();
    const b = createNonce();
    expect(a).not.toBe(b);
    expect(Buffer.from(a, 'base64')).toHaveLength(16);
  });
});
