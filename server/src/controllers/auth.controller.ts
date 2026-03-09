import jwt from 'jsonwebtoken'
import { OAuth2Client, TokenPayload } from 'google-auth-library'
import { Request, Response, NextFunction } from 'express'
import User from '../models/User.model'
import PhoneAuthCode from '../models/PhoneAuthCode.model'
import Analytics from '../models/Analytics.model'
import { sendOtp } from '../services/sms/eskiz.service'
import ERROR_CODES from '../constants/errorCodes'
import { sendError, sendSuccess } from '../utils/http'

export interface AuthRequest extends Request {
  user?: any;
}

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

const signToken = (id: string | number) =>
  jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any })

const signPasswordResetToken = ({ userId, phone }: { userId: string | number, phone: string }) =>
  jwt.sign(
    { purpose: OTP_PURPOSE_PASSWORD_RESET, userId, phone },
    process.env.JWT_SECRET as string,
    { expiresIn: PASSWORD_RESET_TOKEN_TTL_SEC }
  )

const verifyPasswordResetToken = (token: string): any => {
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string)
    if (decoded?.purpose !== OTP_PURPOSE_PASSWORD_RESET || !decoded?.userId || !decoded?.phone) {
      return null
    }
    return decoded
  } catch {
    return null
  }
}

const getRequestIp = (req: Request) => {
  const value = req.ip || req.headers['x-forwarded-for'] || null
  return typeof value === 'string' ? value : null
}

const trackEventSafe = (payload: any) => {
  Analytics.trackEvent(payload).catch(() => { })
}

const mapOtpVerifyFailure = (req: Request, res: Response, reason: string) => {
  if (reason === 'expired') {
    return sendError(res, {
      status: 400,
      code: ERROR_CODES.PHONE_CODE_EXPIRED,
      message: 'OTP code has expired. Request a new code.',
      requestId: typeof req.id === 'string' ? req.id : undefined,
    })
  }

  if (reason === 'attempts_exceeded') {
    return sendError(res, {
      status: 429,
      code: ERROR_CODES.PHONE_CODE_ATTEMPTS_EXCEEDED,
      message: 'Maximum OTP attempts reached. Request a new code.',
      requestId: typeof req.id === 'string' ? req.id : undefined,
    })
  }

  return sendError(res, {
    status: 400,
    code: ERROR_CODES.PHONE_CODE_INVALID,
    message: 'Invalid OTP code.',
    requestId: typeof req.id === 'string' ? req.id : undefined,
  })
}

interface RequestOtpParams {
  req: Request
  res: Response
  phone: string
  purpose: string
  userId?: string | number | null
}

const requestOtpCode = async ({ req, res, phone, purpose, userId = null }: RequestOtpParams) => {
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
      requestId: typeof req.id === 'string' ? req.id : undefined,
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
        requestId: typeof req.id === 'string' ? req.id : undefined,
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
      await PhoneAuthCode.deleteById(createdCode.id).catch(() => { })
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

export const register = async (_req: Request, res: Response) => {
  return sendError(res, {
    status: 410,
    code: ERROR_CODES.PHONE_AUTH_ONLY,
    message: 'Email/password registration is deprecated. Use phone signup flow.',
  })
}

export const login = async (_req: Request, res: Response) => {
  return sendError(res, {
    status: 410,
    code: ERROR_CODES.PHONE_AUTH_ONLY,
    message: 'Email/password login is deprecated. Use phone/password login.',
  })
}

export const signupRequestCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.body
    const existing = await User.findByPhone(phone)
    if (existing) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.PHONE_ALREADY_REGISTERED,
        message: 'This phone is already registered. Please log in.',
        requestId: typeof req.id === 'string' ? req.id : undefined,
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

export const signupConfirm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phone, password, code } = req.body
    const verification = await PhoneAuthCode.verifyCode({
      phone,
      code,
      purpose: OTP_PURPOSE_SIGNUP,
    })

    if (!verification.ok) {
      return mapOtpVerifyFailure(req, res, verification.reason as string)
    }

    const existing = await User.findByPhone(phone)
    if (existing) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.PHONE_ALREADY_REGISTERED,
        message: 'This phone is already registered. Please log in.',
        requestId: typeof req.id === 'string' ? req.id : undefined,
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

export const loginWithPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, password } = req.body
    const user = await User.findByPhone(phone, { withPassword: true })
    if (!user) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.PHONE_NOT_REGISTERED,
        message: 'No account found for this phone.',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    if (!user.password) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.PASSWORD_SETUP_REQUIRED,
        message: 'Password setup is required for this account.',
        requestId: typeof req.id === 'string' ? req.id : undefined,
        details: { requiresPasswordSetup: true },
      })
    }

    const matched = await User.verifyPassword(password, user.password)
    if (!matched) {
      return sendError(res, {
        status: 401,
        code: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid phone or password.',
        requestId: typeof req.id === 'string' ? req.id : undefined,
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

export const legacyLoginOtpRequestCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.body
    const user = await User.findByPhone(phone, { withPassword: true })
    if (!user) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.PHONE_NOT_REGISTERED,
        message: 'No account found for this phone.',
        requestId: typeof req.id === 'string' ? req.id : undefined,
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

export const legacyLoginOtpConfirm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, code } = req.body
    const user = await User.findByPhone(phone, { withPassword: true })
    if (!user) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.PHONE_NOT_REGISTERED,
        message: 'No account found for this phone.',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const purpose = user.password
      ? OTP_PURPOSE_LEGACY_LOGIN
      : OTP_PURPOSE_LEGACY_PASSWORD_SETUP

    const verification = await PhoneAuthCode.verifyCode({ phone, code, purpose })
    if (!verification.ok) {
      return mapOtpVerifyFailure(req, res, verification.reason as string)
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

export const passwordResetRequestCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.body
    const user = await User.findByPhone(phone, { withPassword: true })
    if (!user) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.PHONE_NOT_REGISTERED,
        message: 'No account found for this phone.',
        requestId: typeof req.id === 'string' ? req.id : undefined,
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

export const passwordResetConfirmCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, code } = req.body
    const user = await User.findByPhone(phone, { withPassword: true })
    if (!user) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.PHONE_NOT_REGISTERED,
        message: 'No account found for this phone.',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const verification = await PhoneAuthCode.verifyCode({
      phone,
      code,
      purpose: OTP_PURPOSE_PASSWORD_RESET,
    })
    if (!verification.ok) {
      return mapOtpVerifyFailure(req, res, verification.reason as string)
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

export const passwordResetComplete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, resetToken, newPassword } = req.body
    if (!resetToken) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.PASSWORD_RESET_TOKEN_REQUIRED,
        message: 'Reset token is required.',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const decoded = verifyPasswordResetToken(resetToken)
    if (!decoded || decoded.phone !== phone) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.PASSWORD_RESET_TOKEN_INVALID,
        message: 'Invalid or expired reset token.',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const user = await User.findById(decoded.userId)
    if (!user || user.phone !== phone) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.PHONE_NOT_REGISTERED,
        message: 'No account found for this phone.',
        requestId: typeof req.id === 'string' ? req.id : undefined,
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

export const passwordSetupComplete = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { newPassword } = req.body
    if (!req.user) {
      return sendError(res, { status: 401, message: 'Unauthorized' })
    }
    const updated = await User.setPassword(req.user.id, newPassword)
    if (!updated) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.USER_NO_LONGER_EXISTS,
        message: 'User no longer exists.',
        requestId: typeof req.id === 'string' ? req.id : undefined,
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
export const requestPhoneCode = async (_req: Request, res: Response) => {
  return sendError(res, {
    status: 410,
    code: ERROR_CODES.PHONE_AUTH_ONLY,
    message: 'Deprecated endpoint. Use /auth/signup/request-code or /auth/login/otp/request-code.',
  })
}

export const verifyPhoneCode = async (_req: Request, res: Response) => {
  return sendError(res, {
    status: 410,
    code: ERROR_CODES.PHONE_AUTH_ONLY,
    message: 'Deprecated endpoint. Use /auth/signup/confirm or /auth/login/otp/confirm.',
  })
}

export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idToken } = req.body
    if (!idToken) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.GOOGLE_ID_TOKEN_REQUIRED,
        message: 'Google ID token required',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.GOOGLE_ID_TOKEN_REQUIRED,
        message: 'Invalid Google Identity token',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const { sub: googleId, email, name, picture } = payload

    if (!googleId || !email) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Google token must include sub and email',
      })
    }

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

export const googleAuthCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, redirectUri } = req.body
    if (!code || !redirectUri) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Authorization code and redirectUri are required',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenResponse.json()
    if (!tokenResponse.ok || !tokenData.id_token) {
      return sendError(res, {
        status: 401,
        code: ERROR_CODES.GOOGLE_ID_TOKEN_REQUIRED,
        message: 'Failed to exchange authorization code',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: tokenData.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload: TokenPayload | undefined = ticket.getPayload()
    if (!payload) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.GOOGLE_ID_TOKEN_REQUIRED,
        message: 'Invalid Google Identity token',
        requestId: typeof req.id === 'string' ? req.id : undefined,
      })
    }

    const { sub: googleId, email, name, picture } = payload

    if (!googleId || !email) {
      return sendError(res, {
        status: 400,
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Google token must include sub and email',
      })
    }

    const user = await User.upsertGoogle({ googleId, email, name, avatar: picture })
    const token = signToken(user.id)
    trackEventSafe({
      eventType: 'signin_success',
      userId: user.id,
      source: 'google_code',
      payload: { email: user.email || null },
    })
    return sendSuccess(res, { token, user: User.toPublic(user) })
  } catch (err) {
    return next(err)
  }
}

export const getMe = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return sendError(res, { status: 401, message: 'Unauthorized' })
  }
  return sendSuccess(res, { user: User.toPublic(req.user) })
}
