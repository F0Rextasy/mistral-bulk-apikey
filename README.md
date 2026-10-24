<div align="center">

```
███╗   ███╗██╗███████╗████████╗██████╗  █████╗ ██╗
████╗ ████║██║██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██║
██╔████╔██║██║███████╗   ██║   ██████╔╝███████║██║
██║╚██╔╝██║██║╚════██║   ██║   ██╔══██╗██╔══██║██║
██║ ╚═╝ ██║██║███████║   ██║   ██║  ██║██║  ██║███████╗
╚═╝     ╚═╝╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
```

# mistral-bulk-apikey

**Bulk-create Mistral AI accounts with auto-generated API keys — OpenAI-compatible inference + 9Router connector.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-45%20served-412991?style=for-the-badge)](https://docs.mistral.ai/getting-started/models/models_overview/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Quick start](#-quick-start) · [🎁 Free tier](#-free-tier--how-much-you-get) · [🤖 Models](#-models--all-45-of-them) · [🧪 Use the API](#-how-to-use-the-api) · [✅ Verified](#-verified-working--every-key-is-tested) · [🧭 How it works](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Options](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Issues](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Why this exists

Mistral's door is an **Ory Kratos** one: `POST /self-service/registration` takes an e-mail, a password and a name and nothing else — **no card, no phone, no captcha** — and the inbox step is a link that carries the code *and* the flow id, so the whole rail runs over plain HTTP with one mailbox alias per account. Once the session exists, the console's own billing route issues the key: `POST /api/billing/api-keys {name, workspace, primitive_access_scope:"shared_only"}` → `mstrl_…` (45 characters).

The unit that scales is **one account = one key**. Measured on the operator's fleet (2026-10-19): the rail pushed every key in 12 chunks of 8 at **~14.6 s/key** with 2 workers, losing 2 accounts (one inbox that never delivered inside 180 s, one `login 400`) — no CAPTCHA wall, no rate-limit wall. All **111** answered chat-200 on `mistral-tiny-latest` **and** on `codestral-latest` — **222/222** live calls. While this repo was being verified, its own CLI minted **3 more** keys of the same shape (2 at `--conc 2` in 56 s, 1 in 26 s), each one chat-200 before it was written. What is being multiplied is the free **Experiment** api_plan, which is why the larger ids stay out of the gate (see below).

## 🎁 Free tier — how much you get

**Every new account gets a free key** — no card, no captcha, no phone.

| What | Value |
| --- | --- |
| Card required | **No** |
| Phone | **not asked** — the console does ship a `/api/users/verify-phone/send-code` route, but on a fresh free account it answers `400 can't be verified` and the chat gate never needs it |
| Captcha / Turnstile | **none** on the Kratos API flow used here |
| Mailbox | **required** — one alias per account; a `temp.tf` outlook/hotmail plus-alias arrives on a domain Mistral accepts |
| Plan | the free **Experiment** api_plan |
| Sign-up credit | nothing to spend — the free plan itself serves the ids in the gate |
| Model ceiling | larger ids answer `429 rate_limited` with a perfectly good key, so they are not in the gate |
| The unit that scales | **one account = one key** → `--count N` is "N free accounts" |

> 💡 The free tier is set by Mistral AI and can change. Check the live numbers at [mistral.ai](https://mistral.ai) — and let the tool's own gate decide:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Models — all 45 of them

One free key sees **45 model ids** (`GET /v1/models`, measured 2026-10-19) — chat, embed, OCR and audio in the same list. Asking every chat-capable id for a real completion (24 ids, one sweep, same key) splits that list in three:

* **9 ids answer 200** — `codestral-2508`, `codestral-latest`, `mistral-code-latest`, `ministral-14b-2512`, `ministral-14b-latest`, `ministral-3b-2512`, `ministral-3b-latest`, `ministral-8b-2512`, `ministral-8b-latest`;
* **13 ids answer 429 `rate_limited`** — the whole `mistral-medium*`, `mistral-small*`, `magistral-*` and `mistral-vibe-cli-*` half;
* **2 ids answer 403** — `labs-leanstral-1-5` and `labs-leanstral-1-5-1`.

Only ids a key has actually answered on are listed here:

| Model ID | ✓ | Notes |
| --- | --- | --- |
| `mistral-tiny-latest` | ✓ | the gate's first stop; answers as `ministral-8b-2512` — a legacy alias the newer catalogue list no longer names |
| `open-mistral-nemo` | ✓ | also absent from the 45-id list and still served |
| `codestral-latest` | ✓ | the code model; second pin, used for the 222-call sweep above |

The gate walks those three in order and stops at the first 200, so a key is kept only when the account really serves one of them. A 429 is treated as a pace signal (one retry after 2.5 s) rather than a dead key.

## 🧪 How to use the API

The endpoint is OpenAI-compatible under **`/v1`**:

```bash
curl https://api.mistral.ai/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"codestral-latest","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

A free-plan key answers on the small ids and returns `429 rate_limited` for `mistral-medium*` / `mistral-small*` — that is the plan, not the key.

## 🛠 Quick start

```bash
# clone or fork this repository, then:
cd mistral-bulk-apikey

# 1) your proxy list, one per line (http://… or socks5://…) — optional, see below
printf 'http://127.0.0.1:8080\n' > proxies.txt   # optional — without it the tool runs direct

# 2) go
node src/launcher.js                # interactive
# or directly:
node src/cli.js --count 50 --conc 2
```

`keys.txt` is written **only** after a live chat completion proves the key.

| Mode | What it does |
| --- | --- |
| `run` (default) | mint accounts until `--count`, gate every key with a live chat |
| `--verify-only` | re-sweep `keys.txt`, moving anything that fails to `keys-ungated.txt` |
| `--screen` | test your proxy list against Mistral → `proxies.live.txt` |
| `--probe` | environment check: exits, inbox rail, registration flow fields, gate order, an existing key |
| `--collect` | rebuild `keys.txt` from `accounts.json` |

### 🖱️ The launcher

The launcher asks for the proxy list, the account count and the gate model, remembers them in `launcher.config.json`, and runs the CLI with the right flags. It also screens your exit list and can register `keys.txt` with a local 9Router.

## ✅ Verified working — every key is tested

| Check | Result |
| --- | --- |
| `GET /self-service/registration/api` | **200** — flow id + `csrf_token`; fields seen: `traits.email`, `password`, `traits.name.first`, `traits.name.last`, `method` |
| `POST /self-service/registration?flow=…` | **200** — account created, `session_token` in the body |
| inbox link `?code=…&flow=…` → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` | **200** — verified (`410` = already verified, also accepted) |
| `GET /api/workspaces` | **200** — workspace uuid |
| `POST /api/billing/api-keys` | **200** — `mstrl_…`, 45 characters, no card |
| `POST https://api.mistral.ai/v1/chat/completions` — run for **every** key before it is written | **200** with real content |
| full fleet sweep | **111/111** keys chat-200 on `mistral-tiny-latest` **and** `codestral-latest` (222/222 calls, 2026-10-19) |
| this repo's CLI, live mint while it was being verified | every key minted and chat-200 (`--count 3` → 2 in 56 s at `--conc 2`; `--count 1` → 1 in 26 s). One account of the first batch was lost to two unreachable exits in the test pool and reported as such |
| a key that fails its chat check | never written to `keys.txt` |

The gate's answer, verbatim (the first key the shipped CLI minted, `mistral-tiny-latest`):

```json
{"id":"cb51dff9b36c41a08d41c8c0533885da","created":1792380045,"model":"ministral-8b-2512","usage":{"prompt_tokens":9,"total_tokens":11,"completion_tokens":2,"service_tier":"standard"},"object":"chat.completion","choices":[{"index":0,"finish_reason":"stop","message":{"role":"assistant","tool_calls":null,"content":"ok"}}]}
```

> **Quality gates.** Every key here passed a live `chat-200` before it was written to `keys.txt`
> (dead keys are never shipped). Router combos follow the same rule at the model level: an entry is
> added **only if the model answers `chat-200` and can call tools** — a model without tool support,
> a dead key or a dead provider is dropped instead of added. Re-run the verify step any time;
> failures are reported, never hidden.

## 🧭 How it works

```
inbox (one Microsoft-family alias per account)                    a fresh alias per account
   |
   |- register: auth.mistral.ai /self-service/registration (Kratos)  csrf + email/password, session_token back
   |- verify:   mail link ?code=...&flow=... -> /self-service/verification
   |- key:      console.mistral.ai /api/billing/api-keys            mstrl_... returned once
   |- live proof: POST https://api.mistral.ai/v1/chat/completions    real content = the key is live
```

| Step | Call | Notes |
| --- | --- | --- |
| alias | `GET https://temp.tf/api/account?providers=outlook,hotmail&dot=0&plus=1` | one alias per account; the route is IP-throttled (~20 s per address) so the rail retries rather than burning the attempt |
| register | `GET /self-service/registration/api` → `POST /self-service/registration?flow=…` | JSON body + `csrf_token` from the flow; the response already carries `session_token` |
| verify | link from the inbox → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` `{method:"code", code}` | the link itself carries both `code` and `flow` |
| session | `session_token` from the registration response | Kratos refuses a second password login while the first session is fresh, so a re-login only happens on a `401` |
| workspace | `GET console.mistral.ai/api/workspaces` | first `items[].uuid` |
| key | `POST console.mistral.ai/api/billing/api-keys` `{name, workspace, primitive_access_scope:"shared_only"}` | plaintext `mstrl_…` returned once |
| gate | `POST api.mistral.ai/v1/chat/completions` | live 200 required before `keys.txt`; 429 retried once after 2.5 s, then the next id |

## ⚙️ CLI options

```bash
node src/cli.js [mode] [flags]
```

| Flag | Default | Meaning |
| --- | --- | --- |
| `--count N` | 10 | accounts (= keys) to mint |
| `--conc N` | 2 | accounts in flight (max 16) — one exit is pinned per account |
| `--model <id>` | `mistral-tiny-latest` | pinned gate model; the fallback order follows it |
| `--pool <file>` | `proxies.txt` | optional proxy list (`MISTRAL_PROXIES` env works too) |
| `--gap MS` | 800 | pause between accounts inside one worker |
| `--exits N` | 6 | exits tried per account |
| `--timeout MS` | 45000 | per-request timeout |
| `--mail-timeout MS` | 180000 | how long one account waits for the verification link |
| `--mail <list>` | `outlook,hotmail` | inbox providers used for the alias |
| `--verify-only` · `--screen` · `--probe` · `--collect` | — | the modes above |

An exit that fails is rotated for the next account, and a pool line may carry a screened note (`http://host:port 1.2.3.4`) — the loader keeps the first token.

## 🛰️ Behind a proxy

**Optional — recommended at scale (per-IP limits, bans).** The tool works without a proxy too.

- **With a pool:** pass `--pool <file>` (or set `MISTRAL_PROXIES`) and every request goes through an exit from that list — one account stays on one exit for its entire life (Kratos binds the session to the IP it was created on).
- **Without a pool:** the CLI prints `running WITHOUT a proxy (direct)` and connects directly; the alias, the verification link, the workspace key and the chat gate all run the same way.
- `--screen` writes the survivors to `proxies.live.txt` so the next run starts from exits that already answered — or tests the direct route when you have no pool.

Measured on the operator's fleet: a 10-line pool put **3 exits** through to `auth.mistral.ai`, and every account that finished kept to the single exit it started on (the two that lost their exit to an unreachable pool line were retried on the next one and reported as such).

## 📄 Files

| Path | Contents |
| --- | --- |
| `keys.txt` | chat-200 keys, one per line — git-ignored |
| `keys-ungated.txt` | keys that failed the last `--verify-only` sweep — retry later |
| `accounts.json` | alias / key / workspace / gate status / exit per account — git-ignored |
| `proxies.txt` | your exit list — git-ignored |
| `proxies.live.txt` | exits that passed `--screen` |

## 🔌 Connect to 9Router

[9Router](https://9router.com) is a self-hosted, OpenAI-compatible router. One command turns `keys.txt` into a provider-node with working combos:

```bash
node src/connect-9router.js
```

Defaults: `--base http://localhost:20128`, `--password 123456`, `--name "Mistral"`, `--prefix mistral`, `--base-url https://api.mistral.ai/v1`.

The operator's panel carries the same keys as native `mistral` provider connections (**111** registered), and a routed call lands on whatever the free plan serves: `POST /v1/chat/completions mistral/codestral-latest` → **200**, while `mistral/mistral-medium-latest` → **503** `[429] rate_limited` — the plan's ceiling, visible one hop away.

## 🔌 Connect to OmniRoute

[OmniRoute](https://omniroute.online) is a self-hosted, OpenAI-compatible router. One command turns `keys.txt` into a provider-node with working combos:

```bash
node src/connect-omniroute.js
```

Defaults: `--base http://localhost:20128`, `--password 123456`, `--name "Mistral"`, `--prefix mistral`, `--base-url https://api.mistral.ai/v1`.

The operator's panel carries the same keys as native `mistral` provider connections (**111** registered), and a routed call lands on whatever the free plan serves: `POST /v1/chat/completions mistral/codestral-latest` → **200**, while `mistral/mistral-medium-latest` → **503** `[429] rate_limited` — the plan's ceiling, visible one hop away.

## 🔑 What one key gets you

| | |
| --- | --- |
| 🏢 Provider | **Mistral AI** — [mistral.ai](https://mistral.ai) |
| 🎁 What the provider gives | a free account on the **Experiment** api_plan with an API key — no card, no phone, no captcha |
| 🔑 What one key gets you | an OpenAI-compatible key scoped to its own account: the small ids the free plan serves (`mistral-tiny-latest`, `open-mistral-nemo`, `codestral-latest`, `ministral-*`), at the plan's rate limits. The quota lives on the **account**, which is exactly why this tool creates one account per key |
| 🌐 API shape | OpenAI-compatible: `POST https://api.mistral.ai/v1/chat/completions` |
| 🔒 Your data | only `auth.mistral.ai` / `console.mistral.ai` / `api.mistral.ai` and the inbox backend you configure are contacted; keys stay on your machine |

## 🐞 Issues

If Mistral changes its registration flow, its verification mail or its free-plan model set, the tool stops at that step and says so (`--probe` shows the flow fields, the inbox rail and the gate order it sees). **[Open an issue](../../issues)** with the command you ran and the exact output; PRs are welcome.

## 📄 License

MIT © 2026 — see [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 mistral-bulk-apikey contributors

</div>
