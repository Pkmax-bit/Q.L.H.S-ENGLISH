import { useState, useContext, useCallback } from 'react'
import { UserPlus, UserMinus, Search, Clock, CheckCircle, XCircle } from 'lucide-react'
import Button from '../common/Button'
import LoadingSpinner from '../common/LoadingSpinner'
import ConfirmDialog from '../common/ConfirmDialog'
import { ToastContext } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../hooks/useAuth'
import classesService from '../../services/classes.service'
import studentsService from '../../services/students.service'
import enrollmentRequestsService from '../../services/enrollmentRequests.service'

export default function ClassStudentManager({ classId, students = [], loading, onReload, readOnly = false }) {
  const [searchMode, setSearchMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [showRemove, setShowRemove] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [removing, setRemoving] = useState(false)
  const [requestNote, setRequestNote] = useState('')
  const { success, error: showError } = useContext(ToastContext)
  const debouncedSearch = useDebounce(searchQuery, 300)
  const { user } = useAuth()

  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher'

  const fetchAllStudents = useCallback(() => {
    if (readOnly) return Promise.resolve({ data: [] })
    return studentsService.getAll()
  }, [readOnly])
  const { data: allStudentsData } = useFetch(fetchAllStudents)
  const allStudents = Array.isArray(allStudentsData) ? allStudentsData : allStudentsData?.students || []

  // Fetch pending requests for this class (teacher sees own, admin sees all)
  const fetchPendingRequests = useCallback(() => {
    if (readOnly || (!isAdmin && !isTeacher)) return Promise.resolve({ data: [] })
    return enrollmentRequestsService.getAll({ class_id: classId, status: 'pending' })
  }, [classId, readOnly, isAdmin, isTeacher])
  const { data: pendingData, execute: reloadPending } = useFetch(fetchPendingRequests)
  const pendingRequests = Array.isArray(pendingData) ? pendingData : pendingData?.requests || []

  const studentIds = students.map((s) => s.id)
  const pendingStudentIds = pendingRequests.map((r) => r.student_id)

  const filteredAvailable = allStudents.filter((s) => {
    const id = s.id
    if (studentIds.includes(id)) return false
    if (pendingStudentIds.includes(id)) return false
    if (!debouncedSearch) return true
    const q = debouncedSearch.toLowerCase()
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.includes(q)
    )
  })

  const handleAdd = async (student) => {
    setAdding(true)
    try {
      if (isAdmin) {
        // Admin adds directly
        await classesService.addStudent(classId, student.id)
        success(`Đã thêm học sinh "${student.full_name}" vào lớp`)
        onReload()
      } else if (isTeacher) {
        // Teacher creates enrollment request
        await enrollmentRequestsService.create({
          class_id: classId,
          student_id: student.id,
          note: requestNote || undefined,
        })
        success(`Đã gửi yêu cầu thêm "${student.full_name}" vào lớp. Chờ admin duyệt.`)
        reloadPending()
        setRequestNote('')
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Thao tác thất bại')
    } finally {
      setAdding(false)
    }
  }

  const handleCancelRequest = async (requestId, studentName) => {
    try {
      await enrollmentRequestsService.cancel(requestId)
      success(`Đã hủy yêu cầu thêm "${studentName}"`)
      reloadPending()
    } catch (err) {
      showError(err.response?.data?.message || 'Hủy yêu cầu thất bại')
    }
  }

  const handleRemoveClick = (student) => {
    setSelectedStudent(student)
    setShowRemove(true)
  }

  const confirmRemove = async () => {
    setRemoving(true)
    try {
      await classesService.removeStudent(classId, selectedStudent.id)
      success(`Đã xóa học sinh "${selectedStudent.full_name}" khỏi lớp`)
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
        {!readOnly && (
          <Button
            size="sm"
            icon={UserPlus}
            onClick={() => setSearchMode(!searchMode)}
            variant={searchMode ? 'secondary' : 'primary'}
          >
            {searchMode ? 'Đóng' : isTeacher ? 'Đề xuất thêm HS' : 'Thêm học sinh'}
          </Button>
        )}
      </div>

      {/* Search to add */}
      {!readOnly && searchMode && (
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
          {isTeacher && (
            <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                Yêu cầu thêm học sinh sẽ cần admin duyệt trước khi có hiệu lực
              </p>
            </div>
          )}

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

          {/* Note input for teacher */}
          {isTeacher && (
            <div className="mb-3">
              <input
                type="text"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="Ghi chú cho admin (tùy chọn)..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredAvailable.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">Không tìm thấy học sinh</p>
            ) : (
              filteredAvailable.slice(0, 20).map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-white"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-700">{student.full_name}</p>
                    <p className="text-xs text-gray-500">{student.email || student.phone || ''}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={isTeacher ? 'warning' : 'success'}
                    icon={isTeacher ? Clock : UserPlus}
                    onClick={() => handleAdd(student)}
                    loading={adding}
                  >
                    {isTeacher ? 'Đề xuất' : 'Thêm'}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Pending requests section */}
      {!readOnly && pendingRequests.length > 0 && (
        <div className="border border-amber-200 rounded-lg bg-amber-50/50">
          <div className="px-3 py-2 border-b border-amber-200 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <h4 className="text-sm font-semibold text-amber-700">
              Đang chờ duyệt ({pendingRequests.length})
            </h4>
          </div>
          <div className="p-2 space-y-1">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-amber-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{req.student_name}</p>
                    <p className="text-xs text-gray-500">
                      {req.student_email || req.student_phone || ''}
                      {req.note && <span className="ml-1 text-amber-600">• {req.note}</span>}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Đề xuất bởi: {req.requester_name || 'Giáo viên'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleCancelRequest(req.id, req.student_name)}
                  className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                  title="Hủy yêu cầu"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            ))}
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
              key={student.id || idx}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                  {idx + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{student.full_name}</p>
                  <p className="text-xs text-gray-500">{student.email || student.phone || ''}</p>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleRemoveClick(student)}
                  className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                  title="Xóa khỏi lớp"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <ConfirmDialog
          isOpen={showRemove}
          onClose={() => { setShowRemove(false); setSelectedStudent(null) }}
          onConfirm={confirmRemove}
          loading={removing}
          title="Xóa học sinh khỏi lớp"
          message={`Bạn có chắc chắn muốn xóa học sinh "${selectedStudent?.full_name}" khỏi lớp?`}
        />
      )}
    </div>
  )
}
