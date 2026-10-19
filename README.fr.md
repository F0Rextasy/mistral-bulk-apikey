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

**Créez en masse des comptes Mistral AI avec des clés API générées automatiquement — inférence compatible OpenAI + connecteur 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-45%20served-412991?style=for-the-badge)](https://docs.mistral.ai/getting-started/models/models_overview/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Démarrage rapide](#-quick-start) · [🎁 Offre gratuite](#-free-tier--how-much-you-get) · [🤖 Modèles](#-models--all-45-of-them) · [🧪 Utiliser l'API](#-how-to-use-the-api) · [✅ Vérifié](#-verified-working--every-key-is-tested) · [🧭 Comment ça marche](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Options](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Problèmes](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Pourquoi ce projet existe

La porte de Mistral est une porte **Ory Kratos** : `POST /self-service/registration` prend un e-mail, un mot de passe et un nom, rien d'autre — **pas de carte, pas de téléphone, pas de captcha** — et l'étape de la boîte de réception est un lien qui porte le code *et* l'id du flow, si bien que tout le rail fonctionne en HTTP simple avec un alias de boîte mail par compte. Une fois la session créée, la propre route de facturation de la console émet la clé : `POST /api/billing/api-keys {name, workspace, primitive_access_scope:"shared_only"}` → `mstrl_…` (45 caractères).

L'unité qui passe à l'échelle est **un compte = une clé**. Mesuré sur la flotte de l'opérateur (2026-10-19) : le rail a poussé **111 clés** en 12 lots de 8 à **~14,6 s/clé** avec 2 workers, perdant 2 comptes (une boîte mail qui n'a jamais livré en 180 s, un `login 400`) — aucun mur CAPTCHA, aucun mur de rate-limit. Les **111** ont répondu chat-200 sur `mistral-tiny-latest` **et** sur `codestral-latest` — **222/222** appels en direct. Pendant la vérification de ce dépôt, son propre CLI a produit **3 clés** de plus de la même forme (2 à `--conc 2` en 56 s, 1 en 26 s), chacune chat-200 avant d'être écrite. Ce qui est multiplié, c'est l'api_plan gratuit **Experiment**, c'est pourquoi les ids plus gros restent hors de la porte (voir ci-dessous).

## 🎁 Offre gratuite — ce que vous obtenez

**Chaque nouveau compte reçoit une clé gratuite** — pas de carte, pas de captcha, pas de téléphone.

| Quoi | Valeur |
| --- | --- |
| Carte requise | **Non** |
| Téléphone | **non demandé** — la console expose bien une route `/api/users/verify-phone/send-code`, mais sur un compte gratuit neuf elle répond `400 can't be verified` et la porte du chat n'en a jamais besoin |
| Captcha / Turnstile | **aucun** sur le flow API Kratos utilisé ici |
| Boîte mail | **requise** — un alias par compte ; un alias plus d'outlook/hotmail `temp.tf` arrive sur un domaine que Mistral accepte |
| Plan | l'api_plan gratuit **Experiment** |
| Crédit d'inscription | rien à dépenser — le plan gratuit lui-même sert les ids de la porte |
| Plafond de modèles | les ids plus gros répondent `429 rate_limited` avec une clé parfaitement valide, ils ne sont donc pas dans la porte |
| L'unité qui passe à l'échelle | **un compte = une clé** → `--count N` signifie « N comptes gratuits » |

> 💡 L'offre gratuite est définie par Mistral AI et peut changer. Vérifiez les chiffres en direct sur [mistral.ai](https://mistral.ai) — et laissez la porte de l'outil décider :

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modèles — les 45

Une clé gratuite voit **45 ids de modèles** (`GET /v1/models`, mesuré le 2026-10-19) — chat, embed, OCR et audio dans la même liste. En demandant à chaque id compatible chat une vraie complétion (24 ids, un balayage, même clé), cette liste se divise en trois :

* **9 ids répondent 200** — `codestral-2508`, `codestral-latest`, `mistral-code-latest`, `ministral-14b-2512`, `ministral-14b-latest`, `ministral-3b-2512`, `ministral-3b-latest`, `ministral-8b-2512`, `ministral-8b-latest` ;
* **13 ids répondent 429 `rate_limited`** — toute la moitié `mistral-medium*`, `mistral-small*`, `magistral-*` et `mistral-vibe-cli-*` ;
* **2 ids répondent 403** — `labs-leanstral-1-5` et `labs-leanstral-1-5-1`.

Seuls les ids sur lesquels une clé a réellement répondu sont listés ici :

| Model ID | ✓ | Notes |
| --- | --- | --- |
| `mistral-tiny-latest` | ✓ | premier arrêt de la porte ; répond en tant que `ministral-8b-2512` — un alias hérité que la liste du catalogue plus récent ne nomme plus |
| `open-mistral-nemo` | ✓ | également absent de la liste des 45 ids et toujours servi |
| `codestral-latest` | ✓ | le modèle de code ; second pin, utilisé pour le balayage de 222 appels ci-dessus |

La porte parcourt ces trois modèles dans l'ordre et s'arrête au premier 200, si bien qu'une clé n'est conservée que lorsque le compte sert réellement l'un d'eux. Un 429 est traité comme un signal de rythme (une nouvelle tentative après 2,5 s) plutôt que comme une clé morte.

## 🧪 Comment utiliser l'API

Le point de terminaison est compatible OpenAI sous **`/v1`** :

```bash
curl https://api.mistral.ai/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"codestral-latest","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

Une clé de plan gratuit répond sur les petits ids et renvoie `429 rate_limited` pour `mistral-medium*` / `mistral-small*` — c'est le plan, pas la clé.

## 🛠 Démarrage rapide

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

`keys.txt` n'est écrit **qu'** après qu'une complétion de chat en direct a prouvé la clé.

| Mode | Ce qu'il fait |
| --- | --- |
| `run` (par défaut) | crée des comptes jusqu'à `--count`, valide chaque clé par un chat en direct |
| `--verify-only` | re-balaye `keys.txt`, déplaçant tout ce qui échoue vers `keys-ungated.txt` |
| `--screen` | teste votre liste de proxies contre Mistral → `proxies.live.txt` |
| `--probe` | vérification de l'environnement : sorties, rail de boîte mail, champs du flow d'inscription, ordre de la porte, une clé existante |
| `--collect` | reconstruit `keys.txt` à partir de `accounts.json` |

### 🖱️ Le launcher

Le launcher demande la liste de proxies, le nombre de comptes et le modèle de la porte, les mémorise dans `launcher.config.json`, et exécute le CLI avec les bons flags. Il filtre aussi votre liste de sorties et peut enregistrer `keys.txt` auprès d'un 9Router local.

## ✅ Vérifié fonctionnel — chaque clé est testée

| Vérification | Résultat |
| --- | --- |
| `GET /self-service/registration/api` | **200** — id du flow + `csrf_token` ; champs vus : `traits.email`, `password`, `traits.name.first`, `traits.name.last`, `method` |
| `POST /self-service/registration?flow=…` | **200** — compte créé, `session_token` dans le corps |
| lien de la boîte mail `?code=…&flow=…` → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` | **200** — vérifié (`410` = déjà vérifié, également accepté) |
| `GET /api/workspaces` | **200** — uuid du workspace |
| `POST /api/billing/api-keys` | **200** — `mstrl_…`, 45 caractères, pas de carte |
| `POST https://api.mistral.ai/v1/chat/completions` — exécuté pour **chaque** clé avant son écriture | **200** avec du contenu réel |
| balayage complet de la flotte | **111/111** clés chat-200 sur `mistral-tiny-latest` **et** `codestral-latest` (222/222 appels, 2026-10-19) |
| le CLI de ce dépôt, création en direct pendant sa vérification | **3 clés** créées et chat-200 (`--count 3` → 2 en 56 s à `--conc 2` ; `--count 1` → 1 en 26 s). Un compte du premier lot a été perdu à cause de deux sorties injoignables dans le pool de test et signalé comme tel |
| une clé qui échoue à sa vérification de chat | jamais écrite dans `keys.txt` |

La réponse de la porte, mot pour mot (la première clé créée par le CLI livré, `mistral-tiny-latest`) :

```json
{"id":"cb51dff9b36c41a08d41c8c0533885da","created":1792380045,"model":"ministral-8b-2512","usage":{"prompt_tokens":9,"total_tokens":11,"completion_tokens":2,"service_tier":"standard"},"object":"chat.completion","choices":[{"index":0,"finish_reason":"stop","message":{"role":"assistant","tool_calls":null,"content":"ok"}}]}
```

## 🧭 Comment ça marche

```
inbox (one Microsoft-family alias per account)                    a fresh alias per account
   |
   |- register: auth.mistral.ai /self-service/registration (Kratos)  csrf + email/password, session_token back
   |- verify:   mail link ?code=...&flow=... -> /self-service/verification
   |- key:      console.mistral.ai /api/billing/api-keys            mstrl_... returned once
   |- live proof: POST https://api.mistral.ai/v1/chat/completions    real content = the key is live
```

| Étape | Appel | Notes |
| --- | --- | --- |
| alias | `GET https://temp.tf/api/account?providers=outlook,hotmail&dot=0&plus=1` | un alias par compte ; la route est limitée par IP (~20 s par adresse), donc le rail réessaie plutôt que de brûler la tentative |
| inscription | `GET /self-service/registration/api` → `POST /self-service/registration?flow=…` | corps JSON + `csrf_token` issu du flow ; la réponse porte déjà le `session_token` |
| vérification | lien depuis la boîte mail → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` `{method:"code", code}` | le lien lui-même porte à la fois `code` et `flow` |
| session | `session_token` issu de la réponse d'inscription | Kratos refuse une seconde connexion par mot de passe tant que la première session est fraîche, donc une reconnexion n'a lieu que sur un `401` |
| workspace | `GET console.mistral.ai/api/workspaces` | premier `items[].uuid` |
| clé | `POST console.mistral.ai/api/billing/api-keys` `{name, workspace, primitive_access_scope:"shared_only"}` | `mstrl_…` en clair renvoyé une seule fois |
| porte | `POST api.mistral.ai/v1/chat/completions` | 200 en direct requis avant `keys.txt` ; 429 réessayé une fois après 2,5 s, puis l'id suivant |

## ⚙️ Options du CLI

```bash
node src/cli.js [mode] [flags]
```

| Flag | Défaut | Signification |
| --- | --- | --- |
| `--count N` | 10 | comptes (= clés) à créer |
| `--conc N` | 2 | comptes en vol (max 16) — une sortie est épinglée par compte |
| `--model <id>` | `mistral-tiny-latest` | modèle de la porte épinglé ; l'ordre de repli le suit |
| `--pool <file>` | `proxies.txt` | liste de proxies (la variable d'env `MISTRAL_PROXIES` fonctionne aussi) |
| `--gap MS` | 800 | pause entre les comptes au sein d'un worker |
| `--tries N` | 2 | sorties essayées par compte |
| `--timeout MS` | 45000 | délai d'expiration par requête |
| `--mail-timeout MS` | 180000 | combien de temps un compte attend le lien de vérification |
| `--mail <list>` | `outlook,hotmail` | fournisseurs de boîte mail utilisés pour l'alias |
| `--verify-only` · `--screen` · `--probe` · `--collect` | — | les modes ci-dessus |

Une sortie qui échoue est remplacée pour le compte suivant, et une ligne du pool peut porter une note filtrée (`http://host:port 1.2.3.4`) — le chargeur conserve le premier token.

## 🛰️ Derrière un proxy

Chaque requête sort par une sortie de votre pool — l'outil ne contacte jamais Mistral depuis votre propre ligne, et **un compte vit sur une seule sortie** pendant toute sa durée de vie (Kratos lie la session à l'IP sur laquelle elle a été créée). Mesuré sur la flotte de l'opérateur : un pool de 10 lignes a fait passer **3 sorties** jusqu'à `auth.mistral.ai`, et chaque compte qui a terminé est resté sur la sortie unique avec laquelle il a commencé (les deux qui ont perdu leur sortie à cause d'une ligne de pool injoignable ont été réessayés sur la suivante et signalés comme tels). `--screen` écrit les survivants dans `proxies.live.txt` afin que la prochaine exécution parte de sorties qui ont déjà répondu.

## 📄 Fichiers

| Chemin | Contenu |
| --- | --- |
| `keys.txt` | clés chat-200, une par ligne — ignoré par git |
| `keys-ungated.txt` | clés qui ont échoué au dernier balayage `--verify-only` — à réessayer plus tard |
| `accounts.json` | alias / clé / workspace / statut de la porte / sortie par compte — ignoré par git |
| `proxies.txt` | votre liste de sorties — ignorée par git |
| `proxies.live.txt` | sorties ayant passé `--screen` |

## 🔌 Se connecter à 9Router

[9Router](https://9router.com) est un routeur auto-hébergé, compatible OpenAI. Une seule commande transforme `keys.txt` en un nœud fournisseur avec des combos fonctionnels :

```bash
node src/connect-9router.js
```

Défauts : `--base http://localhost:20128`, `--password 123456`, `--name "Mistral"`, `--prefix mistral`, `--base-url https://api.mistral.ai/v1`.

Le panneau de l'opérateur porte les mêmes clés que les connexions natives au fournisseur `mistral` (**111** enregistrées), et un appel routé atterrit sur ce que sert le plan gratuit : `POST /v1/chat/completions mistral/codestral-latest` → **200**, tandis que `mistral/mistral-medium-latest` → **503** `[429] rate_limited` — le plafond du plan, visible à un saut de distance.

## 🔑 Ce qu'une clé vous donne

| | |
| --- | --- |
| 🏢 Fournisseur | **Mistral AI** — [mistral.ai](https://mistral.ai) |
| 🎁 Ce que le fournisseur donne | un compte gratuit sur l'api_plan **Experiment** avec une clé API — pas de carte, pas de téléphone, pas de captcha |
| 🔑 Ce qu'une clé vous donne | une clé compatible OpenAI limitée à son propre compte : les petits ids que sert le plan gratuit (`mistral-tiny-latest`, `open-mistral-nemo`, `codestral-latest`, `ministral-*`), aux limites de débit du plan. Le quota vit sur le **compte**, ce qui est exactement pourquoi cet outil crée un compte par clé |
| 🌐 Forme de l'API | compatible OpenAI : `POST https://api.mistral.ai/v1/chat/completions` |
| 🔒 Vos données | seuls `auth.mistral.ai` / `console.mistral.ai` / `api.mistral.ai` et le backend de boîte mail que vous configurez sont contactés ; les clés restent sur votre machine |

## 🐞 Problèmes

Si Mistral modifie son flow d'inscription, son mail de vérification ou son ensemble de modèles du plan gratuit, l'outil s'arrête à cette étape et le signale (`--probe` montre les champs du flow, le rail de boîte mail et l'ordre de la porte qu'il voit). **[Ouvrez un ticket](../../issues)** avec la commande que vous avez exécutée et la sortie exacte ; les PR sont bienvenues.

## 📄 Licence

MIT © 2026 — voir [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 mistral-bulk-apikey contributors

</div>