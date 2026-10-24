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

**Massenhaftes Erstellen von Mistral-AI-Konten mit automatisch generierten API-Schlüsseln — OpenAI-kompatible Inferenz + 9Router-Konnektor.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-45%20served-412991?style=for-the-badge)](https://docs.mistral.ai/getting-started/models/models_overview/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Schnellstart](#-quick-start) · [🎁 Kostenlose Stufe](#-free-tier--how-much-you-get) · [🤖 Modelle](#-models--all-45-of-them) · [🧪 Die API verwenden](#-how-to-use-the-api) · [✅ Verifiziert](#-verified-working--every-key-is-tested) · [🧭 So funktioniert es](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Optionen](#️-cli-options) · [🛰️ Proxys](#️-behind-a-proxy) · [🐞 Probleme](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Warum es das gibt

Mistrals Tür ist eine **Ory Kratos**-Tür: `POST /self-service/registration` nimmt eine E-Mail-Adresse, ein Passwort und einen Namen entgegen und sonst nichts — **keine Karte, kein Telefon, kein Captcha** — und der Posteingangsschritt ist ein Link, der den Code *und* die Flow-ID trägt, sodass die gesamte Strecke über einfaches HTTP mit einem Postfach-Alias pro Konto läuft. Sobald die Sitzung existiert, stellt die eigene Abrechnungsroute der Konsole den Schlüssel aus: `POST /api/billing/api-keys {name, workspace, primitive_access_scope:"shared_only"}` → `mstrl_…` (45 Zeichen).

Die Einheit, die skaliert, ist **ein Konto = ein Schlüssel**. Gemessen auf der Flotte des Betreibers (2026-10-19): Die Strecke stieß jeden Schlüssel in 12 Blöcken zu je 8 mit **~14,6 s/Schlüssel** bei 2 Workern durch und verlor 2 Konten (ein Postfach, das innerhalb von 180 s nie lieferte, ein `login 400`) — keine CAPTCHA-Mauer, keine Rate-Limit-Mauer. Alle **111** antworteten mit chat-200 auf `mistral-tiny-latest` **und** auf `codestral-latest` — **222/222** Live-Aufrufe. Während dieses Repository verifiziert wurde, prägte seine eigene CLI **3 weitere** Schlüssel derselben Form (2 bei `--conc 2` in 56 s, 1 in 26 s), jeder davon chat-200, bevor er geschrieben wurde. Was vervielfacht wird, ist der kostenlose **Experiment**-api_plan, weshalb die größeren IDs aus dem Gate herausbleiben (siehe unten).

## 🎁 Kostenlose Stufe — wie viel du bekommst

**Jedes neue Konto erhält einen kostenlosen Schlüssel** — keine Karte, kein Captcha, kein Telefon.

| Was | Wert |
| --- | --- |
| Karte erforderlich | **Nein** |
| Telefon | **wird nicht verlangt** — die Konsole liefert zwar eine Route `/api/users/verify-phone/send-code`, aber bei einem frischen kostenlosen Konto antwortet sie mit `400 can't be verified`, und das Chat-Gate braucht sie nie |
| Captcha / Turnstile | **keines** im hier verwendeten Kratos-API-Flow |
| Postfach | **erforderlich** — ein Alias pro Konto; ein `temp.tf`-Outlook/Hotmail-Plus-Alias kommt auf einer Domain an, die Mistral akzeptiert |
| Plan | der kostenlose **Experiment**-api_plan |
| Anmeldeguthaben | nichts auszugeben — der kostenlose Plan selbst bedient die IDs im Gate |
| Modell-Obergrenze | größere IDs antworten mit `429 rate_limited` trotz eines völlig guten Schlüssels, daher sind sie nicht im Gate |
| Die Einheit, die skaliert | **ein Konto = ein Schlüssel** → `--count N` bedeutet „N kostenlose Konten" |

> 💡 Die kostenlose Stufe wird von Mistral AI festgelegt und kann sich ändern. Prüfe die aktuellen Zahlen auf [mistral.ai](https://mistral.ai) — und lass das Gate des Tools selbst entscheiden:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelle — alle 45 davon

Ein kostenloser Schlüssel sieht **45 Modell-IDs** (`GET /v1/models`, gemessen am 2026-10-19) — Chat, Embed, OCR und Audio in derselben Liste. Fragt man jede chat-fähige ID nach einer echten Completion (24 IDs, ein Durchlauf, derselbe Schlüssel), teilt das diese Liste in drei Teile:

* **9 IDs antworten mit 200** — `codestral-2508`, `codestral-latest`, `mistral-code-latest`, `ministral-14b-2512`, `ministral-14b-latest`, `ministral-3b-2512`, `ministral-3b-latest`, `ministral-8b-2512`, `ministral-8b-latest`;
* **13 IDs antworten mit 429 `rate_limited`** — die gesamte Hälfte `mistral-medium*`, `mistral-small*`, `magistral-*` und `mistral-vibe-cli-*`;
* **2 IDs antworten mit 403** — `labs-leanstral-1-5` und `labs-leanstral-1-5-1`.

Hier sind nur IDs aufgeführt, auf denen ein Schlüssel tatsächlich geantwortet hat:

| Modell-ID | ✓ | Hinweise |
| --- | --- | --- |
| `mistral-tiny-latest` | ✓ | die erste Station des Gates; antwortet als `ministral-8b-2512` — ein Legacy-Alias, den die neuere Katalogliste nicht mehr nennt |
| `open-mistral-nemo` | ✓ | fehlt ebenfalls in der 45-ID-Liste und wird weiterhin bedient |
| `codestral-latest` | ✓ | das Code-Modell; zweiter Pin, verwendet für den 222-Aufruf-Durchlauf oben |

Das Gate durchläuft diese drei der Reihe nach und stoppt beim ersten 200, sodass ein Schlüssel nur behalten wird, wenn das Konto wirklich eines davon bedient. Ein 429 wird als Tempohinweis behandelt (ein Wiederholungsversuch nach 2,5 s) und nicht als toter Schlüssel.

## 🧪 So verwendest du die API

Der Endpunkt ist OpenAI-kompatibel unter **`/v1`**:

```bash
curl https://api.mistral.ai/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"codestral-latest","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

Ein Schlüssel der kostenlosen Stufe antwortet auf die kleinen IDs und gibt `429 rate_limited` für `mistral-medium*` / `mistral-small*` zurück — das ist der Plan, nicht der Schlüssel.

## 🛠 Schnellstart

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

`keys.txt` wird **erst** geschrieben, nachdem eine Live-Chat-Completion den Schlüssel bestätigt hat.

| Modus | Was er tut |
| --- | --- |
| `run` (Standard) | Konten prägen bis `--count`, jeden Schlüssel mit einem Live-Chat durch das Gate schicken |
| `--verify-only` | `keys.txt` erneut durchlaufen, alles Fehlschlagende nach `keys-ungated.txt` verschieben |
| `--screen` | deine Proxy-Liste gegen Mistral testen → `proxies.live.txt` |
| `--probe` | Umgebungsprüfung: Exits, Postfach-Strecke, Registrierungs-Flow-Felder, Gate-Reihenfolge, ein vorhandener Schlüssel |
| `--collect` | `keys.txt` aus `accounts.json` neu aufbauen |

### 🖱️ Der Launcher

Der Launcher fragt nach der Proxy-Liste, der Kontoanzahl und dem Gate-Modell, merkt sie sich in `launcher.config.json` und führt die CLI mit den richtigen Flags aus. Er prüft außerdem deine Exit-Liste und kann `keys.txt` bei einem lokalen 9Router registrieren.

## ✅ Verifiziert funktionierend — jeder Schlüssel wird getestet

| Prüfung | Ergebnis |
| --- | --- |
| `GET /self-service/registration/api` | **200** — Flow-ID + `csrf_token`; gesehene Felder: `traits.email`, `password`, `traits.name.first`, `traits.name.last`, `method` |
| `POST /self-service/registration?flow=…` | **200** — Konto erstellt, `session_token` im Body |
| Postfach-Link `?code=…&flow=…` → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` | **200** — verifiziert (`410` = bereits verifiziert, ebenfalls akzeptiert) |
| `GET /api/workspaces` | **200** — Workspace-UUID |
| `POST /api/billing/api-keys` | **200** — `mstrl_…`, 45 Zeichen, keine Karte |
| `POST https://api.mistral.ai/v1/chat/completions` — für **jeden** Schlüssel ausgeführt, bevor er geschrieben wird | **200** mit echtem Inhalt |
| vollständiger Flotten-Durchlauf | **111/111** Schlüssel chat-200 auf `mistral-tiny-latest` **und** `codestral-latest` (222/222 Aufrufe, 2026-10-19) |
| die CLI dieses Repos, Live-Prägung während der Verifizierung | jeder Schlüssel geprägt und chat-200 (`--count 3` → 2 in 56 s bei `--conc 2`; `--count 1` → 1 in 26 s). Ein Konto der ersten Charge ging durch zwei unerreichbare Exits im Testpool verloren und wurde als solches gemeldet |
| ein Schlüssel, der seine Chat-Prüfung nicht besteht | wird nie in `keys.txt` geschrieben |

Die Antwort des Gates, wörtlich (der erste Schlüssel, den die ausgelieferte CLI prägte, `mistral-tiny-latest`):

```json
{"id":"cb51dff9b36c41a08d41c8c0533885da","created":1792380045,"model":"ministral-8b-2512","usage":{"prompt_tokens":9,"total_tokens":11,"completion_tokens":2,"service_tier":"standard"},"object":"chat.completion","choices":[{"index":0,"finish_reason":"stop","message":{"role":"assistant","tool_calls":null,"content":"ok"}}]}
```

> **Qualitätsgates.** Jeder Schlüssel hier hat ein Live-`chat-200` bestanden, bevor er in `keys.txt`
> geschrieben wurde (tote Schlüssel werden nie ausgeliefert). Router-Kombinationen folgen derselben Regel
> auf Modellebene: Ein Eintrag wird **nur hinzugefügt, wenn das Modell `chat-200` antwortet und Tools
> aufrufen kann** — ein Modell ohne Tool-Unterstützung, ein toter Schlüssel oder ein toter Anbieter wird
> verworfen statt hinzugefügt. Führe den Verifizierungsschritt jederzeit erneut aus;
> Fehler werden gemeldet, nie verborgen.

## 🧭 So funktioniert es

```
inbox (one Microsoft-family alias per account)                    a fresh alias per account
   |
   |- register: auth.mistral.ai /self-service/registration (Kratos)  csrf + email/password, session_token back
   |- verify:   mail link ?code=...&flow=... -> /self-service/verification
   |- key:      console.mistral.ai /api/billing/api-keys            mstrl_... returned once
   |- live proof: POST https://api.mistral.ai/v1/chat/completions    real content = the key is live
```

| Schritt | Aufruf | Hinweise |
| --- | --- | --- |
| Alias | `GET https://temp.tf/api/account?providers=outlook,hotmail&dot=0&plus=1` | ein Alias pro Konto; die Route ist IP-gedrosselt (~20 s pro Adresse), daher wiederholt die Strecke eher, als den Versuch zu verbrennen |
| Registrierung | `GET /self-service/registration/api` → `POST /self-service/registration?flow=…` | JSON-Body + `csrf_token` aus dem Flow; die Antwort trägt bereits `session_token` |
| Verifizierung | Link aus dem Postfach → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` `{method:"code", code}` | der Link selbst trägt sowohl `code` als auch `flow` |
| Sitzung | `session_token` aus der Registrierungsantwort | Kratos verweigert eine zweite Passwort-Anmeldung, solange die erste Sitzung frisch ist, daher erfolgt eine erneute Anmeldung nur bei einem `401` |
| Workspace | `GET console.mistral.ai/api/workspaces` | erste `items[].uuid` |
| Schlüssel | `POST console.mistral.ai/api/billing/api-keys` `{name, workspace, primitive_access_scope:"shared_only"}` | Klartext-`mstrl_…` wird einmal zurückgegeben |
| Gate | `POST api.mistral.ai/v1/chat/completions` | Live-200 erforderlich vor `keys.txt`; 429 wird einmal nach 2,5 s wiederholt, dann die nächste ID |

## ⚙️ CLI-Optionen

```bash
node src/cli.js [mode] [flags]
```

| Flag | Standard | Bedeutung |
| --- | --- | --- |
| `--count N` | 10 | Konten (= Schlüssel), die geprägt werden sollen |
| `--conc N` | 2 | Konten in Bearbeitung (max. 16) — pro Konto wird ein Exit festgelegt |
| `--model <id>` | `mistral-tiny-latest` | festgelegtes Gate-Modell; die Fallback-Reihenfolge folgt ihm |
| `--pool <file>` | `proxies.txt` | optionale Proxy-Liste (die Umgebungsvariable `MISTRAL_PROXIES` funktioniert ebenfalls) |
| `--gap MS` | 800 | Pause zwischen Konten innerhalb eines Workers |
| `--exits N` | 6 | pro Konto versuchte Exits |
| `--timeout MS` | 45000 | Timeout pro Anfrage |
| `--mail-timeout MS` | 180000 | wie lange ein Konto auf den Verifizierungslink wartet |
| `--mail <list>` | `outlook,hotmail` | für den Alias verwendete Postfach-Anbieter |
| `--verify-only` · `--screen` · `--probe` · `--collect` | — | die oben genannten Modi |

Ein Exit, der fehlschlägt, wird für das nächste Konto rotiert, und eine Pool-Zeile kann eine geprüfte Notiz tragen (`http://host:port 1.2.3.4`) — der Loader behält das erste Token.

## 🛰️ Hinter einem Proxy

**Optional — bei Skalierung empfohlen (Limits pro IP, Sperren).** Das Tool funktioniert auch ohne Proxy.

- **Mit einem Pool:** übergib `--pool <file>` (oder setze `MISTRAL_PROXIES`), und jede Anfrage läuft über einen Exit aus dieser Liste — ein Konto bleibt während seines gesamten Lebens auf einem Exit (Kratos bindet die Sitzung an die IP, auf der sie erstellt wurde).
- **Ohne einen Pool:** die CLI gibt `running WITHOUT a proxy (direct)` aus und verbindet direkt; der Alias, der Verifizierungslink, der Workspace-Schlüssel und das Chat-Gate laufen alle auf dieselbe Weise.
- `--screen` schreibt die Überlebenden nach `proxies.live.txt`, sodass der nächste Lauf mit Exits beginnt, die bereits geantwortet haben — oder testet die direkte Route, wenn du keinen Pool hast.

Gemessen auf der Flotte des Betreibers: Ein Pool mit 10 Zeilen brachte **3 Exits** zu `auth.mistral.ai` durch, und jedes Konto, das fertig wurde, blieb auf dem einen Exit, mit dem es begonnen hatte (die beiden, die ihren Exit an eine unerreichbare Pool-Zeile verloren, wurden auf der nächsten erneut versucht und als solche gemeldet).

## 📄 Dateien

| Pfad | Inhalt |
| --- | --- |
| `keys.txt` | chat-200-Schlüssel, einer pro Zeile — von Git ignoriert |
| `keys-ungated.txt` | Schlüssel, die den letzten `--verify-only`-Durchlauf nicht bestanden haben — später erneut versuchen |
| `accounts.json` | Alias / Schlüssel / Workspace / Gate-Status / Exit pro Konto — von Git ignoriert |
| `proxies.txt` | deine Exit-Liste — von Git ignoriert |
| `proxies.live.txt` | Exits, die `--screen` bestanden haben |

## 🔌 Mit 9Router verbinden

[9Router](https://9router.com) ist ein selbst gehosteter, OpenAI-kompatibler Router. Ein Befehl verwandelt `keys.txt` in einen Provider-Node mit funktionierenden Kombinationen:

```bash
node src/connect-9router.js
```

Standardwerte: `--base http://localhost:20128`, `--password 123456`, `--name "Mistral"`, `--prefix mistral`, `--base-url https://api.mistral.ai/v1`.

Das Panel des Betreibers trägt dieselben Schlüssel als native `mistral`-Provider-Verbindungen (**111** registriert), und ein gerouteter Aufruf landet auf dem, was der kostenlose Plan bedient: `POST /v1/chat/completions mistral/codestral-latest` → **200**, während `mistral/mistral-medium-latest` → **503** `[429] rate_limited` — die Obergrenze des Plans, einen Hop entfernt sichtbar.

## 🔌 Mit OmniRoute verbinden

[OmniRoute](https://omniroute.online) ist ein selbst gehosteter, OpenAI-kompatibler Router. Ein Befehl verwandelt `keys.txt` in einen Provider-Node mit funktionierenden Kombinationen:

```bash
node src/connect-omniroute.js
```

Standardwerte: `--base http://localhost:20128`, `--password 123456`, `--name "Mistral"`, `--prefix mistral`, `--base-url https://api.mistral.ai/v1`.

Das Panel des Betreibers trägt dieselben Schlüssel als native `mistral`-Provider-Verbindungen (**111** registriert), und ein gerouteter Aufruf landet auf dem, was der kostenlose Plan bedient: `POST /v1/chat/completions mistral/codestral-latest` → **200**, während `mistral/mistral-medium-latest` → **503** `[429] rate_limited` — die Obergrenze des Plans, einen Hop entfernt sichtbar.

## 🔑 Was ein Schlüssel dir bringt

| | |
| --- | --- |
| 🏢 Anbieter | **Mistral AI** — [mistral.ai](https://mistral.ai) |
| 🎁 Was der Anbieter gibt | ein kostenloses Konto im **Experiment**-api_plan mit einem API-Schlüssel — keine Karte, kein Telefon, kein Captcha |
| 🔑 Was ein Schlüssel dir bringt | einen OpenAI-kompatiblen Schlüssel, der auf sein eigenes Konto beschränkt ist: die kleinen IDs, die der kostenlose Plan bedient (`mistral-tiny-latest`, `open-mistral-nemo`, `codestral-latest`, `ministral-*`), zu den Rate-Limits des Plans. Das Kontingent liegt auf dem **Konto**, weshalb dieses Tool genau ein Konto pro Schlüssel erstellt |
| 🌐 API-Form | OpenAI-kompatibel: `POST https://api.mistral.ai/v1/chat/completions` |
| 🔒 Deine Daten | es werden nur `auth.mistral.ai` / `console.mistral.ai` / `api.mistral.ai` und das von dir konfigurierte Postfach-Backend kontaktiert; Schlüssel bleiben auf deinem Rechner |

## 🐞 Probleme

Wenn Mistral seinen Registrierungs-Flow, seine Verifizierungsmail oder sein Modell-Set der kostenlosen Stufe ändert, stoppt das Tool an diesem Schritt und sagt es (`--probe` zeigt die Flow-Felder, die Postfach-Strecke und die Gate-Reihenfolge, die es sieht). **[Öffne ein Issue](../../issues)** mit dem ausgeführten Befehl und der exakten Ausgabe; PRs sind willkommen.

## 📄 Lizenz

MIT © 2026 — siehe [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 mistral-bulk-apikey contributors

</div>