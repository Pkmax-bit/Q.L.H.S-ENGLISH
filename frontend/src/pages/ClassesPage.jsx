import { useState } from 'react'
import ClassList from '../components/classes/ClassList'
import ClassDetail from '../components/classes/ClassDetail'

export default function ClassesPage() {
  const [selectedClassId, setSelectedClassId] = useState(null)

  if (selectedClassId) {
    return (
      <ClassDetail
        classId={selectedClassId}
        onBack={() => setSelectedClassId(null)}
      />
    )
  }

  return <ClassList onViewDetail={(id) => setSelectedClassId(id)} />
}
