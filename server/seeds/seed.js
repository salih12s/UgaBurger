const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize, User, Category, Product, Extra, ProductExtra, Setting } = require('../models');

async function seed() {
  try {
    await sequelize.sync({ force: true });
    console.log('Tablolar oluşturuldu');

    // --- ADMIN USER ---
    const adminHash = await bcrypt.hash('admin123', 10);
    await User.create({
      first_name: 'Admin',
      last_name: 'Uga',
      email: 'admin@ugaburger.com',
      phone: '05301257088',
      password_hash: adminHash,
      role: 'admin',
    });
    console.log('Admin hesabı oluşturuldu (tel: 05301257088, şifre: admin123)');

    // --- CATEGORIES ---
    const categories = await Category.bulkCreate([
      { name: 'Et Burger', slug: 'et-burger', sort_order: 1 },
      { name: 'Tavuk Burger', slug: 'tavuk-burger', sort_order: 2 },
      { name: 'Tavuk Sepeti', slug: 'tavuk-sepeti', sort_order: 3 },
      { name: 'Makarnalar', slug: 'makarnalar', sort_order: 4 },
      { name: 'Aperatifler', slug: 'aperatifler', sort_order: 5 },
      { name: 'İçecekler', slug: 'icecekler', sort_order: 6 },
      { name: 'Soslar', slug: 'soslar', sort_order: 7 },
      { name: 'Diğer', slug: 'diger', sort_order: 8 },
    ]);
    console.log('Kategoriler oluşturuldu');

    const catMap = {};
    categories.forEach(c => { catMap[c.slug] = c.id; });

    // --- PRODUCTS ---
    const products = await Product.bulkCreate([
      // Et Burger
      { name: 'SMASH BURGER', description: '200 gr Burger, Cheddar peyniri', price: 550.00, image_url: '/images/smash_burger.jpg.jpeg', category_id: catMap['et-burger'], sort_order: 1 },
      { name: 'CHEESE BURGER', description: 'Çift kat cheddar peynirli klasik burger', price: 450.00, image_url: '/images/CHEESEBURGER.jpg', category_id: catMap['et-burger'], sort_order: 2 },
      { name: 'MUSHY BURGER', description: 'Mantarlı özel burger', price: 500.00, image_url: '/images/MUSHYBURGER.jpg', category_id: catMap['et-burger'], sort_order: 3 },
      { name: 'KLASİK BURGER', description: 'Geleneksel lezzet', price: 400.00, image_url: '/images/KLASİKBURGER.jpeg', category_id: catMap['et-burger'], sort_order: 4 },
      { name: 'İSLİ BURGER', description: 'İsli BBQ soslu özel burger', price: 520.00, image_url: '/images/İSLİBURGER.jpg', category_id: catMap['et-burger'], sort_order: 5 },
      { name: 'UGA BURGER', description: 'Uga Burger özel tarif', price: 600.00, image_url: '/images/UGABURGER.jpg', category_id: catMap['et-burger'], sort_order: 6 },
      { name: "Devil's INN", description: 'Acı sevenler için özel burger', price: 550.00, image_url: "/images/Devil'sINN.jpg", category_id: catMap['et-burger'], sort_order: 7 },

      // Tavuk Burger
      { name: 'CRISPY CHICKEN BURGER', description: 'Çıtır tavuk burger', price: 400.00, image_url: '/images/CRISPYCHICKENBURGER.jpg', category_id: catMap['tavuk-burger'], sort_order: 1 },
      { name: "KING'S CRISPY BURGER", description: 'Kral boy çıtır tavuk burger', price: 480.00, image_url: "/images/KING'SCRISPYBURGER.jpg", category_id: catMap['tavuk-burger'], sort_order: 2 },
      { name: 'Chicken Mushroom Burger', description: 'Tavuk ve mantar burger', price: 460.00, image_url: '/images/ChickenMushroomBurger.jpg', category_id: catMap['tavuk-burger'], sort_order: 3 },
      { name: "Chicken's Inn Burger", description: 'Chicken Inn özel tarif', price: 450.00, image_url: "/images/Chicken'sInnBurger.jpg", category_id: catMap['tavuk-burger'], sort_order: 4 },

      // Tavuk Sepeti
      { name: 'Tenders & Fries', description: 'Çıtır tavuk parçaları ve patates', price: 350.00, image_url: '/images/TenderFries.jpg', category_id: catMap['tavuk-sepeti'], sort_order: 1 },
      { name: 'Tavuk Nugget', description: 'Çıtır tavuk nugget', price: 250.00, image_url: '/images/TavukNugget.jpg', category_id: catMap['tavuk-sepeti'], sort_order: 2 },
      { name: 'Crunchy Mix Box', description: 'Karışık çıtır kutu', price: 400.00, image_url: '/images/CrunchyMixBox.jpg', category_id: catMap['tavuk-sepeti'], sort_order: 3 },

      // Makarnalar
      { name: 'Tavuklu Mantarlı Penne', description: 'Tavuk ve mantar soslu penne makarna', price: 300.00, image_url: '/images/TavukluMantarlıPenne.jpeg', category_id: catMap['makarnalar'], sort_order: 1 },
      { name: 'Köri Soslu Penne', description: 'Köri soslu penne makarna', price: 280.00, image_url: '/images/KöriSosluPenne.jpg', category_id: catMap['makarnalar'], sort_order: 2 },
      { name: 'Pesto Soslu Penne', description: 'Pesto soslu penne makarna', price: 290.00, image_url: '/images/PestoSosluPenne.jpeg', category_id: catMap['makarnalar'], sort_order: 3 },
      { name: 'MAC & CHEESE', description: 'Kremalı peynirli makarna', price: 280.00, image_url: '/images/MAC&CHEESE.jpg', category_id: catMap['makarnalar'], sort_order: 4 },

      // Aperatifler
      { name: 'Mozerella Stick', description: 'Çıtır Mozzarella', price: 120.00, image_url: '/images/MozarellaStick.jpg', category_id: catMap['aperatifler'], sort_order: 1 },
      { name: 'Cheese Chicken Fries', description: 'Patates Kızartması, Çıtır Tavuk Parçaları, Peynir Sos, Uga Sos', price: 320.00, image_url: '/images/CheeseChickenFries.jpg', category_id: catMap['aperatifler'], sort_order: 2 },
      { name: 'Peynir Soslu Patates Kızartması', description: 'Peynir soslu patates', price: 120.00, image_url: '', category_id: catMap['aperatifler'], sort_order: 3 },
      { name: 'Trüflü Parmesanlı Patates Kızartması', description: 'Trüf yağlı parmesan peynirli patates', price: 150.00, image_url: '/images/TrüflüParmesanlıPatatesKızartması.jpg', category_id: catMap['aperatifler'], sort_order: 4 },
      { name: 'Soğan Halkası', description: 'Çıtır soğan halkası', price: 100.00, image_url: '/images/SoğanHalkası.jpg', category_id: catMap['aperatifler'], sort_order: 5 },
      { name: 'Patates Kızartması', description: 'Klasik patates kızartması', price: 80.00, image_url: '/images/PatatesKızartması.jpg', category_id: catMap['aperatifler'], sort_order: 6 },

      // İçecekler
      { name: 'Pepsi Kola', description: '', price: 40.00, image_url: '/images/PepsiKola.jpg', category_id: catMap['icecekler'], sort_order: 1 },
      { name: 'Pepsi Zero', description: '', price: 40.00, image_url: '/images/PepsiZero.jpg', category_id: catMap['icecekler'], sort_order: 2 },
      { name: '7 up', description: '', price: 40.00, image_url: '/images/7up.jpg', category_id: catMap['icecekler'], sort_order: 3 },
      { name: 'Fuse Tea Mango', description: '', price: 40.00, image_url: '/images/FuseTeaMango.jpg', category_id: catMap['icecekler'], sort_order: 4 },
      { name: 'Fuse Tea Şeftali', description: '', price: 40.00, image_url: '/images/FuseTeaŞeftali.jpg', category_id: catMap['icecekler'], sort_order: 5 },
      { name: 'Su', description: '', price: 10.00, image_url: '/images/Su.jpg', category_id: catMap['icecekler'], sort_order: 6 },
      { name: 'Yedigün', description: '', price: 40.00, image_url: '/images/Yedigün.jpg', category_id: catMap['icecekler'], sort_order: 7 },
      { name: 'Lipton Ice Tea Karpuz ve Nane', description: '', price: 45.00, image_url: '', category_id: catMap['icecekler'], sort_order: 8 },

      // Soslar
      { name: 'Sweet Chili', description: '', price: 25.00, image_url: '', category_id: catMap['soslar'], sort_order: 1 },
      { name: 'Uga Sos', description: '', price: 25.00, image_url: '', category_id: catMap['soslar'], sort_order: 2 },
      { name: 'Peynir Sos', description: '', price: 25.00, image_url: '', category_id: catMap['soslar'], sort_order: 3 },
      { name: 'Coleslaw', description: '', price: 25.00, image_url: '', category_id: catMap['soslar'], sort_order: 4 },
      { name: 'Trüf Mayonez', description: '', price: 25.00, image_url: '', category_id: catMap['soslar'], sort_order: 5 },
      { name: 'Ranch Sos', description: '', price: 25.00, image_url: '', category_id: catMap['soslar'], sort_order: 6 },
      { name: 'Chipotle Sos', description: '', price: 25.00, image_url: '', category_id: catMap['soslar'], sort_order: 7 },
      { name: 'BBQ Sos', description: '', price: 25.00, image_url: '', category_id: catMap['soslar'], sort_order: 8 },
      { name: 'Acı Sos (Hot Chili)', description: '', price: 25.00, image_url: '', category_id: catMap['soslar'], sort_order: 9 },
      { name: 'Acılı Mayonez', description: '', price: 25.00, image_url: '', category_id: catMap['soslar'], sort_order: 10 },
      { name: 'İsli BBQ Sos', description: '', price: 25.00, image_url: '', category_id: catMap['soslar'], sort_order: 11 },
      { name: 'Sarımsaklı Mayonez', description: '', price: 25.00, image_url: '', category_id: catMap['soslar'], sort_order: 12 },
    ]);
    console.log(`${products.length} ürün oluşturuldu`);

    // --- EXTRAS ---
    const extras = await Extra.bulkCreate([
      { name: 'Peynir Sos', price: 25.00 },
      { name: 'Uga Sos', price: 25.00 },
      { name: 'BBQ Sos', price: 25.00 },
      { name: 'Ranch Sos', price: 25.00 },
      { name: 'Sweet Chili', price: 25.00 },
      { name: 'Ekstra Peynir', price: 30.00 },
      { name: 'Ekstra Köfte', price: 50.00 },
      { name: 'Patates Büyütme', price: 20.00 },
    ]);
    console.log('Ekstralar oluşturuldu');

    // Bind Peynir Sos extra to Cheese Chicken Fries (like in screenshot)
    const cheeseChickenFries = products.find(p => p.name === 'Cheese Chicken Fries');
    const peynirSosExtra = extras.find(e => e.name === 'Peynir Sos');
    if (cheeseChickenFries && peynirSosExtra) {
      await ProductExtra.create({ product_id: cheeseChickenFries.id, extra_id: peynirSosExtra.id });
    }

    // --- SETTINGS ---
    await Setting.bulkCreate([
      { key: 'online_order_active', value: 'false' },
      { key: 'min_order_amount', value: '1' },
      { key: 'store_phone', value: '05301257088' },
      { key: 'store_address', value: 'Uga Burger, inönü mah. Yenişehir/Mersin' },
    ]);
    console.log('Ayarlar oluşturuldu');

    console.log('\n✅ Seed tamamlandı!');
    console.log('Admin giriş: tel=05301257088, şifre=admin123');
    process.exit(0);
  } catch (err) {
    console.error('Seed hatası:', err);
    process.exit(1);
  }
}

seed();
