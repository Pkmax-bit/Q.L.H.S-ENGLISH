import { useState } from 'react'
import StudentClassGrid from '../components/student/StudentClassGrid'
import StudentClassroom from '../components/student/StudentClassroom'

export default function StudentLearningPage() {
  const [selectedClass, setSelectedClass] = useState(null)

  if (selectedClass) {
    return (
      <StudentClassroom
        classData={selectedClass}
        onBack={() => setSelectedClass(null)}
      />
    )
  }

  return <StudentClassGrid onSelectClass={setSelectedClass} />
}
