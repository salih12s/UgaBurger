# 🍔 Musatti Burger - Online Sipariş Sistemi

Musatti Burger, React (frontend) ve Node.js/Express (backend) ile geliştirilmiş, tam kapsamlı bir restoran online sipariş ve yönetim sistemidir. Müşteri siparişleri, admin yönetim paneli, masa siparişleri, teslimat bölgesi doğrulama, raporlama ve mutfak fişi yazdırma gibi özellikler içerir.

---

## 📑 İçindekiler

- [Teknoloji Yığını](#-teknoloji-yığını)
- [Proje Yapısı](#-proje-yapısı)
- [Kurulum](#-kurulum)
- [Ortam Değişkenleri](#-ortam-değişkenleri)
- [Veritabanı Modelleri](#-veritabanı-modelleri)
- [API Endpoint'leri](#-api-endpointleri)
- [Client Tarafı](#-client-tarafı)
- [Admin Paneli](#-admin-paneli)
- [Müşteri Özellikleri](#-müşteri-özellikleri)
- [Seed Verileri](#-seed-verileri)

---

## 🛠 Teknoloji Yığını

### Backend
| Teknoloji | Versiyon | Açıklama |
|-----------|----------|----------|
| **Node.js** | - | Sunucu çalışma ortamı |
| **Express** | ^4.21.0 | Web framework |
| **Sequelize** | ^6.37.3 | ORM (PostgreSQL) |
| **PostgreSQL** | - | İlişkisel veritabanı |
| **bcryptjs** | ^2.4.3 | Şifre hashleme |
| **jsonwebtoken** | ^9.0.2 | JWT kimlik doğrulama |
| **multer** | ^1.4.5 | Dosya yükleme (görseller) |
| **cors** | ^2.8.5 | Cross-Origin ayarları |
| **dotenv** | ^16.4.5 | Ortam değişkenleri |

### Frontend
| Teknoloji | Versiyon | Açıklama |
|-----------|----------|----------|
| **React** | ^19.2.4 | UI kütüphanesi |
| **Vite** | - | Build aracı ve dev sunucu |
| **React Router DOM** | ^7.14.0 | Sayfa yönlendirme |
| **Material-UI (MUI)** | ^7 | Bileşen kütüphanesi |
| **Axios** | ^1.15.0 | HTTP istemcisi |
| **Leaflet** | ^1.9.4 | Harita (teslimat bölgeleri) |
| **React Hot Toast** | ^2.6.0 | Bildirimler |
| **Emotion** | - | CSS-in-JS |

---

## 📁 Proje Yapısı

```
MusattiBurger/
├── package.json                  # Root: concurrently ile server+client çalıştırma
├── Images/                       # Statik görseller
│
├── server/                       # ────── BACKEND ──────
│   ├── package.json
│   ├── server.js                 # Ana sunucu: Express, middleware, route tanımları
│   ├── config/
│   │   └── db.js                 # Sequelize PostgreSQL bağlantısı
│   ├── controllers/
│   │   ├── adminController.js    # Admin CRUD işlemleri, raporlar, ayarlar
│   │   ├── authController.js     # Kayıt, giriş, profil
│   │   ├── orderController.js    # Sipariş oluşturma, sipariş geçmişi
│   │   └── productController.js  # Ürün/kategori listeleme (public)
│   ├── middleware/
│   │   └── auth.js               # JWT doğrulama + admin rol kontrolü
│   ├── models/
│   │   ├── index.js              # Model ilişkileri merkezi kayıt
│   │   ├── User.js               # Kullanıcı modeli
│   │   ├── Category.js           # Kategori modeli
│   │   ├── Product.js            # Ürün modeli
│   │   ├── Extra.js              # Ekstra malzeme modeli
│   │   ├── ProductExtra.js       # Ürün-Ekstra pivot tablosu
│   │   ├── Order.js              # Sipariş modeli
│   │   ├── OrderItem.js          # Sipariş kalemi modeli
│   │   ├── Table.js              # Masa modeli
│   │   └── Setting.js            # Ayar (key-value) modeli
│   ├── routes/
│   │   ├── auth.js               # /api/auth/*
│   │   ├── products.js           # /api/categories, /api/products
│   │   ├── orders.js             # /api/orders/*
│   │   └── admin.js              # /api/admin/* (korumalı)
│   ├── seeds/
│   │   └── seed.js               # Veritabanı başlangıç verileri
│   └── uploads/                  # Yüklenen görseller
│
└── client/                       # ────── FRONTEND ──────
    ├── package.json
    ├── vite.config.js            # Vite ayarları + proxy
    ├── index.html
    └── src/
        ├── App.jsx               # Router ve layout
        ├── main.jsx              # React DOM render
        ├── index.css             # Global stiller
        ├── theme.js              # MUI tema (renkler, tipografi)
        ├── api/
        │   └── axios.js          # Axios instance + JWT interceptor
        ├── context/
        │   ├── AuthContext.jsx    # Kimlik doğrulama state yönetimi
        │   └── CartContext.jsx    # Sepet state yönetimi
        └── components/
            ├── Home/
            │   └── HomePage.jsx          # Ana sayfa (hero section)
            ├── Auth/
            │   ├── LoginPage.jsx         # Giriş formu
            │   └── RegisterPage.jsx      # Kayıt formu
            ├── Menu/
            │   ├── MenuPage.jsx          # Menü listeleme + sepet
            │   ├── ProductCard.jsx       # Ürün kartı
            │   └── ProductModal.jsx      # Ürün detay + ekstra seçimi
            ├── Cart/
            │   └── OrderDialog.jsx       # Sipariş onay (konum, ödeme, özet)
            ├── Profile/
            │   └── ProfilePage.jsx       # Profil + sipariş geçmişi
            ├── Contact/
            │   └── ContactPage.jsx       # İletişim + harita
            ├── Layout/
            │   ├── Navbar.jsx            # Üst menü (responsive)
            │   └── Footer.jsx            # Alt bilgi
            └── Admin/
                ├── AdminLayout.jsx       # Admin panel iskeleti (sidebar)
                ├── OrderManagement.jsx   # Sipariş yönetimi + fiş yazdırma
                ├── TableOrders.jsx       # Masa sipariş oluşturma
                ├── MenuManagement.jsx    # Ürün/Kategori/Ekstra CRUD
                ├── Reports.jsx           # Satış raporları
                └── SettingsPanel.jsx     # Tüm sistem ayarları
```

---

## 🚀 Kurulum

### Gereksinimler
- **Node.js** (v18+)
- **PostgreSQL** (v14+)
- **npm**

### 1. Depoyu Klonlayın
```bash
git clone <repo-url>
cd MusattiBurger
```

### 2. Tüm Bağımlılıkları Yükleyin
```bash
npm run install:all
```
> Bu komut root, server ve client bağımlılıklarını tek seferde yükler.

### 3. PostgreSQL Veritabanı Oluşturun
```sql
CREATE DATABASE musatti_burger;
```

### 4. Ortam Değişkenlerini Ayarlayın
`server/` dizininde `.env` dosyası oluşturun (detaylar aşağıda).

### 5. Veritabanını Seed Edin (Başlangıç Verileri)
```bash
npm run seed
```

### 6. Geliştirme Sunucusunu Başlatın
```bash
npm run dev
```
> Backend (port 5000) ve frontend (port 5173) eşzamanlı çalışır.

---

## 🔐 Ortam Değişkenleri

`server/.env` dosyasında aşağıdaki değişkenleri tanımlayın:

```env
# Veritabanı
DB_NAME=musatti_burger
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Sunucu
PORT=5000

# JWT
JWT_SECRET=your_jwt_secret_key

# Client URL (CORS)
CLIENT_URL=http://localhost:5173
```

---

## 🗄 Veritabanı Modelleri

### Entity-Relationship Diyagramı

```
┌──────────┐       ┌──────────────┐       ┌──────────────┐
│  User    │       │   Category   │       │    Table     │
├──────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)  │       │ id (PK)      │       │ id (PK)      │
│ first_nm │       │ name         │       │ table_number │
│ last_nm  │       │ slug         │       │ is_active    │
│ email    │       │ sort_order   │       └──────┬───────┘
│ phone    │       └──────┬───────┘              │
│ pass_hash│              │ 1:N                  │ 1:N
│ role     │              │                      │
└────┬─────┘       ┌──────┴───────┐       ┌──────┴───────┐
     │             │   Product    │       │    Order     │
     │             ├──────────────┤       ├──────────────┤
     │             │ id (PK)      │       │ id (PK)      │
     │ 1:N         │ category_id  │       │ user_id (FK) │◄── User (optional)
     │             │ name         │       │ order_type   │
     └────────────►│ description  │       │ table_id(FK) │
                   │ price        │       │ del_address  │
                   │ image_url    │       │ status       │
                   │ is_available │       │ pay_status   │
                   │ sort_order   │       │ pay_method   │
                   └──┬───────┬───┘       │ total_amount │
                      │       │           │ order_note   │
                   N:M│       │ 1:N       │ card_info    │
                      │       │           └──────┬───────┘
              ┌───────┴──┐    │                  │ 1:N
              │ProductEx.│    │           ┌──────┴───────┐
              ├──────────┤    │           │  OrderItem   │
              │product_id│    │           ├──────────────┤
              │ extra_id │    └──────────►│ order_id(FK) │
              └───────┬──┘               │ product_id   │
                      │                  │ quantity      │
              ┌───────┴──┐               │ unit_price   │
              │  Extra   │               │ extras(JSONB)│
              ├──────────┤               └──────────────┘
              │ id (PK)  │
              │ name     │        ┌──────────────┐
              │ price    │        │   Setting    │
              │is_availab│        ├──────────────┤
              └──────────┘        │ id (PK)      │
                                  │ key (UNIQUE) │
                                  │ value (TEXT)  │
                                  └──────────────┘
```

### Model Detayları

#### User (Kullanıcı)
| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | INTEGER (PK) | Otomatik artan |
| `first_name` | STRING(100) | Ad |
| `last_name` | STRING(100) | Soyad |
| `email` | STRING(255) | E-posta |
| `phone` | STRING(20), UNIQUE | Telefon (giriş için) |
| `password_hash` | STRING(255) | bcrypt ile hashlenmiş şifre |
| `role` | ENUM('customer','admin') | Varsayılan: 'customer' |

#### Category (Kategori)
| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | INTEGER (PK) | Otomatik artan |
| `name` | STRING(100) | Kategori adı |
| `slug` | STRING(100), UNIQUE | URL-dostu isim |
| `sort_order` | INTEGER | Sıralama |

#### Product (Ürün)
| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | INTEGER (PK) | Otomatik artan |
| `category_id` | FK → Category | Ait olduğu kategori |
| `name` | STRING(200) | Ürün adı |
| `description` | TEXT | Açıklama |
| `price` | DECIMAL(10,2) | Fiyat (₺) |
| `image_url` | STRING(500) | Görsel yolu |
| `is_available` | BOOLEAN | Varsayılan: true |
| `sort_order` | INTEGER | Sıralama |

#### Extra (Ekstra Malzeme)
| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | INTEGER (PK) | Otomatik artan |
| `name` | STRING(200) | Ekstra adı (ör: "Ekstra Peynir") |
| `price` | DECIMAL(10,2) | Fiyat |
| `is_available` | BOOLEAN | Varsayılan: true |

#### Order (Sipariş)
| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | INTEGER (PK) | Otomatik artan |
| `user_id` | FK → User (nullable) | Müşteri (masa siparişlerinde null) |
| `order_type` | ENUM('online','table') | Sipariş türü |
| `table_id` | FK → Table (nullable) | Masa numarası |
| `delivery_address` | TEXT | Teslimat adresi |
| `status` | ENUM | pending → confirmed → preparing → ready → delivered / cancelled |
| `payment_status` | ENUM | pending / paid / failed |
| `payment_method` | ENUM | 'door' / 'online' |
| `total_amount` | DECIMAL(10,2) | Toplam tutar |
| `order_note` | TEXT | Sipariş notu |
| `card_info` | JSONB | {holder, last4, expiry} |

#### OrderItem (Sipariş Kalemi)
| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | INTEGER (PK) | Otomatik artan |
| `order_id` | FK → Order | Ait olduğu sipariş |
| `product_id` | FK → Product | Ürün |
| `quantity` | INTEGER | Adet (varsayılan: 1) |
| `unit_price` | DECIMAL(10,2) | Sipariş anındaki fiyat |
| `extras` | JSONB | Seçilen ekstralar: [{id, name, price}] |

#### Setting (Ayar)
| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | INTEGER (PK) | Otomatik artan |
| `key` | STRING(100), UNIQUE | Ayar anahtarı |
| `value` | TEXT | Ayar değeri |

#### Table (Masa)
| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | INTEGER (PK) | Otomatik artan |
| `table_number` | INTEGER, UNIQUE | Masa numarası |
| `is_active` | BOOLEAN | Varsayılan: true |

---

## 📡 API Endpoint'leri

### Kimlik Doğrulama (`/api/auth`)

| Metot | Endpoint | Yetki | Açıklama |
|-------|----------|-------|----------|
| `POST` | `/api/auth/register` | Herkese açık | Yeni kullanıcı kaydı |
| `POST` | `/api/auth/login` | Herkese açık | Telefon + şifre ile giriş |
| `GET` | `/api/auth/me` | 🔒 JWT | Mevcut kullanıcı bilgisi |

**Kayıt İsteği:**
```json
{
  "first_name": "Ali",
  "last_name": "Yılmaz",
  "email": "ali@mail.com",
  "phone": "05551234567",
  "password": "sifre123"
}
```

**Giriş Yanıtı:**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": 1,
    "first_name": "Ali",
    "role": "customer"
  }
}
```

---

### Ürünler & Kategoriler (`/api`)

| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| `GET` | `/api/categories` | Tüm kategoriler (sort_order sıralı) |
| `GET` | `/api/products` | Mevcut ürünler (`?category_id=2` filtreli) |
| `GET` | `/api/products/:id` | Ürün detayı (kategori + ekstralar dahil) |
| `GET` | `/api/settings` | Tüm ayarlar (key-value) |
| `GET` | `/api/health` | Sağlık kontrolü |

---

### Siparişler (`/api/orders`)

| Metot | Endpoint | Yetki | Açıklama |
|-------|----------|-------|----------|
| `POST` | `/api/orders` | 🔒 JWT | Yeni sipariş oluştur |
| `GET` | `/api/orders/my` | 🔒 JWT | Kullanıcının sipariş geçmişi |

**Sipariş Oluşturma İsteği:**
```json
{
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "extras": [
        { "id": 1, "name": "Ekstra Peynir", "price": 30 }
      ]
    }
  ],
  "order_type": "online",
  "delivery_address": "Yenişehir Mah. No:5",
  "order_note": "Kapıda bırakın",
  "payment_method": "online",
  "card_info": {
    "holder": "ALI YILMAZ",
    "last4": "4567",
    "expiry": "12/27"
  }
}
```

---

### Admin (`/api/admin`) — 🔒 JWT + Admin

#### Sipariş Yönetimi
| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| `GET` | `/api/admin/orders` | Tüm siparişler (`?status=pending&order_type=online`) |
| `PUT` | `/api/admin/orders/:id/status` | Sipariş durumu güncelle |
| `POST` | `/api/admin/quick-order` | Masa siparişi oluştur (hızlı sipariş) |

#### Masa Yönetimi
| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| `GET` | `/api/admin/tables` | Tüm masalar |
| `POST` | `/api/admin/tables` | Masa ekle |
| `PUT` | `/api/admin/tables/:id` | Masa güncelle |
| `DELETE` | `/api/admin/tables/:id` | Masa sil |

#### Ürün Yönetimi
| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| `GET` | `/api/admin/products` | Tüm ürünler (pasifler dahil) |
| `POST` | `/api/admin/products` | Ürün ekle |
| `PUT` | `/api/admin/products/:id` | Ürün güncelle |
| `DELETE` | `/api/admin/products/:id` | Ürün sil |

#### Kategori Yönetimi
| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| `POST` | `/api/admin/categories` | Kategori ekle |
| `PUT` | `/api/admin/categories/:id` | Kategori güncelle |

#### Ekstra Yönetimi
| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| `GET` | `/api/admin/extras` | Tüm ekstralar |
| `POST` | `/api/admin/extras` | Ekstra ekle |
| `PUT` | `/api/admin/extras/:id` | Ekstra güncelle |
| `DELETE` | `/api/admin/extras/:id` | Ekstra sil |

#### Diğer
| Metot | Endpoint | Açıklama |
|-------|----------|----------|
| `POST` | `/api/admin/upload` | Görsel yükle (max 5MB, jpeg/png/gif/webp) |
| `GET` | `/api/admin/reports/daily` | Günlük/tarih aralığı raporu (`?startDate=...&endDate=...`) |
| `GET` | `/api/admin/settings` | Tüm ayarlar |
| `PUT` | `/api/admin/settings` | Ayar güncelle (upsert) |

---

## 💻 Client Tarafı

### Sayfa Yapısı ve Routing

| Yol | Bileşen | Yetki | Açıklama |
|-----|---------|-------|----------|
| `/` | `HomePage` | Herkese açık | Ana sayfa (hero section) |
| `/login` | `LoginPage` | Herkese açık | Giriş |
| `/register` | `RegisterPage` | Herkese açık | Kayıt |
| `/menu` | `MenuPage` | Herkese açık | Menü ve sipariş |
| `/contact` | `ContactPage` | Herkese açık | İletişim ve adres |
| `/profile` | `ProfilePage` | 🔒 Müşteri | Profil ve geçmiş |
| `/admin/*` | `AdminLayout` | 🔒 Admin | Admin paneli |

### Context (State Yönetimi)

#### AuthContext
- `user` — Giriş yapmış kullanıcı objesi
- `login(phone, password)` — Giriş yapma
- `register(data)` — Kayıt olma
- `logout()` — Çıkış
- Token localStorage'da saklanır, sayfa yenilemelerinde kalıcıdır
- JWT geçersiz olduğunda otomatik çıkış yapılır

#### CartContext
- `items` — Sepetteki ürünler (bellekte, localStorage kullanmaz)
- `addItem(product, quantity, selectedExtras)` — Sepete ekle (aynı ürün + ekstra kombinasyonu varsa miktar artar)
- `removeItem(index)` — Sepetten çıkar
- `updateQuantity(index, quantity)` — Miktar güncelle
- `clearCart()` — Sepeti temizle
- `totalAmount` — Toplam tutar
- `totalItems` — Toplam adet

### Axios Yapılandırması
- Base URL: `/api` (Vite proxy ile backend'e yönlenir)
- **Request Interceptor:** Her isteğe localStorage'daki JWT token eklenir
- **Response Interceptor:** 401 hatalarında token temizlenir, `/login` sayfasına yönlendirilir

### Tema (Material-UI)
- **Ana renk:** Kırmızı (#dc2626)
- **İkincil renk:** Mavi (#3b82f6)
- **Font:** Inter
- **Border radius:** 12px (genel), 16px (kartlar)

---

## 🔧 Admin Paneli

Admin paneli 5 ana bölümden oluşur:

### 1. Sipariş Yönetimi
- Durum bazlı filtreleme (Bekleyen / Onaylanan / Hazırlanan / Hazır / Teslim / İptal)
- Her sipariş kartında: müşteri bilgisi, ürünler, adres, ödeme yöntemi
- Tek tıkla durum ilerletme: `pending → confirmed → preparing → ready → delivered`
- İptal etme özelliği
- **80mm termal yazıcı fişi yazdırma** (özelleştirilebilir)
- **10 saniyede bir otomatik güncelleme** (gerçek zamanlı)

### 2. Masa / Hızlı Sipariş
- Kategoriye göre ürün seçimi
- Masa seçimi (dropdown)
- Ürünleri **ücretsiz** olarak işaretleme (ikram)
- Nakit / Kart ödeme seçimi
- Sipariş notu ekleme
- Masa ekleme / silme yönetimi
- Online sipariş ayarını bypass eder

### 3. Menü Yönetimi
**3 sekmeli arayüz:**
- **Ürünler:** Tablo görünümü, görsel yükleme, kategori atama, ekstra seçimi, aktif/pasif durumu
- **Ekstralar:** Hızlı ekleme/düzenleme/silme
- **Kategoriler:** İsim, slug, sıralama yönetimi

### 4. Raporlar
- Tarih aralığı seçimi ile filtreleme
- **4 özet kart:** Toplam sipariş, toplam gelir, online sipariş, masa siparişi
- Online siparişler detay tablosu
- Masa siparişleri detay tablosu
- **Ürün bazlı satış analizi** (adet + ciro)
- Ortalama sipariş tutarı

### 5. Ayarlar
Kapsamlı yapılandırma paneli:

| Bölüm | Ayarlar |
|--------|---------|
| **Genel** | Minimum sipariş tutarı, mağaza telefonu, site adı, site ikonu |
| **Kapanış Görünümü** | Kapalıyken gösterilen mesaj, banner rengi, ikon |
| **Ana Sayfa Tasarımı** | Hero başlık, arka plan görseli, overlay, metin rengi/boyutu |
| **Yazıcı** | Fiş başlığı, alt bilgi, font boyutu, gösterilecek alanlar, **canlı önizleme** |
| **Konum & İletişim** | Adres, telefon, **interaktif Leaflet harita** ile teslimat merkezi |
| **Teslimat Bölgeleri** | Yarıçap (km) + minimum sipariş tutarı, haritada renkli daireler |
| **Çalışma Saatleri** | Her gün için açık/kapalı + saat aralığı |
| **Yasal Metinler** | KVKK Aydınlatma Metni, Mesafeli Satış Sözleşmesi |
| **Önerilen Ürünler** | Sipariş onayında gösterilecek ürünler |

---

## 🛒 Müşteri Özellikleri

### Sipariş Akışı
```
1. Menü Sayfası
   └── Kategoriye göre ürün filtreleme
   └── Ürün kartına tıklama

2. Ürün Detay Modalı
   └── Ekstra malzeme seçimi (opsiyonel)
   └── Miktar belirleme
   └── "Sepete Ekle"

3. Sepet Butonu (FAB)
   └── Toplam tutar ve adet gösterimi
   └── Tıklayınca sipariş dialogu açılır

4. Sipariş Onay Dialogu
   ├── Adım 1: Konum doğrulama (GPS + Haversine mesafe hesabı)
   ├── Adım 2: Teslimat adresi girişi
   ├── Adım 3: Kart bilgileri (numara, ad, son kullanma, CVV)
   ├── Sipariş notu (opsiyonel)
   ├── Önerilen ürünler
   ├── KVKK onayı
   └── Sipariş özeti + minimum tutar kontrolü
       └── "Siparişi Onayla"
```

### Teslimat Bölgesi Doğrulama
- Kullanıcının GPS konumu alınır
- **Haversine formülü** ile teslimat merkezine uzaklık hesaplanır
- Birden fazla bölge tanımlanabilir (her bölgenin kendi yarıçapı ve minimum sipariş tutarı)
- Bölge dışındaki kullanıcılar sipariş veremez

### Profil Sayfası
- Kullanıcı bilgileri (ad, e-posta, telefon)
- Kayıtlı adres (localStorage'da saklanır)
- **Sipariş geçmişi:** Her siparişin detayı, durumu (renk kodlu), ürünleri, ödeme bilgisi

---

## 🌱 Seed Verileri

`npm run seed` komutu ile oluşturulan başlangıç verileri:

### Admin Kullanıcı
| Alan | Değer |
|------|-------|
| İsim | Admin Uga |
| Telefon | 05301257088 |
| Şifre | admin123 |
| Rol | admin |

### Kategoriler (8 adet)
Et Burger, Tavuk Burger, Tavuk Sepeti, Makarnalar, Aperatifler, İçecekler, Soslar, Diğer

### Ürünler (43+ adet)
- **Burgerler:** Smash Burger (550₺), Cheese Burger (450₺), Mushy Burger (500₺), Uga Burger (600₺)
- **Tavuk:** Crispy Chicken (400₺), King's Crispy (480₺)
- **Sepetler:** Tenders & Fries (350₺), Nugget (250₺)
- **Makarnalar:** Penne çeşitleri (280-300₺), Mac & Cheese (280₺)
- **Aperatifler:** Mozzarella Sticks, Cheese Fries, Truffle Fries, Onion Rings
- **İçecekler:** Pepsi, 7up, Fuse Tea, Su (40-45₺)
- **Soslar:** Sweet Chili, BBQ, Ranch, Truffle Mayo, Chipotle (25₺)

### Ekstralar (8 adet)
Peynir Sos (25₺), Uga Sos (25₺), BBQ Sos (25₺), Ranch Sos (25₺), Sweet Chili (25₺), Ekstra Peynir (30₺), Ekstra Köfte (50₺), Patates Büyütme (20₺)

### Varsayılan Ayarlar
| Anahtar | Değer |
|---------|-------|
| `online_order_active` | false |
| `min_order_amount` | 1 |
| `store_phone` | 05301257088 |
| `store_address` | Uga Burger, İnönü Mah. Yenişehir/Mersin |

---

## 📜 npm Script'leri

### Root (package.json)
```bash
npm run dev          # Server + Client eşzamanlı çalıştır
npm run server:dev   # Sadece backend (nodemon)
npm run client       # Sadece frontend (Vite)
npm run seed         # Veritabanını seed et
npm run install:all  # Tüm bağımlılıkları yükle
```

### Server
```bash
npm start            # Production sunucu
npm run dev          # Development (nodemon)
npm run seed         # Seed verileri
```

### Client
```bash
npm run dev          # Vite dev sunucu (port 5173)
npm run build        # Production build
npm run preview      # Build önizleme
npm run lint         # ESLint kontrolü
```

---

## 🔑 Kimlik Doğrulama Akışı

```
┌─────────┐    POST /auth/login     ┌─────────┐
│  Client  │ ────────────────────►  │  Server  │
│          │  {phone, password}      │          │
│          │                         │ bcrypt   │
│          │    JWT Token            │ compare  │
│          │ ◄────────────────────   │          │
└─────┬────┘                         └──────────┘
      │
      │ localStorage.setItem('token', jwt)
      │
      │  Her istek:
      │  Authorization: Bearer <token>
      │
      │  401 hatası → localStorage temizle → /login
```

- **JWT süresi:** 7 gün
- **Şifre:** bcryptjs ile 10 salt rounds hash
- **Middleware zinciri:** `authMiddleware` → JWT doğrulama → `adminMiddleware` → rol kontrolü

---

## 🖨 Fiş Yazdırma

Admin panelinden sipariş fişi yazdırma özelliği:

- **Format:** 80mm termal yazıcı uyumlu
- **Font:** Courier New (monospace)
- **Özelleştirmeler:** Başlık, alt bilgi, font boyutu, gösterilecek alanlar
- **İçerik:** Sipariş no, tarih/saat, masa, ürünler, fiyatlar, toplam
- **Yöntem:** Yeni pencerede HTML oluşturulup `window.print()` çağrılır

---

## ⚙️ Teknik Notlar

- **Veritabanı senkronizasyonu:** `sequelize.sync({ alter: true })` — sunucu her başladığında model değişikliklerini otomatik uygular
- **Görsel yükleme:** Multer ile `/server/uploads/` dizinine kaydedilir (timestamp-tabanlı benzersiz isim)
- **Proxy:** Vite dev sunucusu `/api`, `/images`, `/uploads` isteklerini backend'e (port 5000) yönlendirir
- **CORS:** `CLIENT_URL` env değişkeni ile yapılandırılır
- **Sipariş toplamı:** Backend tarafında hesaplanır (güvenlik): `(ürün fiyatı + ekstra fiyatları) × miktar`
- **Konum doğrulama:** Client tarafında Haversine formülü ile mesafe hesabı yapılır
