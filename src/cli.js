#!/usr/bin/env node
'use strict';

/**
 * mistral-bulk-apikey CLI — mint Mistral AI accounts (console.mistral.ai) and
 * keep only the keys that answered a live chat completion.
 *
 * Mistral's door is an Ory Kratos one: e-mail + password, a link in the inbox
 * that carries `code` and `flow`, and — once the session exists — a console
 * workspace whose billing route issues `mstrl_…` keys. No card, no phone, no
 * captcha on the free "Experiment" api_plan.
 *
 * Flow, per account, every request over one pinned exit. Your proxy list is
 * OPTIONAL: pass --pool (or the MISTRAL_PROXIES env) and every request goes
 * through an exit from it; without a pool the tool connects directly:
 *   1. alias    temp.tf  GET /api/account?providers=outlook,hotmail&plus=1
 *   2. register `GET /self-service/registration/api` → csrf → `POST …?flow=…`
 *   3. verify   mail link → `GET /self-service/verification/flows?id=<flow>`
 *               → `POST /self-service/verification?flow=<flow>` {code}
 *   4. session  `session_token` from step 2, re-login only when a call answers 401
 *   5. key      `POST /api/billing/api-keys` {name, workspace, primitive_access_scope}
 *   6. gate     `POST https://api.mistral.ai/v1/chat/completions` → 200 = keep
 *
 * A key is appended to `keys.txt` only *after* step 6 answers 200 with real
 * content; anything else is recorded in `accounts.json` and retried next run.
 *
 * Options:
 *   --count N        accounts (= keys) to mint                     [10]
 *   --conc N         accounts in flight at once, max 16             [2]
 *   --model <id>     pinned gate model, fallbacks follow   [mistral-tiny-latest]
 *   --pool <file>    proxy list, one exit per line, optional (env MISTRAL_PROXIES)
 *   --gap MS         pause between accounts inside a worker         [800]
 *   --exits N        exits tried per account before giving up         [6]
 *   --timeout MS     per-request timeout                           [45000]
 *   --mail-timeout MS  how long one account waits for the link    [180000]
 *   --mail <list>    inbox providers for the alias      [outlook,hotmail]
 *   --verify-only    re-run every key in keys.txt through the chat gate
 *   --screen         only test the proxy list against Mistral
 *   --probe          environment check: exits, inbox rail, gate, keys
 *   --collect        rebuild keys.txt from accounts.json
 *   --help
 *
 * Zero dependencies outside `src/vendor/` (proxy tunnels + inbox backends).
 * Node.js >= 18.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { parseProxy, createAgent, loadPoolFile, label } = require('./vendor/proxy.js');
const { req: httpReq } = require('./vendor/http.js');
const { TempTf } = require('./vendor/temptf.js');

// Shipped as `<repo>/src/cli.js`; in the lab it sits in `providers/mistral/`,
// so both layouts must resolve the same root for keys.txt / accounts.json.
const ROOT = path.basename(__dirname) === 'src' ? path.resolve(__dirname, '..') : __dirname;
const KEYS_FILE = path.join(ROOT, 'keys.txt');
const UNGATED_FILE = path.join(ROOT, 'keys-ungated.txt');
const ACCOUNTS_FILE = path.join(ROOT, 'accounts.json');

/** Dead-key report: only definite rejections — 429/5xx/transport never land here. */
const DEAD_FILE = path.join(ROOT, 'keys-dead.txt');
const DEAD_STATUS = new Set([401, 403]);
const DEAD_REASON = /banned|deactivated|disabled|suspended|quota|insufficient|forbidden|unauthorized/i;
function recordDead(key, status, sample) {
  if (!key) return;
  if (!DEAD_STATUS.has(Number(status)) && !DEAD_REASON.test(String(sample || ''))) return;
  const why = `${status}${sample ? ' ' + String(sample).replace(/\s+/g, ' ').slice(0, 60) : ''}`;
  try {
    fs.mkdirSync(path.dirname(DEAD_FILE), { recursive: true });
    fs.appendFileSync(DEAD_FILE, `${key}\t${why}\t${new Date().toISOString()}\n`);
  } catch (e) { /* diagnostics must never break the run */ }
}

const AUTH = 'https://auth.mistral.ai';
const CONSOLE = 'https://console.mistral.ai';
const API = 'https://api.mistral.ai';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

// ------------------------------------------------------------------- options

const argv = process.argv.slice(2);
function arg(name, dflt) {
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const i = argv.indexOf(`--${name}`);
  if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--')) return argv[i + 1];
  return dflt;
}
const has = (name) => argv.includes(`--${name}`);

if (has('help') || has('h')) {
  console.log(`mistral-bulk-apikey — mint Mistral AI accounts, one key each, verified by a live chat call.

  node src/cli.js --count 50       mint (a key is kept only after a chat 200)
  node src/cli.js --verify-only    re-check every key in keys.txt
  node src/cli.js --screen         test your proxy list against Mistral
  node src/cli.js --probe          exits / inbox rail / gate / keys
  node src/cli.js --collect        rebuild keys.txt from accounts.json
  node src/cli.js --help

  --count N      accounts to mint                                 [10]
  --conc N       accounts in flight (max 16)                       [2]
  --model <id>   pinned gate model                     [mistral-tiny-latest]
  --pool <file>  proxy list, one exit per line, optional (env MISTRAL_PROXIES)

Requests go through your proxy list when one is provided (--pool / env). Without
a pool the tool connects directly.`);
  process.exit(0);
}

const COUNT = Math.max(1, parseInt(arg('count', '10'), 10) || 10);
const CONC = Math.min(16, Math.max(1, parseInt(arg('conc', arg('concurrency', '2')), 10) || 2));
const GAP_MS = Math.max(0, parseInt(arg('gap', '800'), 10) || 0);
const EXITS = Math.max(1, parseInt(arg('exits', '6'), 10) || 6);
const TIMEOUT_MS = Math.max(5000, parseInt(arg('timeout', '45000'), 10) || 45000);
const MAIL_TIMEOUT_MS = Math.max(30000, parseInt(arg('mail-timeout', '180000'), 10) || 180000);
const MAIL_PROVIDERS = String(arg('mail', 'outlook,hotmail')).split(',').map((s) => s.trim()).filter(Boolean);
const PIN_MODEL = arg('model', 'mistral-tiny-latest');
const PROXY_FILE = process.env.MISTRAL_PROXIES || arg('pool', arg('proxies', 'proxies.txt'));

const VERIFY_ONLY = has('verify-only');
const SCREEN_ONLY = has('screen');
const PROBE_ONLY = has('probe');
const COLLECT_ONLY = has('collect');

// The free "Experiment" api_plan serves this small set; anything larger answers
// 429 rate_limited even with a perfectly good key, so it must never be the gate.
const GATE_FALLBACKS = ['mistral-tiny-latest', 'open-mistral-nemo', 'codestral-latest'];
const gateOrder = () => [PIN_MODEL, ...GATE_FALLBACKS].filter((m, i, a) => m && a.indexOf(m) === i);

// ------------------------------------------------------------------ helpers

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (msg) => console.log(`${new Date().toISOString().slice(11, 19)} ${msg}`);
const mask = (line) => label(parseProxy(line) || null);
const randName = () => {
  const alpha = 'abcdefghijklmnopqrstuvwxyz';
  const pick = (n) => Array.from({ length: n }, () => alpha[Math.floor(Math.random() * alpha.length)]).join('');
  return { first: 'M' + pick(6), last: 'B' + pick(7) };
};
const randPass = () => {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '0123456789';
  const rand = (set, n) => Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join('');
  return `${rand(lower, 5)}${rand(upper, 1)}${rand(lower + digits, 4)}!${rand(digits, 2)}`;
};

/** Cookie jar for the Kratos session (csrf + session live in cookies). */
function jar() {
  const c = new Map();
  return {
    absorb(headers) {
      for (const x of [].concat((headers && headers['set-cookie']) || [])) {
        const [kv] = String(x).split(';');
        const i = kv.indexOf('=');
        if (i > 0) c.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim());
      }
    },
    header() {
      return [...c.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    },
  };
}

function loadExits() {
  // ROOT-relative first (the shipped launcher passes `proxies.txt`), then cwd.
  const candidates = [path.resolve(ROOT, PROXY_FILE), path.resolve(PROXY_FILE)];
  const file = candidates.find((f) => fs.existsSync(f));
  if (!file) {
    // No pool = DIRECT mode: a proxy is recommended at scale (per-IP limits,
    // bans), but the tool works without one. `null` is the direct sentinel.
    console.log(`no proxy list at ${PROXY_FILE} — running WITHOUT a proxy (direct). Put exits there (or pass --pool) to rotate per account.`);
    return [null];
  }
  // `loadPoolFile` keeps the raw line (provenance/trailing notes) and tolerates
  // other fleets' `scheme://host:port  # exit=1.2.3.4` format.
  const lines = loadPoolFile(file)
    .map((p) => p.raw)
    .filter(Boolean);
  if (!lines.length) {
    console.log(`${PROXY_FILE} has no usable exits — running WITHOUT a proxy (direct).`);
    return [null];
  }
  return [...new Set(lines)];
}

/** A dead exit, not a panel verdict — the flow rotates to the next candidate. */
const isExitError = (e) =>
  /proxy connect failed|CONNECT refused|connect timeout|connect failed|ETIMEDOUT|ECONNREFUSED|ECONNRESET|ECONNABORTED|EPIPE|ENETUNREACH|EHOSTUNREACH|EAI_AGAIN|ENOTFOUND|getaddrinfo|socket hang up|secureConnect|TLS|handshake|unparseable exit|\btimeout\b/i.test(
    String((e && e.message) || e),
  );

// -------------------------------------------------------------- HTTP pinned

/**
 * One request through the exit this account is pinned to. Transport failures
 * are retried on the same exit (a flapping free exit usually recovers) and the
 * caller rotates exits when the account retry budget runs out.
 */
async function call(px, url, { method = 'GET', headers = {}, body = null, timeoutMs = TIMEOUT_MS, tries = 3 } = {}) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    try {
      const reqOpts = {
        method,
        timeoutMs,
        headers: { 'user-agent': UA, accept: 'application/json, text/plain, */*', 'accept-language': 'en-US,en;q=0.9', ...headers },
        body,
      };
      return px ? await httpReq(px, url, reqOpts) : await directReq(url, reqOpts);
    } catch (e) {
      last = e;
      if (i < tries - 1) await sleep(700 * (i + 1));
    }
  }
  throw last;
}

/**
 * The direct-mode twin of `vendor/http.js#req`: same request shape and the same
 * `{status, headers, text, json, setCookie}` result, but the socket leaves this
 * machine with no tunnel. Used when no pool was given (`px === null`).
 */
function directReq(url, { method = 'GET', headers = {}, body = null, timeoutMs = TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const payload =
      body === undefined || body === null ? null : Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const h = { ...headers };
    if (!Object.keys(h).some((k) => k.toLowerCase() === 'accept-encoding')) h['accept-encoding'] = 'identity';
    if (payload && !Object.keys(h).some((k) => k.toLowerCase() === 'content-type')) h['Content-Type'] = 'application/json';
    if (payload && !Object.keys(h).some((k) => k.toLowerCase() === 'content-length')) h['Content-Length'] = payload.length;
    const r = lib.request(
      { method, host: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), path: u.pathname + u.search, headers: h },
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

/** A Kratos call: JSON in, cookies absorbed, `{status, json, text}` out. */
async function kratos(px, cookies, urlPath, { method = 'GET', body = null } = {}) {
  const headers = { accept: 'application/json' };
  if (method === 'POST') headers['content-type'] = 'application/json';
  if (cookies.header()) headers.cookie = cookies.header();
  const r = await call(px, `${AUTH}${urlPath}`, { method, headers, body: body ? JSON.stringify(body) : null });
  cookies.absorb(r.headers);
  return r;
}

const messageOf = (r) => {
  const msgs = (r.json && r.json.ui && r.json.ui.messages) || [];
  const detail = msgs.map((m) => m.text || m.id).filter(Boolean).join(' ');
  return String(detail || (r.json && (r.json.error && (r.json.error.message || r.json.error.reason)) ) || r.text || '').slice(0, 200);
};

// -------------------------------------------------------------------- flows

function appendKey(key) {
  const known = fs.existsSync(KEYS_FILE) ? fs.readFileSync(KEYS_FILE, 'utf8').split(/\r?\n/).map((s) => s.trim()) : [];
  if (!known.includes(key)) fs.appendFileSync(KEYS_FILE, `${key}\n`);
}

let writeChain = Promise.resolve();
function recordAccount(rec) {
  writeChain = writeChain.then(() => {
    let arr = [];
    try {
      arr = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
    } catch (e) {
      arr = [];
    }
    arr.push(rec);
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(arr, null, 1) + '\n');
  });
  return writeChain;
}

/** The gate: 200 with `choices` and no `error` = the key is live. */
async function chatGate(px, key, model, { maxTokens = 8 } = {}) {
  const r = await call(px, `${API}/v1/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: 'reply with the single word ok' }], max_tokens: maxTokens }),
    timeoutMs: Math.max(TIMEOUT_MS, 60000),
    tries: 2,
  });
  const j = r.json;
  const ok = r.status === 200 && j && !j.error && Array.isArray(j.choices) && j.choices.length;
  return {
    ok,
    status: r.status,
    model: (j && j.model) || '',
    text: ok ? String((((j.choices[0] || {}).message) || {}).content || '').slice(0, 60) : '',
    error: ok ? '' : String((j && j.error && (j.error.message || JSON.stringify(j.error))) || r.text).slice(0, 160),
  };
}

/** Account → verified key. Returns `{key, ...}` or throws with the failing step. */
async function mintAccount(px, index) {
  const stamp = `#${index + 1}`;

  // 1. mailbox: one fresh Microsoft-family alias per account
  const mail = new TempTf({ proxy: px, providers: MAIL_PROVIDERS, plus: true, log: (m) => say(`  ${stamp} ${m}`) });
  let address = null;
  for (let t = 0; t < 4 && !address; t++) {
    try {
      address = (await mail.createAccount()).address;
    } catch (e) {
      say(`  ${stamp} alias attempt ${t + 1} failed: ${String(e.message).slice(0, 120)}`);
      await sleep(15000);
    }
  }
  if (!address) throw new Error('no mail alias (inbox rail exhausted/timeout)');

  const person = randName();
  const password = randPass();
  const cookies = jar();

  // 2. registration (API flow: csrf in the body, no Origin/Referer)
  const rf = await kratos(px, cookies, '/self-service/registration/api');
  if (rf.status !== 200 || !rf.json || !rf.json.id) throw new Error(`registration flow ${rf.status} ${String(rf.text).slice(0, 120)}`);
  const csrf = ((rf.json.ui && rf.json.ui.nodes) || []).find((n) => n.attributes && n.attributes.name === 'csrf_token');
  const reg = await kratos(px, cookies, `/self-service/registration?flow=${rf.json.id}`, {
    method: 'POST',
    body: {
      method: 'password',
      password,
      traits: { email: address, name: { first: person.first, last: person.last } },
      csrf_token: (csrf && csrf.attributes.value) || '',
      transient_payload: {},
    },
  });
  if (reg.status !== 200) throw new Error(`register ${reg.status} ${messageOf(reg)}`);
  const sessionFromReg = reg.json && reg.json.session_token;
  say(`  ${stamp} registered ${address}`);

  // 3. verification: the mail link itself carries code + flow
  let vcode = null;
  let vflow = null;
  const deadline = Date.now() + MAIL_TIMEOUT_MS;
  while (Date.now() < deadline && !vcode) {
    const msgs = await mail.messages().catch(() => []);
    for (const m of msgs) {
      const raw = JSON.stringify(m.raw);
      const hit = raw.match(/self-service\/verification\?code=(\d+)(?:&amp;|&)flow=([0-9a-f-]{36})/);
      const hit2 = raw.match(/code=(\d{6})/);
      if (hit) {
        vcode = hit[1];
        vflow = hit[2];
        break;
      }
      if (hit2 && /verif/i.test(m.subject)) {
        vcode = hit2[1];
        break;
      }
    }
    if (!vcode) await sleep(6000);
  }
  if (!vcode) throw new Error(`no verification mail within ${Math.round(MAIL_TIMEOUT_MS / 1000)}s`);
  let verified = true;
  if (vflow) {
    const vf = await kratos(px, cookies, `/self-service/verification/flows?id=${vflow}`);
    const vcsrf = ((vf.json && vf.json.ui && vf.json.ui.nodes) || []).find((n) => n.attributes && n.attributes.name === 'csrf_token');
    const vr = await kratos(px, cookies, `/self-service/verification?flow=${vflow}`, {
      method: 'POST',
      body: { method: 'code', code: vcode, ...(vcsrf ? { csrf_token: vcsrf.attributes.value } : {}) },
    });
    if (vr.status >= 400 && vr.status !== 410) throw new Error(`verify ${vr.status} ${messageOf(vr)}`);
    verified = vr.status < 400;
    say(`  ${stamp} verify ${vr.status}`);
  }

  // 4. session: registration already handed one; Kratos refuses a second
  //    password login while it is fresh, so only re-login on a 401.
  const login = async () => {
    const lf = await kratos(px, cookies, '/self-service/login/api');
    const lcsrf = ((lf.json && lf.json.ui && lf.json.ui.nodes) || []).find((n) => n.attributes && n.attributes.name === 'csrf_token');
    const lg = await kratos(px, cookies, `/self-service/login?flow=${lf.json.id}`, {
      method: 'POST',
      body: { method: 'password', identifier: address, password, csrf_token: (lcsrf && lcsrf.attributes.value) || '' },
    });
    if (!(lg.json && lg.json.session_token)) throw new Error(`login ${lg.status} ${messageOf(lg)}`);
    return lg.json.session_token;
  };
  let st = sessionFromReg;
  if (!st) st = await login();

  // 5. workspace → key
  const auth = () => ({ authorization: `Bearer ${st}`, ...(cookies.header() ? { cookie: cookies.header() } : {}) });
  let ws = await call(px, `${CONSOLE}/api/workspaces`, { headers: auth() });
  if (ws.status === 401) {
    st = await login();
    ws = await call(px, `${CONSOLE}/api/workspaces`, { headers: auth() });
  }
  const wid = (((ws.json && ws.json.items) || [])[0] || {}).uuid;
  if (!wid) throw new Error(`no workspace: ${ws.status} ${String(ws.text).slice(0, 140)}`);
  const kr = await call(px, `${CONSOLE}/api/billing/api-keys`, {
    method: 'POST',
    headers: { ...auth(), 'content-type': 'application/json' },
    body: JSON.stringify({ name: `bulk${index + 1}-${Math.random().toString(36).slice(2, 7)}`, workspace: wid, primitive_access_scope: 'shared_only' }),
  });
  const key = kr.json && kr.json.key;
  if (!key) throw new Error(`key create ${kr.status} ${String(kr.text).slice(0, 160)}`);
  say(`  ${stamp} key ${String(key).slice(0, 12)}… workspace ${String(wid).slice(0, 8)}`);

  // 6. gate — the only step that decides whether the key is written
  let last = { status: 0, error: 'no model tried' };
  for (const model of gateOrder()) {
    let gate = await chatGate(px, key, model);
    // 429 on a good key is a pace signal, not a dead key.
    if (gate.status === 429) {
      await sleep(2500);
      gate = await chatGate(px, key, model);
    }
    if (gate.ok) {
      return { address, password, person, key, keyId: (kr.json && kr.json.key_id) || '', workspace: wid, model, gate, verified };
    }
    recordDead(key, gate.status, gate.error);
    last = { status: gate.status, error: `${model}: ${gate.error}` };
  }
  return { address, password, person, key, keyId: (kr.json && kr.json.key_id) || '', workspace: wid, model: '', gate: last, verified };
}

/** Accounts whose every candidate died at the transport layer (not a panel verdict). */
let deadRoutes = 0;
async function mintOne(exits, startExit, index) {
  let transportDead = 0;
  for (let attempt = 0; attempt < EXITS; attempt++) {
    // Attempt 0 keeps the pinned exit; a retry walks to the next one. The step
    // is 1, not a multiple: with a 3-line pool a `+3` step lands on the same
    // exit again and burns the whole retry budget on the dead one.
    const exitLine = attempt === 0 ? startExit : exits[(exits.indexOf(startExit) + attempt) % exits.length];
    const px = exitLine ? parseProxy(exitLine) : null;
    if (exitLine && !px) {
      say(`  ✗ #${index + 1} unparseable exit ${mask(exitLine)}`);
      transportDead++;
      continue;
    }
    try {
      const acct = await mintAccount(px, index);
      const live = Boolean(acct.gate && acct.gate.ok);
      await recordAccount({
        index: index + 1,
        email: acct.address,
        key: acct.key,
        key_id: acct.keyId,
        workspace: acct.workspace,
        model: acct.model,
        chat_status: acct.gate.status,
        chat: acct.gate.text,
        verified: acct.verified,
        exit: mask(exitLine),
        verdict: live ? 'LIVE' : 'key-no-chat',
        at: new Date().toISOString(),
      });
      if (!live) {
        say(`  ✗ #${index + 1} ${acct.address}: key created but no model answered 200 (${acct.gate.error})`);
        return null;
      }
      appendKey(acct.key);
      say(`  ✓ #${index + 1} ${acct.address} → ${acct.key.slice(0, 12)}…  ${acct.gate.model || acct.model}  chat 200 ${acct.gate.text}`);
      return acct;
    } catch (e) {
      if (isExitError(e)) {
        transportDead++;
        say(`  ✗ #${index + 1} exit ${attempt + 1}/${EXITS} ${mask(exitLine)} dead (${String(e.message).slice(0, 70)}) → next exit`);
      } else {
        say(`  ✗ #${index + 1} attempt ${attempt + 1} via ${mask(exitLine)}: ${String(e.message).slice(0, 180)}`);
      }
      await sleep(1500 * (attempt + 1));
    }
  }
  if (transportDead > 0 && transportDead === EXITS) deadRoutes++;
  await recordAccount({ index: index + 1, verdict: 'failed', at: new Date().toISOString() });
  return null;
}

// --------------------------------------------------------------------- modes

async function screen(exits) {
  say(`screening ${exits.filter(Boolean).length || 'direct'} exit(s) against ${new URL(AUTH).host}`);
  const live = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: CONC }, async () => {
      for (;;) {
        const i = cursor++;
        if (i >= exits.length) return;
        const px = exits[i] ? parseProxy(exits[i]) : null;
        try {
          const r = await call(px, `${AUTH}/self-service/registration/api`, { timeoutMs: 15000, tries: 1 });
          if (r.status === 200) {
            if (exits[i]) live.push(exits[i]); // nothing to screen in direct mode
            say(`  ✓ ${mask(exits[i])} ${r.status}`);
          } else {
            say(`  ✗ ${mask(exits[i])} ${r.status}`);
          }
        } catch (e) {
          say(`  ✗ ${mask(exits[i])} ${String(e.message).slice(0, 100)}`);
        }
      }
    })
  );
  fs.writeFileSync(path.join(ROOT, 'proxies.live.txt'), live.join('\n') + (live.length ? '\n' : ''));
  say(`screen done: ${live.length}/${exits.filter(Boolean).length || 'direct'} live → proxies.live.txt`);
}

async function probe(exits) {
  // A probe has to survive a partly dead pool: sweep first, then inspect the
  // rail through an exit that actually answers.
  const working = [];
  for (const ex of exits) {
    try {
      const r = await call(ex ? parseProxy(ex) : null, `${AUTH}/self-service/registration/api`, { timeoutMs: 15000, tries: 1 });
      if (r.status === 200) working.push({ ex, r });
    } catch (e) {
      /* dead exit */
    }
  }
  say(`exits: ${working.length}/${exits.filter(Boolean).length || 'direct'} reach ${new URL(AUTH).host}`);
  if (!working.length) {
    say('no exit reached Mistral — nothing further to probe');
    return;
  }
  const px = working[0].ex ? parseProxy(working[0].ex) : null;
  const rf = working[0].r;
  const fields = (((rf.json || {}).ui || {}).nodes || []).map((n) => n.attributes && n.attributes.name).filter(Boolean);
  say(`registration flow: ${rf.status} flow ${String((rf.json || {}).id || '-').slice(0, 8)}… fields ${fields.join(',') || '-'}`);
  const mail = new TempTf({ proxy: px, providers: MAIL_PROVIDERS, plus: true, log: () => {} });
  try {
    // `dot`/`plus` must be named explicitly: the stats route refuses a bare
    // providers list ("Enable at least one: dot or plus").
    const stats = await mail.call('GET', `/api/stats?providers=${MAIL_PROVIDERS.join(',')}&dot=0&plus=1`);
    say(`inbox rail temp.tf: ok (${MAIL_PROVIDERS.join('/')}) totalReceived=${(stats && stats.totalReceived) ?? '?'}`);
  } catch (e) {
    say(`inbox rail temp.tf: FAILED ${String(e.message).slice(0, 120)}`);
  }
  const order = gateOrder();
  if (fs.existsSync(KEYS_FILE)) {
    const keys = fs.readFileSync(KEYS_FILE, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    say(`keys.txt: ${keys.length} key(s) — sampling the first one`);
    for (const model of order) {
      const g = await chatGate(px, keys[0], model);
      say(`  ${g.ok ? '✓' : '✗'} ${model} → ${g.status}${g.ok ? ` (${g.model} ${g.text})` : ` ${g.error}`}`);
      if (g.ok) break;
    }
  } else {
    say('keys.txt: not present yet');
  }
  say(`gate order: ${order.join(' → ')}`);
}

async function verifyOnly(exits) {
  if (!fs.existsSync(KEYS_FILE)) {
    console.error(`! ${path.basename(KEYS_FILE)} not found — nothing to verify`);
    process.exit(2);
  }
  const keys = fs.readFileSync(KEYS_FILE, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  say(`re-checking ${keys.length} key(s), gate ${gateOrder().join(' → ')}`);
  const live = [];
  const dead = [];
  for (let i = 0; i < keys.length; i++) {
    let ok = false;
    let note = '';
    let status = 0;
    // A key is only ever marked dead by an *answer*. A transport failure is the
    // exit's problem, so the key moves to the next exit in the pool instead of
    // being written off — a dead free exit would otherwise look like a dead key.
    for (let attempt = 0; attempt < EXITS && !ok; attempt++) {
      const exitLine = exits[(i + attempt) % exits.length];
      const px = exitLine ? parseProxy(exitLine) : null;
      let exitFailed = false;
      for (const model of gateOrder()) {
        try {
          const g = await chatGate(px, keys[i], model);
          if (g.ok) {
            ok = true;
            note = `${model} ${g.status} ${g.model} ${g.text}`;
            break;
          }
          status = g.status;
          note = `${model} HTTP ${g.status} ${g.error}`;
        } catch (e) {
          exitFailed = true;
          note = `${String(e.message).slice(0, 100)} (${mask(exitLine)})`;
          break;
        }
      }
      if (!ok && !exitFailed) break; // the plan answered: the key itself is not live
    }
    if (!ok) recordDead(keys[i], status, note);
    (ok ? live : dead).push(keys[i]);
    say(`  ${ok ? '✓' : '✗'} ${keys[i].slice(0, 12)}… ${note}`);
  }
  fs.writeFileSync(KEYS_FILE, live.join('\n') + (live.length ? '\n' : ''));
  if (dead.length) fs.writeFileSync(UNGATED_FILE, dead.join('\n') + '\n');
  say(`verify done: ${live.length} live, ${dead.length} dead`);
}

async function collect() {
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    console.error(`! ${path.basename(ACCOUNTS_FILE)} not found — nothing to collect`);
    process.exit(2);
  }
  const rows = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
  const keys = [...new Set(rows.filter((r) => r.chat_status === 200 && r.key).map((r) => r.key))];
  fs.writeFileSync(KEYS_FILE, keys.join('\n') + (keys.length ? '\n' : ''));
  say(`collect done: ${keys.length} chat-200 key(s) → keys.txt`);
}

async function mint(exits) {
  say(`minting ${COUNT} account(s), conc ${CONC}, ${exits.filter(Boolean).length || 'direct'} exit(s), gate ${gateOrder().join(' → ')}`);
  let cursor = 0;
  let ok = 0;
  let failed = 0;
  await Promise.all(
    Array.from({ length: CONC }, async () => {
      for (;;) {
        const i = cursor++;
        if (i >= COUNT) return;
        const rec = await mintOne(exits, exits[i % exits.length], i);
        if (rec) ok++;
        else failed++;
        if (GAP_MS) await sleep(GAP_MS);
      }
    })
  );
  await writeChain;
  say(`done: ${ok} live key(s), ${failed} failed — keys.txt`);
  if (!ok && failed > 0 && deadRoutes === failed) {
    const route = exits[0] === null ? 'direct mode (no proxy list)' : `${exits.length}-exit pool`;
    console.error(`[fatal] no usable route — ${failed} account(s) × ${EXITS} candidate(s) over ${route}: every attempt died at the transport layer.`);
    process.exit(1);
  }
  if (!ok) process.exitCode = 1;
}

(async () => {
  const exits = loadExits();
  if (SCREEN_ONLY) return screen(exits);
  if (COLLECT_ONLY) return collect();
  if (PROBE_ONLY) return probe(exits);
  if (VERIFY_ONLY) return verifyOnly(exits);
  return mint(exits);
})().catch((e) => {
  console.error('[fatal]', e.message);
  process.exit(1);
});
