const MaterialPack = require('../models/MaterialPack.model')
const Payment = require('../models/Payment.model')
const Analytics = require('../models/Analytics.model')
const SubjectScope = require('../models/SubjectScope.model')
const ERROR_CODES = require('../constants/errorCodes')
const { sendError, sendSuccess } = require('../utils/http')
const { isSuperAdminUser } = require('../utils/adminAccess')
const { isExamsCommerceEnabled, isPaymeClickEnabled } = require('../config/featureFlags')

exports.createTeacherMaterialPack = async (req, res, next) => {
  try {
    const pack = await MaterialPack.createDraft({
      subjectId: req.body.subjectId,
      ownerUserId: req.user.id,
      title: req.body.title,
      description: req.body.description,
      priceUzs: req.body.priceUzs,
    })

    return sendSuccess(res, pack, undefined, 201)
  } catch (err) {
    return next(err)
  }
}

exports.updateTeacherMaterialPack = async (req, res, next) => {
  try {
    const current = await MaterialPack.getById(req.params.packId)
    if (!current) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.MATERIAL_PACK_NOT_FOUND,
        message: 'Material pack not found',
        requestId: req.id,
      })
    }

    if (current.ownerUserId !== req.user.id && req.user.role !== 'superadmin') {
      return sendError(res, {
        status: 403,
        code: ERROR_CODES.TEACHER_SCOPE_REQUIRED,
        message: 'Teacher ownership is required for updates',
        requestId: req.id,
      })
    }

    if (!isSuperAdminUser(req.user)) {
      const hasTeacherScope = await SubjectScope.hasTeacherScope({
        userId: req.user.id,
        subjectId: current.subjectId,
      })
      if (!hasTeacherScope) {
        return sendError(res, {
          status: 403,
          code: ERROR_CODES.TEACHER_SCOPE_REQUIRED,
          message: 'Teacher subject scope is required for material updates',
          requestId: req.id,
          details: { subjectId: current.subjectId },
        })
      }
    }

    if (current.status === 'published') {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.EXAM_INVALID_STATE,
        message: 'Published material pack cannot be edited directly',
        requestId: req.id,
      })
    }

    const updated = await MaterialPack.updateDraft(req.params.packId, req.body)
    return sendSuccess(res, updated)
  } catch (err) {
    return next(err)
  }
}

exports.submitTeacherMaterialPackReview = async (req, res, next) => {
  try {
    const current = await MaterialPack.getById(req.params.packId)
    if (!current) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.MATERIAL_PACK_NOT_FOUND,
        message: 'Material pack not found',
        requestId: req.id,
      })
    }

    if (current.ownerUserId !== req.user.id && req.user.role !== 'superadmin') {
      return sendError(res, {
        status: 403,
        code: ERROR_CODES.TEACHER_SCOPE_REQUIRED,
        message: 'Teacher ownership is required for review submission',
        requestId: req.id,
      })
    }

    if (!isSuperAdminUser(req.user)) {
      const hasTeacherScope = await SubjectScope.hasTeacherScope({
        userId: req.user.id,
        subjectId: current.subjectId,
      })
      if (!hasTeacherScope) {
        return sendError(res, {
          status: 403,
          code: ERROR_CODES.TEACHER_SCOPE_REQUIRED,
          message: 'Teacher subject scope is required for review submission',
          requestId: req.id,
          details: { subjectId: current.subjectId },
        })
      }
    }

    const submitted = await MaterialPack.setStatus(req.params.packId, {
      status: 'pending_review',
      reviewerId: null,
    })

    return sendSuccess(res, { pack: submitted, submitted: true })
  } catch (err) {
    return next(err)
  }
}

exports.approveMaterialPack = async (req, res, next) => {
  try {
    const pack = await MaterialPack.getById(req.params.packId)
    if (!pack) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.MATERIAL_PACK_NOT_FOUND,
        message: 'Material pack not found',
        requestId: req.id,
      })
    }

    if (!isSuperAdminUser(req.user)) {
      const hasScope = await SubjectScope.hasAdminScope({
        userId: req.user.id,
        subjectId: pack.subjectId,
        requireContent: true,
      })
      if (!hasScope) {
        return sendError(res, {
          status: 403,
          code: ERROR_CODES.SUBJECT_SCOPE_REQUIRED,
          message: 'Admin subject scope is required for material approval',
          requestId: req.id,
          details: { subjectId: pack.subjectId },
        })
      }
    }

    const published = await MaterialPack.setStatus(req.params.packId, {
      status: 'published',
      reviewerId: req.user.id,
    })

    return sendSuccess(res, { pack: published, approved: true })
  } catch (err) {
    return next(err)
  }
}

exports.rejectMaterialPack = async (req, res, next) => {
  try {
    const pack = await MaterialPack.getById(req.params.packId)
    if (!pack) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.MATERIAL_PACK_NOT_FOUND,
        message: 'Material pack not found',
        requestId: req.id,
      })
    }

    if (!isSuperAdminUser(req.user)) {
      const hasScope = await SubjectScope.hasAdminScope({
        userId: req.user.id,
        subjectId: pack.subjectId,
        requireContent: true,
      })
      if (!hasScope) {
        return sendError(res, {
          status: 403,
          code: ERROR_CODES.SUBJECT_SCOPE_REQUIRED,
          message: 'Admin subject scope is required for material rejection',
          requestId: req.id,
          details: { subjectId: pack.subjectId },
        })
      }
    }

    const nextStatus = req.body?.archive ? 'archived' : 'draft'
    const rejected = await MaterialPack.setStatus(req.params.packId, {
      status: nextStatus,
      reviewerId: req.user.id,
    })

    return sendSuccess(res, { pack: rejected, rejected: true })
  } catch (err) {
    return next(err)
  }
}

exports.getMaterialCatalog = async (req, res, next) => {
  try {
    const packs = await MaterialPack.listPublishedCatalog({ subjectId: req.query.subjectId })
    return sendSuccess(res, packs)
  } catch (err) {
    return next(err)
  }
}

exports.createMaterialCheckout = async (req, res, next) => {
  try {
    if (!isExamsCommerceEnabled()) {
      return sendError(res, {
        status: 403,
        code: ERROR_CODES.FEATURE_DISABLED,
        message: 'Exam/material commerce feature is disabled',
        requestId: req.id,
      })
    }

    if (req.body.provider !== 'manual' && !isPaymeClickEnabled()) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.FEATURE_DISABLED,
        message: 'Payme/Click checkout is disabled',
        requestId: req.id,
      })
    }

    const pack = await MaterialPack.getById(req.params.packId)
    if (!pack || pack.status !== 'published' || !pack.isActive) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.MATERIAL_PACK_NOT_FOUND,
        message: 'Material pack is not available for purchase',
        requestId: req.id,
      })
    }

    const payment = await Payment.createCheckoutIntent({
      userId: req.user.id,
      paymentType: 'material_pack',
      provider: req.body.provider,
      amountUzs: Number(pack.priceUzs || 0),
      payload: {
        packId: pack.id,
      },
    })

    if (payment.status === 'paid') {
      await MaterialPack.grantEntitlement({
        userId: req.user.id,
        packId: pack.id,
        sourcePaymentId: payment.id,
      })
    }

    Analytics.trackEvent({
      eventType: 'material_checkout_created',
      userId: req.user.id,
      subjectId: pack.subjectId,
      source: req.body.provider,
      payload: { packId: pack.id, paymentId: payment.id },
    }).catch(() => {})

    return sendSuccess(res, {
      payment,
      checkout: {
        provider: payment.provider,
        externalId: payment.externalId,
      },
    }, undefined, 201)
  } catch (err) {
    return next(err)
  }
}
