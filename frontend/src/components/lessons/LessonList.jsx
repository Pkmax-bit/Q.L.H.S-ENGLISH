import { useState, useContext, useCallback } from 'react'
import { Plus, Download } from 'lucide-react'
import Table from '../common/Table'
import Button from '../common/Button'
import ConfirmDialog from '../common/ConfirmDialog'
import LessonForm from './LessonForm'
import LessonDetail from './LessonDetail'
import { useFetch } from '../../hooks/useFetch'
import { useExcelExport } from '../../hooks/useExcelExport'
import { ToastContext } from '../../context/ToastContext'
import lessonsService from '../../services/lessons.service'
import { formatDate } from '../../utils/formatDate'

export default function LessonList() {
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const { exportToExcel } = useExcelExport()

  const fetchLessons = useCallback(() => lessonsService.getAll(), [])
  const { data: lessons, loading, execute: reload } = useFetch(fetchLessons)

  const lessonList = Array.isArray(lessons) ? lessons : lessons?.lessons || []

  const columns = [
    { key: 'title', label: 'Tiêu đề' },
    {
      key: 'subject',
      label: 'Môn học',
      accessor: (row) => row.subject?.name || row.subjectName || '—',
    },
    { key: 'order_index', label: 'Thứ tự', accessor: (row) => row.order_index ?? row.orderIndex ?? '—' },
    {
      key: 'createdAt',
      label: 'Ngày tạo',
      accessor: (row) => formatDate(row.createdAt),
    },
  ]

  const handleEdit = (lesson) => { setSelected(lesson); setShowForm(true) }
  const handleDelete = (lesson) => { setSelected(lesson); setShowDelete(true) }
  const handleView = (lesson) => { setSelected(lesson); setShowDetail(true) }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await lessonsService.delete(selected._id || selected.id)
      success('Xóa bài học thành công')
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa bài học thất bại')
    } finally {
      setDeleting(false)
      setShowDelete(false)
      setSelected(null)
    }
  }

  const handleExport = () => {
    const exportCols = [
      { key: 'title', header: 'Tiêu đề' },
      { key: 'subject', header: 'Môn học', accessor: (r) => r.subject?.name || '' },
      { key: 'order_index', header: 'Thứ tự' },
    ]
    exportToExcel(lessonList, exportCols, 'danh-sach-bai-hoc')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bài học</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý danh sách bài học</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={Download} onClick={handleExport}>
            Xuất Excel
          </Button>
          <Button icon={Plus} onClick={() => { setSelected(null); setShowForm(true) }}>
            Thêm bài học
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={lessonList}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        searchPlaceholder="Tìm bài học..."
        emptyMessage="Chưa có bài học nào"
      />

      <LessonForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setSelected(null) }}
        lesson={selected}
        onSuccess={() => { setShowForm(false); setSelected(null); reload() }}
      />

      <LessonDetail
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelected(null) }}
        lesson={selected}
      />

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => { setShowDelete(false); setSelected(null) }}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Xóa bài học"
        message={`Bạn có chắc chắn muốn xóa bài học "${selected?.title}"?`}
      />
    </div>
  )
}
