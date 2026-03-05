const jwt = require('jsonwebtoken')
const { OAuth2Client } = require('google-auth-library')
const User = require('../models/User.model')
const PhoneAuthCode = require('../models/PhoneAuthCode.model')
const Analytics = require('../models/Analytics.model')
const { sendOtp } = require('../services/sms/eskiz.service')
const ERROR_CODES = require('../constants/errorCodes')
const { sendError, sendSuccess } = require('../utils/http')

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const OTP_TTL_SEC = Number(process.env.PHONE_OTP_TTL_SEC || 300)
const OTP_RESEND_COOLDOWN_SEC = Number(process.env.PHONE_OTP_RESEND_COOLDOWN_SEC || 60)
const OTP_RATE_LIMIT_WINDOW_SEC = 15 * 60
const OTP_RATE_LIMIT_MAX = 5
const PASSWORD_RESET_TOKEN_TTL_SEC = Number(process.env.PASSWORD_RESET_TOKEN_TTL_SEC || 10 * 60)

const OTP_PURPOSE_SIGNUP = 'signup'
const OTP_PURPOSE_PASSWORD_RESET = 'password_reset'
const OTP_PURPOSE_LEGACY_PASSWORD_SETUP = 'legacy_password_setup'
const OTP_PURPOSE_LEGACY_LOGIN = 'legacy_login'

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })

const signPasswordResetToken = ({ userId, phone }) =>
  jwt.sign(
    { purpose: OTP_PURPOSE_PASSWORD_RESET, userId, phone },
    process.env.JWT_SECRET,
    { expiresIn: PASSWORD_RESET_TOKEN_TTL_SEC }
  )

const verifyPasswordResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if (decoded?.purpose !== OTP_PURPOSE_PASSWORD_RESET || !decoded?.userId || !decoded?.phone) {
      return null
    }
    return decoded
  } catch {
    return null
  }
}

const getRequestIp = (req) => {
  const value = req.ip || req.headers['x-forwarded-for'] || null
  return typeof value === 'string' ? value : null
}

const trackEventSafe = (payload) => {
  Analytics.trackEvent(payload).catch(() => {})
}

const mapOtpVerifyFailure = (req, res, reason) => {
  if (reason === 'expired') {
    return sendError(res, {
      status: 400,
      code: ERROR_CODES.PHONE_CODE_EXPIRED,
      message: 'OTP code has expired. Request a new code.',
      requestId: req.id,
    })
  }

  if (reason === 'attempts_exceeded') {
    return sendError(res, {
      status: 429,
      code: ERROR_CODES.PHONE_CODE_ATTEMPTS_EXCEEDED,
      message: 'Maximum OTP attempts reached. Request a new code.',
      requestId: req.id,
    })
  }

  return sendError(res, {
    status: 400,
    code: ERROR_CODES.PHONE_CODE_INVALID,
    message: 'Invalid OTP code.',
    requestId: req.id,
  })
}

const requestOtpCode = async ({ req, res, phone, purpose, userId = null }) => {
  const requestIp = getRequestIp(req)
  const recentCount = await PhoneAuthCode.countRecentRequests({
    phone,
    requestIp,
    windowSec: OTP_RATE_LIMIT_WINDOW_SEC,
    purpose,
  })

  if (recentCount >= OTP_RATE_LIMIT_MAX) {
    sendError(res, {
      status: 429,
      code: ERROR_CODES.PHONE_CODE_REQUEST_LIMIT,
      message: 'Too many OTP requests. Please wait and try again.',
      requestId: req.id,
    })
    return false
  }

  const lastCode = await PhoneAuthCode.getLastActiveCode(phone, purpose)
  if (lastCode) {
    const elapsedSec = Math.floor((Date.now() - new Date(lastCode.created_at).getTime()) / 1000)
    if (elapsedSec < OTP_RESEND_COOLDOWN_SEC) {
      sendError(res, {
        status: 429,
        code: ERROR_CODES.PHONE_CODE_COOLDOWN,
        message: `Please wait ${OTP_RESEND_COOLDOWN_SEC - elapsedSec}s before requesting a new code.`,
        requestId: req.id,
      })
      return false
    }
  }

  const createdCode = await PhoneAuthCode.createCode({
    phone,
    requestIp,
    ttlSec: OTP_TTL_SEC,
    maxAttempts: 5,
    purpose,
    userId,
  })

  try {
    await sendOtp(phone, createdCode.code)
  } catch (smsErr) {
    if (createdCode.id) {
      await PhoneAuthCode.deleteById(createdCode.id).catch(() => {})
    }
    throw smsErr
  }

  sendSuccess(res, {
    sent: true,
    phone,
    ttlSec: OTP_TTL_SEC,
    resendCooldownSec: OTP_RESEND_COOLDOWN_SEC,
  })

  return true
}

exports.register = async (_req, res) => {
  return sendError(res, {
    status: 410,
    code: ERROR_CODES.PHONE_AUTH_ONLY,
    message: 'Email/password registration is deprecated. Use phone signup flow.',
  })
}

exports.login = async (_req, res) => {
  return sendError(res, {
    status: 410,
    code: ERROR_CODES.PHONE_AUTH_ONLY,
    message: 'Email/password login is deprecated. Use phone/password login.',
  })
}

exports.signupRequestCode = async (req, res, next) => {
  try {
    const { phone } = req.body
    const existing = await User.findByPhone(phone)
    if (existing) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.PHONE_ALREADY_REGISTERED,
        message: 'This phone is already registered. Please log in.',
        requestId: req.id,
      })
    }

    await requestOtpCode({
      req,
      res,
      phone,
      purpose: OTP_PURPOSE_SIGNUP,
    })
  } catch (err) {
    return next(err)
  }
}

exports.signupConfirm = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, password, code } = req.body
    const verification = await PhoneAuthCode.verifyCode({
      phone,
      code,
      purpose: OTP_PURPOSE_SIGNUP,
    })

    if (!verification.ok) {
      return mapOtpVerifyFailure(req, res, verification.reason)
    }

    const existing = await User.findByPhone(phone)
    if (existing) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.PHONE_ALREADY_REGISTERED,
        message: 'This phone is already registered. Please log in.',
        requestId: req.id,
      })
    }

    const user = await User.create({
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      phone,
      password,
      provider: 'local',
      phoneVerified: true,
    })

    const token = signToken(user.id)
    trackEventSafe({
      eventType: 'signup_success',
      userId: user.id,
      source: 'phone_password',
      payload: { phone },
    })
    trackEventSafe({
      eventType: 'signin_success',
      userId: user.id,
      source: 'phone_password',
    })
    return sendSuccess(res, { token, user: User.toPublic(user) })
  } catch (err) {
    return next(err)
  }
}

exports.loginWithPassword = async (req, res, next) => {
  try {
    const { phone, password } = req.body
    const user = await User.findByPhone(phone, { withPassword: true })
    if (!user) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.PHONE_NOT_REGISTERED,
        message: 'No account found for this phone.',
        requestId: req.id,
      })
    }

    if (!user.password) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.PASSWORD_SETUP_REQUIRED,
        message: 'Password setup is required for this account.',
        requestId: req.id,
        details: { requiresPasswordSetup: true },
      })
    }

    const matched = await User.verifyPassword(password, user.password)
    if (!matched) {
      return sendError(res, {
        status: 401,
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid phone or password.',
        requestId: req.id,
      })
    }

    const token = signToken(user.id)
    trackEventSafe({
      eventType: 'signin_success',
      userId: user.id,
      source: 'password',
      payload: { phone },
    })
    return sendSuccess(res, { token, user: User.toPublic(user) })
  } catch (err) {
    return next(err)
  }
}

exports.legacyLoginOtpRequestCode = async (req, res, next) => {
  try {
    const { phone } = req.body
    const user = await User.findByPhone(phone, { withPassword: true })
    if (!user) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.PHONE_NOT_REGISTERED,
        message: 'No account found for this phone.',
        requestId: req.id,
      })
    }

    const purpose = user.password
      ? OTP_PURPOSE_LEGACY_LOGIN
      : OTP_PURPOSE_LEGACY_PASSWORD_SETUP

    await requestOtpCode({
      req,
      res,
      phone,
      purpose,
      userId: user.id,
    })
  } catch (err) {
    return next(err)
  }
}

exports.legacyLoginOtpConfirm = async (req, res, next) => {
  try {
    const { phone, code } = req.body
    const user = await User.findByPhone(phone, { withPassword: true })
    if (!user) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.PHONE_NOT_REGISTERED,
        message: 'No account found for this phone.',
        requestId: req.id,
      })
    }

    const purpose = user.password
      ? OTP_PURPOSE_LEGACY_LOGIN
      : OTP_PURPOSE_LEGACY_PASSWORD_SETUP

    const verification = await PhoneAuthCode.verifyCode({ phone, code, purpose })
    if (!verification.ok) {
      return mapOtpVerifyFailure(req, res, verification.reason)
    }

    const verifiedUser = await User.markPhoneVerified(user.id)
    const token = signToken(user.id)
    const requiresPasswordSetup = !user.password
    trackEventSafe({
      eventType: 'signin_success',
      userId: user.id,
      source: requiresPasswordSetup ? 'otp_legacy_setup' : 'otp_legacy',
      payload: { phone },
    })

    return sendSuccess(res, {
      token,
      user: User.toPublic(verifiedUser || user),
      requiresPasswordSetup,
    })
  } catch (err) {
    return next(err)
  }
}

exports.passwordResetRequestCode = async (req, res, next) => {
  try {
    const { phone } = req.body
    const user = await User.findByPhone(phone, { withPassword: true })
    if (!user) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.PHONE_NOT_REGISTERED,
        message: 'No account found for this phone.',
        requestId: req.id,
      })
    }

    await requestOtpCode({
      req,
      res,
      phone,
      purpose: OTP_PURPOSE_PASSWORD_RESET,
      userId: user.id,
    })
  } catch (err) {
    return next(err)
  }
}

exports.passwordResetConfirmCode = async (req, res, next) => {
  try {
    const { phone, code } = req.body
    const user = await User.findByPhone(phone, { withPassword: true })
    if (!user) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.PHONE_NOT_REGISTERED,
        message: 'No account found for this phone.',
        requestId: req.id,
      })
    }

    const verification = await PhoneAuthCode.verifyCode({
      phone,
      code,
      purpose: OTP_PURPOSE_PASSWORD_RESET,
    })
    if (!verification.ok) {
      return mapOtpVerifyFailure(req, res, verification.reason)
    }

    const resetToken = signPasswordResetToken({
      userId: user.id,
      phone: user.phone,
    })

    return sendSuccess(res, {
      verified: true,
      resetToken,
      resetTokenTtlSec: PASSWORD_RESET_TOKEN_TTL_SEC,
    })
  } catch (err) {
    return next(err)
  }
}

exports.passwordResetComplete = async (req, res, next) => {
  try {
    const { phone, resetToken, newPassword } = req.body
    if (!resetToken) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.PASSWORD_RESET_TOKEN_REQUIRED,
        message: 'Reset token is required.',
        requestId: req.id,
      })
    }

    const decoded = verifyPasswordResetToken(resetToken)
    if (!decoded || decoded.phone !== phone) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.PASSWORD_RESET_TOKEN_INVALID,
        message: 'Invalid or expired reset token.',
        requestId: req.id,
      })
    }

    const user = await User.findById(decoded.userId)
    if (!user || user.phone !== phone) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.PHONE_NOT_REGISTERED,
        message: 'No account found for this phone.',
        requestId: req.id,
      })
    }

    await User.setPassword(user.id, newPassword)
    trackEventSafe({
      eventType: 'password_reset_complete',
      userId: user.id,
      source: 'password_reset',
      payload: { phone },
    })
    return sendSuccess(res, { reset: true })
  } catch (err) {
    return next(err)
  }
}

exports.passwordSetupComplete = async (req, res, next) => {
  try {
    const { newPassword } = req.body
    const updated = await User.setPassword(req.user.id, newPassword)
    if (!updated) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.USER_NO_LONGER_EXISTS,
        message: 'User no longer exists.',
        requestId: req.id,
      })
    }

    trackEventSafe({
      eventType: 'password_setup_complete',
      userId: updated.id,
      source: 'legacy_setup',
    })

    return sendSuccess(res, { token: signToken(updated.id), user: User.toPublic(updated) })
  } catch (err) {
    return next(err)
  }
}

// Deprecated compatibility endpoints.
exports.requestPhoneCode = async (_req, res) => {
  return sendError(res, {
    status: 410,
    code: ERROR_CODES.PHONE_AUTH_ONLY,
    message: 'Deprecated endpoint. Use /auth/signup/request-code or /auth/login/otp/request-code.',
  })
}

exports.verifyPhoneCode = async (_req, res) => {
  return sendError(res, {
    status: 410,
    code: ERROR_CODES.PHONE_AUTH_ONLY,
    message: 'Deprecated endpoint. Use /auth/signup/confirm or /auth/login/otp/confirm.',
  })
}

exports.googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body
    if (!idToken) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.GOOGLE_ID_TOKEN_REQUIRED,
        message: 'Google ID token required',
        requestId: req.id,
      })
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    const { sub: googleId, email, name, picture } = payload

    const user = await User.upsertGoogle({ googleId, email, name, avatar: picture })
    const token = signToken(user.id)
    trackEventSafe({
      eventType: 'signin_success',
      userId: user.id,
      source: 'google',
      payload: { email: user.email || null },
    })
    return sendSuccess(res, { token, user: User.toPublic(user) })
  } catch (err) {
    return next(err)
  }
}

exports.getMe = async (req, res) => {
  return sendSuccess(res, { user: User.toPublic(req.user) })
}
