process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret'
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client-id'

jest.mock('../src/models/User.model', () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  upsertGoogle: jest.fn(),
  toPublic: jest.fn((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role || 'student',
    avatar: row.avatar || '',
    createdAt: row.created_at || new Date().toISOString(),
  })),
}))

jest.mock('google-auth-library', () => {
  const verifyIdToken = jest.fn()
  return {
    OAuth2Client: jest.fn(() => ({ verifyIdToken })),
    __verifyIdToken: verifyIdToken,
  }
})

const request = require('supertest')
const app = require('../src/app')
const User = require('../src/models/User.model')
const { __verifyIdToken } = require('google-auth-library')

describe('Auth routes integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('registers a user successfully', async () => {
    User.findByEmail.mockResolvedValue(null)
    User.create.mockResolvedValue({
      id: 'user-1',
      name: 'Ali',
      email: 'ali@example.com',
      role: 'student',
      avatar: '',
      created_at: new Date().toISOString(),
    })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ali', email: 'ali@example.com', password: 'Password123!' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('token')
    expect(res.body).toHaveProperty('user.email', 'ali@example.com')
  })

  it('rejects login with invalid credentials', async () => {
    User.findByEmail.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bad@example.com', password: 'wrong' })

    expect(res.status).toBe(401)
    expect(res.body.code).toBe('INVALID_CREDENTIALS')
  })

  it('rejects google auth when id token is missing', async () => {
    const res = await request(app).post('/api/auth/google').send({})

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('GOOGLE_ID_TOKEN_REQUIRED')
  })

  it('authenticates with google token successfully', async () => {
    __verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-1',
        email: 'google@example.com',
        name: 'Google User',
        picture: 'https://example.com/avatar.png',
      }),
    })

    User.upsertGoogle.mockResolvedValue({
      id: 'user-google-1',
      name: 'Google User',
      email: 'google@example.com',
      role: 'student',
      avatar: 'https://example.com/avatar.png',
      created_at: new Date().toISOString(),
    })

    const res = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'mock-id-token' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body).toHaveProperty('user.email', 'google@example.com')
  })
})
