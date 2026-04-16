    const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

const resetPassword = async (req, res) => {
  try {
    const { phone, new_password } = req.body;
    if (!phone || !new_password) return res.status(400).json({ error: 'Telefon ve yeni şifre gerekli' });
    if (new_password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });

    const user = await User.findOne({ where: { phone } });
    if (!user) return res.status(404).json({ error: 'Bu telefon numarasına ait hesap bulunamadı' });

    user.password_hash = await bcrypt.hash(new_password, 10);
    await user.save();

    res.json({ message: 'Şifreniz başarıyla güncellendi' });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

module.exports = { register, login, getMe, updateProfile, resetPassword };
