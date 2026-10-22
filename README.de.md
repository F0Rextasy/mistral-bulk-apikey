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
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Schnellstart](#-quick-start) · [🎁 Kostenloser Tarif](#-free-tier--how-much-you-get) · [🤖 Modelle](#-models--all-45-of-them) · [🧪 Die API verwenden](#-how-to-use-the-api) · [✅ Verifiziert](#-verified-working--every-key-is-tested) · [🧭 So funktioniert es](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Optionen](#️-cli-options) · [🛰️ Proxys](#️-behind-a-proxy) · [🐞 Probleme](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Warum es das gibt

Mistrals Tür ist eine **Ory Kratos**-Tür: `POST /self-service/registration` nimmt eine E-Mail, ein Passwort und einen Namen entgegen und sonst nichts — **keine Karte, kein Telefon, kein Captcha** — und der Posteingangsschritt ist ein Link, der den Code *und* die Flow-ID trägt, sodass die gesamte Strecke über einfaches HTTP mit einem Postfach-Alias pro Konto läuft. Sobald die Sitzung existiert, stellt die Billing-Route der Konsole selbst den Schlüssel aus: `POST /api/billing/api-keys {name, workspace, primitive_access_scope:"shared_only"}` → `mstrl_…` (45 Zeichen).

Die Einheit, die skaliert, ist **ein Konto = ein Schlüssel**. Gemessen auf der Flotte des Betreibers (2026-10-19): Die Strecke erzeugte **111 Schlüssel** in 12 Blöcken zu je 8 mit **~14,6 s/Schlüssel** bei 2 Workern und verlor 2 Konten (ein Postfach, das innerhalb von 180 s nie lieferte, ein `login 400`) — keine CAPTCHA-Wand, keine Rate-Limit-Wand. Alle **111** antworteten mit Chat-200 auf `mistral-tiny-latest` **und** auf `codestral-latest` — **222/222** Live-Aufrufe. Während dieses Repository verifiziert wurde, erzeugte seine eigene CLI **3 weitere** Schlüssel derselben Form (2 bei `--conc 2` in 56 s, 1 in 26 s), jeder davon Chat-200, bevor er geschrieben wurde. Was vervielfacht wird, ist der kostenlose **Experiment**-api_plan, weshalb die größeren IDs aus dem Gate herausbleiben (siehe unten).

## 🎁 Kostenloser Tarif — wie viel du bekommst

**Jedes neue Konto erhält einen kostenlosen Schlüssel** — keine Karte, kein Captcha, kein Telefon.

| Was | Wert |
| --- | --- |
| Karte erforderlich | **Nein** |
| Telefon | **wird nicht verlangt** — die Konsole liefert zwar eine Route `/api/users/verify-phone/send-code`, aber bei einem frischen kostenlosen Konto antwortet sie mit `400 can't be verified`, und das Chat-Gate benötigt sie nie |
| Captcha / Turnstile | **keines** im hier verwendeten Kratos-API-Flow |
| Postfach | **erforderlich** — ein Alias pro Konto; ein `temp.tf`-Outlook/Hotmail-Plus-Alias kommt auf einer Domain an, die Mistral akzeptiert |
| Tarif | der kostenlose **Experiment**-api_plan |
| Anmeldeguthaben | nichts auszugeben — der kostenlose Tarif selbst bedient die IDs im Gate |
| Modell-Obergrenze | größere IDs antworten mit `429 rate_limited` trotz einwandfreiem Schlüssel, daher sind sie nicht im Gate |
| Die Einheit, die skaliert | **ein Konto = ein Schlüssel** → `--count N` bedeutet „N kostenlose Konten" |

> 💡 Der kostenlose Tarif wird von Mistral AI festgelegt und kann sich ändern. Prüfe die aktuellen Zahlen auf [mistral.ai](https://mistral.ai) — und lass das Gate des Tools selbst entscheiden:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelle — alle 45 davon

Ein kostenloser Schlüssel sieht **45 Modell-IDs** (`GET /v1/models`, gemessen am 2026-10-19) — Chat, Embed, OCR und Audio in derselben Liste. Fragt man jede chat-fähige ID nach einer echten Completion (24 IDs, ein Durchlauf, derselbe Schlüssel), teilt sich diese Liste in drei Teile:

* **9 IDs antworten mit 200** — `codestral-2508`, `codestral-latest`, `mistral-code-latest`, `ministral-14b-2512`, `ministral-14b-latest`, `ministral-3b-2512`, `ministral-3b-latest`, `ministral-8b-2512`, `ministral-8b-latest`;
* **13 IDs antworten mit 429 `rate_limited`** — die gesamte Hälfte `mistral-medium*`, `mistral-small*`, `magistral-*` und `mistral-vibe-cli-*`;
* **2 IDs antworten mit 403** — `labs-leanstral-1-5` und `labs-leanstral-1-5-1`.

Hier sind nur IDs aufgeführt, auf denen ein Schlüssel tatsächlich geantwortet hat:

| Modell-ID | ✓ | Hinweise |
| --- | --- | --- |
| `mistral-tiny-latest` | ✓ | die erste Station des Gates; antwortet als `ministral-8b-2512` — ein Legacy-Alias, den die neuere Katalogliste nicht mehr nennt |
| `open-mistral-nemo` | ✓ | fehlt ebenfalls in der 45-ID-Liste und wird weiterhin bedient |
| `codestral-latest` | ✓ | das Code-Modell; zweiter Pin, verwendet für den obigen 222-Aufruf-Durchlauf |

Das Gate durchläuft diese drei der Reihe nach und stoppt beim ersten 200, sodass ein Schlüssel nur behalten wird, wenn das Konto wirklich eines davon bedient. Ein 429 wird als Tempohinweis behandelt (ein Wiederholungsversuch nach 2,5 s) und nicht als toter Schlüssel.

## 🧪 So verwendest du die API

Der Endpunkt ist OpenAI-kompatibel unter **`/v1`**:

```bash
curl https://api.mistral.ai/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"codestral-latest","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

Ein Schlüssel des kostenlosen Tarifs antwortet auf die kleinen IDs und gibt für `mistral-medium*` / `mistral-small*` `429 rate_limited` zurück — das ist der Tarif, nicht der Schlüssel.

## 🛠 Schnellstart

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

`keys.txt` wird **erst** geschrieben, nachdem eine Live-Chat-Completion den Schlüssel bestätigt hat.

| Modus | Was er tut |
| --- | --- |
| `run` (Standard) | erstellt Konten bis `--count`, prüft jeden Schlüssel mit einem Live-Chat |
| `--verify-only` | durchläuft `keys.txt` erneut und verschiebt alles, was fehlschlägt, nach `keys-ungated.txt` |
| `--screen` | testet deine Proxy-Liste gegen Mistral → `proxies.live.txt` |
| `--probe` | Umgebungsprüfung: Exits, Postfach-Strecke, Registrierungs-Flow-Felder, Gate-Reihenfolge, ein vorhandener Schlüssel |
| `--collect` | baut `keys.txt` aus `accounts.json` neu auf |

### 🖱️ Der Launcher

Der Launcher fragt nach der Proxy-Liste, der Kontenanzahl und dem Gate-Modell, merkt sie sich in `launcher.config.json` und führt die CLI mit den richtigen Flags aus. Er prüft außerdem deine Exit-Liste und kann `keys.txt` bei einem lokalen 9Router registrieren.

## ✅ Verifiziert funktionierend — jeder Schlüssel wird getestet

| Prüfung | Ergebnis |
| --- | --- |
| `GET /self-service/registration/api` | **200** — Flow-ID + `csrf_token`; gesehene Felder: `traits.email`, `password`, `traits.name.first`, `traits.name.last`, `method` |
| `POST /self-service/registration?flow=…` | **200** — Konto erstellt, `session_token` im Body |
| Postfach-Link `?code=…&flow=…` → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` | **200** — verifiziert (`410` = bereits verifiziert, ebenfalls akzeptiert) |
| `GET /api/workspaces` | **200** — Workspace-UUID |
| `POST /api/billing/api-keys` | **200** — `mstrl_…`, 45 Zeichen, keine Karte |
| `POST https://api.mistral.ai/v1/chat/completions` — für **jeden** Schlüssel ausgeführt, bevor er geschrieben wird | **200** mit echtem Inhalt |
| vollständiger Flotten-Durchlauf | **111/111** Schlüssel Chat-200 auf `mistral-tiny-latest` **und** `codestral-latest` (222/222 Aufrufe, 2026-10-19) |
| CLI dieses Repos, Live-Erstellung während der Verifizierung | **3 Schlüssel** erstellt und Chat-200 (`--count 3` → 2 in 56 s bei `--conc 2`; `--count 1` → 1 in 26 s). Ein Konto des ersten Stapels ging durch zwei nicht erreichbare Exits im Testpool verloren und wurde als solches gemeldet |
| ein Schlüssel, der seine Chat-Prüfung nicht besteht | wird nie in `keys.txt` geschrieben |

Die Antwort des Gates, wörtlich (der erste Schlüssel, den die ausgelieferte CLI erstellt hat, `mistral-tiny-latest`):

```json
{"id":"cb51dff9b36c41a08d41c8c0533885da","created":1792380045,"model":"ministral-8b-2512","usage":{"prompt_tokens":9,"total_tokens":11,"completion_tokens":2,"service_tier":"standard"},"object":"chat.completion","choices":[{"index":0,"finish_reason":"stop","message":{"role":"assistant","tool_calls":null,"content":"ok"}}]}
```

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
| Alias | `GET https://temp.tf/api/account?providers=outlook,hotmail&dot=0&plus=1` | ein Alias pro Konto; die Route ist IP-gedrosselt (~20 s pro Adresse), daher wiederholt die Strecke den Versuch, statt den Versuch zu verbrennen |
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
| `--count N` | 10 | Konten (= Schlüssel), die erstellt werden sollen |
| `--conc N` | 2 | Konten in Bearbeitung (max. 16) — pro Konto wird ein Exit festgelegt |
| `--model <id>` | `mistral-tiny-latest` | festgelegtes Gate-Modell; die Fallback-Reihenfolge folgt ihm |
| `--pool <file>` | `proxies.txt` | Proxy-Liste (die Umgebungsvariable `MISTRAL_PROXIES` funktioniert ebenfalls) |
| `--gap MS` | 800 | Pause zwischen Konten innerhalb eines Workers |
| `--tries N` | 2 | pro Konto versuchte Exits |
| `--timeout MS` | 45000 | Timeout pro Anfrage |
| `--mail-timeout MS` | 180000 | wie lange ein Konto auf den Verifizierungslink wartet |
| `--mail <list>` | `outlook,hotmail` | für den Alias verwendete Postfach-Anbieter |
| `--verify-only` · `--screen` · `--probe` · `--collect` | — | die oben genannten Modi |

Ein Exit, der fehlschlägt, wird für das nächste Konto rotiert, und eine Pool-Zeile kann eine geprüfte Notiz tragen (`http://host:port 1.2.3.4`) — der Loader behält das erste Token.

## 🛰️ Hinter einem Proxy

Jede Anfrage verlässt das System über einen Exit aus deinem Pool — das Tool wählt sich nie über deine eigene Leitung bei Mistral ein, und **ein Konto lebt auf einem Exit** für seine gesamte Lebensdauer (Kratos bindet die Sitzung an die IP, auf der sie erstellt wurde). Gemessen auf der Flotte des Betreibers: Ein Pool mit 10 Zeilen brachte **3 Exits** zu `auth.mistral.ai` durch, und jedes Konto, das fertig wurde, blieb bei dem einen Exit, mit dem es begonnen hatte (die beiden, die ihren Exit an eine nicht erreichbare Pool-Zeile verloren, wurden auf der nächsten wiederholt und als solche gemeldet). `--screen` schreibt die Überlebenden nach `proxies.live.txt`, sodass der nächste Lauf mit Exits beginnt, die bereits geantwortet haben.

## 📄 Dateien

| Pfad | Inhalt |
| --- | --- |
| `keys.txt` | Chat-200-Schlüssel, einer pro Zeile — von Git ignoriert |
| `keys-ungated.txt` | Schlüssel, die den letzten `--verify-only`-Durchlauf nicht bestanden haben — später erneut versuchen |
| `accounts.json` | Alias / Schlüssel / Workspace / Gate-Status / Exit pro Konto — von Git ignoriert |
| `proxies.txt` | deine Exit-Liste — von Git ignoriert |
| `proxies.live.txt` | Exits, die `--screen` bestanden haben |

## 🔌 Mit 9Router verbinden

[9Router](https://9router.com) ist ein selbst gehosteter, OpenAI-kompatibler Router. Ein Befehl verwandelt `keys.txt` in einen Provider-Node mit funktionierenden Kombos:

```bash
node src/connect-9router.js
```

Standardwerte: `--base http://localhost:20128`, `--password 123456`, `--name "Mistral"`, `--prefix mistral`, `--base-url https://api.mistral.ai/v1`.

Das Panel des Betreibers trägt dieselben Schlüssel als native `mistral`-Provider-Verbindungen (**111** registriert), und ein gerouteter Aufruf landet auf dem, was der kostenlose Tarif bedient: `POST /v1/chat/completions mistral/codestral-latest` → **200**, während `mistral/mistral-medium-latest` → **503** `[429] rate_limited` — die Obergrenze des Tarifs, einen Hop entfernt sichtbar.

## 🔑 Was ein Schlüssel dir bringt

| | |
| --- | --- |
| 🏢 Anbieter | **Mistral AI** — [mistral.ai](https://mistral.ai) |
| 🎁 Was der Anbieter gibt | ein kostenloses Konto im **Experiment**-api_plan mit einem API-Schlüssel — keine Karte, kein Telefon, kein Captcha |
| 🔑 Was ein Schlüssel dir bringt | einen OpenAI-kompatiblen Schlüssel, der auf sein eigenes Konto beschränkt ist: die kleinen IDs, die der kostenlose Tarif bedient (`mistral-tiny-latest`, `open-mistral-nemo`, `codestral-latest`, `ministral-*`), zu den Rate-Limits des Tarifs. Das Kontingent liegt beim **Konto**, weshalb dieses Tool genau ein Konto pro Schlüssel erstellt |
| 🌐 API-Form | OpenAI-kompatibel: `POST https://api.mistral.ai/v1/chat/completions` |
| 🔒 Deine Daten | es werden nur `auth.mistral.ai` / `console.mistral.ai` / `api.mistral.ai` und das von dir konfigurierte Postfach-Backend kontaktiert; Schlüssel bleiben auf deinem Rechner |

## 🐞 Probleme

Wenn Mistral seinen Registrierungs-Flow, seine Verifizierungs-Mail oder sein Modell-Set des kostenlosen Tarifs ändert, stoppt das Tool an diesem Schritt und sagt es (`--probe` zeigt die Flow-Felder, die Postfach-Strecke und die Gate-Reihenfolge, die es sieht). **[Öffne ein Issue](../../issues)** mit dem ausgeführten Befehl und der exakten Ausgabe; PRs sind willkommen.

## 📄 Lizenz

MIT © 2026 — siehe [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 mistral-bulk-apikey contributors

</div>