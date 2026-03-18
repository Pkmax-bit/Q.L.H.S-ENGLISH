import { useState } from 'react'
import LessonList from '../components/lessons/LessonList'
import LessonDetail from '../components/lessons/LessonDetail'

export default function LessonsPage() {
  const [selectedLessonId, setSelectedLessonId] = useState(null)

  if (selectedLessonId) {
    return (
      <LessonDetail
        lessonId={selectedLessonId}
        onBack={() => setSelectedLessonId(null)}
      />
    )
  }

  return <LessonList onViewDetail={(id) => setSelectedLessonId(id)} />
}
