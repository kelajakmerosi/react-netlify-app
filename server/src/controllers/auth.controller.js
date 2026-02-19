const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User   = require('../models/User.model');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ─── POST /api/auth/register ──────────────────────────────────────────────────

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const user  = await User.create({ name: name || email.split('@')[0], email, password });
    const token = signToken(user.id);

    res.status(201).json({ token, user: User.toPublic(user) });
  } catch (err) { next(err); }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findByEmail(email, { withPassword: true });
    if (!user || !user.password || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user.id);
    res.json({ token, user: User.toPublic(user) });
  } catch (err) { next(err); }
};

// ─── POST /api/auth/google ────────────────────────────────────────────────────

exports.googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'Google ID token required' });

    // Verify token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Upsert user — create on first login, update avatar on subsequent
    const user  = await User.upsertGoogle({ googleId, email, name, avatar: picture });
    const token = signToken(user.id);

    res.json({ token, user: User.toPublic(user) });
  } catch (err) { next(err); }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

exports.getMe = async (req, res) => {
  res.json({ user: User.toPublic(req.user) });
};
