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

**Массовое создание аккаунтов Mistral AI с автоматически сгенерированными API-ключами — инференс, совместимый с OpenAI, + коннектор 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-45%20served-412991?style=for-the-badge)](https://docs.mistral.ai/getting-started/models/models_overview/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Быстрый старт](#-quick-start) · [🎁 Бесплатный тариф](#-free-tier--how-much-you-get) · [🤖 Модели](#-models--all-45-of-them) · [🧪 Использование API](#-how-to-use-the-api) · [✅ Проверено](#-verified-working--every-key-is-tested) · [🧭 Как это работает](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Опции](#️-cli-options) · [🛰️ Прокси](#️-behind-a-proxy) · [🐞 Проблемы](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Зачем это нужно

Дверь Mistral — это **Ory Kratos**: `POST /self-service/registration` принимает e-mail, пароль и имя, и ничего больше — **ни карты, ни телефона, ни капчи** — а шаг с почтовым ящиком представляет собой ссылку, которая несёт в себе код *и* идентификатор потока, так что весь путь проходит по обычному HTTP с одним почтовым псевдонимом на аккаунт. Как только сессия существует, собственный биллинговый маршрут консоли выдаёт ключ: `POST /api/billing/api-keys {name, workspace, primitive_access_scope:"shared_only"}` → `mstrl_…` (45 символов).

Единица масштабирования — **один аккаунт = один ключ**. По замерам на парке оператора (2026-10-19): конвейер выдал **111 ключей** за 12 порций по 8 при **~14,6 с/ключ** с 2 воркерами, потеряв 2 аккаунта (один ящик, который так и не доставил письмо за 180 с, и один `login 400`) — ни стены CAPTCHA, ни стены rate-limit. Все **111** ответили chat-200 на `mistral-tiny-latest` **и** на `codestral-latest` — **222/222** живых вызова. Пока этот репозиторий проверялся, его собственный CLI выпустил **ещё 3** ключа той же формы (2 при `--conc 2` за 56 с, 1 за 26 с), каждый — chat-200 до того, как был записан. Умножается бесплатный api_plan **Experiment**, поэтому более крупные id остаются за воротами (см. ниже).

## 🎁 Бесплатный тариф — сколько вы получаете

**Каждый новый аккаунт получает бесплатный ключ** — без карты, без капчи, без телефона.

| Что | Значение |
| --- | --- |
| Требуется карта | **Нет** |
| Телефон | **не запрашивается** — в консоли действительно есть маршрут `/api/users/verify-phone/send-code`, но на свежем бесплатном аккаунте он отвечает `400 can't be verified`, и ворота чата его никогда не требуют |
| Captcha / Turnstile | **нет** на используемом здесь потоке Kratos API |
| Почтовый ящик | **обязателен** — один псевдоним на аккаунт; plus-псевдоним outlook/hotmail на `temp.tf` приходит на домен, который Mistral принимает |
| Тариф | бесплатный api_plan **Experiment** |
| Кредит при регистрации | тратить нечего — сам бесплатный тариф обслуживает id в воротах |
| Потолок моделей | более крупные id отвечают `429 rate_limited` даже с совершенно исправным ключом, поэтому они не в воротах |
| Единица масштабирования | **один аккаунт = один ключ** → `--count N` означает «N бесплатных аккаунтов» |

> 💡 Бесплатный тариф устанавливается Mistral AI и может измениться. Проверяйте актуальные цифры на [mistral.ai](https://mistral.ai) — и пусть решают собственные ворота инструмента:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Модели — все 45

Один бесплатный ключ видит **45 id моделей** (`GET /v1/models`, замер 2026-10-19) — чат, embed, OCR и аудио в одном списке. Запрос реального завершения у каждого id, поддерживающего чат (24 id, один проход, один и тот же ключ), делит этот список на три части:

* **9 id отвечают 200** — `codestral-2508`, `codestral-latest`, `mistral-code-latest`, `ministral-14b-2512`, `ministral-14b-latest`, `ministral-3b-2512`, `ministral-3b-latest`, `ministral-8b-2512`, `ministral-8b-latest`;
* **13 id отвечают 429 `rate_limited`** — вся половина `mistral-medium*`, `mistral-small*`, `magistral-*` и `mistral-vibe-cli-*`;
* **2 id отвечают 403** — `labs-leanstral-1-5` и `labs-leanstral-1-5-1`.

Здесь перечислены только те id, на которых ключ действительно отвечал:

| Model ID | ✓ | Примечания |
| --- | --- | --- |
| `mistral-tiny-latest` | ✓ | первая остановка ворот; отвечает как `ministral-8b-2512` — устаревший псевдоним, который новый список каталога больше не называет |
| `open-mistral-nemo` | ✓ | также отсутствует в списке из 45 id и всё ещё обслуживается |
| `codestral-latest` | ✓ | кодовая модель; второй пин, использовалась для прохода из 222 вызовов выше |

Ворота проходят эти три по порядку и останавливаются на первом 200, поэтому ключ сохраняется только тогда, когда аккаунт действительно обслуживает один из них. 429 трактуется как сигнал темпа (одна повторная попытка через 2,5 с), а не как мёртвый ключ.

## 🧪 Как использовать API

Эндпоинт совместим с OpenAI под **`/v1`**:

```bash
curl https://api.mistral.ai/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"codestral-latest","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

Ключ бесплатного тарифа отвечает на малых id и возвращает `429 rate_limited` для `mistral-medium*` / `mistral-small*` — это тариф, а не ключ.

## 🛠 Быстрый старт

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

`keys.txt` записывается **только** после того, как живое завершение чата подтвердит ключ.

| Режим | Что делает |
| --- | --- |
| `run` (по умолчанию) | создаёт аккаунты до `--count`, проверяет каждый ключ живым чатом |
| `--verify-only` | повторно проходит `keys.txt`, перемещая всё, что не прошло, в `keys-ungated.txt` |
| `--screen` | проверяет ваш список прокси против Mistral → `proxies.live.txt` |
| `--probe` | проверка окружения: выходы, почтовый конвейер, поля потока регистрации, порядок ворот, существующий ключ |
| `--collect` | пересобирает `keys.txt` из `accounts.json` |

### 🖱️ Лаунчер

Лаунчер запрашивает список прокси, количество аккаунтов и модель ворот, запоминает их в `launcher.config.json` и запускает CLI с нужными флагами. Он также проверяет ваш список выходов и может зарегистрировать `keys.txt` в локальном 9Router.

## ✅ Проверено в работе — каждый ключ протестирован

| Проверка | Результат |
| --- | --- |
| `GET /self-service/registration/api` | **200** — id потока + `csrf_token`; замеченные поля: `traits.email`, `password`, `traits.name.first`, `traits.name.last`, `method` |
| `POST /self-service/registration?flow=…` | **200** — аккаунт создан, `session_token` в теле ответа |
| ссылка из ящика `?code=…&flow=…` → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` | **200** — подтверждено (`410` = уже подтверждено, тоже принимается) |
| `GET /api/workspaces` | **200** — uuid рабочего пространства |
| `POST /api/billing/api-keys` | **200** — `mstrl_…`, 45 символов, без карты |
| `POST https://api.mistral.ai/v1/chat/completions` — выполняется для **каждого** ключа до его записи | **200** с реальным содержимым |
| полный проход по парку | **111/111** ключей chat-200 на `mistral-tiny-latest` **и** `codestral-latest` (222/222 вызова, 2026-10-19) |
| CLI этого репозитория, живой выпуск во время проверки | **3 ключа** выпущены и chat-200 (`--count 3` → 2 за 56 с при `--conc 2`; `--count 1` → 1 за 26 с). Один аккаунт из первой партии был потерян из-за двух недоступных выходов в тестовом пуле и был так и отчитан |
| ключ, не прошедший проверку чата | никогда не записывается в `keys.txt` |

Ответ ворот, дословно (первый ключ, выпущенный поставляемым CLI, `mistral-tiny-latest`):

```json
{"id":"cb51dff9b36c41a08d41c8c0533885da","created":1792380045,"model":"ministral-8b-2512","usage":{"prompt_tokens":9,"total_tokens":11,"completion_tokens":2,"service_tier":"standard"},"object":"chat.completion","choices":[{"index":0,"finish_reason":"stop","message":{"role":"assistant","tool_calls":null,"content":"ok"}}]}
```

## 🧭 Как это работает

```
inbox (one Microsoft-family alias per account)                    a fresh alias per account
   |
   |- register: auth.mistral.ai /self-service/registration (Kratos)  csrf + email/password, session_token back
   |- verify:   mail link ?code=...&flow=... -> /self-service/verification
   |- key:      console.mistral.ai /api/billing/api-keys            mstrl_... returned once
   |- live proof: POST https://api.mistral.ai/v1/chat/completions    real content = the key is live
```

| Шаг | Вызов | Примечания |
| --- | --- | --- |
| псевдоним | `GET https://temp.tf/api/account?providers=outlook,hotmail&dot=0&plus=1` | один псевдоним на аккаунт; маршрут ограничен по IP (~20 с на адрес), поэтому конвейер повторяет попытку, а не сжигает попытку |
| регистрация | `GET /self-service/registration/api` → `POST /self-service/registration?flow=…` | тело JSON + `csrf_token` из потока; ответ уже несёт `session_token` |
| подтверждение | ссылка из ящика → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` `{method:"code", code}` | сама ссылка несёт и `code`, и `flow` |
| сессия | `session_token` из ответа регистрации | Kratos отказывает во втором входе по паролю, пока первая сессия свежа, поэтому повторный вход происходит только при `401` |
| рабочее пространство | `GET console.mistral.ai/api/workspaces` | первый `items[].uuid` |
| ключ | `POST console.mistral.ai/api/billing/api-keys` `{name, workspace, primitive_access_scope:"shared_only"}` | открытый текст `mstrl_…` возвращается один раз |
| ворота | `POST api.mistral.ai/v1/chat/completions` | требуется живой 200 до `keys.txt`; 429 повторяется один раз через 2,5 с, затем следующий id |

## ⚙️ Опции CLI

```bash
node src/cli.js [mode] [flags]
```

| Флаг | По умолчанию | Значение |
| --- | --- | --- |
| `--count N` | 10 | аккаунтов (= ключей) для выпуска |
| `--conc N` | 2 | аккаунтов в работе (максимум 16) — на каждый аккаунт закрепляется один выход |
| `--model <id>` | `mistral-tiny-latest` | закреплённая модель ворот; порядок резерва следует за ней |
| `--pool <file>` | `proxies.txt` | список прокси (переменная окружения `MISTRAL_PROXIES` тоже работает) |
| `--gap MS` | 800 | пауза между аккаунтами внутри одного воркера |
| `--tries N` | 2 | выходов, испробованных на аккаунт |
| `--timeout MS` | 45000 | таймаут на запрос |
| `--mail-timeout MS` | 180000 | сколько один аккаунт ждёт ссылку подтверждения |
| `--mail <list>` | `outlook,hotmail` | почтовые провайдеры, используемые для псевдонима |
| `--verify-only` · `--screen` · `--probe` · `--collect` | — | режимы выше |

Неудачный выход заменяется для следующего аккаунта, а строка пула может нести отфильтрованную пометку (`http://host:port 1.2.3.4`) — загрузчик сохраняет первый токен.

## 🛰️ За прокси

Каждый запрос уходит через выход из вашего пула — инструмент никогда не обращается к Mistral с вашей собственной линии, и **один аккаунт живёт на одном выходе** всю свою жизнь (Kratos привязывает сессию к IP, на котором она была создана). По замерам на парке оператора: пул из 10 строк пропустил **3 выхода** к `auth.mistral.ai`, и каждый завершившийся аккаунт оставался на том единственном выходе, с которого начал (два, потерявшие свой выход из-за недоступной строки пула, были повторены на следующем и так и отчитаны). `--screen` записывает выживших в `proxies.live.txt`, чтобы следующий запуск начинался с выходов, которые уже отвечали.

## 📄 Файлы

| Путь | Содержимое |
| --- | --- |
| `keys.txt` | ключи chat-200, по одному в строке — игнорируется git |
| `keys-ungated.txt` | ключи, не прошедшие последний проход `--verify-only` — повторите позже |
| `accounts.json` | псевдоним / ключ / рабочее пространство / статус ворот / выход на аккаунт — игнорируется git |
| `proxies.txt` | ваш список выходов — игнорируется git |
| `proxies.live.txt` | выходы, прошедшие `--screen` |

## 🔌 Подключение к 9Router

[9Router](https://9router.com) — это самостоятельно размещаемый маршрутизатор, совместимый с OpenAI. Одна команда превращает `keys.txt` в узел-провайдер с рабочими комбинациями:

```bash
node src/connect-9router.js
```

По умолчанию: `--base http://localhost:20128`, `--password 123456`, `--name "Mistral"`, `--prefix mistral`, `--base-url https://api.mistral.ai/v1`.

Панель оператора несёт те же ключи как нативные подключения провайдера `mistral` (**111** зарегистрировано), а маршрутизированный вызов попадает на то, что обслуживает бесплатный тариф: `POST /v1/chat/completions mistral/codestral-latest` → **200**, тогда как `mistral/mistral-medium-latest` → **503** `[429] rate_limited` — потолок тарифа, видимый на расстоянии одного перехода.

## 🔌 Подключение к OmniRoute

[OmniRoute](https://omniroute.online) — это самостоятельно размещаемый маршрутизатор, совместимый с OpenAI. Одна команда превращает `keys.txt` в узел-провайдер с рабочими комбинациями:

```bash
node src/connect-omniroute.js
```

По умолчанию: `--base http://localhost:20128`, `--password 123456`, `--name "Mistral"`, `--prefix mistral`, `--base-url https://api.mistral.ai/v1`.

Панель оператора несёт те же ключи как нативные подключения провайдера `mistral` (**111** зарегистрировано), а маршрутизированный вызов попадает на то, что обслуживает бесплатный тариф: `POST /v1/chat/completions mistral/codestral-latest` → **200**, тогда как `mistral/mistral-medium-latest` → **503** `[429] rate_limited` — потолок тарифа, видимый на расстоянии одного перехода.
## 🔑 Что даёт один ключ

| | |
| --- | --- |
| 🏢 Провайдер | **Mistral AI** — [mistral.ai](https://mistral.ai) |
| 🎁 Что даёт провайдер | бесплатный аккаунт на api_plan **Experiment** с API-ключом — без карты, без телефона, без капчи |
| 🔑 Что даёт один ключ | ключ, совместимый с OpenAI, привязанный к собственному аккаунту: малые id, которые обслуживает бесплатный тариф (`mistral-tiny-latest`, `open-mistral-nemo`, `codestral-latest`, `ministral-*`), в пределах лимитов тарифа. Квота живёт на **аккаунте**, именно поэтому этот инструмент создаёт один аккаунт на ключ |
| 🌐 Форма API | совместим с OpenAI: `POST https://api.mistral.ai/v1/chat/completions` |
| 🔒 Ваши данные | связь происходит только с `auth.mistral.ai` / `console.mistral.ai` / `api.mistral.ai` и настроенным вами почтовым бэкендом; ключи остаются на вашей машине |

## 🐞 Проблемы

Если Mistral изменит свой поток регистрации, письмо подтверждения или набор моделей бесплатного тарифа, инструмент остановится на этом шаге и сообщит об этом (`--probe` показывает поля потока, почтовый конвейер и порядок ворот, которые он видит). **[Откройте issue](../../issues)** с командой, которую вы запустили, и точным выводом; PR приветствуются.

## 📄 Лицензия

MIT © 2026 — см. [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 mistral-bulk-apikey contributors

</div>