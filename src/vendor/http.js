'use strict';

/**
 * Fail-closed HTTP over one pinned exit.
 *
 * `proxy.js#fetchText` resolves the body alone, which is enough for the inbox
 * backends but not for a sign-up rail: Ory Kratos hands its CSRF value and its
 * session back in `Set-Cookie`, and every step of the flow has to read the
 * status code before it decides what the next one is.
 *
 * Same contract as the fleet's own request helper — **no exit, no request**
 * (never a silent fall back to this machine's address) — and the same
 * request shape: `(proxy, url, {method, headers, body, timeoutMs, agent})`
 * resolving `{status, headers, text, json, setCookie}`.
 *
 * `agent` is optional; when the caller passes one, every request of one account
 * reuses a single tunnel, which is what an exit-bound session needs. The
 * connect and handshake budgets are read off the proxy object by `ProxyAgent`.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const { createAgent } = require('./proxy');

function req(proxy, url, { method = 'GET', headers = {}, body = null, timeoutMs = 45000, connectTimeoutMs = 8000, agent = null } = {}) {
  if (!proxy) return Promise.reject(new Error('refusing a direct request (no exit): ' + url));
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const payload =
      body === undefined || body === null ? null : Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const h = { ...headers };
    // Identity framing keeps the body readable without a decompressor, and
    // content-length is what stops an http/1.1 server from chunking the reply.
    if (!Object.keys(h).some((k) => k.toLowerCase() === 'accept-encoding')) h['accept-encoding'] = 'identity';
    if (payload && !Object.keys(h).some((k) => k.toLowerCase() === 'content-type')) h['Content-Type'] = 'application/json';
    if (payload && !Object.keys(h).some((k) => k.toLowerCase() === 'content-length')) h['Content-Length'] = payload.length;
    proxy.connectTimeoutMs = connectTimeoutMs;
    proxy.timeoutMs = timeoutMs;
    const r = lib.request(
      {
        method,
        host: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        agent: agent || createAgent(proxy),
        headers: h,
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (text += c));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(text);
          } catch (e) {
            /* the caller may want the raw text */
          }
          resolve({ status: res.statusCode, headers: res.headers, text, json, setCookie: [].concat(res.headers['set-cookie'] || []) });
        });
      }
    );
    r.setTimeout(timeoutMs, () => r.destroy(new Error('timeout ' + url)));
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

module.exports = { req };
