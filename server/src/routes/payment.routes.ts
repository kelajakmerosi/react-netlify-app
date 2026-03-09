import {  Router  } from 'express'
import { 
  handlePaymeWebhook,
  handleClickWebhook,
  getPaymentSession,
  startPaymentSession,
  confirmPaymentDemo,
 } from '../controllers/payment.controller'
import {  protect, requireCapability  } from '../middleware/auth.middleware'
import {  validateBody, validateParams  } from '../middleware/validate.middleware'
import { 
  WebhookAckSchema,
  PaymentPathParamsSchema,
  PaymentSessionStartSchema,
 } from '../../../shared/contracts'

const router = Router()

router.post('/payme/webhook', validateBody(WebhookAckSchema as any), handlePaymeWebhook)
router.post('/click/webhook', validateBody(WebhookAckSchema as any), handleClickWebhook)
router.get('/:paymentId/session', protect as any, requireCapability('buy' as any), validateParams(PaymentPathParamsSchema), getPaymentSession)
router.post('/:paymentId/session/start', protect as any, requireCapability('buy' as any), validateParams(PaymentPathParamsSchema), validateBody(PaymentSessionStartSchema), startPaymentSession)
router.post('/:paymentId/demo-confirm', protect as any, requireCapability('buy' as any), validateParams(PaymentPathParamsSchema), confirmPaymentDemo)

export default router
