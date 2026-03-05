const crypto = require('crypto')
const Payment = require('../models/Payment.model')
const Exam = require('../models/Exam.model')
const MaterialPack = require('../models/MaterialPack.model')
const Analytics = require('../models/Analytics.model')
const ERROR_CODES = require('../constants/errorCodes')
const { sendError, sendSuccess } = require('../utils/http')
const { isPaymeClickEnabled } = require('../config/featureFlags')

const secureEqual = (a, b) => {
  const left = Buffer.from(String(a || ''))
  const right = Buffer.from(String(b || ''))
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

const verifyWebhookSignature = ({ req, secret }) => {
  if (!secret) return true
  const signature = req.headers['x-signature']
  if (!signature) return false
  const digest = crypto
    .createHmac('sha256', secret)
    .update(req.rawBody || '')
    .digest('hex')
  return secureEqual(signature, digest)
}

const applyEntitlementFromPaidPayment = async (payment) => {
  if (!payment || payment.status !== 'paid') return
  if (payment.paymentType === 'exam_attempt_pack') {
    const examId = payment.payload?.examId
    const attempts = Math.max(1, Number(payment.payload?.attempts || 1))
    if (examId && payment.userId) {
      await Exam.grantEntitlement({
        userId: payment.userId,
        examId,
        attemptsTotal: attempts,
        sourcePaymentId: payment.id,
      })

      Analytics.trackEvent({
        eventType: 'exam_entitlement_granted',
        userId: payment.userId,
        payload: { examId, paymentId: payment.id, attempts },
      }).catch(() => {})
    }
  }

  if (payment.paymentType === 'material_pack') {
    const packId = payment.payload?.packId
    if (packId && payment.userId) {
      await MaterialPack.grantEntitlement({
        userId: payment.userId,
        packId,
        sourcePaymentId: payment.id,
      })

      Analytics.trackEvent({
        eventType: 'material_entitlement_granted',
        userId: payment.userId,
        payload: { packId, paymentId: payment.id },
      }).catch(() => {})
    }
  }
}

const getProviderRequirements = (provider) => {
  if (provider === 'payme') {
    return [
      { id: 'payerName', label: 'Full name', required: true },
      { id: 'payerPhone', label: 'Phone number', required: true },
      { id: 'payerEmail', label: 'Email', required: true },
    ]
  }

  if (provider === 'click') {
    return [
      { id: 'payerName', label: 'Full name', required: true },
      { id: 'payerPhone', label: 'Phone number', required: true },
      { id: 'payerEmail', label: 'Email', required: false },
    ]
  }

  return []
}

const buildProviderRedirectUrl = ({ payment, checkoutContext = {} }) => {
  if (!payment || payment.provider === 'manual') return null

  const baseUrl = payment.provider === 'payme'
    ? String(process.env.PAYME_CHECKOUT_URL || '').trim()
    : String(process.env.CLICK_CHECKOUT_URL || '').trim()

  if (!baseUrl) return null

  try {
    const url = new URL(baseUrl)
    url.searchParams.set('externalId', payment.externalId)
    url.searchParams.set('amountUzs', String(payment.amountUzs || 0))
    if (checkoutContext.payerPhone) url.searchParams.set('phone', String(checkoutContext.payerPhone))
    if (checkoutContext.payerEmail) url.searchParams.set('email', String(checkoutContext.payerEmail))
    if (checkoutContext.returnUrl) url.searchParams.set('returnUrl', String(checkoutContext.returnUrl))
    if (checkoutContext.cancelUrl) url.searchParams.set('cancelUrl', String(checkoutContext.cancelUrl))
    return url.toString()
  } catch {
    return null
  }
}

const resolvePaymentForUser = async ({ paymentId, req, res }) => {
  const payment = await Payment.getById(paymentId)
  if (!payment || payment.userId !== req.user.id) {
    sendError(res, {
      status: 404,
      code: ERROR_CODES.PAYMENT_NOT_FOUND,
      message: 'Payment not found',
      requestId: req.id,
    })
    return null
  }
  return payment
}

exports.getPaymentSession = async (req, res, next) => {
  try {
    const payment = await resolvePaymentForUser({ paymentId: req.params.paymentId, req, res })
    if (!payment) return undefined

    const checkoutContext = payment.payload?.checkoutContext || {}
    const redirectUrl = buildProviderRedirectUrl({ payment, checkoutContext })

    return sendSuccess(res, {
      payment,
      session: {
        provider: payment.provider,
        requiresExternalStep: payment.provider !== 'manual',
        providerEnabled: payment.provider === 'manual' || isPaymeClickEnabled(),
        requiredFields: getProviderRequirements(payment.provider),
        redirectUrl,
      },
    })
  } catch (err) {
    return next(err)
  }
}

exports.startPaymentSession = async (req, res, next) => {
  try {
    const payment = await resolvePaymentForUser({ paymentId: req.params.paymentId, req, res })
    if (!payment) return undefined

    if (payment.provider !== 'manual' && !isPaymeClickEnabled()) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.FEATURE_DISABLED,
        message: 'Payme/Click checkout is disabled',
        requestId: req.id,
      })
    }

    const checkoutContext = {
      payerName: req.body.payerName,
      payerPhone: req.body.payerPhone,
      payerEmail: req.body.payerEmail || null,
      returnUrl: req.body.returnUrl || null,
      cancelUrl: req.body.cancelUrl || null,
      note: req.body.note || null,
      launchedAt: new Date().toISOString(),
    }

    const updated = await Payment.attachCheckoutContext({
      paymentId: payment.id,
      userId: req.user.id,
      checkoutContext,
    })

    if (!updated) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.PAYMENT_NOT_FOUND,
        message: 'Payment not found',
        requestId: req.id,
      })
    }

    const redirectUrl = buildProviderRedirectUrl({ payment: updated, checkoutContext })

    Analytics.trackEvent({
      eventType: 'payment_session_started',
      userId: req.user.id,
      source: updated.provider,
      payload: {
        paymentId: updated.id,
        externalId: updated.externalId,
        hasRedirectUrl: Boolean(redirectUrl),
      },
    }).catch(() => {})

    return sendSuccess(res, {
      payment: updated,
      session: {
        provider: updated.provider,
        redirectUrl,
        requiresExternalStep: updated.provider !== 'manual',
      },
    })
  } catch (err) {
    return next(err)
  }
}

exports.confirmPaymentDemo = async (req, res, next) => {
  try {
    if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
      return sendError(res, {
        status: 403,
        code: ERROR_CODES.FEATURE_DISABLED,
        message: 'Demo payment confirmation is disabled in production',
        requestId: req.id,
      })
    }

    const payment = await resolvePaymentForUser({ paymentId: req.params.paymentId, req, res })
    if (!payment) return undefined

    if (payment.provider === 'manual') {
      return sendSuccess(res, { payment, alreadyPaid: payment.status === 'paid' })
    }

    const marked = await Payment.markWebhookStatus({
      provider: payment.provider,
      externalId: payment.externalId,
      status: 'paid',
      payload: {
        source: 'demo-confirm',
      },
    })

    const updated = marked.payment || payment
    if (updated.status === 'paid') {
      await applyEntitlementFromPaidPayment(updated)
    }

    return sendSuccess(res, {
      payment: updated,
      confirmed: true,
    })
  } catch (err) {
    return next(err)
  }
}

const handleWebhook = async ({ req, res, provider, secret }) => {
  if (!isPaymeClickEnabled()) {
    return sendError(res, {
      status: 404,
      code: ERROR_CODES.FEATURE_DISABLED,
      message: `${provider} webhook is disabled`,
      requestId: req.id,
    })
  }

  if (!secret) {
    return sendError(res, {
      status: 500,
      code: ERROR_CODES.PAYMENT_SIGNATURE_INVALID,
      message: `${provider} webhook secret is not configured`,
      requestId: req.id,
    })
  }

  if (!verifyWebhookSignature({ req, secret })) {
    return sendError(res, {
      status: 401,
      code: ERROR_CODES.PAYMENT_SIGNATURE_INVALID,
      message: 'Invalid webhook signature',
      requestId: req.id,
    })
  }

  const externalId = String(req.body.externalId || '').trim()
  const status = String(req.body.status || '').trim().toLowerCase()

  if (!externalId || !['pending', 'paid', 'failed', 'refunded'].includes(status)) {
    return sendError(res, {
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'externalId and valid status are required',
      requestId: req.id,
    })
  }

  const { payment } = await Payment.markWebhookStatus({
    provider,
    externalId,
    status,
    payload: req.body,
  })

  if (!payment) {
    return sendError(res, {
      status: 404,
      code: ERROR_CODES.PAYMENT_NOT_FOUND,
      message: 'Payment not found for provider/externalId',
      requestId: req.id,
    })
  }

  if (payment.status === 'paid') {
    await applyEntitlementFromPaidPayment(payment)
  }

  Analytics.trackEvent({
    eventType: 'payment_webhook_processed',
    userId: payment.userId,
    source: provider,
    payload: {
      paymentId: payment.id,
      externalId,
      status,
    },
  }).catch(() => {})

  return sendSuccess(res, {
    ok: true,
    provider,
    paymentId: payment.id,
    status: payment.status,
  })
}

exports.handlePaymeWebhook = async (req, res, next) => {
  try {
    return await handleWebhook({
      req,
      res,
      provider: 'payme',
      secret: process.env.PAYME_WEBHOOK_SECRET || '',
    })
  } catch (err) {
    return next(err)
  }
}

exports.handleClickWebhook = async (req, res, next) => {
  try {
    return await handleWebhook({
      req,
      res,
      provider: 'click',
      secret: process.env.CLICK_WEBHOOK_SECRET || '',
    })
  } catch (err) {
    return next(err)
  }
}
