const { Router } = require('express')
const {
  getMaterialCatalog,
  createMaterialCheckout,
} = require('../controllers/material.controller')
const { protect, requireCapability } = require('../middleware/auth.middleware')
const { validateBody, validateParams, validateQuery } = require('../middleware/validate.middleware')
const {
  MaterialCatalogQuerySchema,
  MaterialPackPathParamsSchema,
  MaterialCheckoutIntentSchema,
} = require('../../../shared/contracts')

const router = Router()

router.get('/', protect, requireCapability('learn'), validateQuery(MaterialCatalogQuerySchema), getMaterialCatalog)
router.post('/:packId/checkout', protect, requireCapability('buy'), validateParams(MaterialPackPathParamsSchema), validateBody(MaterialCheckoutIntentSchema), createMaterialCheckout)

module.exports = router
