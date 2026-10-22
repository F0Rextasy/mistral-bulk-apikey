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

**자동 생성된 API 키로 Mistral AI 계정을 대량 생성 — OpenAI 호환 추론 + 9Router 커넥터.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-45%20served-412991?style=for-the-badge)](https://docs.mistral.ai/getting-started/models/models_overview/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 빠른 시작](#-quick-start) · [🎁 무료 티어](#-free-tier--how-much-you-get) · [🤖 모델](#-models--all-45-of-them) · [🧪 API 사용하기](#-how-to-use-the-api) · [✅ 검증됨](#-verified-working--every-key-is-tested) · [🧭 작동 방식](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ 옵션](#️-cli-options) · [🛰️ 프록시](#️-behind-a-proxy) · [🐞 이슈](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ 왜 이게 필요한가

Mistral의 문은 **Ory Kratos** 방식입니다: `POST /self-service/registration`은 이메일, 비밀번호, 이름만 받고 그 외에는 아무것도 받지 않습니다 — **카드도, 전화도, 캡차도 없습니다** — 그리고 받은편지함 단계는 코드와 flow id를 함께 담은 링크이므로, 전체 레일이 계정당 하나의 메일함 별칭으로 평범한 HTTP 위에서 돌아갑니다. 세션이 생기면 콘솔 자체의 결제 라우트가 키를 발급합니다: `POST /api/billing/api-keys {name, workspace, primitive_access_scope:"shared_only"}` → `mstrl_…` (45자).

확장되는 단위는 **하나의 계정 = 하나의 키**입니다. 운영자의 플릿에서 측정한 결과(2026-10-19): 레일은 2개의 워커로 8개씩 12개의 청크로 **111개의 키**를 **키당 약 14.6초**로 밀어냈고, 2개의 계정을 잃었습니다(하나는 180초 안에 배달되지 않은 받은편지함, 하나는 `login 400`) — CAPTCHA 장벽도, 속도 제한 장벽도 없었습니다. **111개** 모두 `mistral-tiny-latest` **와** `codestral-latest`에서 chat-200을 응답했습니다 — **222/222** 라이브 호출. 이 저장소가 검증되는 동안, 자체 CLI가 같은 형태의 키를 **3개 더** 발급했습니다(`--conc 2`에서 56초에 2개, 26초에 1개), 각각 기록되기 전에 chat-200을 응답했습니다. 증식되는 것은 무료 **Experiment** api_plan이며, 이것이 더 큰 id들이 게이트에서 제외되는 이유입니다(아래 참조).

## 🎁 무료 티어 — 얼마나 받을 수 있나

**모든 새 계정은 무료 키를 받습니다** — 카드도, 캡차도, 전화도 없습니다.

| 항목 | 값 |
| --- | --- |
| 카드 필요 | **아니오** |
| 전화 | **요구되지 않음** — 콘솔은 실제로 `/api/users/verify-phone/send-code` 라우트를 제공하지만, 새 무료 계정에서는 `400 can't be verified`를 응답하며 채팅 게이트는 결코 이것을 필요로 하지 않습니다 |
| 캡차 / Turnstile | 여기서 사용되는 Kratos API 흐름에서는 **없음** |
| 메일함 | **필수** — 계정당 하나의 별칭; `temp.tf` outlook/hotmail 플러스 별칭은 Mistral이 허용하는 도메인으로 도착합니다 |
| 플랜 | 무료 **Experiment** api_plan |
| 가입 크레딧 | 쓸 것이 없음 — 무료 플랜 자체가 게이트의 id들을 제공합니다 |
| 모델 상한 | 더 큰 id들은 완벽하게 좋은 키로도 `429 rate_limited`를 응답하므로 게이트에 포함되지 않습니다 |
| 확장되는 단위 | **하나의 계정 = 하나의 키** → `--count N`은 "N개의 무료 계정" |

> 💡 무료 티어는 Mistral AI가 설정하며 변경될 수 있습니다. 실시간 수치는 [mistral.ai](https://mistral.ai)에서 확인하세요 — 그리고 도구 자체의 게이트가 결정하게 하세요:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 모델 — 45개 전부

하나의 무료 키는 **45개의 모델 id**를 봅니다(`GET /v1/models`, 2026-10-19 측정) — 채팅, 임베드, OCR, 오디오가 같은 목록에 있습니다. 채팅이 가능한 모든 id에 실제 완성을 요청하면(24개 id, 한 번의 스윕, 같은 키) 그 목록이 셋으로 나뉩니다:

* **9개 id가 200을 응답** — `codestral-2508`, `codestral-latest`, `mistral-code-latest`, `ministral-14b-2512`, `ministral-14b-latest`, `ministral-3b-2512`, `ministral-3b-latest`, `ministral-8b-2512`, `ministral-8b-latest`;
* **13개 id가 429 `rate_limited`를 응답** — `mistral-medium*`, `mistral-small*`, `magistral-*`, `mistral-vibe-cli-*` 절반 전체;
* **2개 id가 403을 응답** — `labs-leanstral-1-5`와 `labs-leanstral-1-5-1`.

여기에는 키가 실제로 응답한 적이 있는 id만 나열됩니다:

| 모델 ID | ✓ | 비고 |
| --- | --- | --- |
| `mistral-tiny-latest` | ✓ | 게이트의 첫 번째 정류장; `ministral-8b-2512`로 응답 — 더 새로운 카탈로그 목록이 더 이상 이름을 붙이지 않는 레거시 별칭 |
| `open-mistral-nemo` | ✓ | 45개 id 목록에 없지만 여전히 제공됨 |
| `codestral-latest` | ✓ | 코드 모델; 두 번째 핀, 위의 222회 호출 스윕에 사용됨 |

게이트는 이 셋을 순서대로 순회하며 첫 200에서 멈추므로, 계정이 실제로 이들 중 하나를 제공할 때만 키가 보관됩니다. 429는 죽은 키가 아니라 속도 신호로 취급됩니다(2.5초 후 한 번 재시도).

## 🧪 API 사용 방법

엔드포인트는 **`/v1`** 아래에서 OpenAI 호환입니다:

```bash
curl https://api.mistral.ai/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"codestral-latest","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

무료 플랜 키는 작은 id들에서 응답하고 `mistral-medium*` / `mistral-small*`에 대해 `429 rate_limited`를 반환합니다 — 그것은 키가 아니라 플랜입니다.

## 🛠 빠른 시작

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

`keys.txt`는 라이브 채팅 완성이 키를 증명한 **후에만** 기록됩니다.

| 모드 | 하는 일 |
| --- | --- |
| `run` (기본) | `--count`까지 계정을 발급하고, 모든 키를 라이브 채팅으로 게이트 |
| `--verify-only` | `keys.txt`를 다시 스윕하고, 실패한 것은 `keys-ungated.txt`로 이동 |
| `--screen` | 프록시 목록을 Mistral에 대해 테스트 → `proxies.live.txt` |
| `--probe` | 환경 점검: 종료, 받은편지함 레일, 등록 흐름 필드, 게이트 순서, 기존 키 |
| `--collect` | `accounts.json`에서 `keys.txt`를 재구성 |

### 🖱️ 런처

런처는 프록시 목록, 계정 수, 게이트 모델을 묻고, 이를 `launcher.config.json`에 기억한 뒤 올바른 플래그로 CLI를 실행합니다. 또한 종료 목록을 스크리닝하고 `keys.txt`를 로컬 9Router에 등록할 수 있습니다.

## ✅ 검증됨 — 모든 키가 테스트됨

| 점검 | 결과 |
| --- | --- |
| `GET /self-service/registration/api` | **200** — flow id + `csrf_token`; 확인된 필드: `traits.email`, `password`, `traits.name.first`, `traits.name.last`, `method` |
| `POST /self-service/registration?flow=…` | **200** — 계정 생성됨, 본문에 `session_token` |
| 받은편지함 링크 `?code=…&flow=…` → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` | **200** — 검증됨(`410` = 이미 검증됨, 역시 허용됨) |
| `GET /api/workspaces` | **200** — 워크스페이스 uuid |
| `POST /api/billing/api-keys` | **200** — `mstrl_…`, 45자, 카드 없음 |
| `POST https://api.mistral.ai/v1/chat/completions` — 기록되기 전 **모든** 키에 대해 실행 | 실제 콘텐츠와 함께 **200** |
| 전체 플릿 스윕 | **111/111** 키가 `mistral-tiny-latest` **와** `codestral-latest`에서 chat-200 (222/222 호출, 2026-10-19) |
| 이 저장소의 CLI, 검증 중 라이브 발급 | **3개 키** 발급 및 chat-200 (`--count 3` → `--conc 2`에서 56초에 2개; `--count 1` → 26초에 1개). 첫 배치의 한 계정은 테스트 풀의 도달 불가능한 두 종료로 인해 잃었고 그대로 보고됨 |
| 채팅 점검에 실패한 키 | `keys.txt`에 결코 기록되지 않음 |

게이트의 응답, 그대로 (배포된 CLI가 발급한 첫 키, `mistral-tiny-latest`):

```json
{"id":"cb51dff9b36c41a08d41c8c0533885da","created":1792380045,"model":"ministral-8b-2512","usage":{"prompt_tokens":9,"total_tokens":11,"completion_tokens":2,"service_tier":"standard"},"object":"chat.completion","choices":[{"index":0,"finish_reason":"stop","message":{"role":"assistant","tool_calls":null,"content":"ok"}}]}
```

## 🧭 작동 방식

```
inbox (one Microsoft-family alias per account)                    a fresh alias per account
   |
   |- register: auth.mistral.ai /self-service/registration (Kratos)  csrf + email/password, session_token back
   |- verify:   mail link ?code=...&flow=... -> /self-service/verification
   |- key:      console.mistral.ai /api/billing/api-keys            mstrl_... returned once
   |- live proof: POST https://api.mistral.ai/v1/chat/completions    real content = the key is live
```

| 단계 | 호출 | 비고 |
| --- | --- | --- |
| 별칭 | `GET https://temp.tf/api/account?providers=outlook,hotmail&dot=0&plus=1` | 계정당 하나의 별칭; 라우트는 IP 스로틀됨(주소당 약 20초)이므로 레일은 시도를 소진하기보다 재시도함 |
| 등록 | `GET /self-service/registration/api` → `POST /self-service/registration?flow=…` | JSON 본문 + 흐름의 `csrf_token`; 응답이 이미 `session_token`을 담고 있음 |
| 검증 | 받은편지함의 링크 → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` `{method:"code", code}` | 링크 자체가 `code`와 `flow`를 모두 담고 있음 |
| 세션 | 등록 응답의 `session_token` | Kratos는 첫 세션이 신선한 동안 두 번째 비밀번호 로그인을 거부하므로, 재로그인은 `401`에서만 발생함 |
| 워크스페이스 | `GET console.mistral.ai/api/workspaces` | 첫 번째 `items[].uuid` |
| 키 | `POST console.mistral.ai/api/billing/api-keys` `{name, workspace, primitive_access_scope:"shared_only"}` | 평문 `mstrl_…`이 한 번 반환됨 |
| 게이트 | `POST api.mistral.ai/v1/chat/completions` | `keys.txt` 전에 라이브 200 필요; 429는 2.5초 후 한 번 재시도, 그다음 다음 id |

## ⚙️ CLI 옵션

```bash
node src/cli.js [mode] [flags]
```

| 플래그 | 기본값 | 의미 |
| --- | --- | --- |
| `--count N` | 10 | 발급할 계정 (= 키) 수 |
| `--conc N` | 2 | 동시 진행 계정 (최대 16) — 계정당 하나의 종료가 고정됨 |
| `--model <id>` | `mistral-tiny-latest` | 고정된 게이트 모델; 폴백 순서가 이를 따름 |
| `--pool <file>` | `proxies.txt` | 프록시 목록 (`MISTRAL_PROXIES` 환경 변수도 작동) |
| `--gap MS` | 800 | 한 워커 내 계정 사이의 일시정지 |
| `--tries N` | 2 | 계정당 시도할 종료 |
| `--timeout MS` | 45000 | 요청당 타임아웃 |
| `--mail-timeout MS` | 180000 | 한 계정이 검증 링크를 기다리는 시간 |
| `--mail <list>` | `outlook,hotmail` | 별칭에 사용되는 받은편지함 제공자 |
| `--verify-only` · `--screen` · `--probe` · `--collect` | — | 위의 모드들 |

실패한 종료는 다음 계정을 위해 교체되며, 풀 라인은 스크리닝된 메모(`http://host:port 1.2.3.4`)를 담을 수 있습니다 — 로더는 첫 번째 토큰을 유지합니다.

## 🛰️ 프록시 뒤에서

모든 요청은 풀의 종료를 통해 나갑니다 — 도구는 결코 자신의 회선에서 Mistral에 접속하지 않으며, **하나의 계정은 전체 수명 동안 하나의 종료에 삽니다**(Kratos는 세션을 생성된 IP에 묶습니다). 운영자의 플릿에서 측정: 10줄 풀이 **3개의 종료**를 `auth.mistral.ai`로 통과시켰고, 완료된 모든 계정은 시작한 단일 종료를 유지했습니다(도달 불가능한 풀 라인으로 종료를 잃은 두 개는 다음 것으로 재시도되었고 그대로 보고됨). `--screen`은 생존자를 `proxies.live.txt`에 기록하므로 다음 실행은 이미 응답한 종료에서 시작합니다.

## 📄 파일

| 경로 | 내용 |
| --- | --- |
| `keys.txt` | chat-200 키, 한 줄에 하나 — git-ignored |
| `keys-ungated.txt` | 마지막 `--verify-only` 스윕에 실패한 키 — 나중에 재시도 |
| `accounts.json` | 계정당 별칭 / 키 / 워크스페이스 / 게이트 상태 / 종료 — git-ignored |
| `proxies.txt` | 종료 목록 — git-ignored |
| `proxies.live.txt` | `--screen`을 통과한 종료 |

## 🔌 9Router에 연결

[9Router](https://9router.com)는 자체 호스팅, OpenAI 호환 라우터입니다. 한 명령으로 `keys.txt`를 작동하는 콤보가 있는 제공자 노드로 바꿉니다:

```bash
node src/connect-9router.js
```

기본값: `--base http://localhost:20128`, `--password 123456`, `--name "Mistral"`, `--prefix mistral`, `--base-url https://api.mistral.ai/v1`.

운영자의 패널은 같은 키를 네이티브 `mistral` 제공자 연결로 담고 있으며(**111**개 등록됨), 라우팅된 호출은 무료 플랜이 제공하는 것에 도달합니다: `POST /v1/chat/completions mistral/codestral-latest` → **200**, 반면 `mistral/mistral-medium-latest` → **503** `[429] rate_limited` — 플랜의 상한, 한 홉 떨어져서 보입니다.

## 🔌 OmniRoute에 연결

[OmniRoute](https://omniroute.online)는 자체 호스팅, OpenAI 호환 라우터입니다. 한 명령으로 `keys.txt`를 작동하는 콤보가 있는 제공자 노드로 바꿉니다:

```bash
node src/connect-omniroute.js
```

기본값: `--base http://localhost:20128`, `--password 123456`, `--name "Mistral"`, `--prefix mistral`, `--base-url https://api.mistral.ai/v1`.

운영자의 패널은 같은 키를 네이티브 `mistral` 제공자 연결로 담고 있으며(**111**개 등록됨), 라우팅된 호출은 무료 플랜이 제공하는 것에 도달합니다: `POST /v1/chat/completions mistral/codestral-latest` → **200**, 반면 `mistral/mistral-medium-latest` → **503** `[429] rate_limited` — 플랜의 상한, 한 홉 떨어져서 보입니다.
## 🔑 하나의 키로 얻는 것

| | |
| --- | --- |
| 🏢 제공자 | **Mistral AI** — [mistral.ai](https://mistral.ai) |
| 🎁 제공자가 주는 것 | **Experiment** api_plan의 무료 계정과 API 키 — 카드도, 전화도, 캡차도 없음 |
| 🔑 하나의 키로 얻는 것 | 자체 계정에 범위가 지정된 OpenAI 호환 키: 무료 플랜이 제공하는 작은 id들(`mistral-tiny-latest`, `open-mistral-nemo`, `codestral-latest`, `ministral-*`), 플랜의 속도 제한에서. 할당량은 **계정**에 있으므로, 이 도구가 키당 하나의 계정을 생성하는 것입니다 |
| 🌐 API 형태 | OpenAI 호환: `POST https://api.mistral.ai/v1/chat/completions` |
| 🔒 데이터 | `auth.mistral.ai` / `console.mistral.ai` / `api.mistral.ai`와 구성한 받은편지함 백엔드만 접촉됩니다; 키는 당신의 머신에 남습니다 |

## 🐞 이슈

Mistral이 등록 흐름, 검증 메일 또는 무료 플랜 모델 세트를 변경하면, 도구는 그 단계에서 멈추고 그렇게 알립니다(`--probe`는 그것이 보는 흐름 필드, 받은편지함 레일, 게이트 순서를 보여줍니다). 실행한 명령과 정확한 출력을 담아 **[이슈를 열어주세요](../../issues)**; PR을 환영합니다.

## 📄 라이선스

MIT © 2026 — [LICENSE](LICENSE) 참조.

<div align="center">

**[MIT](LICENSE)** © 2026 mistral-bulk-apikey contributors

</div>