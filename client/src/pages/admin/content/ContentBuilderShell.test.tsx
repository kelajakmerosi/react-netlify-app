import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminService, type SubjectRecord } from '../../../services/admin.service'
import ContentBuilderShell from './ContentBuilderShell'

const listAdminScopesMock = vi.fn()
const mockUseAuth = vi.fn(() => ({ user: { id: 'u-1', role: 'superadmin' } }))
const getTopicDataMock = vi.fn(() => ({ status: 'locked' }))

const tMock = (key: string) => {
  const labels: Record<string, string> = {
    adminContentEditDetails: 'Edit',
    adminContentEditSubjectTitle: 'Edit subject',
    adminContentBackToInventory: 'Back to inventory',
    adminContentCreateSubjectTitle: 'Create new subject',
    adminContentSectionSubjectsSubtitle: 'Edit subject catalog',
    adminContentDeleteSubject: 'Delete subject',
    adminContentDelete: 'Delete',
    adminContentDeleteConfirmTitle: 'Delete subject?',
    adminContentDeleteConfirmBody: 'This removes the subject.',
    adminContentDeleteFinalTitle: 'Delete forever?',
    adminContentDeleteFinalBody: 'This cannot be undone.',
    adminContentDeleteForever: 'Delete forever',
    adminContentPublish: 'Publish',
    adminContentPublishing: 'Publishing',
    adminContentPublishConfirmTitle: 'Publish subject?',
    adminContentPublishConfirmBody: 'Save this subject now.',
    adminContentDraftSaved: 'Draft saved',
    adminContentSectionTitle: 'Section title',
    adminContentVisualPresetTitle: 'Card image',
    adminContentCustomVisualOption: 'Manual',
    adminContentPublishedSuccess: 'Published successfully',
    adminContentSaveDraft: 'Save draft',
    adminContentStep1Hint: 'Fill in the subject card details.',
    adminContentStep2Hint: 'Prepare lessons.',
    adminContentStep4Hint: 'Review and publish.',
    adminContentNewTopic: 'New topic',
    adminContentTopicsTitle: 'Topics',
    adminContentActionDelete: 'Delete',
    adminLoading: 'Loading',
    subjects: 'Subjects',
    continue: 'Continue',
    cancel: 'Cancel',
  }
  return labels[key] ?? key
}

vi.mock('../../../hooks', () => ({
  useLang: () => ({
    t: tMock,
    lang: 'en',
  }),
  useAuth: () => mockUseAuth(),
  useApp: () => ({
    getTopicData: getTopicDataMock,
  }),
}))

vi.mock('../../../services/scope.service', () => ({
  scopeService: {
    listAdminScopes: (...args: unknown[]) => listAdminScopesMock(...args),
  },
}))

vi.mock('../../../app/providers/ToastProvider', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}))

const subjectFixture: SubjectRecord = {
  id: 'math',
  title: 'Advanced Math',
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
  sections: [{
    id: 'section-1',
    type: 'attestation',
    title: 'Attestatsiya',
    topicIds: ['algebra-basics'],
  }],
}

const seedBackedLiveSubjectFixture: SubjectRecord = {
  id: '7f5f12e0-83d2-4baa-a5c2-8e660d0f2222',
  catalog_key: '5',
  title: 'Mock test',
  description: 'Updated display name',
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
  sections: [{
    id: 'section-1',
    type: 'attestation',
    title: 'Mock test',
    topicIds: ['algebra-basics'],
  }],
}

const demoSubjectFixture: SubjectRecord = {
  ...subjectFixture,
  id: 'demo-math',
  title: 'Demo Matematika',
}

const renderShell = ({
  initialEntry = '/admin/content',
  subjects = [subjectFixture],
  subjectsLoading = false,
  onSubjectsChange = vi.fn(),
}: {
  initialEntry?: string
  subjects?: SubjectRecord[]
  subjectsLoading?: boolean
  onSubjectsChange?: ReturnType<typeof vi.fn>
} = {}) => {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/admin/*"
          element={(
            <ContentBuilderShell
              subjects={subjects}
              subjectsLoading={subjectsLoading}
              currentUserId="u-1"
              canManagePricing
              pricingRows={[{
                subjectId: 'math',
                subjectTitle: 'Advanced Math',
                priceUzs: 25000,
                isActive: true,
              }]}
              savingCourseId={null}
              bootstrappingDemo={false}
              onBootstrapDemo={vi.fn().mockResolvedValue('ok')}
              onCoursePricingChange={vi.fn()}
              onSaveCoursePrice={vi.fn().mockResolvedValue('saved')}
              onSubjectsChange={onSubjectsChange}
            />
          )}
        />
      </Routes>
    </MemoryRouter>,
  )

  return { onSubjectsChange }
}

beforeEach(() => {
  vi.restoreAllMocks()
  window.localStorage?.removeItem?.('km_admin_content_draft_5')
  window.localStorage?.removeItem?.('km_admin_content_draft_math')
  window.localStorage?.removeItem?.('km_admin_content_draft_new')
  listAdminScopesMock.mockReset()
  mockUseAuth.mockReset()
  mockUseAuth.mockReturnValue({ user: { id: 'u-1', role: 'superadmin' } })
  getTopicDataMock.mockReset()
  getTopicDataMock.mockReturnValue({ status: 'locked' })
})

describe('ContentBuilderShell', () => {
  it('falls back to loaded subjects when scope endpoint fails', async () => {
    mockUseAuth.mockReturnValueOnce({ user: { id: 'u-1', role: 'admin' } })
    listAdminScopesMock.mockRejectedValueOnce(new Error('forbidden'))

    renderShell()

    expect(await screen.findByRole('button', { name: 'Edit: Advanced Math' })).not.toBeNull()
    expect(screen.getAllByText('Edit').length).toBeGreaterThan(0)
  })

  it('mirrors learner-visible subjects instead of extra admin-only records', async () => {
    renderShell({ initialEntry: '/admin/content', subjects: [subjectFixture, demoSubjectFixture] })

    expect(await screen.findByRole('button', { name: 'Edit: Mathematics' })).not.toBeNull()
    expect(screen.queryByText('Demo Matematika')).toBeNull()
    expect(screen.getAllByLabelText('Delete subject').length).toBeGreaterThan(0)
  })

  it('shows a delete icon on every mirrored admin card', async () => {
    renderShell({ initialEntry: '/admin/content', subjects: [] })

    expect((await screen.findAllByLabelText('Delete subject')).length).toBe(6)
  })

  it('renders the subject editor on a dedicated route for custom live subjects', async () => {
    renderShell({ initialEntry: '/admin/content/subjects/math/details' })

    expect(await screen.findByText('Edit subject')).not.toBeNull()
    expect(screen.getAllByText('Back to inventory').length).toBeGreaterThan(0)
  })

  it('keeps the seed-backed route stable while admin subjects are still loading', async () => {
    renderShell({ initialEntry: '/admin/content/subjects/5/details', subjects: [], subjectsLoading: true })

    expect(await screen.findByText('Create new subject')).not.toBeNull()
    expect(screen.getAllByText('Back to inventory').length).toBeGreaterThan(0)
    expect(screen.queryByText('Edit subject catalog')).toBeNull()
  })

  it('waits for custom admin subjects to load before deciding the editor route is missing', async () => {
    renderShell({ initialEntry: '/admin/content/subjects/math/details', subjects: [], subjectsLoading: true })

    expect(await screen.findByText('Loading')).not.toBeNull()
    expect(screen.queryByText('Edit subject catalog')).toBeNull()
  })

  it('opens the dedicated editor when the built-in card surface is clicked', async () => {
    const user = userEvent.setup()
    renderShell({ initialEntry: '/admin/content', subjects: [] })

    await user.click(await screen.findByRole('button', { name: 'Edit: Mathematics' }))

    expect(await screen.findByText('Create new subject')).not.toBeNull()
    expect(screen.getAllByText('Back to inventory').length).toBeGreaterThan(0)
  })

  it('opens the dedicated editor when the details button is clicked for a seed-backed route', async () => {
    const user = userEvent.setup()
    renderShell({ initialEntry: '/admin/content', subjects: [] })

    const detailButtons = await screen.findAllByRole('button', { name: /^Edit$/ })
    await user.click(detailButtons[0]!)

    expect(await screen.findByText('Create new subject')).not.toBeNull()
    expect(screen.getAllByText('Back to inventory').length).toBeGreaterThan(0)
  })

  it('creates a live subject from the built-in seed route and keeps the canonical route id', async () => {
    const user = userEvent.setup()
    const createSubjectSpy = vi.spyOn(adminService, 'createSubject').mockResolvedValue({
      ...seedBackedLiveSubjectFixture,
      id: 'b5ce8d44-9869-4a59-a4c5-f267fce81111',
      catalog_key: '5',
      title: 'Mathematics',
    })
    const { onSubjectsChange } = renderShell({ initialEntry: '/admin/content/subjects/5/review', subjects: [] })

    const publishTriggers = await screen.findAllByRole('button', { name: 'Publish' })
    await user.click(publishTriggers[0]!)
    const publishButtons = screen.getAllByRole('button', { name: 'Publish' })
    await user.click(publishButtons[publishButtons.length - 1]!)

    expect(createSubjectSpy).toHaveBeenCalledWith(expect.objectContaining({ catalogKey: '5' }))
    expect(onSubjectsChange).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        id: 'b5ce8d44-9869-4a59-a4c5-f267fce81111',
        catalog_key: '5',
      }),
    ]))
    expect((await screen.findAllByText('Mathematics')).length).toBeGreaterThan(0)
  })

  it('keeps renamed seed-backed subjects merged into a single canonical card', async () => {
    renderShell({ initialEntry: '/admin/content', subjects: [seedBackedLiveSubjectFixture] })

    expect(await screen.findByRole('button', { name: 'Edit: Mock test' })).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit: Mathematics' })).toBeNull()
  })

  it('deletes seed-backed subjects by live DB id while keeping the canonical route stable', async () => {
    const user = userEvent.setup()
    const deleteSubjectSpy = vi.spyOn(adminService, 'deleteSubject').mockResolvedValue()
    renderShell({ initialEntry: '/admin/content', subjects: [seedBackedLiveSubjectFixture] })

    await user.click((await screen.findAllByLabelText('Delete subject'))[0]!)
    await user.click(await screen.findByRole('button', { name: 'Continue' }))
    await user.click(await screen.findByRole('button', { name: 'Delete forever' }))

    expect(deleteSubjectSpy).toHaveBeenCalledWith('7f5f12e0-83d2-4baa-a5c2-8e660d0f2222')
  })

  it('uses the saved visual choice on the mirrored admin card after merge', async () => {
    renderShell({
      initialEntry: '/admin/content',
      subjects: [{
        ...seedBackedLiveSubjectFixture,
        icon: 'zap',
        color: '#0c95d8',
      }],
    })

    const mockTestCard = await screen.findByRole('button', { name: 'Edit: Mock test' })
    expect(within(mockTestCard).getByAltText('Physics study artwork')).not.toBeNull()
  })

  it('updates the live card preview when a section title changes', async () => {
    const user = userEvent.setup()
    renderShell({ initialEntry: '/admin/content/subjects/math/details' })

    const sectionInput = await screen.findByLabelText('Section title')
    await user.clear(sectionInput)
    await user.type(sectionInput, 'Mock test')

    expect(screen.getByDisplayValue('Mock test')).not.toBeNull()
    expect(screen.getByText('Mock test')).not.toBeNull()
  })

  it('renders an inline color picker for the advanced color field', async () => {
    renderShell({ initialEntry: '/admin/content/subjects/math/details' })

    expect(await screen.findByText('Edit subject')).not.toBeNull()
    expect(document.querySelector('input[type=\"color\"]')).not.toBeNull()
  })

  it('reveals a local image upload input when manual card image mode is selected', async () => {
    const user = userEvent.setup()
    renderShell({ initialEntry: '/admin/content/subjects/math/details' })

    const visualSelect = await screen.findByLabelText('Card image')
    await user.selectOptions(visualSelect, '__manual__')

    expect(document.querySelector('input[type=\"file\"]')).not.toBeNull()
  })

  it('prefers a saved subject image over the preset artwork on mirrored cards', async () => {
    renderShell({
      initialEntry: '/admin/content',
      subjects: [{
        ...seedBackedLiveSubjectFixture,
        image_url: 'data:image/png;base64,AAA',
      }],
    })

    expect(await screen.findByAltText('Mock test card image')).not.toBeNull()
  })

  it('hydrates legacy stored drafts without crashing the details route', async () => {
    const originalLocalStorage = window.localStorage
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => (
          key === 'km_admin_content_draft_5'
            ? JSON.stringify({
              savedAt: Date.now(),
              draft: {
                subject: {
                  title: 'Legacy mathematics',
                  description: 'Old draft',
                  icon: 'calculator',
                  color: '#3f68f7',
                  order: 0,
                },
                topics: [],
              },
            })
            : null
        )),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
    })

    try {
      renderShell({ initialEntry: '/admin/content/subjects/5/details', subjects: [] })

      expect(await screen.findByDisplayValue('Legacy mathematics')).not.toBeNull()
      expect(screen.getAllByText('Back to inventory').length).toBeGreaterThan(0)
    } finally {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: originalLocalStorage,
      })
    }
  })

  it('shows the create-subject action on the catalog route', () => {
    renderShell()

    expect(screen.getByText('Create new subject')).not.toBeNull()
    expect(screen.getByText('Edit subject catalog')).not.toBeNull()
  })
})
