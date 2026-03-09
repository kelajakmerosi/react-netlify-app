import { Request, Response, NextFunction } from 'express'
interface AuthRequest extends Request { user?: any; file?: any; }
import MaterialPack from '../models/MaterialPack.model'
import Payment from '../models/Payment.model'
import Analytics from '../models/Analytics.model'
import SubjectScope from '../models/SubjectScope.model'
import ERROR_CODES from '../constants/errorCodes'
import {  sendError, sendSuccess  } from '../utils/http'
import {  isSuperAdminUser  } from '../utils/adminAccess'
import {  isExamsCommerceEnabled, isPaymeClickEnabled  } from '../config/featureFlags'

export const createTeacherMaterialPack = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

export const updateTeacherMaterialPack = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const current = await MaterialPack.getById(req.params.packId)
    if (!current) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.MATERIAL_PACK_NOT_FOUND,
        message: 'Material pack not found',
        requestId: req.id as any as any,
      })
    }

    if (current.ownerUserId !== req.user.id && req.user.role !== 'superadmin') {
      return sendError(res, {
        status: 403,
        code: ERROR_CODES.TEACHER_SCOPE_REQUIRED,
        message: 'Teacher ownership is required for updates',
        requestId: req.id as any as any,
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
          requestId: req.id as any as any,
          details: { subjectId: current.subjectId },
        })
      }
    }

    if (current.status === 'published') {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.EXAM_INVALID_STATE,
        message: 'Published material pack cannot be edited directly',
        requestId: req.id as any as any,
      })
    }

    const updated = await MaterialPack.updateDraft(req.params.packId, req.body)
    return sendSuccess(res, updated)
  } catch (err) {
    return next(err)
  }
}

export const submitTeacherMaterialPackReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const current = await MaterialPack.getById(req.params.packId)
    if (!current) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.MATERIAL_PACK_NOT_FOUND,
        message: 'Material pack not found',
        requestId: req.id as any as any,
      })
    }

    if (current.ownerUserId !== req.user.id && req.user.role !== 'superadmin') {
      return sendError(res, {
        status: 403,
        code: ERROR_CODES.TEACHER_SCOPE_REQUIRED,
        message: 'Teacher ownership is required for review submission',
        requestId: req.id as any as any,
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
          requestId: req.id as any as any,
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

export const approveMaterialPack = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pack = await MaterialPack.getById(req.params.packId)
    if (!pack) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.MATERIAL_PACK_NOT_FOUND,
        message: 'Material pack not found',
        requestId: req.id as any as any,
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
          requestId: req.id as any as any,
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

export const rejectMaterialPack = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pack = await MaterialPack.getById(req.params.packId)
    if (!pack) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.MATERIAL_PACK_NOT_FOUND,
        message: 'Material pack not found',
        requestId: req.id as any as any,
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
          requestId: req.id as any as any,
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

export const getMaterialCatalog = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const packs = await MaterialPack.listPublishedCatalog({ subjectId: req.query.subjectId })
    return sendSuccess(res, packs)
  } catch (err) {
    return next(err)
  }
}

export const createMaterialCheckout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!isExamsCommerceEnabled()) {
      return sendError(res, {
        status: 403,
        code: ERROR_CODES.FEATURE_DISABLED,
        message: 'Exam/material commerce feature is disabled',
        requestId: req.id as any as any,
      })
    }

    if (req.body.provider !== 'manual' && !isPaymeClickEnabled()) {
      return sendError(res, {
        status: 409,
        code: ERROR_CODES.FEATURE_DISABLED,
        message: 'Payme/Click checkout is disabled',
        requestId: req.id as any as any,
      })
    }

    const pack = await MaterialPack.getById(req.params.packId)
    if (!pack || pack.status !== 'published' || !pack.isActive) {
      return sendError(res, {
        status: 404,
        code: ERROR_CODES.MATERIAL_PACK_NOT_FOUND,
        message: 'Material pack is not available for purchase',
        requestId: req.id as any as any,
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

    if (payment && payment.status === 'paid') {
      await MaterialPack.grantEntitlement({
        userId: req.user.id,
        packId: pack.id,
        sourcePaymentId: payment?.id,
      })
    }

    Analytics.trackEvent({
      eventType: 'material_checkout_created',
      userId: req.user.id,
      subjectId: pack.subjectId,
      source: req.body.provider,
      payload: { packId: pack.id, paymentId: payment?.id },
    }).catch(() => {})

    return sendSuccess(res, {
      payment,
      checkout: {
        provider: payment?.provider,
        externalId: payment?.externalId,
      },
    }, undefined, 201)
  } catch (err) {
    return next(err)
  }
}
