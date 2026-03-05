import { z } from 'zod'
import api from './api'
import { tokenStore } from './auth.service'

const resolveToken = () => tokenStore.get() ?? undefined

const MaterialCatalogItemSchema = z.object({
  id: z.string(),
  subjectId: z.string(),
  ownerUserId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  priceUzs: z.number(),
  status: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().optional(),
})

const MaterialCheckoutSchema = z.object({
  payment: z.object({
    id: z.string(),
    provider: z.string(),
    externalId: z.string(),
    status: z.string(),
    amountUzs: z.number(),
  }),
  checkout: z.object({
    provider: z.string(),
    externalId: z.string(),
  }),
})

const LibrarySchema = z.array(z.object({
  entitlementId: z.string(),
  grantedAt: z.string(),
  pack: z.object({
    id: z.string(),
    subjectId: z.string(),
    title: z.string(),
    description: z.string(),
    priceUzs: z.number(),
  }),
  assets: z.array(z.object({
    id: z.string(),
    storageKey: z.string(),
    fileName: z.string(),
    mimeType: z.string().nullable().optional(),
    sizeBytes: z.number(),
    createdAt: z.string().optional(),
    access: z.object({
      provider: z.string(),
      storageKey: z.string(),
      url: z.string().nullable().optional(),
    }).optional(),
  })),
}))

export const materialService = {
  getCatalog: async (subjectId?: string) => {
    const query = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : ''
    return api.get(`/material-packs${query}`, resolveToken(), z.array(MaterialCatalogItemSchema))
  },

  checkout: async (packId: string, payload: { provider: 'payme' | 'click' | 'manual' }) => {
    return api.post(`/material-packs/${encodeURIComponent(packId)}/checkout`, payload, resolveToken(), MaterialCheckoutSchema)
  },

  getLibrary: async () => {
    return api.get('/users/me/material-library', resolveToken(), LibrarySchema)
  },
}

export default materialService
