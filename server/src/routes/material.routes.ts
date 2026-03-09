import {  Router  } from 'express'
import { 
  getMaterialCatalog,
  createMaterialCheckout,
 } from '../controllers/material.controller'
import {  protect, requireCapability  } from '../middleware/auth.middleware'
import {  validateBody, validateParams, validateQuery  } from '../middleware/validate.middleware'
import { 
  MaterialCatalogQuerySchema,
  MaterialPackPathParamsSchema,
  MaterialCheckoutIntentSchema,
 } from '../../../shared/contracts'

const router = Router()

router.get('/', protect as any, requireCapability('learn' as any), validateQuery(MaterialCatalogQuerySchema), getMaterialCatalog)
router.post('/:packId/checkout', protect as any, requireCapability('buy' as any), validateParams(MaterialPackPathParamsSchema), validateBody(MaterialCheckoutIntentSchema), createMaterialCheckout)

export default router
