const { Router } = require('express')
const {
  handlePaymeWebhook,
  handleClickWebhook,
  getPaymentSession,
  startPaymentSession,
  confirmPaymentDemo,
} = require('../controllers/payment.controller')
const { protect, requireCapability } = require('../middleware/auth.middleware')
const { validateBody, validateParams } = require('../middleware/validate.middleware')
const {
  WebhookAckSchema,
  PaymentPathParamsSchema,
  PaymentSessionStartSchema,
} = require('../../../shared/contracts')

const router = Router()

router.post('/payme/webhook', validateBody(WebhookAckSchema), handlePaymeWebhook)
router.post('/click/webhook', validateBody(WebhookAckSchema), handleClickWebhook)
router.get('/:paymentId/session', protect, requireCapability('buy'), validateParams(PaymentPathParamsSchema), getPaymentSession)
router.post('/:paymentId/session/start', protect, requireCapability('buy'), validateParams(PaymentPathParamsSchema), validateBody(PaymentSessionStartSchema), startPaymentSession)
router.post('/:paymentId/demo-confirm', protect, requireCapability('buy'), validateParams(PaymentPathParamsSchema), confirmPaymentDemo)

module.exports = router
