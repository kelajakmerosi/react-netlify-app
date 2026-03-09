import { Router } from 'express'
import {
  register,
  login,
  getMe,
  googleAuth,
  googleAuthCode,
  requestPhoneCode,
  verifyPhoneCode,
  signupRequestCode,
  signupConfirm,
  loginWithPassword,
  legacyLoginOtpRequestCode,
  legacyLoginOtpConfirm,
  passwordResetRequestCode,
  passwordResetConfirmCode,
  passwordResetComplete,
  passwordSetupComplete,
} from '../controllers/auth.controller'
import { protect } from '../middleware/auth.middleware'
import { validateBody } from '../middleware/validate.middleware'
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  GoogleAuthRequestSchema,
  GoogleAuthCodeRequestSchema,
  PhoneRequestCodeSchema,
  PhoneVerifyCodeSchema,
  SignupRequestCodeSchema,
  SignupConfirmSchema,
  LoginWithPasswordSchema,
  LegacyLoginOtpRequestCodeSchema,
  LegacyLoginOtpConfirmSchema,
  PasswordResetRequestCodeSchema,
  PasswordResetConfirmCodeSchema,
  PasswordResetCompleteSchema,
  PasswordSetupCompleteSchema,
} from '../../../shared/contracts'

const router = Router()

// Deprecated endpoints kept for compatibility.
router.post('/register', validateBody(RegisterRequestSchema), register)
router.post('/login', validateBody(LoginRequestSchema), login)
router.post('/phone/request-code', validateBody(PhoneRequestCodeSchema), requestPhoneCode)
router.post('/phone/verify-code', validateBody(PhoneVerifyCodeSchema), verifyPhoneCode)

router.post('/signup/request-code', validateBody(SignupRequestCodeSchema), signupRequestCode)
router.post('/signup/confirm', validateBody(SignupConfirmSchema), signupConfirm)
router.post('/login/password', validateBody(LoginWithPasswordSchema), loginWithPassword)
router.post('/login/otp/request-code', validateBody(LegacyLoginOtpRequestCodeSchema), legacyLoginOtpRequestCode)
router.post('/login/otp/confirm', validateBody(LegacyLoginOtpConfirmSchema), legacyLoginOtpConfirm)
router.post('/password/reset/request-code', validateBody(PasswordResetRequestCodeSchema), passwordResetRequestCode)
router.post('/password/reset/confirm-code', validateBody(PasswordResetConfirmCodeSchema), passwordResetConfirmCode)
router.post('/password/reset/complete', validateBody(PasswordResetCompleteSchema), passwordResetComplete)
router.post('/password/setup/complete', protect, validateBody(PasswordSetupCompleteSchema), passwordSetupComplete)

router.post('/google', validateBody(GoogleAuthRequestSchema), googleAuth)
router.post('/google/code', validateBody(GoogleAuthCodeRequestSchema), googleAuthCode)
router.get('/me', protect, getMe)

export default router
