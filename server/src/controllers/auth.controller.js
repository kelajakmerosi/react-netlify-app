const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User   = require('../models/User.model');
const ERROR_CODES = require('../constants/errorCodes');
const { sendError } = require('../utils/http');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ─── POST /api/auth/register ──────────────────────────────────────────────────

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.EMAIL_PASSWORD_REQUIRED,
        message: 'Email and password required',
        requestId: req.id,
      });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.EMAIL_ALREADY_IN_USE,
        message: 'Email already in use',
        requestId: req.id,
      });
    }

    const user  = await User.create({ name: name || email.split('@')[0], email, password });
    const token = signToken(user.id);

    res.status(201).json({ token, user: User.toPublic(user) });
  } catch (err) { next(err); }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.EMAIL_PASSWORD_REQUIRED,
        message: 'Email and password required',
        requestId: req.id,
      });
    }

    const user = await User.findByEmail(email, { withPassword: true });
    if (!user || !user.password || !(await bcrypt.compare(password, user.password)))
      return sendError(res, {
        status: 401,
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid credentials',
        requestId: req.id,
      });

    const token = signToken(user.id);
    res.json({ token, user: User.toPublic(user) });
  } catch (err) { next(err); }
};

// ─── POST /api/auth/google ────────────────────────────────────────────────────

exports.googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.GOOGLE_ID_TOKEN_REQUIRED,
        message: 'Google ID token required',
        requestId: req.id,
      });
    }

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
