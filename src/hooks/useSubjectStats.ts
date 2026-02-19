import { useMemo } from 'react'
import { SUBJECTS } from '../constants'
import { useApp }   from './index'

export function useSubjectStats(subjectId?: string) {
  const { getTopicData } = useApp()

  return useMemo(() => {
    const subjects = subjectId ? SUBJECTS.filter(s => s.id === subjectId) : SUBJECTS

    return subjects.map(subject => {
      let tests = 0, correct = 0, completed = 0
      const total = subject.topics.length

      subject.topics.forEach(topic => {
        const d = getTopicData(subject.id, topic.id)
        if (d.quizScore !== undefined) { tests += 10; correct += d.quizScore }
        if (d.status === 'completed') completed++
      })

      const pct = tests > 0 ? Math.round((correct / tests) * 100) : 0

      return {
        subject,
        tests,
        correct,
        incorrect:  tests - correct,
        pct,
        completed,
        total,
        completionPct: Math.round((completed / total) * 100),
      }
    })
  }, [getTopicData, subjectId])
}
