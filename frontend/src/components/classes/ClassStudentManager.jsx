import { useState, useContext, useCallback } from 'react'
import { UserPlus, UserMinus, Search } from 'lucide-react'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import ConfirmDialog from '../common/ConfirmDialog'
import { ToastContext } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import { useDebounce } from '../../hooks/useDebounce'
import classesService from '../../services/classes.service'
import studentsService from '../../services/students.service'

export default function ClassStudentManager({ classId, students = [], loading, onReload }) {
  const [searchMode, setSearchMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [showRemove, setShowRemove] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [removing, setRemoving] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const debouncedSearch = useDebounce(searchQuery, 300)

  const fetchAllStudents = useCallback(() => studentsService.getAll(), [])
  const { data: allStudentsData } = useFetch(fetchAllStudents)
  const allStudents = Array.isArray(allStudentsData) ? allStudentsData : allStudentsData?.students || []

  const studentIds = students.map((s) => s._id || s.id)
  const filteredAvailable = allStudents.filter((s) => {
    const id = s._id || s.id
    if (studentIds.includes(id)) return false
    if (!debouncedSearch) return true
    const q = debouncedSearch.toLowerCase()
    return (
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.includes(q)
    )
  })

  const handleAdd = async (student) => {
    setAdding(true)
    try {
      await classesService.addStudent(classId, student._id || student.id)
      success(`Đã thêm học sinh "${student.name}" vào lớp`)
      onReload()
    } catch (err) {
      showError(err.response?.data?.message || 'Thêm học sinh thất bại')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveClick = (student) => {
    setSelectedStudent(student)
    setShowRemove(true)
  }

  const confirmRemove = async () => {
    setRemoving(true)
    try {
      await classesService.removeStudent(classId, selectedStudent._id || selectedStudent.id)
      success(`Đã xóa học sinh "${selectedStudent.name}" khỏi lớp`)
      onReload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa học sinh thất bại')
    } finally {
      setRemoving(false)
      setShowRemove(false)
      setSelectedStudent(null)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      {/* Current students */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">
          Danh sách học sinh ({students.length})
        </h4>
        <Button
          size="sm"
          icon={UserPlus}
          onClick={() => setSearchMode(!searchMode)}
          variant={searchMode ? 'secondary' : 'primary'}
        >
          {searchMode ? 'Đóng' : 'Thêm học sinh'}
        </Button>
      </div>

      {/* Search to add */}
      {searchMode && (
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm học sinh để thêm..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredAvailable.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">Không tìm thấy học sinh</p>
            ) : (
              filteredAvailable.slice(0, 20).map((student) => (
                <div
                  key={student._id || student.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-700">{student.name}</p>
                    <p className="text-xs text-gray-500">{student.email || student.phone || ''}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="success"
                    icon={UserPlus}
                    onClick={() => handleAdd(student)}
                    loading={adding}
                  >
                    Thêm
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Student list */}
      {students.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Lớp chưa có học sinh nào</p>
      ) : (
        <div className="space-y-1">
          {students.map((student, idx) => (
            <div
              key={student._id || student.id || idx}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                  {idx + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{student.name}</p>
                  <p className="text-xs text-gray-500">{student.email || student.phone || ''}</p>
                </div>
              </div>
              <button
                onClick={() => handleRemoveClick(student)}
                className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                title="Xóa khỏi lớp"
              >
                <UserMinus className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={showRemove}
        onClose={() => { setShowRemove(false); setSelectedStudent(null) }}
        onConfirm={confirmRemove}
        loading={removing}
        title="Xóa học sinh khỏi lớp"
        message={`Bạn có chắc chắn muốn xóa học sinh "${selectedStudent?.name}" khỏi lớp?`}
      />
    </div>
  )
}
