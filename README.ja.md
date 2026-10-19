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

**Mistral AI アカウントを自動生成された API キーとともに一括作成 — OpenAI 互換の推論 + 9Router コネクタ。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-45%20served-412991?style=for-the-badge)](https://docs.mistral.ai/getting-started/models/models_overview/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 クイックスタート](#-quick-start) · [🎁 無料枠](#-free-tier--how-much-you-get) · [🤖 モデル](#-models--all-45-of-them) · [🧪 API の使い方](#-how-to-use-the-api) · [✅ 検証済み](#-verified-working--every-key-is-tested) · [🧭 仕組み](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ オプション](#️-cli-options) · [🛰️ プロキシ](#️-behind-a-proxy) · [🐞 問題](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ これが存在する理由

Mistral の入口は **Ory Kratos** のものだ。`POST /self-service/registration` はメールアドレス、パスワード、名前を受け取るだけで、それ以外は何も要らない — **カードも、電話も、キャプチャも不要** — そして受信トレイのステップはコード*と*フロー ID を運ぶリンクなので、レール全体が平文 HTTP で、アカウントごとに 1 つのメールボックスエイリアスを使って動く。セッションが存在すれば、コンソール自身の課金ルートがキーを発行する: `POST /api/billing/api-keys {name, workspace, primitive_access_scope:"shared_only"}` → `mstrl_…` (45 文字)。

スケールする単位は **1 アカウント = 1 キー** だ。運用者のフリートで測定 (2026-10-19): レールは 2 ワーカーで 8 件ずつ 12 チャンクに分けて **111 キー** を **~14.6 秒/キー** で押し出し、2 アカウントを失った (180 秒以内に配信されなかった受信トレイが 1 つ、`login 400` が 1 つ) — CAPTCHA の壁も、レート制限の壁もなかった。**111** すべてが `mistral-tiny-latest` **および** `codestral-latest` で chat-200 を返した — **222/222** のライブコール。このリポジトリが検証されている間に、それ自身の CLI が同じ形のキーを **さらに 3 つ** 鋳造した (`--conc 2` で 56 秒に 2 つ、26 秒に 1 つ)、それぞれが書き込まれる前に chat-200 だった。増幅されているのは無料の **Experiment** api_plan であり、だからこそより大きな ID はゲートに入らない (下記参照)。

## 🎁 無料枠 — どれだけ得られるか

**すべての新規アカウントが無料キーを取得する** — カードも、キャプチャも、電話も不要。

| 項目 | 値 |
| --- | --- |
| カード必須 | **いいえ** |
| 電話 | **要求されない** — コンソールには `/api/users/verify-phone/send-code` ルートが確かに存在するが、新規の無料アカウントでは `400 can't be verified` を返し、チャットゲートがそれを必要とすることはない |
| キャプチャ / Turnstile | ここで使われる Kratos API フローでは **なし** |
| メールボックス | **必須** — アカウントごとに 1 つのエイリアス。`temp.tf` の outlook/hotmail プラスエイリアスは Mistral が受け入れるドメインで届く |
| プラン | 無料の **Experiment** api_plan |
| 登録クレジット | 使うものは何もない — 無料プラン自体がゲート内の ID を提供する |
| モデルの上限 | より大きな ID は完全に有効なキーでも `429 rate_limited` を返すため、ゲートには含まれない |
| スケールする単位 | **1 アカウント = 1 キー** → `--count N` は「N 個の無料アカウント」 |

> 💡 無料枠は Mistral AI によって設定され、変更される可能性がある。最新の数値は [mistral.ai](https://mistral.ai) で確認を — そしてツール自身のゲートに判断させよう:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 モデル — その 45 すべて

1 つの無料キーは **45 のモデル ID** を見ることができる (`GET /v1/models`、2026-10-19 測定) — チャット、埋め込み、OCR、音声が同じリストにある。チャット可能なすべての ID に実際の補完を要求すると (24 ID、1 回のスイープ、同じキー)、そのリストは 3 つに分かれる:

* **9 の ID が 200 を返す** — `codestral-2508`、`codestral-latest`、`mistral-code-latest`、`ministral-14b-2512`、`ministral-14b-latest`、`ministral-3b-2512`、`ministral-3b-latest`、`ministral-8b-2512`、`ministral-8b-latest`;
* **13 の ID が 429 `rate_limited` を返す** — `mistral-medium*`、`mistral-small*`、`magistral-*`、`mistral-vibe-cli-*` の半分すべて;
* **2 の ID が 403 を返す** — `labs-leanstral-1-5` と `labs-leanstral-1-5-1`。

ここにはキーが実際に応答したことのある ID のみを掲載している:

| モデル ID | ✓ | 備考 |
| --- | --- | --- |
| `mistral-tiny-latest` | ✓ | ゲートの最初の停車点。`ministral-8b-2512` として応答する — 新しいカタログリストではもはや名前が挙げられていないレガシーエイリアス |
| `open-mistral-nemo` | ✓ | 45 ID のリストにはなく、それでも提供されている |
| `codestral-latest` | ✓ | コードモデル。2 番目のピンで、上記の 222 コールスイープに使われた |

ゲートはこれら 3 つを順に辿り、最初の 200 で停止するので、キーはアカウントが実際にそのうちの 1 つを提供する場合にのみ保持される。429 は死んだキーではなくペースのシグナルとして扱われる (2.5 秒後に 1 回リトライ)。

## 🧪 API の使い方

エンドポイントは **`/v1`** 配下の OpenAI 互換だ:

```bash
curl https://api.mistral.ai/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"codestral-latest","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

無料プランのキーは小さな ID で応答し、`mistral-medium*` / `mistral-small*` には `429 rate_limited` を返す — それはプランであり、キーではない。

## 🛠 クイックスタート

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

`keys.txt` はライブのチャット補完がキーを証明した**後にのみ**書き込まれる。

| モード | 動作 |
| --- | --- |
| `run` (デフォルト) | `--count` までアカウントを鋳造し、すべてのキーをライブチャットでゲートする |
| `--verify-only` | `keys.txt` を再スイープし、失敗したものを `keys-ungated.txt` に移動する |
| `--screen` | プロキシリストを Mistral に対してテスト → `proxies.live.txt` |
| `--probe` | 環境チェック: 出口、受信トレイレール、登録フローのフィールド、ゲート順序、既存のキー |
| `--collect` | `accounts.json` から `keys.txt` を再構築する |

### 🖱️ ランチャー

ランチャーはプロキシリスト、アカウント数、ゲートモデルを尋ね、それらを `launcher.config.json` に記憶し、正しいフラグで CLI を実行する。また出口リストをスクリーニングし、`keys.txt` をローカルの 9Router に登録することもできる。

## ✅ 動作検証済み — すべてのキーがテストされる

| チェック | 結果 |
| --- | --- |
| `GET /self-service/registration/api` | **200** — フロー ID + `csrf_token`; 確認されたフィールド: `traits.email`、`password`、`traits.name.first`、`traits.name.last`、`method` |
| `POST /self-service/registration?flow=…` | **200** — アカウント作成、ボディに `session_token` |
| 受信トレイのリンク `?code=…&flow=…` → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` | **200** — 検証済み (`410` = すでに検証済み、これも受け入れられる) |
| `GET /api/workspaces` | **200** — ワークスペース uuid |
| `POST /api/billing/api-keys` | **200** — `mstrl_…`、45 文字、カード不要 |
| `POST https://api.mistral.ai/v1/chat/completions` — 書き込まれる前の**すべての**キーに対して実行 | 実際のコンテンツで **200** |
| フリート全体のスイープ | **111/111** キーが `mistral-tiny-latest` **および** `codestral-latest` で chat-200 (222/222 コール、2026-10-19) |
| このリポジトリの CLI、検証中のライブ鋳造 | **3 キー** を鋳造し chat-200 (`--count 3` → `--conc 2` で 56 秒に 2 つ; `--count 1` → 26 秒に 1 つ)。最初のバッチの 1 アカウントはテストプール内の到達不能な 2 つの出口で失われ、そのように報告された |
| チャットチェックに失敗したキー | `keys.txt` に決して書き込まれない |

ゲートの応答、逐語 (出荷された CLI が鋳造した最初のキー、`mistral-tiny-latest`):

```json
{"id":"cb51dff9b36c41a08d41c8c0533885da","created":1792380045,"model":"ministral-8b-2512","usage":{"prompt_tokens":9,"total_tokens":11,"completion_tokens":2,"service_tier":"standard"},"object":"chat.completion","choices":[{"index":0,"finish_reason":"stop","message":{"role":"assistant","tool_calls":null,"content":"ok"}}]}
```

## 🧭 仕組み

```
inbox (one Microsoft-family alias per account)                    a fresh alias per account
   |
   |- register: auth.mistral.ai /self-service/registration (Kratos)  csrf + email/password, session_token back
   |- verify:   mail link ?code=...&flow=... -> /self-service/verification
   |- key:      console.mistral.ai /api/billing/api-keys            mstrl_... returned once
   |- live proof: POST https://api.mistral.ai/v1/chat/completions    real content = the key is live
```

| ステップ | 呼び出し | 備考 |
| --- | --- | --- |
| エイリアス | `GET https://temp.tf/api/account?providers=outlook,hotmail&dot=0&plus=1` | アカウントごとに 1 つのエイリアス; ルートは IP スロットルされる (アドレスあたり ~20 秒) ので、レールは試行を無駄にするのではなくリトライする |
| 登録 | `GET /self-service/registration/api` → `POST /self-service/registration?flow=…` | JSON ボディ + フローからの `csrf_token`; レスポンスはすでに `session_token` を運んでいる |
| 検証 | 受信トレイからのリンク → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` `{method:"code", code}` | リンク自体が `code` と `flow` の両方を運ぶ |
| セッション | 登録レスポンスからの `session_token` | Kratos は最初のセッションが新しい間は 2 回目のパスワードログインを拒否するので、再ログインは `401` のときのみ発生する |
| ワークスペース | `GET console.mistral.ai/api/workspaces` | 最初の `items[].uuid` |
| キー | `POST console.mistral.ai/api/billing/api-keys` `{name, workspace, primitive_access_scope:"shared_only"}` | 平文の `mstrl_…` が一度だけ返される |
| ゲート | `POST api.mistral.ai/v1/chat/completions` | `keys.txt` の前にライブ 200 が必要; 429 は 2.5 秒後に 1 回リトライされ、その後次の ID へ |

## ⚙️ CLI オプション

```bash
node src/cli.js [mode] [flags]
```

| フラグ | デフォルト | 意味 |
| --- | --- | --- |
| `--count N` | 10 | 鋳造するアカウント数 (= キー数) |
| `--conc N` | 2 | 同時進行のアカウント数 (最大 16) — アカウントごとに 1 つの出口が固定される |
| `--model <id>` | `mistral-tiny-latest` | 固定されたゲートモデル; フォールバック順序はこれに従う |
| `--pool <file>` | `proxies.txt` | プロキシリスト (`MISTRAL_PROXIES` 環境変数も可) |
| `--gap MS` | 800 | 1 つのワーカー内のアカウント間のポーズ |
| `--tries N` | 2 | アカウントごとに試す出口数 |
| `--timeout MS` | 45000 | リクエストごとのタイムアウト |
| `--mail-timeout MS` | 180000 | 1 つのアカウントが検証リンクを待つ時間 |
| `--mail <list>` | `outlook,hotmail` | エイリアスに使う受信トレイプロバイダ |
| `--verify-only` · `--screen` · `--probe` · `--collect` | — | 上記のモード |

失敗した出口は次のアカウントのためにローテーションされ、プールの行はスクリーニング済みの注記 (`http://host:port 1.2.3.4`) を運ぶことがある — ローダーは最初のトークンを保持する。

## 🛰️ プロキシの背後で

すべてのリクエストはあなたのプールからの出口を通って出ていく — ツールがあなた自身の回線から Mistral にダイヤルすることは決してなく、**1 つのアカウントはその生涯を通じて 1 つの出口に住む** (Kratos はセッションを作成された IP に束縛する)。運用者のフリートで測定: 10 行のプールが **3 つの出口** を `auth.mistral.ai` まで通し、完了したすべてのアカウントは開始した単一の出口を守った (到達不能なプール行に出口を失った 2 つは次のものでリトライされ、そのように報告された)。`--screen` は生存者を `proxies.live.txt` に書き出すので、次の実行はすでに応答した出口から始まる。

## 📄 ファイル

| パス | 内容 |
| --- | --- |
| `keys.txt` | chat-200 キー、1 行に 1 つ — git 無視 |
| `keys-ungated.txt` | 最後の `--verify-only` スイープに失敗したキー — 後でリトライ |
| `accounts.json` | アカウントごとのエイリアス / キー / ワークスペース / ゲートステータス / 出口 — git 無視 |
| `proxies.txt` | あなたの出口リスト — git 無視 |
| `proxies.live.txt` | `--screen` を通過した出口 |

## 🔌 9Router に接続する

[9Router](https://9router.com) はセルフホストの OpenAI 互換ルーターだ。1 つのコマンドで `keys.txt` を動作するコンボを持つプロバイダノードに変える:

```bash
node src/connect-9router.js
```

デフォルト: `--base http://localhost:20128`、`--password 123456`、`--name "Mistral"`、`--prefix mistral`、`--base-url https://api.mistral.ai/v1`。

運用者のパネルは同じキーをネイティブの `mistral` プロバイダ接続として運び (**111** 登録済み)、ルーティングされた呼び出しは無料プランが提供するものに着地する: `POST /v1/chat/completions mistral/codestral-latest` → **200**、一方 `mistral/mistral-medium-latest` → **503** `[429] rate_limited` — プランの上限が、1 ホップ先に見える。

## 🔑 1 つのキーで得られるもの

| | |
| --- | --- |
| 🏢 プロバイダ | **Mistral AI** — [mistral.ai](https://mistral.ai) |
| 🎁 プロバイダが与えるもの | **Experiment** api_plan 上の無料アカウントと API キー — カードも、電話も、キャプチャも不要 |
| 🔑 1 つのキーで得られるもの | 自身のアカウントにスコープされた OpenAI 互換キー: 無料プランが提供する小さな ID (`mistral-tiny-latest`、`open-mistral-nemo`、`codestral-latest`、`ministral-*`)、プランのレート制限で。クォータは **アカウント** に住んでおり、だからこそこのツールはキーごとに 1 つのアカウントを作成する |
| 🌐 API の形 | OpenAI 互換: `POST https://api.mistral.ai/v1/chat/completions` |
| 🔒 あなたのデータ | 接触されるのは `auth.mistral.ai` / `console.mistral.ai` / `api.mistral.ai` と、あなたが設定した受信トレイバックエンドのみ; キーはあなたのマシンに留まる |

## 🐞 問題

Mistral が登録フロー、検証メール、または無料プランのモデルセットを変更した場合、ツールはそのステップで停止し、そう告げる (`--probe` はそれが見るフローフィールド、受信トレイレール、ゲート順序を表示する)。実行したコマンドと正確な出力を添えて **[issue を開いてください](../../issues)**; PR は歓迎する。

## 📄 ライセンス

MIT © 2026 — [LICENSE](LICENSE) を参照。

<div align="center">

**[MIT](LICENSE)** © 2026 mistral-bulk-apikey contributors

</div>