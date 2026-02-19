const ERROR_CODES = require('../constants/errorCodes')

const sendError = (res, { status, code, message, requestId, details }) => {
  const payload = {
    code: code || ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: message || 'Internal server error',
  }

  if (requestId) payload.requestId = requestId
  if (details) payload.details = details

  return res.status(status || 500).json(payload)
}

module.exports = { sendError }
