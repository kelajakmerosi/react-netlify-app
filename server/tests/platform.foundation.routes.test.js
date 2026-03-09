process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret'
process.env.FEATURE_PAYME_CLICK = 'true'
process.env.FEATURE_EXAMS_COMMERCE = 'true'
process.env.PAYME_WEBHOOK_SECRET = 'test-payme-secret'

jest.mock('../src/models/User.model', () => ({
  findById: jest.fn(),
  findByIdentity: jest.fn(),
  updateCapabilities: jest.fn(),
  toPublic: jest.fn((row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    capabilities: {
      canTeach: row.can_teach,
      canBuy: row.can_buy,
      canLearn: row.can_learn,
    },
  })),
}))

jest.mock('../src/models/SubjectScope.model', () => ({
  hasAdminScope: jest.fn(),
  hasTeacherScope: jest.fn(),
  listAdminScopes: jest.fn(),
  assignAdminScope: jest.fn(),
  revokeAdminScope: jest.fn(),
  listTeacherScopes: jest.fn(),
  assignTeacherScope: jest.fn(),
  revokeTeacherScope: jest.fn(),
}))

jest.mock('../src/models/Exam.model', () => ({
  FIXED_EXAM_DURATION_SEC: 7200,
  FIXED_EXAM_PASS_PERCENT: 80,
  DEFAULT_REQUIRED_EXAM_QUESTION_COUNT: 50,
  createDraft: jest.fn(),
  getById: jest.fn(),
  updateDraft: jest.fn(),
  setStatus: jest.fn(),
  listPublishedCatalog: jest.fn(),
  replaceStructure: jest.fn(),
  listQuestions: jest.fn(),
  validateExamStructure: jest.fn(),
  grantEntitlement: jest.fn(),
  startAttempt: jest.fn(),
  saveAttemptAnswer: jest.fn(),
  submitAttempt: jest.fn(),
  getAttemptSession: jest.fn(),
  getAttemptResult: jest.fn(),
  updateQuestionKey: jest.fn(),
}))

jest.mock('../src/models/MaterialPack.model', () => ({
  getById: jest.fn(),
  grantEntitlement: jest.fn(),
  listLibraryByUser: jest.fn(),
  listPublishedCatalog: jest.fn(),
}))

jest.mock('../src/models/Payment.model', () => ({
  createCheckoutIntent: jest.fn(),
  getById: jest.fn(),
  attachCheckoutContext: jest.fn(),
  markWebhookStatus: jest.fn(),
}))

jest.mock('../src/models/Analytics.model', () => ({
  trackEvent: jest.fn().mockResolvedValue(null),
}))

const request = require('supertest')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const app = require('../src/app').default || require('../src/app')
const User = require('../src/models/User.model')
const SubjectScope = require('../src/models/SubjectScope.model')
const Exam = require('../src/models/Exam.model')
const Payment = require('../src/models/Payment.model')

describe('Platform foundation routes', () => {
  const superToken = jwt.sign({ id: 'super-1' }, process.env.JWT_SECRET)
  const teacherToken = jwt.sign({ id: 'teacher-1' }, process.env.JWT_SECRET)
  const learnerToken = jwt.sign({ id: 'learner-1' }, process.env.JWT_SECRET)

  beforeEach(() => {
    jest.clearAllMocks()

    User.findById.mockImplementation(async (id) => {
      if (id === 'super-1') {
        return {
          id: 'super-1',
          name: 'Super',
          email: 'kelajakmerosi@gmail.com',
          role: 'admin',
          can_teach: true,
          can_buy: true,
          can_learn: true,
        }
      }

      if (id === 'teacher-1') {
        return {
          id: 'teacher-1',
          name: 'Teacher',
          email: 'teacher@example.com',
          role: 'student',
          can_teach: true,
          can_buy: true,
          can_learn: true,
        }
      }

      if (id === 'learner-1') {
        return {
          id: 'learner-1',
          name: 'Learner',
          email: 'learner@example.com',
          role: 'student',
          can_teach: false,
          can_buy: true,
          can_learn: true,
        }
      }

      if (id === '11111111-1111-4111-8111-111111111111') {
        return {
          id,
          name: 'Target',
          role: 'student',
          can_teach: false,
          can_buy: true,
          can_learn: true,
        }
      }

      return null
    })

    User.updateCapabilities.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Target',
      role: 'student',
      can_teach: true,
      can_buy: true,
      can_learn: true,
    })

    SubjectScope.hasTeacherScope.mockResolvedValue(true)

    Exam.createDraft.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      subjectId: 'math',
      ownerUserId: 'teacher-1',
      title: 'Test exam',
      status: 'draft',
      priceUzs: 10000,
      durationSec: 7200,
      passPercent: 80,
    })
    Exam.getById.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      subjectId: 'math',
      ownerUserId: 'teacher-1',
      title: 'Test exam',
      status: 'published',
      isActive: true,
      priceUzs: 10000,
      durationSec: 7200,
      passPercent: 80,
      requiredQuestionCount: 50,
    })
    Exam.validateExamStructure.mockResolvedValue({
      valid: true,
      requiredQuestionCount: 50,
      questionCount: 50,
      verifiedQuestions: 50,
      issues: [],
    })

    Payment.createCheckoutIntent.mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      userId: 'learner-1',
      paymentType: 'exam_attempt_pack',
      provider: 'payme',
      externalId: 'ext-1',
      status: 'pending',
      amountUzs: 10000,
      payload: {
        examId: '22222222-2222-4222-8222-222222222222',
        attempts: 1,
      },
    })

    Payment.getById.mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      userId: 'learner-1',
      paymentType: 'exam_attempt_pack',
      provider: 'payme',
      externalId: 'ext-1',
      status: 'pending',
      amountUzs: 10000,
      payload: {
        examId: '22222222-2222-4222-8222-222222222222',
        attempts: 1,
      },
    })

    Payment.attachCheckoutContext.mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      userId: 'learner-1',
      paymentType: 'exam_attempt_pack',
      provider: 'payme',
      externalId: 'ext-1',
      status: 'pending',
      amountUzs: 10000,
      payload: {
        examId: '22222222-2222-4222-8222-222222222222',
        attempts: 1,
        checkoutContext: {
          payerName: 'Learner One',
          payerPhone: '+998901234567',
        },
      },
    })

    Payment.markWebhookStatus.mockResolvedValue({
      payment: {
        id: '33333333-3333-4333-8333-333333333333',
        status: 'paid',
        userId: 'learner-1',
        paymentType: 'exam_attempt_pack',
        payload: { examId: '22222222-2222-4222-8222-222222222222', attempts: 1 },
      },
    })
  })

  it('updates user capabilities via superadmin endpoint', async () => {
    const res = await request(app)
      .patch('/api/admin/users/11111111-1111-4111-8111-111111111111/capabilities')
      .set('Authorization', `Bearer ${superToken}`)
      .send({ canTeach: true })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data.capabilitiesUpdated', true)
  })

  it('allows teacher to create scoped exam draft', async () => {
    const res = await request(app)
      .post('/api/teacher/exams')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        subjectId: 'math',
        title: 'Test exam',
        questions: [
          {
            promptText: 'Q1',
            options: ['A', 'B'],
            correctIndex: 0,
          },
        ],
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('data.id', '22222222-2222-4222-8222-222222222222')
  })

  it('rejects non-fixed exam duration policy at request validation', async () => {
    const res = await request(app)
      .post('/api/teacher/exams')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        subjectId: 'math',
        title: 'Policy invalid exam',
        durationSec: 3600,
        questions: [
          {
            promptText: 'Q1',
            options: ['A', 'B'],
            correctIndex: 0,
          },
        ],
      })

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error.code', 'VALIDATION_ERROR')
  })

  it('creates exam checkout intent for learner', async () => {
    const res = await request(app)
      .post('/api/exams/22222222-2222-4222-8222-222222222222/checkout')
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({ provider: 'payme', attempts: 1 })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('data.payment.id', '33333333-3333-4333-8333-333333333333')
  })

  it('processes payme webhook and acknowledges', async () => {
    const payload = { externalId: 'ext-1', status: 'paid' }
    const signature = crypto
      .createHmac('sha256', process.env.PAYME_WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex')
    const res = await request(app)
      .post('/api/payments/payme/webhook')
      .set('x-signature', signature)
      .send(payload)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data.ok', true)
  })

  it('returns checkout payment session for owner', async () => {
    const res = await request(app)
      .get('/api/payments/33333333-3333-4333-8333-333333333333/session')
      .set('Authorization', `Bearer ${learnerToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data.payment.id', '33333333-3333-4333-8333-333333333333')
    expect(res.body).toHaveProperty('data.session.provider', 'payme')
  })
})
