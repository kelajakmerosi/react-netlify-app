import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SubjectRecord } from '../../../services/admin.service'
import ContentBuilderShell from './ContentBuilderShell'

vi.mock('../../../hooks', () => ({
  useLang: () => ({
    t: (key: string) => key,
    lang: 'en',
  }),
}))

const subjectFixture: SubjectRecord = {
  id: 'math',
  title: 'Mathematics',
  description: 'Core math',
  icon: 'calculator',
  color: '#3f68f7',
  order: 0,
  topics: [{
    id: 'algebra-basics',
    title: 'Algebra basics',
    videoId: 'abc12345678',
    questions: [{
      text: '2 + 2 = ?',
      options: ['3', '4'],
      answer: 1,
    }],
  }],
}

describe('ContentBuilderShell', () => {
  it('switches between internal content subtabs', async () => {
    render(
      <ContentBuilderShell
        subjects={[subjectFixture]}
        currentUserId="u-1"
        canManagePricing
        pricingRows={[{
          subjectId: 'math',
          subjectTitle: 'Mathematics',
          priceUzs: 25000,
          isActive: true,
        }]}
        savingCourseId={null}
        bootstrappingDemo={false}
        onBootstrapDemo={vi.fn().mockResolvedValue('ok')}
        onCoursePricingChange={vi.fn()}
        onSaveCoursePrice={vi.fn().mockResolvedValue('saved')}
        onSubjectsChange={vi.fn()}
      />,
    )

    expect(screen.getByText('adminContentOverviewTitle')).not.toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'adminContentSubtabImports' }))
    expect(await screen.findByText('adminExamImportsTabTitle')).not.toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: 'adminContentSubtabExams' }))
    expect(await screen.findByText('adminContentSectionExamsTitle')).not.toBeNull()
  })

  it('keeps the subject workspace hidden until a subject action is chosen', () => {
    render(
      <ContentBuilderShell
        subjects={[subjectFixture]}
        currentUserId="u-1"
        canManagePricing={false}
        pricingRows={[]}
        savingCourseId={null}
        bootstrappingDemo={false}
        onBootstrapDemo={vi.fn().mockResolvedValue('ok')}
        onCoursePricingChange={vi.fn()}
        onSaveCoursePrice={vi.fn().mockResolvedValue('saved')}
        onSubjectsChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('tab', { name: 'adminContentSubtabSubjects' }))

    expect(screen.getByText('adminContentSectionSubjectsTitle')).not.toBeNull()
    expect(screen.queryByText('adminContentEditSubjectTitle')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'adminContentEditDetails' }))

    expect(screen.getByText('adminContentEditSubjectTitle')).not.toBeNull()
    expect(screen.queryByText('adminContentSectionSubjectsTitle')).toBeNull()
  })
})
