import { Response } from 'express'
import ERROR_CODES from '../constants/errorCodes'

export const sendSuccess = (res: Response, data: any, meta?: any, status = 200) => {
  const payload: any = { data }
  if (meta) payload.meta = meta
  return res.status(status).json(payload)
}

export interface ErrorPayload {
  status?: number
  code?: string
  message?: string
  requestId?: string | number
  details?: any
}

export const sendError = (res: Response, { status, code, message, requestId, details }: ErrorPayload) => {
  const payload: any = {
    error: {
      code: code || ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: message || 'Internal server error',
    },
  }

  if (requestId) payload.error.requestId = String(requestId)
  if (details) payload.error.details = details

  return res.status(status || 500).json(payload)
}
