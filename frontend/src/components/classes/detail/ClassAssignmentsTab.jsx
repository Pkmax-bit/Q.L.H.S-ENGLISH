import { useState, useContext, useCallback } from 'react'
import { ClipboardList, Clock, Eye, EyeOff, HelpCircle, AlertTriangle, Plus, Pencil, Trash2 } from 'lucide-react'
import Button from '../../common/Button'
import ConfirmDialog from '../../common/ConfirmDialog'
import AssignmentDetail from '../../assignments/AssignmentDetail'
import AssignmentForm from '../../assignments/AssignmentForm'
import { ToastContext } from '../../../context/ToastContext'
import { useAuth } from '../../../hooks/useAuth'
import { useFetch } from '../../../hooks/useFetch'
import assignmentsService from '../../../services/assignments.service'
import { formatDate } from '../../../utils/formatDate'

const TYPE_LABELS = {
  multiple_choice: { label: 'Trắc nghiệm', color: 'bg-blue-100 text-blue-700' },
  essay: { label: 'Tự luận', color: 'bg-amber-100 text-amber-700' },
  mixed: { label: 'Kết hợp', color: 'bg-purple-100 text-purple-700' },
}

export default function ClassAssignmentsTab({ assignments: initialAssignments, classId, onReload }) {
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const { user } = useAuth()

  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher'
  const canManage = isAdmin || isTeacher

  // Fetch assignments for this class (live data)
  const fetchAssignments = useCallback(() => assignmentsService.getAll({ class_id: classId, limit: 200 }), [classId])
  const { data: assignmentsData, loading, execute: reloadAssignments } = useFetch(fetchAssignments)
  const assignments = Array.isArray(assignmentsData) ? assignmentsData : assignmentsData?.assignments || initialAssignments || []

  const handleAdd = () => {
    setSelected(null)
    setShowForm(true)
  }

  const handleEdit = (assignment) => {
    // Fetch full detail with questions for editing
    assignmentsService.getById(assignment.id).then(res => {
      const data = res.data?.data ?? res.data ?? res
      setSelected(data)
      setShowForm(true)
    }).catch(() => {
      setSelected(assignment)
      setShowForm(true)
    })
  }

  const handleView = (assignment) => {
    assignmentsService.getById(assignment.id).then(res => {
      const data = res.data?.data ?? res.data ?? res
      setSelected(data)
      setShowDetail(true)
    }).catch(() => {
      setSelected(assignment)
      setShowDetail(true)
    })
  }

  const handleDeleteClick = (assignment) => {
    setSelected(assignment)
    setShowDelete(true)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await assignmentsService.delete(selected.id)
      success('Xóa bài tập thành công')
      reloadAssignments()
      if (onReload) onReload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa bài tập thất bại')
    } finally {
      setDeleting(false)
      setShowDelete(false)
      setSelected(null)
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setSelected(null)
    reloadAssignments()
    if (onReload) onReload()
  }

  const now = new Date()

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      {canManage && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            Danh sách bài tập ({assignments.length})
          </h3>
          <Button size="sm" icon={Plus} onClick={handleAdd}>
            Thêm bài tập
          </Button>
        </div>
      )}

      {/* Assignments list */}
      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Chưa có bài tập nào</p>
          <p className="text-sm text-gray-400 mt-1">
            {canManage ? 'Nhấn "Thêm bài tập" để tạo bài tập mới' : 'Bài tập sẽ hiển thị ở đây khi được tạo'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {assignments.map((assignment) => {
            const typeInfo = TYPE_LABELS[assignment.assignment_type] || TYPE_LABELS.mixed
            const isOverdue = assignment.due_date && new Date(assignment.due_date) < now
            const isDueSoon = assignment.due_date && !isOverdue && (new Date(assignment.due_date) - now) < 24 * 60 * 60 * 1000

            return (
              <div
                key={assignment.id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors group"
              >
                <div
                  className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleView(assignment)}
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors truncate">
                        {assignment.title}
                      </p>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />
                        {assignment.question_count} câu hỏi
                      </span>
                      <span>{assignment.total_points} điểm</span>
                      {assignment.time_limit_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {assignment.time_limit_minutes} phút
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Due date */}
                  {assignment.due_date && (
                    <span className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 ${
                      isOverdue
                        ? 'bg-red-100 text-red-700'
                        : isDueSoon
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isOverdue && <AlertTriangle className="h-3 w-3" />}
                      {formatDate(assignment.due_date)}
                    </span>
                  )}

                  {/* Published status */}
                  {assignment.is_published ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                      <Eye className="h-3 w-3" />
                      Đã xuất bản
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">
                      <EyeOff className="h-3 w-3" />
                      Nháp
                    </span>
                  )}

                  {/* Action buttons */}
                  {canManage && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(assignment) }}
                        className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(assignment) }}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Assignment Form Modal */}
      {canManage && (
        <AssignmentForm
          isOpen={showForm}
          onClose={() => { setShowForm(false); setSelected(null) }}
          assignment={selected}
          defaultClassId={classId}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Assignment Detail Modal */}
      <AssignmentDetail
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelected(null) }}
        assignment={selected}
      />

      {/* Delete Confirm */}
      {isAdmin && (
        <ConfirmDialog
          isOpen={showDelete}
          onClose={() => { setShowDelete(false); setSelected(null) }}
          onConfirm={confirmDelete}
          loading={deleting}
          title="Xóa bài tập"
          message={`Bạn có chắc chắn muốn xóa bài tập "${selected?.title}"? Tất cả câu hỏi và bài nộp liên quan sẽ bị xóa.`}
        />
      )}
    </div>
  )
}
