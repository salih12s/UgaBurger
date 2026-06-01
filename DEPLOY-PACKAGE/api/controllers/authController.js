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
      user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, phone: user.phone, role: user.role, addresses: [], billing_addresses: [] },
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
    let billing = [];
    try { addrs = JSON.parse(user.addresses || '[]'); } catch {}
    try { billing = JSON.parse(user.billing_addresses || '[]'); } catch {}
    res.json({
      token,
      user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, phone: user.phone, role: user.role, addresses: addrs, billing_addresses: billing },
    });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'role', 'addresses', 'billing_addresses'],
    });
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    const u = user.toJSON();
    try { u.addresses = JSON.parse(u.addresses || '[]'); } catch { u.addresses = []; }
    try { u.billing_addresses = JSON.parse(u.billing_addresses || '[]'); } catch { u.billing_addresses = []; }
    res.json(u);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    const { addresses, billing_addresses } = req.body;
    if (addresses !== undefined) user.addresses = JSON.stringify(addresses);
    if (billing_addresses !== undefined) user.billing_addresses = JSON.stringify(billing_addresses);
    await user.save();
    const u = user.toJSON();
    try { u.addresses = JSON.parse(u.addresses || '[]'); } catch { u.addresses = []; }
    try { u.billing_addresses = JSON.parse(u.billing_addresses || '[]'); } catch { u.billing_addresses = []; }
    res.json({ id: u.id, first_name: u.first_name, last_name: u.last_name, email: u.email, phone: u.phone, role: u.role, addresses: u.addresses, billing_addresses: u.billing_addresses });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-posta adresi gerekli' });

    const user = await User.findOne({ where: { email: String(email).trim() } });
    if (!user) return res.status(404).json({ error: 'Bu e-posta adresine ait hesap bulunamadı' });

    // Güvenli rastgele token üret (link tabanlı sıfırlama)
    const token = crypto.randomBytes(32).toString('hex');
    user.reset_token = token;
    user.reset_token_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 saat
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'https://ugaburger.com';
    const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password/${token}`;

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
      to: user.email,
      subject: 'Şifre Sıfırlama Talebi - UGA BURGER',
      html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="500" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;max-width:500px;width:100%;box-shadow:0 4px 18px rgba(0,0,0,0.06);">
  <tr><td style="background:#dc2626;padding:24px;text-align:center;">
    <span style="font-size:30px;">🍔</span>
    <h1 style="color:#fff;margin:8px 0 0;font-size:22px;">UGA BURGER</h1>
  </td></tr>
  <tr><td style="padding:32px 28px;">
    <h2 style="color:#222;text-align:center;margin:0 0 12px;">Şifre Sıfırlama</h2>
    <p style="color:#555;font-size:15px;line-height:1.55;text-align:center;margin:0 0 20px;">Şifrenizi sıfırlamak için aşağıdaki butona tıklayın. Bu bağlantı <strong>1 saat</strong> boyunca geçerlidir.</p>
    <div style="margin:28px auto;text-align:center;">
      <a href="${resetUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:16px;">Şifremi Sıfırla</a>
    </div>
    <p style="color:#888;font-size:12px;line-height:1.6;text-align:center;margin:20px 0 0;word-break:break-all;">Buton çalışmazsa şu bağlantıyı tarayıcınıza yapıştırın:<br><a href="${resetUrl}" style="color:#3b82f6;">${resetUrl}</a></p>
    <p style="color:#888;font-size:12px;line-height:1.5;text-align:center;margin:18px 0 0;">Bu talebi siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.</p>
  </td></tr>
  <tr><td style="background:#f9f9f9;padding:14px;text-align:center;">
    <p style="color:#aaa;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} UGA BURGER</p>
  </td></tr>
</table></td></tr></table></body></html>`,
      text: `UGA BURGER - Şifre Sıfırlama\n\nŞifrenizi sıfırlamak için bu bağlantıya gidin (1 saat geçerli):\n${resetUrl}\n\nBu talebi siz yapmadıysanız görmezden gelin.`,
    });

    res.json({ message: 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi' });
  } catch (err) {
    res.status(500).json({ error: 'E-posta gönderilemedi: ' + err.message });
  }
};

// Link tabanlı şifre sıfırlama: /reset-password/:token üzerinden gelir.
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

    if (!user) return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş bağlantı' });

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
