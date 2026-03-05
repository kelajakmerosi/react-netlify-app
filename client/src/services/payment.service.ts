import { z } from 'zod'
import api from './api'
import { tokenStore } from './auth.service'

const resolveToken = () => tokenStore.get() ?? undefined

const PaymentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  paymentType: z.string(),
  planKey: z.string().nullable().optional(),
  subjectId: z.string().nullable().optional(),
  amountUzs: z.number(),
  provider: z.enum(['manual', 'payme', 'click']),
  status: z.enum(['pending', 'paid', 'failed', 'refunded']),
  externalId: z.string(),
  payload: z.record(z.unknown()).optional(),
  paidAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
})

const PaymentSessionSchema = z.object({
  payment: PaymentSchema,
  session: z.object({
    provider: z.enum(['manual', 'payme', 'click']),
    requiresExternalStep: z.boolean(),
    providerEnabled: z.boolean().optional(),
    requiredFields: z.array(z.object({
      id: z.string(),
      label: z.string(),
      required: z.boolean(),
    })).default([]),
    redirectUrl: z.string().nullable().optional(),
  }),
})

const PaymentSessionStartSchema = z.object({
  payment: PaymentSchema,
  session: z.object({
    provider: z.enum(['manual', 'payme', 'click']),
    requiresExternalStep: z.boolean(),
    redirectUrl: z.string().nullable().optional(),
  }),
})

export const paymentService = {
  getSession: async (paymentId: string) => {
    return api.get(`/payments/${encodeURIComponent(paymentId)}/session`, resolveToken(), PaymentSessionSchema)
  },

  startSession: async (paymentId: string, payload: {
    payerName: string
    payerPhone: string
    payerEmail?: string
    returnUrl?: string
    cancelUrl?: string
    note?: string
  }) => {
    return api.post(
      `/payments/${encodeURIComponent(paymentId)}/session/start`,
      payload,
      resolveToken(),
      PaymentSessionStartSchema,
    )
  },

  confirmDemo: async (paymentId: string) => {
    return api.post(
      `/payments/${encodeURIComponent(paymentId)}/demo-confirm`,
      {},
      resolveToken(),
      z.object({
        payment: PaymentSchema,
        confirmed: z.boolean().optional(),
        alreadyPaid: z.boolean().optional(),
      }),
    )
  },
}

export default paymentService
