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

**Crie contas Mistral AI em massa com chaves de API geradas automaticamente — inferência compatível com OpenAI + conector 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-45%20served-412991?style=for-the-badge)](https://docs.mistral.ai/getting-started/models/models_overview/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Início rápido](#-quick-start) · [🎁 Nível gratuito](#-free-tier--how-much-you-get) · [🤖 Modelos](#-models--all-45-of-them) · [🧪 Use a API](#-how-to-use-the-api) · [✅ Verificado](#-verified-working--every-key-is-tested) · [🧭 Como funciona](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Opções](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Problemas](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Por que isso existe

A porta da Mistral é uma porta **Ory Kratos**: `POST /self-service/registration` recebe um e-mail, uma senha e um nome e nada mais — **sem cartão, sem telefone, sem captcha** — e a etapa da caixa de entrada é um link que carrega o código *e* o id do fluxo, então todo o trilho roda sobre HTTP simples com um alias de caixa de correio por conta. Uma vez que a sessão existe, a própria rota de cobrança do console emite a chave: `POST /api/billing/api-keys {name, workspace, primitive_access_scope:"shared_only"}` → `mstrl_…` (45 caracteres).

A unidade que escala é **uma conta = uma chave**. Medido na frota do operador (2026-10-19): o trilho empurrou **111 chaves** em 12 lotes de 8 a **~14,6 s/chave** com 2 workers, perdendo 2 contas (uma caixa de entrada que nunca entregou dentro de 180 s, um `login 400`) — sem barreira de CAPTCHA, sem barreira de limite de taxa. Todas as **111** responderam chat-200 em `mistral-tiny-latest` **e** em `codestral-latest` — **222/222** chamadas ao vivo. Enquanto este repositório estava sendo verificado, sua própria CLI cunhou **mais 3** chaves do mesmo formato (2 com `--conc 2` em 56 s, 1 em 26 s), cada uma chat-200 antes de ser gravada. O que está sendo multiplicado é o api_plan gratuito **Experiment**, e é por isso que os ids maiores ficam fora do portão (veja abaixo).

## 🎁 Nível gratuito — quanto você recebe

**Toda nova conta recebe uma chave gratuita** — sem cartão, sem captcha, sem telefone.

| O quê | Valor |
| --- | --- |
| Cartão exigido | **Não** |
| Telefone | **não solicitado** — o console até inclui uma rota `/api/users/verify-phone/send-code`, mas em uma conta gratuita nova ela responde `400 can't be verified` e o portão do chat nunca precisa dela |
| Captcha / Turnstile | **nenhum** no fluxo da API Kratos usado aqui |
| Caixa de correio | **obrigatória** — um alias por conta; um alias plus de outlook/hotmail do `temp.tf` chega em um domínio que a Mistral aceita |
| Plano | o api_plan gratuito **Experiment** |
| Crédito de cadastro | nada a gastar — o próprio plano gratuito serve os ids no portão |
| Teto de modelos | ids maiores respondem `429 rate_limited` mesmo com uma chave perfeitamente boa, então não estão no portão |
| A unidade que escala | **uma conta = uma chave** → `--count N` é "N contas gratuitas" |

> 💡 O nível gratuito é definido pela Mistral AI e pode mudar. Confira os números ao vivo em [mistral.ai](https://mistral.ai) — e deixe o próprio portão da ferramenta decidir:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelos — todos os 45

Uma chave gratuita enxerga **45 ids de modelo** (`GET /v1/models`, medido em 2026-10-19) — chat, embed, OCR e áudio na mesma lista. Pedir a cada id compatível com chat uma conclusão real (24 ids, uma varredura, mesma chave) divide essa lista em três:

* **9 ids respondem 200** — `codestral-2508`, `codestral-latest`, `mistral-code-latest`, `ministral-14b-2512`, `ministral-14b-latest`, `ministral-3b-2512`, `ministral-3b-latest`, `ministral-8b-2512`, `ministral-8b-latest`;
* **13 ids respondem 429 `rate_limited`** — toda a metade `mistral-medium*`, `mistral-small*`, `magistral-*` e `mistral-vibe-cli-*`;
* **2 ids respondem 403** — `labs-leanstral-1-5` e `labs-leanstral-1-5-1`.

Apenas os ids nos quais uma chave realmente respondeu estão listados aqui:

| Model ID | ✓ | Notas |
| --- | --- | --- |
| `mistral-tiny-latest` | ✓ | a primeira parada do portão; responde como `ministral-8b-2512` — um alias legado que a lista mais recente do catálogo não nomeia mais |
| `open-mistral-nemo` | ✓ | também ausente da lista de 45 ids e ainda servido |
| `codestral-latest` | ✓ | o modelo de código; segundo pin, usado para a varredura de 222 chamadas acima |

O portão percorre esses três em ordem e para no primeiro 200, então uma chave só é mantida quando a conta realmente serve um deles. Um 429 é tratado como sinal de ritmo (uma nova tentativa após 2,5 s) em vez de chave morta.

## 🧪 Como usar a API

O endpoint é compatível com OpenAI sob **`/v1`**:

```bash
curl https://api.mistral.ai/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"codestral-latest","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

Uma chave do plano gratuito responde nos ids pequenos e retorna `429 rate_limited` para `mistral-medium*` / `mistral-small*` — isso é o plano, não a chave.

## 🛠 Início rápido

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

`keys.txt` é gravado **somente** depois que uma conclusão de chat ao vivo comprova a chave.

| Modo | O que faz |
| --- | --- |
| `run` (padrão) | cria contas até `--count`, valida cada chave com um chat ao vivo |
| `--verify-only` | revarre `keys.txt`, movendo qualquer coisa que falhar para `keys-ungated.txt` |
| `--screen` | testa sua lista de proxies contra a Mistral → `proxies.live.txt` |
| `--probe` | verificação de ambiente: saídas, trilho da caixa de entrada, campos do fluxo de registro, ordem do portão, uma chave existente |
| `--collect` | reconstrói `keys.txt` a partir de `accounts.json` |

### 🖱️ O launcher

O launcher pede a lista de proxies, a contagem de contas e o modelo do portão, memoriza-os em `launcher.config.json` e executa a CLI com as flags corretas. Ele também tria sua lista de saídas e pode registrar `keys.txt` em um 9Router local.

## ✅ Verificado e funcionando — toda chave é testada

| Verificação | Resultado |
| --- | --- |
| `GET /self-service/registration/api` | **200** — id do fluxo + `csrf_token`; campos vistos: `traits.email`, `password`, `traits.name.first`, `traits.name.last`, `method` |
| `POST /self-service/registration?flow=…` | **200** — conta criada, `session_token` no corpo |
| link da caixa de entrada `?code=…&flow=…` → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` | **200** — verificado (`410` = já verificado, também aceito) |
| `GET /api/workspaces` | **200** — uuid do workspace |
| `POST /api/billing/api-keys` | **200** — `mstrl_…`, 45 caracteres, sem cartão |
| `POST https://api.mistral.ai/v1/chat/completions` — executado para **cada** chave antes de ser gravada | **200** com conteúdo real |
| varredura completa da frota | **111/111** chaves chat-200 em `mistral-tiny-latest` **e** `codestral-latest` (222/222 chamadas, 2026-10-19) |
| CLI deste repositório, criação ao vivo enquanto era verificado | **3 chaves** cunhadas e chat-200 (`--count 3` → 2 em 56 s com `--conc 2`; `--count 1` → 1 em 26 s). Uma conta do primeiro lote foi perdida para duas saídas inalcançáveis no pool de teste e reportada como tal |
| uma chave que falha na verificação de chat | nunca gravada em `keys.txt` |

A resposta do portão, literalmente (a primeira chave que a CLI fornecida cunhou, `mistral-tiny-latest`):

```json
{"id":"cb51dff9b36c41a08d41c8c0533885da","created":1792380045,"model":"ministral-8b-2512","usage":{"prompt_tokens":9,"total_tokens":11,"completion_tokens":2,"service_tier":"standard"},"object":"chat.completion","choices":[{"index":0,"finish_reason":"stop","message":{"role":"assistant","tool_calls":null,"content":"ok"}}]}
```

## 🧭 Como funciona

```
inbox (one Microsoft-family alias per account)                    a fresh alias per account
   |
   |- register: auth.mistral.ai /self-service/registration (Kratos)  csrf + email/password, session_token back
   |- verify:   mail link ?code=...&flow=... -> /self-service/verification
   |- key:      console.mistral.ai /api/billing/api-keys            mstrl_... returned once
   |- live proof: POST https://api.mistral.ai/v1/chat/completions    real content = the key is live
```

| Etapa | Chamada | Notas |
| --- | --- | --- |
| alias | `GET https://temp.tf/api/account?providers=outlook,hotmail&dot=0&plus=1` | um alias por conta; a rota tem limitação por IP (~20 s por endereço), então o trilho tenta novamente em vez de queimar a tentativa |
| registro | `GET /self-service/registration/api` → `POST /self-service/registration?flow=…` | corpo JSON + `csrf_token` do fluxo; a resposta já carrega `session_token` |
| verificação | link da caixa de entrada → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` `{method:"code", code}` | o próprio link carrega tanto `code` quanto `flow` |
| sessão | `session_token` da resposta de registro | o Kratos recusa um segundo login por senha enquanto a primeira sessão está recente, então um novo login só acontece em um `401` |
| workspace | `GET console.mistral.ai/api/workspaces` | primeiro `items[].uuid` |
| chave | `POST console.mistral.ai/api/billing/api-keys` `{name, workspace, primitive_access_scope:"shared_only"}` | `mstrl_…` em texto simples retornado uma vez |
| portão | `POST api.mistral.ai/v1/chat/completions` | 200 ao vivo exigido antes de `keys.txt`; 429 tentado novamente uma vez após 2,5 s, depois o próximo id |

## ⚙️ Opções da CLI

```bash
node src/cli.js [mode] [flags]
```

| Flag | Padrão | Significado |
| --- | --- | --- |
| `--count N` | 10 | contas (= chaves) a cunhar |
| `--conc N` | 2 | contas em andamento (máx 16) — uma saída é fixada por conta |
| `--model <id>` | `mistral-tiny-latest` | modelo do portão fixado; a ordem de fallback o segue |
| `--pool <file>` | `proxies.txt` | lista de proxies (a variável de ambiente `MISTRAL_PROXIES` também funciona) |
| `--gap MS` | 800 | pausa entre contas dentro de um worker |
| `--tries N` | 2 | saídas tentadas por conta |
| `--timeout MS` | 45000 | timeout por requisição |
| `--mail-timeout MS` | 180000 | quanto tempo uma conta espera pelo link de verificação |
| `--mail <list>` | `outlook,hotmail` | provedores de caixa de entrada usados para o alias |
| `--verify-only` · `--screen` · `--probe` · `--collect` | — | os modos acima |

Uma saída que falha é rotacionada para a próxima conta, e uma linha do pool pode carregar uma nota de triagem (`http://host:port 1.2.3.4`) — o carregador mantém o primeiro token.

## 🛰️ Atrás de um proxy

Toda requisição sai por uma saída do seu pool — a ferramenta nunca disca para a Mistral a partir da sua própria linha, e **uma conta vive em uma saída** durante toda a sua vida (o Kratos vincula a sessão ao IP em que ela foi criada). Medido na frota do operador: um pool de 10 linhas colocou **3 saídas** através de `auth.mistral.ai`, e toda conta que terminou manteve-se na única saída em que começou (as duas que perderam sua saída para uma linha de pool inalcançável foram tentadas novamente na próxima e reportadas como tal). `--screen` grava os sobreviventes em `proxies.live.txt` para que a próxima execução comece a partir de saídas que já responderam.

## 📄 Arquivos

| Caminho | Conteúdo |
| --- | --- |
| `keys.txt` | chaves chat-200, uma por linha — ignorado pelo git |
| `keys-ungated.txt` | chaves que falharam na última varredura `--verify-only` — tente novamente depois |
| `accounts.json` | alias / chave / workspace / status do portão / saída por conta — ignorado pelo git |
| `proxies.txt` | sua lista de saídas — ignorado pelo git |
| `proxies.live.txt` | saídas que passaram em `--screen` |

## 🔌 Conectar ao 9Router

[9Router](https://9router.com) é um roteador auto-hospedado e compatível com OpenAI. Um comando transforma `keys.txt` em um nó de provedor com combos funcionais:

```bash
node src/connect-9router.js
```

Padrões: `--base http://localhost:20128`, `--password 123456`, `--name "Mistral"`, `--prefix mistral`, `--base-url https://api.mistral.ai/v1`.

O painel do operador carrega as mesmas chaves como conexões nativas do provedor `mistral` (**111** registradas), e uma chamada roteada cai no que o plano gratuito servir: `POST /v1/chat/completions mistral/codestral-latest` → **200**, enquanto `mistral/mistral-medium-latest` → **503** `[429] rate_limited` — o teto do plano, visível a um salto de distância.

## 🔑 O que uma chave te dá

| | |
| --- | --- |
| 🏢 Provedor | **Mistral AI** — [mistral.ai](https://mistral.ai) |
| 🎁 O que o provedor dá | uma conta gratuita no api_plan **Experiment** com uma chave de API — sem cartão, sem telefone, sem captcha |
| 🔑 O que uma chave te dá | uma chave compatível com OpenAI limitada à sua própria conta: os ids pequenos que o plano gratuito serve (`mistral-tiny-latest`, `open-mistral-nemo`, `codestral-latest`, `ministral-*`), nos limites de taxa do plano. A cota vive na **conta**, e é exatamente por isso que esta ferramenta cria uma conta por chave |
| 🌐 Formato da API | Compatível com OpenAI: `POST https://api.mistral.ai/v1/chat/completions` |
| 🔒 Seus dados | apenas `auth.mistral.ai` / `console.mistral.ai` / `api.mistral.ai` e o backend de caixa de entrada que você configurar são contatados; as chaves ficam na sua máquina |

## 🐞 Problemas

Se a Mistral mudar seu fluxo de registro, seu e-mail de verificação ou seu conjunto de modelos do plano gratuito, a ferramenta para nessa etapa e avisa (`--probe` mostra os campos do fluxo, o trilho da caixa de entrada e a ordem do portão que ela enxerga). **[Abra uma issue](../../issues)** com o comando que você executou e a saída exata; PRs são bem-vindos.

## 📄 Licença

MIT © 2026 — veja [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 mistral-bulk-apikey contributors

</div>