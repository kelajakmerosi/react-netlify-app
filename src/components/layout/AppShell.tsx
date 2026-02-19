import { useState } from 'react'
import { Sidebar }       from './Sidebar'
import { Topbar }        from './Topbar'
import { DashboardPage } from '../../pages/DashboardPage'
import { SubjectsPage }  from '../../pages/SubjectsPage'
import { SubjectPage }   from '../../pages/SubjectPage'
import { TopicPage }     from '../../pages/TopicPage'
import { ProfilePage }   from '../../pages/ProfilePage'
import { useRouter }     from '../../app/router'
import type { PageId }   from '../../types'

export function AppShell() {
  const { activePage, currentSubject, currentTopic, navigate, goBack } = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const renderPage = () => {
    if (activePage === 'topic' && currentTopic) {
      return (
        <TopicPage
          subjectId={currentTopic.subjectId}
          topicId={currentTopic.topicId}
          onBack={goBack}
        />
      )
    }
    if (activePage === 'subject' && currentSubject) {
      return (
        <SubjectPage
          subjectId={currentSubject}
          onBack={() => navigate('subjects')}
          onTopicSelect={topic => navigate('topic', { topic })}
        />
      )
    }
    switch (activePage as PageId) {
      case 'dashboard': return <DashboardPage onNavigate={navigate} />
      case 'subjects':  return (
        <SubjectsPage
          onSubjectSelect={id => navigate('subject', { subjectId: id })}
        />
      )
      case 'profile':   return <ProfilePage />
      default:          return <DashboardPage onNavigate={navigate} />
    }
  }

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        navigate={navigate}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="main-content">
        <Topbar
          activePage={activePage}
          onMenuToggle={() => setMobileOpen(o => !o)}
        />
        {renderPage()}
      </div>
    </div>
  )
}
