import { useCallback } from 'react'
import ClassStudentManager from '../ClassStudentManager'
import { useAuth } from '../../../hooks/useAuth'
import { useFetch } from '../../../hooks/useFetch'
import classesService from '../../../services/classes.service'

export default function ClassStudentsTab({ classId, students: initialStudents, onReload }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher'
  const canManage = isAdmin || isTeacher

  const fetchStudents = useCallback(() => classesService.getStudents(classId), [classId])
  const { data: studentsData, loading, execute: reloadStudents } = useFetch(fetchStudents)
  const students = Array.isArray(studentsData) ? studentsData : studentsData?.students || initialStudents || []

  const handleReload = () => {
    reloadStudents()
    if (onReload) onReload()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <ClassStudentManager
        classId={classId}
        students={students}
        loading={loading}
        onReload={handleReload}
        readOnly={!canManage}
      />
    </div>
  )
}
