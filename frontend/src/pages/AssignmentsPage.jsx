import { useState } from 'react'
import AssignmentList from '../components/assignments/AssignmentList'
import AssignmentDetail from '../components/assignments/AssignmentDetail'

export default function AssignmentsPage() {
  const [selectedId, setSelectedId] = useState(null)

  if (selectedId) {
    return (
      <AssignmentDetail
        assignmentId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    )
  }

  return <AssignmentList onViewDetail={(id) => setSelectedId(id)} />
}
