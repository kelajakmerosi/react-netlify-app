import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ManagedExamWorkspace from './ManagedExamWorkspace'

const examServiceMock = vi.hoisted(() => ({
  getTeacherExams: vi.fn(),
  getTeacherQuestions: vi.fn(),
  getTeacherValidation: vi.fn(),
  createTeacherExam: vi.fn(),
  updateTeacherExam: vi.fn(),
  submitReview: vi.fn(),
}))

vi.mock('../../../hooks', () => ({
  useLang: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../../../services/exam.service', () => ({
  default: examServiceMock,
}))

vi.mock('../../../app/providers/ToastProvider', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    toast: vi.fn(),
  }),
}))

describe('ManagedExamWorkspace', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows an empty editor state until an exam is chosen and opens a fresh draft immediately', async () => {
    examServiceMock.getTeacherExams.mockResolvedValueOnce([{
      id: 'exam-1',
      subjectId: 'math',
      ownerUserId: 'u-1',
      title: 'Attestation demo',
      description: 'Demo exam',
      durationSec: 7200,
      passPercent: 80,
      requiredQuestionCount: 35,
      status: 'draft',
      priceUzs: 25000,
      isActive: true,
      questionCount: 35,
      verifiedQuestions: 35,
    }])

    render(
      <ManagedExamWorkspace
        subjects={[{
          id: 'math',
          title: 'Mathematics',
          description: 'Core math',
          topics: [],
        }]}
      />,
    )

    expect(await screen.findByText('adminExamEditorEmptyTitle')).not.toBeNull()
    expect(screen.queryByText('adminLoading')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'adminExamCreateCardTitle' }))

    expect(screen.getByText('adminExamEditorUntitled')).not.toBeNull()
    expect(screen.queryByText('adminExamEditorEmptyTitle')).toBeNull()
    expect(screen.queryByText('adminLoading')).toBeNull()
  })

  it('opens the broken question editor from the review step fix action', async () => {
    examServiceMock.getTeacherExams.mockResolvedValueOnce([{
      id: 'exam-1',
      subjectId: 'math',
      ownerUserId: 'u-1',
      title: 'Attestation demo',
      description: 'Demo exam',
      durationSec: 7200,
      passPercent: 80,
      requiredQuestionCount: 35,
      status: 'draft',
      priceUzs: 25000,
      isActive: true,
      questionCount: 1,
      verifiedQuestions: 0,
    }])
    examServiceMock.getTeacherQuestions.mockResolvedValueOnce([{
      id: 'question-1',
      questionOrder: 1,
      promptText: '',
      options: ['', ''],
      correctIndex: 0,
      keyVerified: false,
      explanation: null,
      difficulty: null,
      sourceRef: null,
      imageUrl: null,
      blockOrder: null,
      blockTitle: null,
    }])
    examServiceMock.getTeacherValidation.mockResolvedValueOnce({
      valid: false,
      requiredQuestionCount: 35,
      questionCount: 1,
      verifiedQuestions: 0,
      issues: [{
        code: 'invalid_question',
        message: 'Question 1 incomplete',
      }],
    })

    render(
      <ManagedExamWorkspace
        subjects={[{
          id: 'math',
          title: 'Mathematics',
          description: 'Core math',
          topics: [],
        }]}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'adminExamOpenEditor' }))

    expect(await screen.findByText('adminExamQuestionsTitle')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /adminExamStepReview/ }))

    expect(await screen.findByText('adminExamProgressTitle')).not.toBeNull()

    fireEvent.click(screen.getAllByRole('button', { name: 'adminExamFixQuestion' })[0])

    expect(await screen.findByLabelText('adminContentQuestionText')).not.toBeNull()
    expect(screen.queryByText('adminExamProgressTitle')).toBeNull()
  })

  it('inserts visible authoring symbols instead of raw latex commands', async () => {
    examServiceMock.getTeacherExams.mockResolvedValueOnce([{
      id: 'exam-1',
      subjectId: 'math',
      ownerUserId: 'u-1',
      title: 'Attestation demo',
      description: 'Demo exam',
      durationSec: 7200,
      passPercent: 80,
      requiredQuestionCount: 35,
      status: 'draft',
      priceUzs: 25000,
      isActive: true,
      questionCount: 1,
      verifiedQuestions: 0,
    }])
    examServiceMock.getTeacherQuestions.mockResolvedValueOnce([{
      id: 'question-1',
      questionOrder: 1,
      promptText: '',
      options: ['', ''],
      correctIndex: 0,
      keyVerified: false,
      explanation: null,
      difficulty: null,
      sourceRef: null,
      imageUrl: null,
      blockOrder: null,
      blockTitle: null,
    }])
    examServiceMock.getTeacherValidation.mockResolvedValueOnce({
      valid: false,
      requiredQuestionCount: 35,
      questionCount: 1,
      verifiedQuestions: 0,
      issues: [],
    })

    render(
      <ManagedExamWorkspace
        subjects={[{
          id: 'math',
          title: 'Mathematics',
          description: 'Core math',
          topics: [],
        }]}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'adminExamOpenEditor' }))

    const promptField = await screen.findByLabelText('adminContentQuestionText') as HTMLTextAreaElement

    fireEvent.click(screen.getByRole('button', { name: 'α' }))
    expect(promptField.value).toContain('α')
    expect(promptField.value).not.toContain('\\alpha')

    fireEvent.click(screen.getByRole('button', { name: '√' }))
    expect(promptField.value).toContain('√()')
    expect(promptField.value).not.toContain('\\sqrt')
  })
})
