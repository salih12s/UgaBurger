<div align="center">
  <img src="./client/public/logo-transparent.png" alt="UGA Burger" width="180" />

  # UGA Burger

  **Restoranın dijital sipariş, operasyon ve yönetim süreçlerini tek üründe birleştiren uçtan uca platform.**

  [Canlı Ürünü İncele](https://ugaburger.com) · [Menüyü Görüntüle](https://ugaburger.com/menu)
</div>

<br />

![UGA Burger ana sayfa](./docs/screenshots/home-desktop.png)

## Ürün hakkında

UGA Burger; müşterinin menüyü keşfetmesinden siparişini tamamlamasına, restoran ekibinin siparişi yönetmesinden satışları raporlamasına kadar tüm akışı kapsayan gerçek bir restoran otomasyonudur.

Platform yalnızca bir online menü değildir. Dinamik ürün seçenekleri, adres ve teslimat bölgesi yönetimi, masa siparişleri, kampanyalar, online ödeme, e-Fatura/e-Arşiv süreçleri, termal fiş çıktısı ve detaylı yönetim paneli aynı yapı içinde çalışır.

## Ürün deneyimi

### Dinamik menü ve sipariş akışı

Kategoriler, ürünler, seçenek grupları ve ürün görselleri yönetim panelinden düzenlenir. Mobil öncelikli arayüz, geniş ürün kataloglarında hızlı gezinme ve sade bir sipariş deneyimi sunar.

![UGA Burger ürün menüsü](./docs/screenshots/menu-desktop.png)

### Mobil kullanım

Ana sayfa, menü, kategori şeridi, ürün kartları ve sipariş adımları küçük ekranlara özel davranışlarla tasarlandı.

<p align="center">
  <img src="./docs/screenshots/menu-mobile.png" alt="UGA Burger mobil menü" width="360" />
  <br />
  <sub>Mobil ürün kataloğu</sub>
</p>

### İletişim ve mağaza bilgileri

Adres, telefon, e-posta, çalışma saatleri ve harita yönlendirmesi merkezi ayarlardan beslenir.

![UGA Burger iletişim ve adres sayfası](./docs/screenshots/contact-desktop.png)

## Öne çıkan yetenekler

### Müşteri tarafı

- Kategori bazlı dinamik ürün kataloğu
- Ürün seçenekleri, ekstralar ve adet yönetimi
- Sepet ve çok adımlı sipariş deneyimi
- Kayıtlı teslimat ve fatura adresleri
- Teslimat bölgesi ve minimum sepet kontrolü
- Kampanya ve promosyon kodları
- Google ile hızlı giriş
- Sipariş geçmişi ve durum takibi
- Bireysel ve kurumsal fatura bilgileri
- Yemeksepeti yönlendirme ve mağaza durumu duyuruları
- Masaüstü, tablet ve mobil uyumlu arayüz

### Restoran operasyonu

- Bekleyen siparişler için sesli ve görsel bildirim
- Durum bazlı sipariş yönetimi
- Masa / hızlı sipariş ekranı
- Nakit, kart ve online ödeme akışları
- Ürün, kategori, seçenek ve stok görünürlüğü yönetimi
- Üye ve kayıtlı adres görüntüleme
- Tarih aralığına ve ürüne göre satış raporları
- Promosyon kodu yönetimi
- Çalışma saatleri, teslimat bölgeleri ve mağaza görünümü ayarları
- 80 mm termal fiş düzeni ve Electron üzerinden sessiz yazdırma
- Sipariş onayına bağlı e-Fatura / e-Arşiv süreci

## Nasıl çalışıyor?

```text
Müşteri arayüzü
      │
      ├── Menü → Ürün seçenekleri → Sepet
      ├── Adres ve teslimat kontrolü
      └── Sipariş / online ödeme
                    │
                    ▼
              Express REST API
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
 Veritabanı     PayTR ödeme   E-Fatura / E-Arşiv
      │
      ▼
 Yönetim paneli → Operasyon → Raporlama → Fiş çıktısı
```

Müşterinin gördüğü içerik, mağaza durumu ve operasyon kuralları yönetim panelindeki ayarlardan beslenir. Sipariş oluşturulduktan sonra restoran ekibi süreci tek panelden ilerletir; ödeme, faturalama ve raporlama verileri aynı sipariş kaydı etrafında birleşir.

## Teknik yapı

| Katman | Kullanılan teknolojiler |
|---|---|
| Arayüz | React 19, Vite 8, Material UI 9, React Router 7 |
| İstemci veri akışı | Context API, Axios, React Hot Toast |
| Harita | Leaflet, React Leaflet |
| Sunucu | Node.js, Express 4 |
| Veri katmanı | Sequelize 6, MySQL / PostgreSQL |
| Medya | Multer, Sharp |
| Masaüstü POS | Electron |
| Servisler | PayTR, Google OAuth, Aktif Dönüşüm, Nodemailer |

### Mimari tercihler

- Büyük ekranlar rota bazlı lazy loading ile ihtiyaç anında yüklenir.
- Vite vendor chunk ayrımı; React, MUI, harita ve istemci paketlerini ayrı önbellek parçalarına böler.
- Görsel yükleme hattı, medya dosyalarını optimize ederek sunar.
- API yanıtlarında sıkıştırma; statik içeriklerde uzun süreli tarayıcı önbelleği kullanılır.
- Ayar tabanlı yapı sayesinde mağaza metinleri, görseller, çalışma saatleri ve operasyon kuralları kod değişikliği olmadan yönetilir.
- Veri modeli hem MySQL/MariaDB hem PostgreSQL üzerinde çalışabilecek şekilde tasarlanmıştır.
- Web yönetim paneli ile Electron tabanlı POS aynı iş akışını paylaşır.

## Proje haritası

```text
MusattiBurger/
├── client/
│   ├── public/                 # Marka varlıkları ve bildirim sesi
│   └── src/
│       ├── api/                # API istemcisi
│       ├── components/
│       │   ├── Admin/          # Operasyon ve yönetim paneli
│       │   ├── Auth/           # Üyelik ekranları
│       │   ├── Cart/           # Sepet, adres ve sipariş akışı
│       │   ├── Contact/        # Mağaza ve iletişim görünümü
│       │   ├── Home/           # Ana vitrin
│       │   ├── Layout/         # Navigasyon ve footer
│       │   ├── Menu/           # Katalog ve ürün seçenekleri
│       │   └── Profile/        # Profil ve sipariş geçmişi
│       ├── context/            # Oturum ve sepet durumu
│       └── App.jsx             # Rotalar ve uygulama kompozisyonu
├── server/
│   ├── controllers/            # İş kuralları
│   ├── models/                 # Sequelize veri modeli
│   ├── routes/                 # REST uçları
│   ├── services/               # Fatura ve dış servis akışları
│   └── server.js               # Express uygulaması
├── electron/                   # POS ve sessiz yazdırma köprüsü
├── Images/                     # Ürün görselleri
└── docs/screenshots/           # README ürün görselleri
```

## Yönetim paneli kapsamı

| Bölüm | Sorumluluk |
|---|---|
| Siparişler | Sipariş takibi, durum güncelleme, ödeme ve fiş işlemleri |
| Masa / Hızlı Sipariş | Salon siparişi, masa seçimi ve hızlı ürün girişi |
| Menü Yönetimi | Ürün, kategori, ekstra, seçenek grubu ve görünürlük |
| Üyeler | Müşteri ve kayıtlı adres görünümü |
| Raporlar | Sipariş, ciro, kanal ve ürün performansı |
| Ayarlar | Marka, çalışma saatleri, teslimat, iletişim ve operasyon tercihleri |

---

<div align="center">
  <sub>React ve Node.js ile geliştirilen gerçek kullanım odaklı restoran sipariş platformu.</sub>
</div>
