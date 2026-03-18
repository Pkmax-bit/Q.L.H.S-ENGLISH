import { useState, useEffect, useCallback, useContext } from 'react'
import Modal from '../common/Modal'
import StatusBadge from '../common/StatusBadge'
import LoadingSpinner from '../common/LoadingSpinner'
import ClassStudentManager from './ClassStudentManager'
import { useFetch } from '../../hooks/useFetch'
import { ToastContext } from '../../context/ToastContext'
import classesService from '../../services/classes.service'
import { formatDate } from '../../utils/formatDate'
import { Calendar, Users, User, FileText } from 'lucide-react'

export default function ClassDetail({ isOpen, onClose, classData }) {
  const [activeTab, setActiveTab] = useState('info')
  const { success, error: showError } = useContext(ToastContext)

  const fetchStudents = useCallback(() => {
    if (classData?.id) {
      return classesService.getStudents(classData.id)
    }
    return Promise.resolve({ data: [] })
  }, [classData])

  const { data: studentsData, loading: studentsLoading, execute: reloadStudents } = useFetch(
    fetchStudents,
    [classData],
    !!(classData?.id)
  )

  const students = Array.isArray(studentsData) ? studentsData : studentsData?.students || []

  useEffect(() => {
    if (isOpen) setActiveTab('info')
  }, [isOpen])

  if (!classData) return null

  const tabs = [
    { key: 'info', label: 'Thông tin' },
    { key: 'students', label: `Học sinh (${students.length})` },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Chi tiết lớp học" size="xl">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4 -mt-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">{classData.name}</h3>
            <StatusBadge status={classData.status || 'active'} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700">
                Giáo viên: {classData.teacher?.full_name || '—'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700">
                Sĩ số: {classData.student_count ?? students.length ?? 0}
                {classData.max_students ? ` / ${classData.max_students}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700">
                Thời gian: {formatDate(classData.start_date) || '—'}
                {classData.end_date ? ` — ${formatDate(classData.end_date)}` : ''}
              </span>
            </div>
          </div>

          {classData.description && (
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-gray-400" />
                <p className="text-sm font-medium text-gray-600">Mô tả</p>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{classData.description}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'students' && (
        <ClassStudentManager
          classId={classData.id}
          students={students}
          loading={studentsLoading}
          onReload={reloadStudents}
        />
      )}
    </Modal>
  )
}
