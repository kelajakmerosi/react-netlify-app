import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ExamImportReviewPanel from './ExamImportReviewPanel'

vi.mock('../../../hooks', () => ({
  useLang: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../../../services/exam.service', () => ({
  default: {
    importSource: vi.fn(),
    getTeacherValidation: vi.fn(),
    getTeacherQuestions: vi.fn(),
    updateQuestionKey: vi.fn(),
    submitReview: vi.fn(),
  },
}))

describe('ExamImportReviewPanel', () => {
  it('keeps source path in advanced options until expanded', () => {
    render(
      <ExamImportReviewPanel
        subjects={[{ id: 'math', title: 'Mathematics' }]}
      />,
    )

    const advancedSummary = screen.getByText('adminExamImportAdvanced')
    const advancedPanel = advancedSummary.closest('details')
    expect(advancedPanel?.hasAttribute('open')).toBe(false)

    fireEvent.click(advancedSummary)

    expect(advancedPanel?.hasAttribute('open')).toBe(true)
    expect(screen.getByLabelText('adminExamImportSourcePath')).not.toBeNull()
  })
})