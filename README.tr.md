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

**Otomatik oluşturulan API anahtarlarıyla toplu Mistral AI hesabı açın — OpenAI uyumlu çıkarım + 9Router bağlayıcısı.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-45%20served-412991?style=for-the-badge)](https://docs.mistral.ai/getting-started/models/models_overview/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Hızlı başlangıç](#-quick-start) · [🎁 Ücretsiz katman](#-free-tier--how-much-you-get) · [🤖 Modeller](#-models--all-45-of-them) · [🧪 API'yi kullanın](#-how-to-use-the-api) · [✅ Doğrulandı](#-verified-working--every-key-is-tested) · [🧭 Nasıl çalışır](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Seçenekler](#️-cli-options) · [🛰️ Proxy'ler](#️-behind-a-proxy) · [🐞 Sorunlar](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Bu neden var

Mistral'ın kapısı bir **Ory Kratos** kapısıdır: `POST /self-service/registration` yalnızca bir e-posta, bir parola ve bir isim alır, başka hiçbir şey — **kart yok, telefon yok, captcha yok** — ve gelen kutusu adımı, kodu *ve* akış kimliğini taşıyan bir bağlantıdır; böylece tüm hat, hesap başına bir posta kutusu takma adıyla düz HTTP üzerinden çalışır. Oturum oluşturulduğunda, konsolun kendi faturalama rotası anahtarı verir: `POST /api/billing/api-keys {name, workspace, primitive_access_scope:"shared_only"}` → `mstrl_…` (45 karakter).

Ölçeklenen birim **bir hesap = bir anahtar**'dır. Operatörün filosunda ölçüldü (2026-10-19): hat, 2 işçiyle 8'lik 12 yığında **111 anahtar** gönderdi, **~14,6 sn/anahtar** hızında, 2 hesap kaybederek (biri 180 sn içinde hiç teslim etmeyen bir gelen kutusu, biri `login 400`) — CAPTCHA duvarı yok, hız sınırı duvarı yok. **111**'inin tamamı `mistral-tiny-latest` **ve** `codestral-latest` üzerinde chat-200 yanıtı verdi — **222/222** canlı çağrı. Bu depo doğrulanırken, kendi CLI'si aynı yapıda **3 anahtar daha** üretti (`--conc 2` ile 56 sn'de 2, 26 sn'de 1), her biri yazılmadan önce chat-200 verdi. Çoğaltılan şey ücretsiz **Experiment** api_plan'ıdır, bu yüzden daha büyük kimlikler kapının dışında kalır (aşağıya bakın).

## 🎁 Ücretsiz katman — ne kadar alırsınız

**Her yeni hesap ücretsiz bir anahtar alır** — kart yok, captcha yok, telefon yok.

| Ne | Değer |
| --- | --- |
| Kart gerekli mi | **Hayır** |
| Telefon | **istenmez** — konsol bir `/api/users/verify-phone/send-code` rotası sunar, ancak yeni ücretsiz bir hesapta `400 can't be verified` yanıtı verir ve sohbet kapısı buna hiç ihtiyaç duymaz |
| Captcha / Turnstile | burada kullanılan Kratos API akışında **yok** |
| Posta kutusu | **gerekli** — hesap başına bir takma ad; Mistral'ın kabul ettiği bir alan adına gelen bir `temp.tf` outlook/hotmail artı-takma adı |
| Plan | ücretsiz **Experiment** api_plan |
| Kayıt kredisi | harcanacak bir şey yok — kapıdaki kimlikleri ücretsiz planın kendisi sunar |
| Model tavanı | daha büyük kimlikler, tamamen geçerli bir anahtarla `429 rate_limited` yanıtı verir, bu yüzden kapıda değiller |
| Ölçeklenen birim | **bir hesap = bir anahtar** → `--count N` demek "N ücretsiz hesap" demektir |

> 💡 Ücretsiz katman Mistral AI tarafından belirlenir ve değişebilir. Güncel sayıları [mistral.ai](https://mistral.ai) adresinden kontrol edin — ve kararı aracın kendi kapısına bırakın:

```bash
node src/cli.js --verify-only     # keys.txt içindeki her anahtar gerçek bir sohbet çağrısıyla yeniden test edilir
```

## 🤖 Modeller — 45'inin tamamı

Tek bir ücretsiz anahtar **45 model kimliği** görür (`GET /v1/models`, 2026-10-19'da ölçüldü) — sohbet, embed, OCR ve ses aynı listede. Sohbet yeteneği olan her kimlikten gerçek bir tamamlama istemek (24 kimlik, tek tarama, aynı anahtar) bu listeyi üçe böler:

* **9 kimlik 200 yanıtı verir** — `codestral-2508`, `codestral-latest`, `mistral-code-latest`, `ministral-14b-2512`, `ministral-14b-latest`, `ministral-3b-2512`, `ministral-3b-latest`, `ministral-8b-2512`, `ministral-8b-latest`;
* **13 kimlik 429 `rate_limited` yanıtı verir** — tüm `mistral-medium*`, `mistral-small*`, `magistral-*` ve `mistral-vibe-cli-*` yarısı;
* **2 kimlik 403 yanıtı verir** — `labs-leanstral-1-5` ve `labs-leanstral-1-5-1`.

Burada yalnızca bir anahtarın gerçekten yanıt verdiği kimlikler listelenmiştir:

| Model Kimliği | ✓ | Notlar |
| --- | --- | --- |
| `mistral-tiny-latest` | ✓ | kapının ilk durağı; `ministral-8b-2512` olarak yanıt verir — yeni katalog listesinin artık adlandırmadığı eski bir takma ad |
| `open-mistral-nemo` | ✓ | 45 kimlikli listede de yok ve hâlâ sunuluyor |
| `codestral-latest` | ✓ | kod modeli; ikinci sabitleme, yukarıdaki 222 çağrılık tarama için kullanıldı |

Kapı bu üçünü sırayla dener ve ilk 200'de durur, böylece bir anahtar yalnızca hesap gerçekten bunlardan birini sunduğunda saklanır. 429, ölü bir anahtar değil, bir hız sinyali olarak değerlendirilir (2,5 sn sonra bir yeniden deneme).

## 🧪 API nasıl kullanılır

Uç nokta **`/v1`** altında OpenAI uyumludur:

```bash
curl https://api.mistral.ai/v1/chat/completions \
  -H "Authorization: Bearer <your key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"codestral-latest","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
```

Ücretsiz planlı bir anahtar küçük kimliklerde yanıt verir ve `mistral-medium*` / `mistral-small*` için `429 rate_limited` döndürür — bu anahtarın değil, planın sonucudur.

## 🛠 Hızlı başlangıç

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

`keys.txt` **yalnızca** canlı bir sohbet tamamlaması anahtarı kanıtladıktan sonra yazılır.

| Mod | Ne yapar |
| --- | --- |
| `run` (varsayılan) | `--count` değerine kadar hesap üretir, her anahtarı canlı bir sohbetle kapıdan geçirir |
| `--verify-only` | `keys.txt` dosyasını yeniden tarar, başarısız olanları `keys-ungated.txt` dosyasına taşır |
| `--screen` | proxy listenizi Mistral'a karşı test eder → `proxies.live.txt` |
| `--probe` | ortam kontrolü: çıkışlar, gelen kutusu hattı, kayıt akışı alanları, kapı sırası, mevcut bir anahtar |
| `--collect` | `accounts.json` dosyasından `keys.txt` dosyasını yeniden oluşturur |

### 🖱️ Başlatıcı

Başlatıcı proxy listesini, hesap sayısını ve kapı modelini sorar, bunları `launcher.config.json` dosyasında hatırlar ve CLI'yi doğru bayraklarla çalıştırır. Ayrıca çıkış listenizi tarar ve `keys.txt` dosyasını yerel bir 9Router'a kaydedebilir.

## ✅ Çalıştığı doğrulandı — her anahtar test edilir

| Kontrol | Sonuç |
| --- | --- |
| `GET /self-service/registration/api` | **200** — akış kimliği + `csrf_token`; görülen alanlar: `traits.email`, `password`, `traits.name.first`, `traits.name.last`, `method` |
| `POST /self-service/registration?flow=…` | **200** — hesap oluşturuldu, gövdede `session_token` |
| gelen kutusu bağlantısı `?code=…&flow=…` → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` | **200** — doğrulandı (`410` = zaten doğrulanmış, o da kabul edilir) |
| `GET /api/workspaces` | **200** — çalışma alanı uuid'si |
| `POST /api/billing/api-keys` | **200** — `mstrl_…`, 45 karakter, kart yok |
| `POST https://api.mistral.ai/v1/chat/completions` — yazılmadan önce **her** anahtar için çalıştırılır | gerçek içerikle **200** |
| tam filo taraması | **111/111** anahtar `mistral-tiny-latest` **ve** `codestral-latest` üzerinde chat-200 (222/222 çağrı, 2026-10-19) |
| bu deponun CLI'si, doğrulanırken canlı üretim | **3 anahtar** üretildi ve chat-200 (`--count 3` → `--conc 2` ile 56 sn'de 2; `--count 1` → 26 sn'de 1). İlk partinin bir hesabı, test havuzundaki iki erişilemez çıkış yüzünden kaybedildi ve bu şekilde bildirildi |
| sohbet kontrolünde başarısız olan bir anahtar | `keys.txt` dosyasına asla yazılmaz |

Kapının yanıtı, birebir (gönderilen CLI'nin ürettiği ilk anahtar, `mistral-tiny-latest`):

```json
{"id":"cb51dff9b36c41a08d41c8c0533885da","created":1792380045,"model":"ministral-8b-2512","usage":{"prompt_tokens":9,"total_tokens":11,"completion_tokens":2,"service_tier":"standard"},"object":"chat.completion","choices":[{"index":0,"finish_reason":"stop","message":{"role":"assistant","tool_calls":null,"content":"ok"}}]}
```

## 🧭 Nasıl çalışır

```
inbox (one Microsoft-family alias per account)                    a fresh alias per account
   |
   |- register: auth.mistral.ai /self-service/registration (Kratos)  csrf + email/password, session_token back
   |- verify:   mail link ?code=...&flow=... -> /self-service/verification
   |- key:      console.mistral.ai /api/billing/api-keys            mstrl_... returned once
   |- live proof: POST https://api.mistral.ai/v1/chat/completions    real content = the key is live
```

| Adım | Çağrı | Notlar |
| --- | --- | --- |
| takma ad | `GET https://temp.tf/api/account?providers=outlook,hotmail&dot=0&plus=1` | hesap başına bir takma ad; rota IP ile sınırlandırılır (adres başına ~20 sn), bu yüzden hat denemeyi harcamak yerine yeniden dener |
| kayıt | `GET /self-service/registration/api` → `POST /self-service/registration?flow=…` | JSON gövdesi + akıştan gelen `csrf_token`; yanıt zaten `session_token` taşır |
| doğrulama | gelen kutusundan gelen bağlantı → `GET /self-service/verification/flows?id=…` → `POST /self-service/verification?flow=…` `{method:"code", code}` | bağlantının kendisi hem `code` hem de `flow` taşır |
| oturum | kayıt yanıtından gelen `session_token` | Kratos, ilk oturum taze olduğu sürece ikinci bir parola girişini reddeder, bu yüzden yeniden giriş yalnızca bir `401` durumunda gerçekleşir |
| çalışma alanı | `GET console.mistral.ai/api/workspaces` | ilk `items[].uuid` |
| anahtar | `POST console.mistral.ai/api/billing/api-keys` `{name, workspace, primitive_access_scope:"shared_only"}` | düz metin `mstrl_…` bir kez döndürülür |
| kapı | `POST api.mistral.ai/v1/chat/completions` | `keys.txt` öncesinde canlı 200 gerekir; 429, 2,5 sn sonra bir kez yeniden denenir, ardından sonraki kimliğe geçilir |

## ⚙️ CLI seçenekleri

```bash
node src/cli.js [mode] [flags]
```

| Bayrak | Varsayılan | Anlamı |
| --- | --- | --- |
| `--count N` | 10 | üretilecek hesap (= anahtar) sayısı |
| `--conc N` | 2 | eşzamanlı hesap (en fazla 16) — hesap başına bir çıkış sabitlenir |
| `--model <id>` | `mistral-tiny-latest` | sabitlenmiş kapı modeli; yedek sırası bunu izler |
| `--pool <file>` | `proxies.txt` | proxy listesi (`MISTRAL_PROXIES` ortam değişkeni de çalışır) |
| `--gap MS` | 800 | bir işçi içindeki hesaplar arası bekleme |
| `--tries N` | 2 | hesap başına denenen çıkış sayısı |
| `--timeout MS` | 45000 | istek başına zaman aşımı |
| `--mail-timeout MS` | 180000 | bir hesabın doğrulama bağlantısını ne kadar bekleyeceği |
| `--mail <list>` | `outlook,hotmail` | takma ad için kullanılan gelen kutusu sağlayıcıları |
| `--verify-only` · `--screen` · `--probe` · `--collect` | — | yukarıdaki modlar |

Başarısız olan bir çıkış, sonraki hesap için değiştirilir ve bir havuz satırı taranmış bir not taşıyabilir (`http://host:port 1.2.3.4`) — yükleyici ilk belirteci korur.

## 🛰️ Proxy arkasında

Her istek havuzunuzdan bir çıkış üzerinden ayrılır — araç Mistral'ı asla kendi hattınızdan aramaz ve **bir hesap tüm yaşamı boyunca tek bir çıkışta yaşar** (Kratos oturumu oluşturulduğu IP'ye bağlar). Operatörün filosunda ölçüldü: 10 satırlık bir havuz `auth.mistral.ai` adresine **3 çıkış** geçirdi ve tamamlanan her hesap başladığı tek çıkışta kaldı (çıkışlarını erişilemez bir havuz satırına kaptıran ikisi bir sonrakinde yeniden denendi ve bu şekilde bildirildi). `--screen`, hayatta kalanları `proxies.live.txt` dosyasına yazar, böylece sonraki çalıştırma zaten yanıt vermiş çıkışlarla başlar.

## 📄 Dosyalar

| Yol | İçerik |
| --- | --- |
| `keys.txt` | chat-200 anahtarları, satır başına bir tane — git tarafından yok sayılır |
| `keys-ungated.txt` | son `--verify-only` taramasında başarısız olan anahtarlar — daha sonra yeniden deneyin |
| `accounts.json` | hesap başına takma ad / anahtar / çalışma alanı / kapı durumu / çıkış — git tarafından yok sayılır |
| `proxies.txt` | çıkış listeniz — git tarafından yok sayılır |
| `proxies.live.txt` | `--screen` testini geçen çıkışlar |

## 🔌 9Router'a bağlanın

[9Router](https://9router.com) kendi kendine barındırılan, OpenAI uyumlu bir yönlendiricidir. Tek bir komut `keys.txt` dosyasını çalışan kombinasyonlara sahip bir sağlayıcı düğümüne dönüştürür:

```bash
node src/connect-9router.js
```

Varsayılanlar: `--base http://localhost:20128`, `--password 123456`, `--name "Mistral"`, `--prefix mistral`, `--base-url https://api.mistral.ai/v1`.

Operatörün paneli aynı anahtarları yerel `mistral` sağlayıcı bağlantıları olarak taşır (**111** kayıtlı) ve yönlendirilmiş bir çağrı, ücretsiz planın sunduğu her neyse ona iner: `POST /v1/chat/completions mistral/codestral-latest` → **200**, oysa `mistral/mistral-medium-latest` → **503** `[429] rate_limited` — planın tavanı, bir atlama ötede görünür.

## 🔑 Bir anahtar size ne kazandırır

| | |
| --- | --- |
| 🏢 Sağlayıcı | **Mistral AI** — [mistral.ai](https://mistral.ai) |
| 🎁 Sağlayıcının verdiği | **Experiment** api_plan üzerinde bir API anahtarına sahip ücretsiz bir hesap — kart yok, telefon yok, captcha yok |
| 🔑 Bir anahtarın size kazandırdığı | kendi hesabına kapsamlanmış OpenAI uyumlu bir anahtar: ücretsiz planın sunduğu küçük kimlikler (`mistral-tiny-latest`, `open-mistral-nemo`, `codestral-latest`, `ministral-*`), planın hız sınırlarında. Kota **hesapta** yaşar, bu aracın anahtar başına bir hesap oluşturmasının nedeni tam olarak budur |
| 🌐 API şekli | OpenAI uyumlu: `POST https://api.mistral.ai/v1/chat/completions` |
| 🔒 Verileriniz | yalnızca `auth.mistral.ai` / `console.mistral.ai` / `api.mistral.ai` ve yapılandırdığınız gelen kutusu arka ucuyla iletişim kurulur; anahtarlar makinenizde kalır |

## 🐞 Sorunlar

Mistral kayıt akışını, doğrulama postasını veya ücretsiz plan model kümesini değiştirirse, araç o adımda durur ve bunu bildirir (`--probe` gördüğü akış alanlarını, gelen kutusu hattını ve kapı sırasını gösterir). Çalıştırdığınız komut ve tam çıktıyla birlikte **[bir sorun açın](../../issues)**; PR'lar memnuniyetle karşılanır.

## 📄 Lisans

MIT © 2026 — bkz. [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 mistral-bulk-apikey katkıda bulunanlar

</div>