import { useState } from 'react'
import StudentClassGrid from '../components/student/StudentClassGrid'
import StudentClassroom from '../components/student/StudentClassroom'
import TakeAssignment from '../components/student/TakeAssignment'
import SubmissionResult from '../components/student/SubmissionResult'

export default function StudentLearningPage() {
  const [selectedClass, setSelectedClass] = useState(null)
  const [takingAssignment, setTakingAssignment] = useState(null) // assignment id
  const [viewResult, setViewResult] = useState(null) // submission id

  // Viewing submission result
  if (viewResult) {
    return (
      <SubmissionResult
        submissionId={viewResult}
        onBack={() => setViewResult(null)}
      />
    )
  }

  // Taking an assignment
  if (takingAssignment) {
    return (
      <TakeAssignment
        assignmentId={takingAssignment}
        onBack={() => setTakingAssignment(null)}
        onComplete={(submission) => {
          setTakingAssignment(null)
          setViewResult(submission.id)
        }}
      />
    )
  }

  // In a classroom
  if (selectedClass) {
    return (
      <StudentClassroom
        classData={selectedClass}
        onBack={() => setSelectedClass(null)}
        onTakeAssignment={(id) => setTakingAssignment(id)}
        onViewResult={(id) => setViewResult(id)}
      />
    )
  }

  return <StudentClassGrid onSelectClass={setSelectedClass} />
}
