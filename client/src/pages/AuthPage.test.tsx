import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const signupRequestCode = vi.fn()
const signupConfirm = vi.fn()
const loginWithPassword = vi.fn()
const legacyLoginOtpRequestCode = vi.fn()
const legacyLoginOtpConfirm = vi.fn()
const passwordResetRequestCode = vi.fn()
const passwordResetConfirmCode = vi.fn()
const passwordResetComplete = vi.fn()
const passwordSetupComplete = vi.fn()
const loginWithGoogle = vi.fn()
const continueAsGuest = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    signupRequestCode,
    signupConfirm,
    loginWithPassword,
    legacyLoginOtpRequestCode,
    legacyLoginOtpConfirm,
    passwordResetRequestCode,
    passwordResetConfirmCode,
    passwordResetComplete,
    passwordSetupComplete,
    loginWithGoogle,
    continueAsGuest,
  }),
}))

const messages: Record<string, string> = {
  phonePlaceholder: '+998XXXXXXXXX',
  phoneFormatError: 'Phone format error',
  password: 'Password',
  passwordRequired: 'Password required',
  passwordPolicyError: 'Password policy error',
  passwordMismatch: 'Passwords mismatch',
  firstNameRequired: 'First name required',
  lastNameRequired: 'Last name required',
  continue: 'Continue',
  verifyOtp: 'Verify code',
  login: 'Login',
  register: 'Register',
  authModeLabel: 'Authentication mode',
  authStepPhoneLogin: 'Login step hint',
  authStepPhoneSignup: 'Signup step hint',
  loginViaCode: 'Sign in via OTP',
  forgotPassword: 'Forgot password?',
  otpModalTitleSignup: 'Confirm Sign Up',
  otpModalTitleLegacyLogin: 'Sign In with Code',
  otpModalSubtitle: 'Enter code sent to {phone}',
  otpDigitAria: 'Code digit',
  codeSentHint: 'Code sent',
  codeResentHint: 'Code resent',
  otpResendIn: 'Resend in {seconds}s',
  otpResendReady: 'Ready to resend',
  resendCode: 'Resend code',
  changePhone: 'Change phone',
  authLoading: 'Loading',
  loginWithGoogle: 'Continue with Google',
  googleLoading: 'Google loading',
  guestMode: 'Continue as Guest',
  tagline: 'Tagline',
  firstName: 'First Name',
  lastName: 'Last Name',
  confirmPassword: 'Confirm Password',
  popupBlocked: 'Popup blocked',
  googleLoginUnavailable: 'Google unavailable',
  googleLoginFailed: 'Google failed',
  orContinueWith: 'or',
}

vi.mock('../hooks', () => ({
  useLang: () => ({
    t: (key: string) => messages[key] || key,
  }),
}))

vi.mock('../app/feature-flags', () => ({
  UI_MIGRATION_FLAGS: {
    adminUseSharedFormPrimitives: true,
    adminUseSharedSegmentedControls: true,
  },
}))

const renderAuthPage = async () => {
  const { AuthPage } = await import('./AuthPage')
  return render(<AuthPage />)
}

describe('AuthPage password-first flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-google-client-id')
  })

  it('logs in with phone and password', async () => {
    loginWithPassword.mockResolvedValue({ id: 'u1' })
    await renderAuthPage()

    fireEvent.change(screen.getByPlaceholderText('+998XXXXXXXXX'), { target: { value: '+998901234567' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Password1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(loginWithPassword).toHaveBeenCalledWith({
        phone: '+998901234567',
        password: 'Password1',
      })
    })
  })

  it('switches to signup mode and validates required fields', async () => {
    await renderAuthPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Register' }))

    expect(screen.getByPlaceholderText('First Name')).toBeTruthy()
    expect(screen.getByPlaceholderText('Last Name')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('First name required')).toBeTruthy()
    expect(signupRequestCode).not.toHaveBeenCalled()
  })

  it('opens OTP modal after signup code request and confirms code', async () => {
    signupRequestCode.mockResolvedValue(undefined)
    signupConfirm.mockResolvedValue({ id: 'u2' })
    await renderAuthPage()

    fireEvent.click(screen.getByRole('tab', { name: 'Register' }))
    fireEvent.change(screen.getByPlaceholderText('First Name'), { target: { value: 'Ali' } })
    fireEvent.change(screen.getByPlaceholderText('Last Name'), { target: { value: 'Valiyev' } })
    fireEvent.change(screen.getByPlaceholderText('+998XXXXXXXXX'), { target: { value: '+998901234568' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'Password1' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { value: 'Password1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(signupRequestCode).toHaveBeenCalledWith('+998901234568'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Confirm Sign Up')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Code digit 1'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verify code' }))

    await waitFor(() => {
      expect(signupConfirm).toHaveBeenCalledWith({
        firstName: 'Ali',
        lastName: 'Valiyev',
        phone: '+998901234568',
        password: 'Password1',
        code: '123456',
      })
    })
  })

  it('starts legacy OTP login flow from login mode', async () => {
    legacyLoginOtpRequestCode.mockResolvedValue(undefined)
    await renderAuthPage()

    fireEvent.change(screen.getByPlaceholderText('+998XXXXXXXXX'), { target: { value: '+998901234569' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in via OTP' }))

    await waitFor(() => expect(legacyLoginOtpRequestCode).toHaveBeenCalledWith('+998901234569'))
    expect(screen.getByText('Sign In with Code')).toBeTruthy()
  })

  it('closes shared OTP modal on overlay press', async () => {
    legacyLoginOtpRequestCode.mockResolvedValue(undefined)
    await renderAuthPage()

    fireEvent.change(screen.getByPlaceholderText('+998XXXXXXXXX'), { target: { value: '+998901234569' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in via OTP' }))

    await waitFor(() => expect(legacyLoginOtpRequestCode).toHaveBeenCalledWith('+998901234569'))

    const dialog = screen.getByRole('dialog')
    const overlay = dialog.parentElement
    if (!overlay) throw new Error('Modal overlay not found')

    fireEvent.mouseDown(overlay)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('keeps Google sign in available', async () => {
    const popup = { closed: true, location: { hash: '' }, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(popup as any)

    await renderAuthPage()
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))

    await waitFor(() => expect(window.open).toHaveBeenCalled())
  })
})
