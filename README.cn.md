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

**批量创建 Mistral AI 账户并自动生成 API 密钥 — 兼容 OpenAI 的推理 + 9Router 连接器。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-45%20served-412991?style=for-the-badge)](https://docs.mistral.ai/getting-started/models/models_overview/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 快速开始](#-quick-start) · [🎁 免费额度](#-free-tier--how-much-you-get) · [🤖 模型](#-models--all-45-of-them) · [🧪 使用 API](#-how-to-use-the-api) · [✅ 已验证](#-verified-working--every-key-is-tested) · [🧭 工作原理](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ 选项](#️-cli-options) · [🛰️ 代理](#️-behind-a-proxy) · [🐞 问题反馈](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ 为什么会有这个项目

Mistral 的大门是一扇 **Ory Kratos** 之门：`POST /self-service/registration` 只接受电子邮箱、密码和姓名，别无其他 —— **无需银行卡、无需手机号、无需验证码** —— 而收件箱环节只是一个链接，它同时携带验证码*和*流程 id，因此整条链路都通过纯 HTTP 运行，每个账户只需一个邮箱别名。会话一旦建立，控制台自身的计费路由就会签发密钥：`POST /api/billing/api-keys {name, workspace, primitive_access_scope:"shared_only"}` → `mstrl_…`（45 个字符）。

可扩展的单元是**一个账户 = 一个密钥**。在运营者的集群上实测（2026-10-19）：该链路以 2 个 worker、每批 8 个的方式推送了 **111 个密钥**，速度为 **约 14.6 秒/密钥**，损失了 2 个账户（一个收件箱在 180 秒内始终未送达，一个 `login 400`）—— 没有 CAPTCHA 墙，没有速率限制墙。全部 **111** 个密钥在 `mistral-tiny-latest` **和** `codestral-latest` 上都返回了 chat-200 —— **222/222** 次实时调用。在本仓库验证期间，其自带的 CLI 又铸造了 **3 个**同样形态的密钥（`--conc 2` 下 56 秒内 2 个，26 秒内 1 个），每一个在写入之前都通过了 chat-200。被复制的是免费的 **Experiment** api_plan，这就是为什么更大的 id 被挡在门外（见下文）。

## 🎁 免费额度 —— 你能得到多少

**每个新账户都会获得一个免费密钥** —— 无需银行卡、无需验证码、无需手机号。

| 项目 | 值 |
| --- | --- |
| 需要银行卡 | **否** |
| 手机号 | **不要求** —— 控制台确实提供了 `/api/users/verify-phone/send-code` 路由，但在全新的免费账户上它会返回 `400 can't be verified`，而聊天网关从不需要它 |
| 验证码 / Turnstile | 此处使用的 Kratos API 流程上**没有** |
| 邮箱 | **必需** —— 每个账户一个别名；一个 `temp.tf` 的 outlook/hotmail 加号别名会落在 Mistral 接受的域名上 |
| 套餐 | 免费的 **Experiment** api_plan |
| 注册赠金 | 无需花费 —— 免费套餐本身就能服务网关中的 id |
| 模型上限 | 更大的 id 即使使用完全正常的密钥也会返回 `429 rate_limited`，因此它们不在网关内 |
| 可扩展的单元 | **一个账户 = 一个密钥** → `--count N` 即“N 个免费账户” |

> 💡 免费额度由 Mistral AI 设定，可能会变化。请在 [mistral.ai](https://mistral.ai) 查看实时数据 —— 并让工具自身的网关来判定：

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 模型 —— 全部 45 个

一个免费密钥能看到 **45 个模型 id**（`GET /v1/models`，实测于 2026-10-19）—— 聊天、嵌入、OCR 和音频都在同一个列表中。向每个支持聊天的 id 请求一次真实补全（24 个 id，一次扫描，同一个密钥）会将这个列表一分为三：

* **9 个 id 返回 200** —— `codestral-2508`、`codestral-latest`、`mistral-code-latest`、`ministral-14b-2512`、`ministral-14b-latest`、`ministral-3b-2512`、`ministral-3b-latest`、`ministral-8b-2512`、`ministral-8b-latest`；
* **13 个 id 返回 429 `rate_limited`** —— 整个 `mistral-medium*`、`mistral-small*`、`magistral-*` 和 `mistral-vibe-cli-*` 这一半；
* **2 个 id 返回 403** —— `labs-leanstral-1-5` 和 `labs-leanstral-1-5-1`。

此处仅列出密钥实际成功应答过的 id：

| 模型 ID | ✓ | 备注 |
| --- | --- | --- |
| `mistral-tiny-latest` | ✓ | 网关的第一站；以 `ministral-8b-2512` 应答 —— 一个较新的目录列表已不再命名的旧别名 |
| `open-mistral-nemo` | ✓ | 同样不在 45 个 id 的列表中，但仍被服务 |
| `codestral-latest` | ✓ | 代码模型；第二个固定项，用于上述 222 次调用扫描 |

网关按顺序遍历这三个，并在第一个 200 处停止，因此只有当账户确实能服务其中之一时，密钥才会被保留。429 被视为节奏信号（2.5 秒后重试一次），而非失效密钥。

## 🧪 如何使用 API

端点在 **`/v1`** 下兼容 OpenAI：

```bash
curl https://api.mistral.ai/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"codestral-latest","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

免费套餐密钥能在小 id 上应答，而对 `mistral-medium*` / `mistral-small*` 返回 `429 rate_limited` —— 这是套餐所致，而非密钥问题。

## 🛠 快速开始

```bash

# clone or fork this repository, then:
cd mistral-bulk-apikey

# 1) your proxy list, one per line (http://… or socks5://…)
printf 'http://127.0.0.1:8080\n' > proxies.txt

# 2) go
node src/launcher.js                # interactive

# or directly:
node src/cli.js --count 50 --conc 2
```

`keys.txt` **只有**在一次实时聊天补全证明密钥有效之后才会被写入。

| 模式 | 作用 |
| --- | --- |
| `run`（默认） | 铸造账户直到 `--count`，用实时聊天对每个密钥进行网关验证 |
| `--verify-only` | 重新扫描 `keys.txt`，将任何失败的密钥移入 `keys-ungated.txt` |
| `--screen` | 用 Mistral 测试你的代理列表 → `proxies.live.txt` |
| `--probe` | 环境检查：出口、收件箱链路、注册流程字段、网关顺序、一个现有密钥 |
| `--collect` | 从 `accounts.json` 重建 `keys.txt` |

### 🖱️ 启动器

启动器会询问代理列表、账户数量和网关模型，将它们记入 `launcher.config.json`，并用正确的标志运行 CLI。它还会筛选你的出口列表，并可将 `keys.txt` 注册到本地 9Router。

## ✅ 已验证可用 —— 每个密钥都经过测试

| 检查 | 结果 |
| --- | --- |
| `GET /self-service/registration/api` | **200** —— 流程 id + `csrf_token`；看到的字段：`traits.email`、`password`、`traits.name.first`、`traits.name.last`、`method` |
| `POST /self-service/registration?flow=…` | **200** —— 账户已创建，响应体中有 `session_token` |
| 收件箱链接 `?code=…&flow=…` → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` | **200** —— 已验证（`410` = 已验证，同样接受） |
| `GET /api/workspaces` | **200** —— 工作区 uuid |
| `POST /api/billing/api-keys` | **200** —— `mstrl_…`，45 个字符，无需银行卡 |
| `POST https://api.mistral.ai/v1/chat/completions` —— 在写入前对**每个**密钥运行 | **200**，带有真实内容 |
| 全集群扫描 | **111/111** 个密钥在 `mistral-tiny-latest` **和** `codestral-latest` 上 chat-200（222/222 次调用，2026-10-19） |
| 本仓库的 CLI，在验证期间的实时铸造 | 铸造了 **3 个密钥**并 chat-200（`--count 3` → `--conc 2` 下 56 秒内 2 个；`--count 1` → 26 秒内 1 个）。第一批中的一个账户因测试池中两个不可达出口而丢失，并如实报告 |
| 未通过聊天检查的密钥 | 从不写入 `keys.txt` |

网关的应答，逐字如下（随附 CLI 铸造的第一个密钥，`mistral-tiny-latest`）：

```json
{"id":"cb51dff9b36c41a08d41c8c0533885da","created":1792380045,"model":"ministral-8b-2512","usage":{"prompt_tokens":9,"total_tokens":11,"completion_tokens":2,"service_tier":"standard"},"object":"chat.completion","choices":[{"index":0,"finish_reason":"stop","message":{"role":"assistant","tool_calls":null,"content":"ok"}}]}
```

## 🧭 工作原理

```
inbox (one Microsoft-family alias per account)                    a fresh alias per account
   |
   |- register: auth.mistral.ai /self-service/registration (Kratos)  csrf + email/password, session_token back
   |- verify:   mail link ?code=...&flow=... -> /self-service/verification
   |- key:      console.mistral.ai /api/billing/api-keys            mstrl_... returned once
   |- live proof: POST https://api.mistral.ai/v1/chat/completions    real content = the key is live
```

| 步骤 | 调用 | 备注 |
| --- | --- | --- |
| 别名 | `GET https://temp.tf/api/account?providers=outlook,hotmail&dot=0&plus=1` | 每个账户一个别名；该路由受 IP 限流（每个地址约 20 秒），因此链路会重试而非浪费尝试机会 |
| 注册 | `GET /self-service/registration/api` → `POST /self-service/registration?flow=…` | JSON 请求体 + 来自流程的 `csrf_token`；响应中已带有 `session_token` |
| 验证 | 来自收件箱的链接 → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` `{method:"code", code}` | 链接本身同时携带 `code` 和 `flow` |
| 会话 | 来自注册响应的 `session_token` | 当第一个会话仍新鲜时，Kratos 拒绝第二次密码登录，因此仅在 `401` 时才重新登录 |
| 工作区 | `GET console.mistral.ai/api/workspaces` | 第一个 `items[].uuid` |
| 密钥 | `POST console.mistral.ai/api/billing/api-keys` `{name, workspace, primitive_access_scope:"shared_only"}` | 明文 `mstrl_…` 仅返回一次 |
| 网关 | `POST api.mistral.ai/v1/chat/completions` | 写入 `keys.txt` 前需要实时 200；429 在 2.5 秒后重试一次，然后换下一个 id |

## ⚙️ CLI 选项

```bash
node src/cli.js [mode] [flags]
```

| 标志 | 默认值 | 含义 |
| --- | --- | --- |
| `--count N` | 10 | 要铸造的账户数（= 密钥数） |
| `--conc N` | 2 | 并发在途的账户数（最大 16）—— 每个账户固定一个出口 |
| `--model <id>` | `mistral-tiny-latest` | 固定的网关模型；回退顺序随之而定 |
| `--pool <file>` | `proxies.txt` | 代理列表（`MISTRAL_PROXIES` 环境变量也可用） |
| `--gap MS` | 800 | 同一 worker 内账户之间的暂停 |
| `--tries N` | 2 | 每个账户尝试的出口数 |
| `--timeout MS` | 45000 | 每个请求的超时 |
| `--mail-timeout MS` | 180000 | 一个账户等待验证链接的时长 |
| `--mail <list>` | `outlook,hotmail` | 用于别名的收件箱提供商 |
| `--verify-only` · `--screen` · `--probe` · `--collect` | — | 上述模式 |

失败的出口会为下一个账户轮换，池中的一行可以带有筛选备注（`http://host:port 1.2.3.4`）—— 加载器保留第一个 token。

## 🛰️ 在代理之后

每个请求都通过你池中的一个出口离开 —— 该工具从不从你自己的线路拨号 Mistral，并且**一个账户在其整个生命周期内都驻留在同一个出口上**（Kratos 将会话绑定到创建它时的 IP）。在运营者的集群上实测：一个 10 行的池让 **3 个出口**通过了 `auth.mistral.ai`，而每个完成的账户都保持在其起始的单一出口上（那两个因池中某行不可达而失去出口的账户在下一个出口上重试，并如实报告）。`--screen` 将幸存者写入 `proxies.live.txt`，以便下一次运行从已经应答过的出口开始。

## 📄 文件

| 路径 | 内容 |
| --- | --- |
| `keys.txt` | chat-200 密钥，每行一个 —— 已被 git 忽略 |
| `keys-ungated.txt` | 上次 `--verify-only` 扫描失败的密钥 —— 稍后重试 |
| `accounts.json` | 每个账户的别名 / 密钥 / 工作区 / 网关状态 / 出口 —— 已被 git 忽略 |
| `proxies.txt` | 你的出口列表 —— 已被 git 忽略 |
| `proxies.live.txt` | 通过 `--screen` 的出口 |

## 🔌 连接到 9Router

[9Router](https://9router.com) 是一个自托管、兼容 OpenAI 的路由器。一条命令即可将 `keys.txt` 变成一个带有可用组合的提供商节点：

```bash
node src/connect-9router.js
```

默认值：`--base http://localhost:20128`、`--password 123456`、`--name "Mistral"`、`--prefix mistral`、`--base-url https://api.mistral.ai/v1`。

运营者的面板将这些密钥作为原生 `mistral` 提供商连接（已注册 **111** 个），而一次路由调用会落在免费套餐所服务的任何模型上：`POST /v1/chat/completions mistral/codestral-latest` → **200**，而 `mistral/mistral-medium-latest` → **503** `[429] rate_limited` —— 套餐的上限，在一跳之外即可见。

## 🔑 一个密钥能给你什么

| | |
| --- | --- |
| 🏢 提供商 | **Mistral AI** —— [mistral.ai](https://mistral.ai) |
| 🎁 提供商给予什么 | 一个 **Experiment** api_plan 上的免费账户及一个 API 密钥 —— 无需银行卡、无需手机号、无需验证码 |
| 🔑 一个密钥能给你什么 | 一个限定于其自身账户的兼容 OpenAI 的密钥：免费套餐所服务的小 id（`mistral-tiny-latest`、`open-mistral-nemo`、`codestral-latest`、`ministral-*`），受套餐速率限制约束。配额存在于**账户**上，这正是此工具为每个密钥创建一个账户的原因 |
| 🌐 API 形态 | 兼容 OpenAI：`POST https://api.mistral.ai/v1/chat/completions` |
| 🔒 你的数据 | 仅联系 `auth.mistral.ai` / `console.mistral.ai` / `api.mistral.ai` 以及你配置的收件箱后端；密钥保留在你的机器上 |

## 🐞 问题反馈

如果 Mistral 更改其注册流程、验证邮件或免费套餐模型集，该工具会在该步骤停止并说明情况（`--probe` 会显示它所看到的流程字段、收件箱链路和网关顺序）。请**[提交 issue](../../issues)**，附上你运行的命令和确切的输出；欢迎 PR。

## 📄 许可证

MIT © 2026 —— 见 [LICENSE](LICENSE)。

<div align="center">

**[MIT](LICENSE)** © 2026 mistral-bulk-apikey contributors

</div>