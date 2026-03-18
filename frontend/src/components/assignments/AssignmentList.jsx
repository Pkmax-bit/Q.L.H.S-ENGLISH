import { useState, useContext, useCallback } from 'react'
import { Plus, Download } from 'lucide-react'
import Table from '../common/Table'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import ConfirmDialog from '../common/ConfirmDialog'
import AssignmentForm from './AssignmentForm'
import AssignmentDetail from './AssignmentDetail'
import { useFetch } from '../../hooks/useFetch'
import { useExcelExport } from '../../hooks/useExcelExport'
import { ToastContext } from '../../context/ToastContext'
import assignmentsService from '../../services/assignments.service'
import { formatDate } from '../../utils/formatDate'

const typeBadgeMap = {
  essay: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Tự luận' },
  multiple_choice: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Trắc nghiệm' },
  mixed: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Hỗn hợp' },
}

function TypeBadge({ type }) {
  const style = typeBadgeMap[type] || typeBadgeMap.essay
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  )
}

export default function AssignmentList() {
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const { exportToExcel } = useExcelExport()

  const fetchAssignments = useCallback(() => assignmentsService.getAll(), [])
  const { data: assignments, loading, execute: reload } = useFetch(fetchAssignments)

  const assignmentList = Array.isArray(assignments) ? assignments : assignments?.assignments || []

  const columns = [
    { key: 'title', label: 'Tiêu đề' },
    {
      key: 'class',
      label: 'Lớp học',
      accessor: (row) => row.class?.name || '—',
    },
    {
      key: 'assignment_type',
      label: 'Loại',
      render: (row) => <TypeBadge type={row.assignment_type} />,
    },
    {
      key: 'total_points',
      label: 'Tổng điểm',
      accessor: (row) => row.total_points ?? '—',
    },
    {
      key: 'due_date',
      label: 'Hạn nộp',
      accessor: (row) => formatDate(row.due_date) || '—',
    },
    {
      key: 'is_published',
      label: 'Xuất bản',
      render: (row) => (
        <StatusBadge
          status={row.is_published ? 'active' : 'inactive'}
          label={row.is_published ? 'Đã xuất bản' : 'Nháp'}
        />
      ),
    },
  ]

  const handleEdit = (item) => { setSelected(item); setShowForm(true) }
  const handleDelete = (item) => { setSelected(item); setShowDelete(true) }
  const handleView = (item) => { setSelected(item); setShowDetail(true) }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await assignmentsService.delete(selected.id)
      success('Xóa bài tập thành công')
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa bài tập thất bại')
    } finally {
      setDeleting(false)
      setShowDelete(false)
      setSelected(null)
    }
  }

  const handleExport = () => {
    const exportCols = [
      { key: 'title', header: 'Tiêu đề' },
      { key: 'class', header: 'Lớp học', accessor: (r) => r.class?.name || '' },
      { key: 'assignment_type', header: 'Loại' },
      { key: 'total_points', header: 'Tổng điểm' },
      { key: 'due_date', header: 'Hạn nộp', accessor: (r) => formatDate(r.due_date) || '' },
    ]
    exportToExcel(assignmentList, exportCols, 'danh-sach-bai-tap')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bài tập</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý bài tập và câu hỏi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={Download} onClick={handleExport}>
            Xuất Excel
          </Button>
          <Button icon={Plus} onClick={() => { setSelected(null); setShowForm(true) }}>
            Thêm bài tập
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={assignmentList}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        searchPlaceholder="Tìm bài tập..."
        emptyMessage="Chưa có bài tập nào"
      />

      <AssignmentForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setSelected(null) }}
        assignment={selected}
        onSuccess={() => { setShowForm(false); setSelected(null); reload() }}
      />

      <AssignmentDetail
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelected(null) }}
        assignment={selected}
      />

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => { setShowDelete(false); setSelected(null) }}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Xóa bài tập"
        message={`Bạn có chắc chắn muốn xóa bài tập "${selected?.title}"?`}
      />
    </div>
  )
}
