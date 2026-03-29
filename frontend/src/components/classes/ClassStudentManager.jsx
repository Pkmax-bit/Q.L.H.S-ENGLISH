import { useState, useContext, useCallback } from 'react'
import { UserPlus, UserMinus, Search, Clock, XCircle, CheckSquare, Square, Trash2, Users } from 'lucide-react'
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
  const [searchStudentList, setSearchStudentList] = useState('')
  const [adding, setAdding] = useState(false)
  const [showRemove, setShowRemove] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [requestNote, setRequestNote] = useState('')

  // Multi-select states
  const [selectedToAdd, setSelectedToAdd] = useState(new Set())
  const [selectedToRemove, setSelectedToRemove] = useState(new Set())

  const { success, error: showError } = useContext(ToastContext)
  const debouncedSearch = useDebounce(searchQuery, 300)
  const debouncedStudentSearch = useDebounce(searchStudentList, 300)
  const { user } = useAuth()

  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher'

  const fetchAllStudents = useCallback(() => {
    if (readOnly) return Promise.resolve({ data: [] })
    return studentsService.getAll()
  }, [readOnly])
  const { data: allStudentsData } = useFetch(fetchAllStudents)
  const allStudents = Array.isArray(allStudentsData) ? allStudentsData : allStudentsData?.students || []

  // Fetch pending requests
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

  // Filter current students list
  const filteredStudents = students.filter((s) => {
    if (!debouncedStudentSearch) return true
    const q = debouncedStudentSearch.toLowerCase()
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.includes(q)
    )
  })

  // Toggle select for adding
  const toggleAddSelect = (studentId) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const selectAllAvailable = () => {
    const visible = filteredAvailable.slice(0, 50)
    if (selectedToAdd.size === visible.length) {
      setSelectedToAdd(new Set())
    } else {
      setSelectedToAdd(new Set(visible.map((s) => s.id)))
    }
  }

  // Toggle select for removing
  const toggleRemoveSelect = (studentId) => {
    setSelectedToRemove((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const selectAllStudents = () => {
    if (selectedToRemove.size === filteredStudents.length) {
      setSelectedToRemove(new Set())
    } else {
      setSelectedToRemove(new Set(filteredStudents.map((s) => s.id)))
    }
  }

  // Batch add
  const handleBatchAdd = async () => {
    if (selectedToAdd.size === 0) return
    setAdding(true)
    try {
      if (isAdmin) {
        const ids = Array.from(selectedToAdd)
        const result = await classesService.addStudentsBatch(classId, ids)
        const data = result.data || result
        let msg = `Đã thêm ${data.added || ids.length} học sinh vào lớp`
        if (data.skipped > 0) msg += ` (${data.skipped} đã có sẵn)`
        if (data.capacityExceeded > 0) msg += ` (${data.capacityExceeded} vượt sĩ số)`
        success(msg)
        onReload()
      } else if (isTeacher) {
        const ids = Array.from(selectedToAdd)
        let count = 0
        for (const sid of ids) {
          try {
            await enrollmentRequestsService.create({
              class_id: classId,
              student_id: sid,
              note: requestNote || undefined,
            })
            count++
          } catch (_) { /* skip errors */ }
        }
        success(`Đã gửi ${count} yêu cầu thêm học sinh. Chờ admin duyệt.`)
        reloadPending()
        setRequestNote('')
      }
      setSelectedToAdd(new Set())
    } catch (err) {
      showError(err.response?.data?.message || 'Thao tác thất bại')
    } finally {
      setAdding(false)
    }
  }

  // Single add (click directly)
  const handleAdd = async (student) => {
    setAdding(true)
    try {
      if (isAdmin) {
        await classesService.addStudent(classId, student.id)
        success(`Đã thêm "${student.full_name}" vào lớp`)
        onReload()
      } else if (isTeacher) {
        await enrollmentRequestsService.create({
          class_id: classId,
          student_id: student.id,
          note: requestNote || undefined,
        })
        success(`Đã gửi yêu cầu thêm "${student.full_name}". Chờ admin duyệt.`)
        reloadPending()
        setRequestNote('')
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Thao tác thất bại')
    } finally {
      setAdding(false)
    }
  }

  // Batch remove
  const confirmBatchRemove = async () => {
    setRemoving(true)
    try {
      const ids = Array.from(selectedToRemove)
      const result = await classesService.removeStudentsBatch(classId, ids)
      const data = result.data || result
      success(`Đã xóa ${data.removed || ids.length} học sinh khỏi lớp`)
      setSelectedToRemove(new Set())
      onReload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa học sinh thất bại')
    } finally {
      setRemoving(false)
      setShowRemove(false)
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

  if (loading) return <LoadingSpinner />

  const visibleAvailable = filteredAvailable.slice(0, 50)
  const allVisibleSelected = visibleAvailable.length > 0 && selectedToAdd.size === visibleAvailable.length
  const allStudentsSelected = filteredStudents.length > 0 && selectedToRemove.size === filteredStudents.length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-sm font-semibold text-gray-700">
          Danh sách học sinh ({students.length})
        </h4>
        <div className="flex gap-2">
          {!readOnly && isAdmin && selectedToRemove.size > 0 && (
            <Button
              size="sm"
              variant="danger"
              icon={Trash2}
              onClick={() => setShowRemove(true)}
            >
              Xóa {selectedToRemove.size} học sinh
            </Button>
          )}
          {!readOnly && (
            <Button
              size="sm"
              icon={UserPlus}
              onClick={() => { setSearchMode(!searchMode); setSelectedToAdd(new Set()) }}
              variant={searchMode ? 'secondary' : 'primary'}
            >
              {searchMode ? 'Đóng' : isTeacher ? 'Đề xuất thêm HS' : 'Thêm học sinh'}
            </Button>
          )}
        </div>
      </div>

      {/* Search & Add section */}
      {!readOnly && searchMode && (
        <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/30">
          {isTeacher && (
            <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                Yêu cầu thêm học sinh sẽ cần admin duyệt trước khi có hiệu lực
              </p>
            </div>
          )}

          {/* Search input */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm học sinh theo tên, email, SĐT..."
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

          {/* Select all + batch add button */}
          {visibleAvailable.length > 0 && (
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                onClick={selectAllAvailable}
                className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-blue-600 transition-colors"
              >
                {allVisibleSelected ? (
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {allVisibleSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${visibleAvailable.length})`}
              </button>
              {selectedToAdd.size > 0 && (
                <Button
                  size="sm"
                  variant="success"
                  icon={Users}
                  onClick={handleBatchAdd}
                  loading={adding}
                >
                  {isTeacher ? `Đề xuất ${selectedToAdd.size} HS` : `Thêm ${selectedToAdd.size} học sinh`}
                </Button>
              )}
            </div>
          )}

          {/* Available students list */}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {visibleAvailable.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">Không tìm thấy học sinh</p>
            ) : (
              visibleAvailable.map((student) => {
                const isSelected = selectedToAdd.has(student.id)
                return (
                  <div
                    key={student.id}
                    onClick={() => toggleAddSelect(student.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-100 border border-blue-300'
                        : 'bg-white hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-700">{student.full_name}</p>
                        <p className="text-xs text-gray-500">{student.email || student.phone || ''}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isTeacher ? 'warning' : 'success'}
                      icon={isTeacher ? Clock : UserPlus}
                      onClick={(e) => { e.stopPropagation(); handleAdd(student) }}
                      loading={adding}
                    >
                      {isTeacher ? 'Đề xuất' : 'Thêm'}
                    </Button>
                  </div>
                )
              })
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

      {/* Current student list with search & multi-select */}
      {students.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Lớp chưa có học sinh nào</p>
      ) : (
        <div className="space-y-2">
          {/* Search current students */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchStudentList}
              onChange={(e) => setSearchStudentList(e.target.value)}
              placeholder="Tìm trong danh sách học sinh..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Select all for remove */}
          {isAdmin && filteredStudents.length > 0 && (
            <div className="flex items-center px-1">
              <button
                onClick={selectAllStudents}
                className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-blue-600 transition-colors"
              >
                {allStudentsSelected ? (
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {allStudentsSelected ? 'Bỏ chọn tất cả' : `Chọn tất cả (${filteredStudents.length})`}
              </button>
            </div>
          )}

          {/* Student rows */}
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">Không tìm thấy học sinh</p>
            ) : (
              filteredStudents.map((student, idx) => {
                const isSelected = selectedToRemove.has(student.id)
                const originalIdx = students.indexOf(student)
                return (
                  <div
                    key={student.id || idx}
                    onClick={() => isAdmin && toggleRemoveSelect(student.id)}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      isAdmin ? 'cursor-pointer' : ''
                    } ${
                      isSelected
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isAdmin && (
                        isSelected ? (
                          <CheckSquare className="h-4 w-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )
                      )}
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                        {originalIdx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">{student.full_name}</p>
                        <p className="text-xs text-gray-500">{student.email || student.phone || ''}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedToRemove(new Set([student.id]))
                          setShowRemove(true)
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                        title="Xóa khỏi lớp"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Confirm batch remove */}
      {isAdmin && (
        <ConfirmDialog
          isOpen={showRemove}
          onClose={() => { setShowRemove(false) }}
          onConfirm={confirmBatchRemove}
          loading={removing}
          title="Xóa học sinh khỏi lớp"
          message={`Bạn có chắc chắn muốn xóa ${selectedToRemove.size} học sinh khỏi lớp?`}
        />
      )}
    </div>
  )
}
