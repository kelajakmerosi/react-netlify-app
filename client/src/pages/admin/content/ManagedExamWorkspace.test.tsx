import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

describe('ManagedExamWorkspace', () => {
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
})
