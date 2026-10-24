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

**Crea cuentas de Mistral AI en masa con claves API autogeneradas — inferencia compatible con OpenAI + conector 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-45%20served-412991?style=for-the-badge)](https://docs.mistral.ai/getting-started/models/models_overview/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Inicio rápido](#-quick-start) · [🎁 Nivel gratuito](#-free-tier--how-much-you-get) · [🤖 Modelos](#-models--all-45-of-them) · [🧪 Usa la API](#-how-to-use-the-api) · [✅ Verificado](#-verified-working--every-key-is-tested) · [🧭 Cómo funciona](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Opciones](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Problemas](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Por qué existe esto

La puerta de Mistral es una de **Ory Kratos**: `POST /self-service/registration` toma un correo electrónico, una contraseña y un nombre y nada más — **sin tarjeta, sin teléfono, sin captcha** — y el paso del buzón es un enlace que lleva el código *y* el id del flujo, así que todo el riel corre sobre HTTP simple con un alias de buzón por cuenta. Una vez que existe la sesión, la propia ruta de facturación de la consola emite la clave: `POST /api/billing/api-keys {name, workspace, primitive_access_scope:"shared_only"}` → `mstrl_…` (45 caracteres).

La unidad que escala es **una cuenta = una clave**. Medido en la flota del operador (2026-10-19): el riel empujó cada clave en 12 lotes de 8 a **~14,6 s/clave** con 2 workers, perdiendo 2 cuentas (un buzón que nunca entregó dentro de 180 s, un `login 400`) — sin muro de CAPTCHA, sin muro de límite de tasa. Las **111** respondieron chat-200 en `mistral-tiny-latest` **y** en `codestral-latest` — **222/222** llamadas en vivo. Mientras se verificaba este repositorio, su propia CLI acuñó **3 más** claves de la misma forma (2 con `--conc 2` en 56 s, 1 en 26 s), cada una chat-200 antes de ser escrita. Lo que se multiplica es el api_plan gratuito **Experiment**, que es por lo que los ids más grandes quedan fuera de la puerta (ver abajo).

## 🎁 Nivel gratuito — cuánto obtienes

**Cada cuenta nueva obtiene una clave gratuita** — sin tarjeta, sin captcha, sin teléfono.

| Qué | Valor |
| --- | --- |
| Tarjeta requerida | **No** |
| Teléfono | **no se pide** — la consola sí incluye una ruta `/api/users/verify-phone/send-code`, pero en una cuenta gratuita nueva responde `400 can't be verified` y la puerta del chat nunca la necesita |
| Captcha / Turnstile | **ninguno** en el flujo de la API de Kratos usado aquí |
| Buzón | **requerido** — un alias por cuenta; un alias plus de outlook/hotmail de `temp.tf` llega en un dominio que Mistral acepta |
| Plan | el api_plan gratuito **Experiment** |
| Crédito de registro | nada que gastar — el propio plan gratuito sirve los ids en la puerta |
| Techo de modelos | los ids más grandes responden `429 rate_limited` con una clave perfectamente buena, así que no están en la puerta |
| La unidad que escala | **una cuenta = una clave** → `--count N` es "N cuentas gratuitas" |

> 💡 El nivel gratuito lo define Mistral AI y puede cambiar. Consulta los números en vivo en [mistral.ai](https://mistral.ai) — y deja que la propia puerta de la herramienta decida:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelos — los 45

Una clave gratuita ve **45 ids de modelo** (`GET /v1/models`, medido 2026-10-19) — chat, embed, OCR y audio en la misma lista. Pedir a cada id capaz de chat una completion real (24 ids, un barrido, la misma clave) divide esa lista en tres:

* **9 ids responden 200** — `codestral-2508`, `codestral-latest`, `mistral-code-latest`, `ministral-14b-2512`, `ministral-14b-latest`, `ministral-3b-2512`, `ministral-3b-latest`, `ministral-8b-2512`, `ministral-8b-latest`;
* **13 ids responden 429 `rate_limited`** — toda la mitad de `mistral-medium*`, `mistral-small*`, `magistral-*` y `mistral-vibe-cli-*`;
* **2 ids responden 403** — `labs-leanstral-1-5` y `labs-leanstral-1-5-1`.

Aquí solo se listan los ids en los que una clave ha respondido realmente:

| ID de modelo | ✓ | Notas |
| --- | --- | --- |
| `mistral-tiny-latest` | ✓ | la primera parada de la puerta; responde como `ministral-8b-2512` — un alias heredado que la lista del catálogo más reciente ya no nombra |
| `open-mistral-nemo` | ✓ | también ausente de la lista de 45 ids y aún servido |
| `codestral-latest` | ✓ | el modelo de código; segundo pin, usado para el barrido de 222 llamadas de arriba |

La puerta recorre esos tres en orden y se detiene en el primer 200, así que una clave solo se conserva cuando la cuenta realmente sirve uno de ellos. Un 429 se trata como una señal de ritmo (un reintento tras 2,5 s) en lugar de una clave muerta.

## 🧪 Cómo usar la API

El endpoint es compatible con OpenAI bajo **`/v1`**:

```bash
curl https://api.mistral.ai/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"codestral-latest","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

Una clave del plan gratuito responde en los ids pequeños y devuelve `429 rate_limited` para `mistral-medium*` / `mistral-small*` — eso es el plan, no la clave.

## 🛠 Inicio rápido

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

`keys.txt` se escribe **solo** después de que una completion de chat en vivo demuestra que la clave funciona.

| Modo | Qué hace |
| --- | --- |
| `run` (predeterminado) | acuña cuentas hasta `--count`, valida cada clave con un chat en vivo |
| `--verify-only` | vuelve a barrer `keys.txt`, moviendo lo que falle a `keys-ungated.txt` |
| `--screen` | prueba tu lista de proxies contra Mistral → `proxies.live.txt` |
| `--probe` | comprobación del entorno: salidas, riel del buzón, campos del flujo de registro, orden de la puerta, una clave existente |
| `--collect` | reconstruye `keys.txt` desde `accounts.json` |

### 🖱️ El launcher

El launcher pide la lista de proxies, el número de cuentas y el modelo de la puerta, los recuerda en `launcher.config.json` y ejecuta la CLI con los flags correctos. También examina tu lista de salidas y puede registrar `keys.txt` con un 9Router local.

## ✅ Verificado y funcionando — cada clave se prueba

| Comprobación | Resultado |
| --- | --- |
| `GET /self-service/registration/api` | **200** — id de flujo + `csrf_token`; campos vistos: `traits.email`, `password`, `traits.name.first`, `traits.name.last`, `method` |
| `POST /self-service/registration?flow=…` | **200** — cuenta creada, `session_token` en el cuerpo |
| enlace del buzón `?code=…&flow=…` → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` | **200** — verificado (`410` = ya verificado, también aceptado) |
| `GET /api/workspaces` | **200** — uuid del workspace |
| `POST /api/billing/api-keys` | **200** — `mstrl_…`, 45 caracteres, sin tarjeta |
| `POST https://api.mistral.ai/v1/chat/completions` — ejecutado para **cada** clave antes de ser escrita | **200** con contenido real |
| barrido completo de la flota | **111/111** claves chat-200 en `mistral-tiny-latest` **y** `codestral-latest` (222/222 llamadas, 2026-10-19) |
| la CLI de este repositorio, acuñación en vivo mientras se verificaba | cada clave acuñada y chat-200 (`--count 3` → 2 en 56 s con `--conc 2`; `--count 1` → 1 en 26 s). Una cuenta del primer lote se perdió por dos salidas inalcanzables en el pool de prueba y se reportó como tal |
| una clave que falla su comprobación de chat | nunca se escribe en `keys.txt` |

La respuesta de la puerta, textual (la primera clave que acuñó la CLI distribuida, `mistral-tiny-latest`):

```json
{"id":"cb51dff9b36c41a08d41c8c0533885da","created":1792380045,"model":"ministral-8b-2512","usage":{"prompt_tokens":9,"total_tokens":11,"completion_tokens":2,"service_tier":"standard"},"object":"chat.completion","choices":[{"index":0,"finish_reason":"stop","message":{"role":"assistant","tool_calls":null,"content":"ok"}}]}
```

> **Puertas de calidad.** Cada clave aquí pasó un `chat-200` en vivo antes de ser escrita en `keys.txt`
> (las claves muertas nunca se distribuyen). Las combinaciones del router siguen la misma regla a nivel de modelo: una entrada se
> añade **solo si el modelo responde `chat-200` y puede llamar a herramientas** — un modelo sin soporte de herramientas,
> una clave muerta o un proveedor muerto se descarta en lugar de añadirse. Vuelve a ejecutar el paso de verificación cuando quieras;
> los fallos se reportan, nunca se ocultan.

## 🧭 Cómo funciona

```
inbox (one Microsoft-family alias per account)                    a fresh alias per account
   |
   |- register: auth.mistral.ai /self-service/registration (Kratos)  csrf + email/password, session_token back
   |- verify:   mail link ?code=...&flow=... -> /self-service/verification
   |- key:      console.mistral.ai /api/billing/api-keys            mstrl_... returned once
   |- live proof: POST https://api.mistral.ai/v1/chat/completions    real content = the key is live
```

| Paso | Llamada | Notas |
| --- | --- | --- |
| alias | `GET https://temp.tf/api/account?providers=outlook,hotmail&dot=0&plus=1` | un alias por cuenta; la ruta está limitada por IP (~20 s por dirección), así que el riel reintenta en lugar de quemar el intento |
| registro | `GET /self-service/registration/api` → `POST /self-service/registration?flow=…` | cuerpo JSON + `csrf_token` del flujo; la respuesta ya lleva `session_token` |
| verificación | enlace del buzón → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` `{method:"code", code}` | el propio enlace lleva tanto `code` como `flow` |
| sesión | `session_token` de la respuesta de registro | Kratos rechaza un segundo inicio de sesión con contraseña mientras la primera sesión es reciente, así que solo se vuelve a iniciar sesión ante un `401` |
| workspace | `GET console.mistral.ai/api/workspaces` | primer `items[].uuid` |
| clave | `POST console.mistral.ai/api/billing/api-keys` `{name, workspace, primitive_access_scope:"shared_only"}` | `mstrl_…` en texto plano devuelto una vez |
| puerta | `POST api.mistral.ai/v1/chat/completions` | se requiere un 200 en vivo antes de `keys.txt`; 429 se reintenta una vez tras 2,5 s, luego el siguiente id |

## ⚙️ Opciones de la CLI

```bash
node src/cli.js [mode] [flags]
```

| Flag | Predeterminado | Significado |
| --- | --- | --- |
| `--count N` | 10 | cuentas (= claves) a acuñar |
| `--conc N` | 2 | cuentas en vuelo (máx 16) — se fija una salida por cuenta |
| `--model <id>` | `mistral-tiny-latest` | modelo de puerta fijado; el orden de respaldo lo sigue |
| `--pool <file>` | `proxies.txt` | lista de proxies opcional (la variable de entorno `MISTRAL_PROXIES` también funciona) |
| `--gap MS` | 800 | pausa entre cuentas dentro de un worker |
| `--exits N` | 6 | salidas probadas por cuenta |
| `--timeout MS` | 45000 | tiempo de espera por solicitud |
| `--mail-timeout MS` | 180000 | cuánto espera una cuenta el enlace de verificación |
| `--mail <list>` | `outlook,hotmail` | proveedores de buzón usados para el alias |
| `--verify-only` · `--screen` · `--probe` · `--collect` | — | los modos de arriba |

Una salida que falla se rota para la siguiente cuenta, y una línea del pool puede llevar una nota examinada (`http://host:port 1.2.3.4`) — el cargador conserva el primer token.

## 🛰️ Detrás de un proxy

**Opcional — recomendado a escala (límites por IP, baneos).** La herramienta también funciona sin proxy.

- **Con un pool:** pasa `--pool <file>` (o define `MISTRAL_PROXIES`) y cada solicitud pasa por una salida de esa lista — una cuenta permanece en una salida durante toda su vida (Kratos vincula la sesión a la IP en la que se creó).
- **Sin un pool:** la CLI imprime `running WITHOUT a proxy (direct)` y se conecta directamente; el alias, el enlace de verificación, la clave del workspace y la puerta del chat funcionan igual.
- `--screen` escribe los supervivientes en `proxies.live.txt` para que la siguiente ejecución parta de salidas que ya respondieron — o prueba la ruta directa cuando no tienes pool.

Medido en la flota del operador: un pool de 10 líneas hizo pasar **3 salidas** hasta `auth.mistral.ai`, y cada cuenta que terminó se mantuvo en la única salida en la que empezó (las dos que perdieron su salida por una línea de pool inalcanzable se reintentaron en la siguiente y se reportaron como tal).

## 📄 Archivos

| Ruta | Contenido |
| --- | --- |
| `keys.txt` | claves chat-200, una por línea — ignorado por git |
| `keys-ungated.txt` | claves que fallaron el último barrido `--verify-only` — reintentar más tarde |
| `accounts.json` | alias / clave / workspace / estado de la puerta / salida por cuenta — ignorado por git |
| `proxies.txt` | tu lista de salidas — ignorado por git |
| `proxies.live.txt` | salidas que pasaron `--screen` |

## 🔌 Conectar con 9Router

[9Router](https://9router.com) es un router autoalojado y compatible con OpenAI. Un comando convierte `keys.txt` en un nodo de proveedor con combinaciones funcionales:

```bash
node src/connect-9router.js
```

Predeterminados: `--base http://localhost:20128`, `--password 123456`, `--name "Mistral"`, `--prefix mistral`, `--base-url https://api.mistral.ai/v1`.

El panel del operador lleva las mismas claves como conexiones nativas del proveedor `mistral` (**111** registradas), y una llamada enrutada aterriza en lo que sirva el plan gratuito: `POST /v1/chat/completions mistral/codestral-latest` → **200**, mientras que `mistral/mistral-medium-latest` → **503** `[429] rate_limited` — el techo del plan, visible a un salto de distancia.

## 🔌 Conectar con OmniRoute

[OmniRoute](https://omniroute.online) es un router autoalojado y compatible con OpenAI. Un comando convierte `keys.txt` en un nodo de proveedor con combinaciones funcionales:

```bash
node src/connect-omniroute.js
```

Predeterminados: `--base http://localhost:20128`, `--password 123456`, `--name "Mistral"`, `--prefix mistral`, `--base-url https://api.mistral.ai/v1`.

El panel del operador lleva las mismas claves como conexiones nativas del proveedor `mistral` (**111** registradas), y una llamada enrutada aterriza en lo que sirva el plan gratuito: `POST /v1/chat/completions mistral/codestral-latest` → **200**, mientras que `mistral/mistral-medium-latest` → **503** `[429] rate_limited` — el techo del plan, visible a un salto de distancia.

## 🔑 Qué te da una clave

| | |
| --- | --- |
| 🏢 Proveedor | **Mistral AI** — [mistral.ai](https://mistral.ai) |
| 🎁 Qué da el proveedor | una cuenta gratuita en el api_plan **Experiment** con una clave API — sin tarjeta, sin teléfono, sin captcha |
| 🔑 Qué te da una clave | una clave compatible con OpenAI limitada a su propia cuenta: los ids pequeños que sirve el plan gratuito (`mistral-tiny-latest`, `open-mistral-nemo`, `codestral-latest`, `ministral-*`), a los límites de tasa del plan. La cuota vive en la **cuenta**, que es exactamente por lo que esta herramienta crea una cuenta por clave |
| 🌐 Forma de la API | Compatible con OpenAI: `POST https://api.mistral.ai/v1/chat/completions` |
| 🔒 Tus datos | solo se contacta con `auth.mistral.ai` / `console.mistral.ai` / `api.mistral.ai` y el backend de buzón que configures; las claves permanecen en tu máquina |

## 🐞 Problemas

Si Mistral cambia su flujo de registro, su correo de verificación o su conjunto de modelos del plan gratuito, la herramienta se detiene en ese paso y lo dice (`--probe` muestra los campos del flujo, el riel del buzón y el orden de la puerta que ve). **[Abre un issue](../../issues)** con el comando que ejecutaste y la salida exacta; los PR son bienvenidos.

## 📄 Licencia

MIT © 2026 — ver [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 mistral-bulk-apikey contributors

</div>