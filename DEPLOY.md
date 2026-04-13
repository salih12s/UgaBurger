# 🍔 MusattiBurger - Plesk Deploy Rehberi

Bu rehber, MusattiBurger projesini Plesk panelde çalıştırmak için adım adım açıklar.

---

## 📋 Ön Gereksinimler

| Gereksinim | Durum |
|------------|-------|
| Plesk Obsidian (veya üstü) | ✅ |
| Node.js Plesk Extension | ✅ Kurulmalı |
| MariaDB 11.4.10 | ✅ Görselinde mevcut |
| Apache mod_proxy + mod_rewrite | ✅ Plesk'te varsayılan |
| Domain: ugaburger.com | ✅ |

---

## 🗄 ADIM 1: Veritabanı Oluşturma (Zaten Yapılmış)

Görselde gördüğümüz ayarlar:

| Ayar | Değer |
|------|-------|
| Veritabanı Adı | `UgaBurger` |
| Sunucu | localhost:3306 (MariaDB v11.4.10) |
| Kullanıcı | `ugaburger` |
| Şifre | `ugaburger33` |
| Erişim | Herhangi bir ana bilgisayardan uzaktan |

> ✅ Bu adım zaten tamamlanmış.

---

## 📦 ADIM 2: Dosyaları Hazırlama

### Yöntem A: Otomatik (deploy.php ile)

1. Proje klasörünü ZIP'leyin: `musattiburger.zip`
2. Plesk > **File Manager** ile şunları yükleyin:
   - `musattiburger.zip` → `/httpdocs/` içine
   - `deploy.php` → `/httpdocs/` içine

3. Tarayıcıda açın:
   ```
   https://ugaburger.com/deploy.php?key=ugaburger2026
   ```
4. Tüm adımlar otomatik çalışacak
5. **Sonra `deploy.php` dosyasını SİLİN!**

### Yöntem B: Manuel

Plesk File Manager ile aşağıdaki yapıyı oluşturun:

```
/ (domain root - httpdocs'un üstü)
├── .env                    ← Ortam değişkenleri
├── Images/                 ← Ürün görselleri
├── api/                    ← Node.js backend (server/ klasörünün kopyası)
│   ├── server.js
│   ├── package.json
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── seeds/
│   └── uploads/
├── client/                 ← React kaynak (build almak için)
│   ├── package.json
│   ├── vite.config.js
│   └── src/
└── httpdocs/               ← React build çıktısı (public web root)
    ├── index.html
    ├── assets/
    └── .htaccess
```

---

## ⚙️ ADIM 3: .env Dosyasını Yapılandırma

Domain root'a (httpdocs'un bir üst dizini) `.env` dosyası oluşturun:

```env
# VERITABANI (MariaDB)
DB_NAME=UgaBurger
DB_USER=ugaburger
DB_PASSWORD=ugaburger33
DB_HOST=localhost
DB_PORT=3306

# SUNUCU
PORT=3000

# JWT (güvenli bir key girin)
JWT_SECRET=buraya_guclu_bir_anahtar_girin_en_az_32_karakter

# CLIENT URL
CLIENT_URL=https://ugaburger.com
```

> ⚠️ `.env` dosyasının izinlerini `600` yapın (sadece owner okuabilsin).

---

## 🔧 ADIM 4: Node.js Yapılandırma (Plesk Panel)

### 4a. Node.js Extension Kurulumu

1. **Plesk** → **Extensions** → **Node.js** ara → **Yükle**
2. Veya zaten yüklüyse atla

### 4b. Node.js Uygulamasını Yapılandır

1. **Plesk** → **Websites & Domains** → **ugaburger.com**
2. **Node.js** butonuna tıkla
3. Ayarları girin:

| Ayar | Değer |
|------|-------|
| Node.js Version | 18.x veya 20.x |
| Application Root | `/api` |
| Application Startup File | `server.js` |
| Application Mode | `production` |

4. **NPM Install** butonuna tıklayın
5. **Enable Node.js** butonuna tıklayın

### 4c. Ortam Değişkenleri (Plesk üzerinden)

Node.js ayarlarında **Environment Variables** bölümüne:

```
NODE_ENV = production
```

> Diğer değişkenler .env dosyasından okunacak.

---

## 🏗 ADIM 5: React Build

### Yöntem A: Lokalde build alıp yükle (Önerilen)

Kendi bilgisayarınızda:

```bash
cd client
npm install
npm run build
```

Oluşan `client/dist/` klasörünün **içeriğini** (dist klasörünün kendisini değil) Plesk File Manager ile `/httpdocs/` içine yükleyin.

### Yöntem B: Sunucuda build

deploy.php bunu otomatik yapar. Manuel yapmak isterseniz:

```bash
cd /var/www/vhosts/ugaburger.com/client
npm install
npm run build
cp -rf dist/* /var/www/vhosts/ugaburger.com/httpdocs/
```

---

## 📄 ADIM 6: .htaccess Kontrolü

`/httpdocs/.htaccess` dosyasının yerinde olduğundan emin olun:

```apache
RewriteEngine On

# API isteklerini Node.js backend'e yönlendir
RewriteCond %{REQUEST_URI} ^/api [NC]
RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L]

# Upload dosyalarını backend'e yönlendir
RewriteCond %{REQUEST_URI} ^/uploads [NC]
RewriteRule ^uploads/(.*)$ http://localhost:3000/uploads/$1 [P,L]

# Images dosyalarını backend'e yönlendir
RewriteCond %{REQUEST_URI} ^/images [NC]
RewriteRule ^images/(.*)$ http://localhost:3000/images/$1 [P,L]

# React SPA
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### Apache Proxy Modülü

Plesk'te **Apache & nginx Settings** bölümünden:
1. **Apache** → **mod_proxy** ve **mod_proxy_http** aktif olmalı
2. Eğer aktif değilse, **Additional Apache directives** bölümüne ekleyin:

```apache
ProxyPreserveHost On
ProxyPass /api http://localhost:3000/api
ProxyPassReverse /api http://localhost:3000/api
ProxyPass /uploads http://localhost:3000/uploads
ProxyPassReverse /uploads http://localhost:3000/uploads
ProxyPass /images http://localhost:3000/images
ProxyPassReverse /images http://localhost:3000/images
```

> **ÖNEMLİ:** Eğer Plesk'te nginx reverse proxy aktifse (varsayılan), nginx üzerinden yapılandırma daha sağlıklı olabilir. Bkz. Adım 7.

---

## 🔄 ADIM 7: Nginx Reverse Proxy (Alternatif - Önerilen)

Plesk genellikle nginx'i reverse proxy olarak kullanır. Bu durumda:

1. **Plesk** → **ugaburger.com** → **Apache & nginx Settings**
2. **Additional nginx directives** bölümüne ekleyin:

```nginx
# API isteklerini Node.js'e yönlendir
location /api {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Upload dosyaları
location /uploads {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# Images
location /images {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# React SPA fallback
location / {
    try_files $uri $uri/ /index.html;
}
```

3. **OK** → **Apply**

> Bu yöntem .htaccess'ten daha performanslı ve güvenilirdir.

---

## 🌱 ADIM 8: Veritabanı Seed

Node.js çalıştıktan sonra, seed'i çalıştırın:

### Plesk Node.js üzerinden:
1. Plesk → Node.js → **Run Script** bölümü
2. Girin: `node seeds/seed.js`
3. **Run** tıklayın

### Veya deploy.php otomatik yapar.

Seed başarılı olursa çıktı:
```
Tablolar oluşturuldu
Admin hesabı oluşturuldu (tel: 05301257088, şifre: admin123)
8 kategori oluşturuldu
43 ürün oluşturuldu
Ekstralar oluşturuldu
Ayarlar oluşturuldu
✅ Seed tamamlandı!
```

---

## ✅ ADIM 9: Test

| Test | URL | Beklenen |
|------|-----|----------|
| Ana Sayfa | `https://ugaburger.com` | Hero section görünmeli |
| API Health | `https://ugaburger.com/api/health` | `{"status":"ok"}` |
| Menü | `https://ugaburger.com/menu` | Ürünler listelenmeli |
| Admin Giriş | `https://ugaburger.com/login` | Tel: 05301257088, Şifre: admin123 |
| Admin Panel | `https://ugaburger.com/admin` | Dashboard görünmeli |
| SPA Routing | `https://ugaburger.com/contact` | Sayfa yüklenmeli (404 olmamalı) |

---

## 🔒 ADIM 10: Güvenlik

- [ ] `deploy.php` dosyasını **SİLİN**
- [ ] `.env` dosya izinlerini `600` yapın
- [ ] JWT_SECRET'ı güçlü bir değerle değiştirin
- [ ] SSL/HTTPS aktif olduğundan emin olun (Plesk > SSL/TLS)
- [ ] Admin şifresini değiştirin

---

## 🔄 Güncelleme Yapma

1. Lokalde değişiklikleri yapın
2. `cd client && npm run build`
3. `dist/` içeriğini Plesk File Manager ile `/httpdocs/`'a yükleyin
4. Backend değişikliği varsa `/api/` altındaki dosyaları güncelleyin
5. Plesk → Node.js → **Restart App**

---

## 🐛 Sorun Giderme

### Node.js başlamıyor
- Plesk → Node.js → **Log** bölümünü kontrol edin
- `.env` dosyası doğru yerde mi? (domain root)
- Port 3000 başka uygulama tarafından kullanılıyor olabilir → `.env` ile değiştirin

### API 502/504 hatası
- Node.js uygulaması çalışıyor mu? Plesk → Node.js → Status kontrolü
- nginx proxy ayarları doğru mu?
- `https://ugaburger.com/api/health` test edin

### Veritabanı bağlantı hatası
- MariaDB çalışıyor mu? Plesk → Databases kontrol
- `.env` bilgileri (DB_NAME, DB_USER, DB_PASSWORD) doğru mu?
- Veritabanı kullanıcısının uzaktan erişim izni var mı?

### Görseller yüklenmiyor
- `/api/uploads/` klasörü var mı ve yazma izni (755) doğru mu?
- nginx/Apache proxy `/uploads` yolunu yönlendiriyor mu?

### React sayfaları 404 veriyor
- `.htaccess` veya nginx `try_files` ayarı doğru mu?
- `index.html` httpdocs'ta mı?

---

## 📊 Dosya Yapısı (Deploy Sonrası)

```
/var/www/vhosts/ugaburger.com/
├── .env                         ← Ortam değişkenleri
├── Images/                      ← Ürün görselleri
│   ├── smash_burger.jpg.jpeg
│   ├── CHEESEBURGER.jpg
│   └── ...
├── api/                         ← Node.js Backend
│   ├── server.js
│   ├── package.json
│   ├── node_modules/
│   ├── config/db.js
│   ├── controllers/
│   ├── middleware/auth.js
│   ├── models/
│   ├── routes/
│   ├── seeds/seed.js
│   └── uploads/                 ← Yüklenen görseller
├── client/                      ← React kaynak (opsiyonel, build için)
└── httpdocs/                    ← Public Web Root
    ├── index.html               ← React SPA entry
    ├── assets/                  ← React build çıktısı (JS/CSS)
    ├── .htaccess                ← URL yönlendirme kuralları
    └── (deploy.php)             ← SİLİN!
```
