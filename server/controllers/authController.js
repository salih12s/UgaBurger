const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const https = require('https');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const { User } = require('../models');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const register = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;

    if (!first_name || !last_name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Tüm alanları doldurunuz' });
    }

    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      return res.status(400).json({ error: 'Bu telefon numarası zaten kayıtlı' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ first_name, last_name, email, phone, password_hash });

    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, phone: user.phone, role: user.role, addresses: [] },
    });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
};

const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Telefon ve şifre gerekli' });
    }

    const user = await User.findOne({ where: { phone } });
    if (!user) {
      return res.status(401).json({ error: 'Telefon numarası veya şifre hatalı' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Telefon numarası veya şifre hatalı' });
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    let addrs = [];
    try { addrs = JSON.parse(user.addresses || '[]'); } catch {}
    res.json({
      token,
      user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, phone: user.phone, role: user.role, addresses: addrs },
    });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'role', 'addresses'],
    });
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    const u = user.toJSON();
    try { u.addresses = JSON.parse(u.addresses || '[]'); } catch { u.addresses = []; }
    res.json(u);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    const { addresses } = req.body;
    if (addresses !== undefined) user.addresses = JSON.stringify(addresses);
    await user.save();
    const u = user.toJSON();
    try { u.addresses = JSON.parse(u.addresses || '[]'); } catch { u.addresses = []; }
    res.json({ id: u.id, first_name: u.first_name, last_name: u.last_name, email: u.email, phone: u.phone, role: u.role, addresses: u.addresses });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-posta adresi gerekli' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Bu e-posta adresine ait hesap bulunamadı' });

    const token = crypto.randomBytes(32).toString('hex');
    user.reset_token = token;
    user.reset_token_expires = new Date(Date.now() + 3600000);
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"UGA BURGER" <${process.env.SMTP_USER || 'no-reply@ugaburger.com'}>`,
      to: email,
      subject: 'Şifre Sıfırlama - UGA BURGER',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626; text-align: center;">UGA BURGER</h2>
          <h3 style="text-align: center;">Şifre Sıfırlama</h3>
          <p>Merhaba,</p>
          <p>Hesabınız için şifre sıfırlama talebinde bulunuldu. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Şifremi Sıfırla</a>
          </div>
          <p style="color: #888; font-size: 13px;">Bu link 1 saat içinde geçerliliğini yitirecektir.</p>
          <p style="color: #888; font-size: 13px;">Bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #aaa; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} UGA BURGER</p>
        </div>
      `,
    });

    res.json({ message: 'Şifre sıfırlama linki e-posta adresinize gönderildi' });
  } catch (err) {
    res.status(500).json({ error: 'E-posta gönderilemedi: ' + err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { new_password } = req.body;
    if (!new_password) return res.status(400).json({ error: 'Yeni şifre gerekli' });
    if (new_password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });

    const user = await User.findOne({
      where: {
        reset_token: token,
        reset_token_expires: { [Op.gt]: new Date() },
      },
    });

    if (!user) return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş link' });

    user.password_hash = await bcrypt.hash(new_password, 10);
    user.reset_token = null;
    user.reset_token_expires = null;
    await user.save();

    res.json({ message: 'Şifreniz başarıyla güncellendi' });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

function fetchGoogleUserInfo(accessToken) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

const googleLogin = async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) return res.status(400).json({ error: 'Access token gerekli' });

    const payload = await fetchGoogleUserInfo(access_token);
    if (!payload || !payload.email) return res.status(400).json({ error: 'Google hesap bilgileri alınamadı' });

    const { sub: google_id, email, given_name, family_name } = payload;

    let user = await User.findOne({ where: { google_id } });

    if (!user) {
      user = await User.findOne({ where: { email } });
      if (user) {
        user.google_id = google_id;
        await user.save();
      } else {
        user = await User.create({
          first_name: given_name || '',
          last_name: family_name || '',
          email,
          phone: null,
          password_hash: null,
          google_id,
        });
      }
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    let addrs = [];
    try { addrs = JSON.parse(user.addresses || '[]'); } catch {}

    res.json({
      token,
      user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, phone: user.phone, role: user.role, addresses: addrs },
    });
  } catch (err) {
    res.status(500).json({ error: 'Google giriş hatası: ' + err.message });
  }
};

module.exports = { register, login, getMe, updateProfile, forgotPassword, resetPassword, googleLogin };
