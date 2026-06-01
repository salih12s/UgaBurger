# 🍔 MusattiBurger - cPanel Deploy Rehberi

Railway (backend + Postgres) → cPanel (Node.js App + MariaDB/MySQL) geçiş rehberi.

---

## Önkoşul Kontrolü

cPanel ana ekranında (Tools sayfası) şu ikonların **var olduğunu** doğrula:

- ✅ **Setup Node.js App** (Software bölümü)
- ✅ **MySQL Databases** (Databases bölümü)
- ✅ **phpMyAdmin** (Databases bölümü)
- ✅ **File Manager** (Files bölümü)
- ✅ **Terminal** (Advanced bölümü) — opsiyonel ama kolaylaştırır
- ⚠️ Postgres var mı? Yok. Bu yüzden MySQL'e geçiyoruz.

---

## ADIM 1 — Veritabanı (cPanel MySQL)

1. cPanel → **MySQL Databases** aç.
2. **Create New Database**:
   - Database name: `ugaburger` (cPanel başına otomatik prefix ekler → `uga28rge_ugaburger`)
3. **Add New User**:
   - Username: `ugauser` → `uga28rge_ugauser`
   - Şifre: güçlü bir şifre üret, **bir yere kaydet** (.env'e gerekiyor).
4. **Add User to Database**:
   - User: `uga28rge_ugauser`
   - Database: `uga28rge_ugaburger`
   - Privileges: **ALL PRIVILEGES** ✓
5. (Opsiyonel) Lokalden migration çalıştıracaksan: cPanel → **Remote MySQL** → ev/ofis IP'ni ekle.

---

## ADIM 2 — Node.js Uygulaması Oluştur

1. cPanel → **Setup Node.js App** aç → **Create Application**.
2. Ayarlar:

   | Alan | Değer |
   |------|-------|
   | Node.js version | 20.x (yoksa 18.x) |
   | Application mode | Production |
   | Application root | `api` |
   | Application URL | **boş bırak** (sadece localhost'tan erişilecek) |
   | Application startup file | `server.js` |
   | Passenger log file | (boş — varsayılan) |

3. **Create** dedikten sonra cPanel sana iki şey gösterir:
   - Atanmış **Port** numarası (örn. `30245`). **Bu portu not al!**
   - "Run NPM Install" ve "Restart" butonları (henüz tıklama).

> ⚠️ cPanel'in atadığı portu kullanmak zorundayız. Aşağıdaki adımlarda `PORT` env değişkenine ve `.htaccess` proxy hedefine bu değeri yazacağız.

---

## ADIM 3 — Dosyaları Yükle

### 3a. server/ klasörünü yükle

Lokalde:

```powershell
# server klasörünü ZIP'le (uploads/ ve node_modules HARİÇ)
cd c:\Users\salih\Desktop\MusattiBurger
Compress-Archive -Path server\* -DestinationPath server.zip -Force
```

cPanel → **File Manager** → home dizini (`/home/uga28rge/`):

1. Daha önce oluşturulan `api/` klasörünü aç.
2. `server.zip` dosyasını upload et.
3. Sağ tık → **Extract** → mevcut `api/` klasörü içine.
4. ZIP'i sil.

> Sonuç: `/home/uga28rge/api/server.js`, `/home/uga28rge/api/package.json` vb.

### 3b. Images/ klasörünü yükle

`Images/` klasörünü ZIP'le → `/home/uga28rge/Images/` olarak çıkart.

### 3c. Frontend build'ini yükle

Lokalde:

```powershell
cd c:\Users\salih\Desktop\MusattiBurger\client
npm install
npm run build
```

`client/dist/` klasörünün **içeriğini** (kendisini değil, içindekileri):

- cPanel → File Manager → `public_html/` içine yükle.
- ZIP'le yüklersen → `public_html/` içine extract et.
- `public_html/.htaccess` dosyasının da geldiğinden emin ol (Vite `dist/` içine kopyalar; gelmiyorsa elle ekle — aşağıda Adım 5'te içerik var).

---

## ADIM 4 — Environment Variables (PayTR / SMTP / E-Fatura)

**Bu, Railway'deki "Variables" sekmesinin cPanel karşılığıdır.**

1. cPanel → **Setup Node.js App** → uygulamayı aç (✏️ kalem ikonu).
2. Sayfayı aşağı kaydır → **Environment Variables** bölümü → her satır için **Add Variable**:

   | Name | Value |
   |------|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | *(cPanel'in atadığı port — Adım 2'de not aldığın)* |
   | `JWT_SECRET` | `8f4d2c9b7e1a6f3d0c5e8b2a9f7d1c4e6b3a8d0f2c7e9a1b5d4f8c2e7a6b1d9` |
   | `CLIENT_URL` | `https://ugaburger.com` |
   | `DB_DIALECT` | `mysql` |
   | `DB_HOST` | `localhost` |
   | `DB_PORT` | `3306` |
   | `DB_NAME` | `uga28rge_ugaburger` |
   | `DB_USER` | `uga28rge_ugauser` |
   | `DB_PASSWORD` | *(Adım 1'de oluşturduğun şifre)* |
   | `DB_SSL` | `false` |
   | `SMTP_HOST` | `smtp.gmail.com` |
   | `SMTP_PORT` | `587` |
   | `SMTP_USER` | `ugaburger33@gmail.com` |
   | `SMTP_PASS` | `clkwyrzjtyjbiedc` |
   | `GOOGLE_CLIENT_ID` | `631573681169-5c6j1gmko7cbrm1uce7uuqo5bi7bkkid.apps.googleusercontent.com` |
   | `EINVOICE_PROVIDER` | `aktifdonusum` |
   | `EINVOICE_API_MODE` | `rest` |
   | `EINVOICE_REST_BASE_URL` | `https://portal.aktifdonusum.com/edonusum` |
   | `EINVOICE_API_URL` | `https://service.aktifdonusum.com/InvoiceService/InvoiceWS` |
   | `EINVOICE_WSDL_URL` | `https://service.aktifdonusum.com/InvoiceService/InvoiceWS?wsdl` |
   | `EARCHIVE_API_URL` | `https://service.aktifdonusum.com/EArchiveInvoiceService/EArchiveInvoiceWS` |
   | `EARCHIVE_WSDL_URL` | `https://service.aktifdonusum.com/EArchiveInvoiceService/EArchiveInvoiceWS?wsdl` |
   | `EINVOICE_USERNAME` | `admin_001742` |
   | `EINVOICE_PASSWORD` | `z6GU&DS4` |
   | `EINVOICE_PREFIX` | `AEA` |
   | `EINVOICE_SOURCE_URN` | `urn:mail:defaultgb@aktif.com.tr` |
   | `EINVOICE_SENDER_VKN` | `0102365158` |
   | `EINVOICE_SENDER_TITLE` | `AHMET MUHITTIN ARK VE ULAS KANTARCI ADI ORTAKLIGI` |
   | `EINVOICE_SENDER_TAX_OFFICE` | `Uray` |
   | `EINVOICE_SENDER_ADDRESS` | `Inonu Mah. 1405 Sk. Murat Apt. No:2/B` |
   | `EINVOICE_SENDER_CITY` | `Mersin` |
   | `EINVOICE_SENDER_DISTRICT` | `Yenisehir` |
   | `EINVOICE_SENDER_POSTCODE` | `33060` |
   | `EINVOICE_SENDER_EMAIL` | `info@ugaburger.com` |
   | `EINVOICE_SENDER_PHONE` | `+905050469382` |
   | `EINVOICE_TEST_MODE` | `false` |
   | `EINVOICE_AUTO_SEND` | `true` |
   | `EINVOICE_MOCK_MODE` | `false` |
   | `EINVOICE_PREVIEW_EMAIL_FALLBACK` | `true` |
   | `EINVOICE_VAT_RATE` | `10` |
   | `PAYTR_MERCHANT_ID` | *(Railway'deki değer)* |
   | `PAYTR_MERCHANT_KEY` | *(Railway'deki değer)* |
   | `PAYTR_MERCHANT_SALT` | *(Railway'deki değer)* |

3. **Save**.

> 🔁 Railway → cPanel: Railway projesinde Variables sekmesinden tüm değerleri kopyalayıp buraya birebir yapıştır. Kod tarafında hiçbir değişiklik yok; `process.env.X` aynı şekilde okunuyor.

### 4a. NPM Install + Restart

Aynı sayfada:

1. **Run NPM Install** → bekleyin (1-3 dk).
2. **Restart** → uygulama başlasın.
3. Üstte yeşil "Application is running" yazısı görmelisin.

> Hata olursa "Logs" linkine tıkla; eksik env veya DB bağlantı hatası genelde buradan görülür.

---

## ADIM 5 — `.htaccess` (public_html)

`public_html/.htaccess` dosyası repo'da [client/public/.htaccess](client/public/.htaccess) olarak hazır. **PORT değerini Adım 2'de cPanel'in atadığı portla değiştirmeyi unutma:**

```apache
RewriteEngine On

RewriteCond %{REQUEST_URI} ^/api [NC]
RewriteRule ^api/(.*)$ http://127.0.0.1:PORT/api/$1 [P,L]

RewriteCond %{REQUEST_URI} ^/uploads [NC]
RewriteRule ^uploads/(.*)$ http://127.0.0.1:PORT/uploads/$1 [P,L]

RewriteCond %{REQUEST_URI} ^/images [NC]
RewriteRule ^images/(.*)$ http://127.0.0.1:PORT/images/$1 [P,L]

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

> ⚠️ `mod_proxy` ve `mod_proxy_http` cPanel'de aktif olmalı. Çoğu paylaşımlı cPanel'de varsayılan açıktır. Eğer "500 Internal Server Error" alırsan hosting destekten **mod_proxy** modülünü aktif etmesini iste.

---

## ADIM 6 — Veri Taşıma (Railway → cPanel)

[server/scripts/migrateRailwayToCpanel.js](server/scripts/migrateRailwayToCpanel.js) bunun için hazır.

### Yöntem A — cPanel Terminal (önerilen, SSH gerekir)

```bash
cd ~/api
# Geçici migration env dosyası
cat > .env.migrate <<EOF
SOURCE_DATABASE_URL=postgresql://postgres:HmdmzcJDIIEUrcxldSMNYkWmHxMGgIGi@mainline.proxy.rlwy.net:35625/railway
TARGET_DB_HOST=localhost
TARGET_DB_PORT=3306
TARGET_DB_NAME=uga28rge_ugaburger
TARGET_DB_USER=uga28rge_ugauser
TARGET_DB_PASSWORD=BURAYA_SIFRE
EOF

# Çalıştır
node -r dotenv/config scripts/migrateRailwayToCpanel.js dotenv_config_path=.env.migrate

# Bittiğinde dosyayı sil
rm .env.migrate
```

### Yöntem B — Lokalden (cPanel Remote MySQL üzerinden)

1. cPanel → **Remote MySQL** → senin ev/ofis public IP'ni ekle.
2. Lokalde:

   ```powershell
   cd c:\Users\salih\Desktop\MusattiBurger\server
   npm install
   $env:SOURCE_DATABASE_URL="postgresql://postgres:HmdmzcJDIIEUrcxldSMNYkWmHxMGgIGi@mainline.proxy.rlwy.net:35625/railway"
   $env:TARGET_DB_HOST="ugaburger.com"   # veya cPanel sunucu IP'si
   $env:TARGET_DB_PORT="3306"
   $env:TARGET_DB_NAME="uga28rge_ugaburger"
   $env:TARGET_DB_USER="uga28rge_ugauser"
   $env:TARGET_DB_PASSWORD="..."
   node scripts/migrateRailwayToCpanel.js
   ```
3. Bittiğinde Remote MySQL'den IP'yi **kaldır**.

Script ekrana her tablo için "kaynak=N, hedef=N" sayım kontrolü yazar. Eşleşmiyorsa hatayı incele.

---

## ADIM 7 — Doğrulama

1. **Health check**: tarayıcıda `https://ugaburger.com/api/health` → `{"status":"ok"}`.
2. **Settings**: `https://ugaburger.com/api/settings` → JSON döner.
3. **Frontend**: `https://ugaburger.com` açılıyor, ürünler listeleniyor mu?
4. **Login**: kayıtlı kullanıcı ile giriş.
5. **Sipariş**: sepete ekle → sipariş ver → admin panelde göründü mü?
6. **SMTP**: parola sıfırlama maili geldi mi?
7. **PayTR**: küçük tutarlı test ödeme. PayTR panelinde **callback URL**'yi `https://ugaburger.com/api/paytr/callback` olarak güncelle.
8. **E-Fatura**: bir test siparişi sonrası `scripts/sendPreviewForOrder.js` ile preview maili.

---

## ADIM 8 — Cutover

- 24-48 saat cPanel'i izle. Hata yoksa:
- Railway projesindeki backend servisini **durdur** (hemen silme — 1 hafta yedek tut).
- Railway Postgres'i de aynı şekilde durdur ama 1 hafta sonra sil.
- DNS zaten ugaburger.com → cPanel olduğundan ek değişiklik yok.

---

## Sorun Giderme

| Belirti | Olası Sebep | Çözüm |
|---------|-------------|-------|
| 502 Bad Gateway `/api/...` | Node app çalışmıyor veya yanlış port | Setup Node.js App → Logs; PORT eşleşmesi |
| 500 Internal Server Error tüm sayfalarda | `.htaccess` mod_proxy yok | Hosting destekten mod_proxy talep |
| `ECONNREFUSED` DB hatası | DB_USER/DB_PASSWORD yanlış | cPanel MySQL Databases'ten yeniden kontrol |
| `ER_NOT_SUPPORTED_AUTH_MODE` | Eski mysql_native_password | cPanel MySQL'de user'ı recreate; mysql2 zaten destekler |
| ENUM hatası sync sırasında | Eski tablolar farklı tip | `sync({ alter: true })` çalıştır veya tabloyu drop edip yeniden sync |
| `mod_proxy` bulunamadı | Hosting kapatmış | `Application URL` alanına `/api` yazıp Passenger'a doğrudan bind et (frontend `VITE_API_URL` aynı kalır) |

---

## Özet Mimari Karşılaştırma

| | Önceki (Railway + Hostinger) | Yeni (cPanel) |
|---|------------------------------|----------------|
| Frontend | Hostinger static | cPanel `public_html/` |
| Backend | Railway Node | cPanel Setup Node.js App |
| DB | Railway PostgreSQL | cPanel MariaDB/MySQL |
| Env Vars | Railway Variables | cPanel "Setup Node.js App > Environment Variables" |
| Deploy | git push (Railway auto) | File Manager upload + Restart |
| API URL | `ugaburger-production.up.railway.app` | `ugaburger.com` (aynı domain, `/api` proxy) |
