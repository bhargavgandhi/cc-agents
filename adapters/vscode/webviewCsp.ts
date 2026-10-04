import * as crypto from 'crypto';

/** A fresh, unguessable script nonce per webview load. */
export function createNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Content-Security-Policy for the panel webview. The webview loads exactly one
 * module script, one stylesheet and one font from dist/webview (all under
 * `cspSource`) and talks to the extension over postMessage only, so nothing
 * else is allowed. Scripts must also carry the per-load nonce. React's
 * `style={}` props go through the CSSOM, which CSP does not govern, so no
 * `'unsafe-inline'`.
 */
export function webviewCsp(cspSource: string, nonce: string): string {
  return [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    `style-src ${cspSource}`,
    `font-src ${cspSource}`,
    `img-src ${cspSource}`,
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

/** Insert the CSP meta tag at the top of <head> and stamp the nonce on every <script>. */
export function applyWebviewCsp(html: string, cspSource: string, nonce: string): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${webviewCsp(cspSource, nonce)}">`;
  return html
    .replace(/<head>/i, `<head>\n    ${meta}`)
    .replace(/<script\b/gi, `<script nonce="${nonce}"`);
}
