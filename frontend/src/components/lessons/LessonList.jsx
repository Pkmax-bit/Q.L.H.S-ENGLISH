import { useState, useContext, useCallback } from 'react'
import { Plus, Download, BookCopy } from 'lucide-react'
import Table from '../common/Table'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import ConfirmDialog from '../common/ConfirmDialog'
import LessonForm from './LessonForm'
import LessonDetail from './LessonDetail'
import { useFetch } from '../../hooks/useFetch'
import { useExcelExport } from '../../hooks/useExcelExport'
import { useAuth } from '../../hooks/useAuth'
import { ToastContext } from '../../context/ToastContext'
import lessonsService from '../../services/lessons.service'
import templatesService from '../../services/templates.service'
import { formatDate } from '../../utils/formatDate'

const contentTypeMap = {
  text: 'Văn bản',
  video: 'Video',
  file: 'Tệp tin',
}

export default function LessonList() {
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const { exportToExcel } = useExcelExport()
  const { user } = useAuth()

  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher'

  const fetchLessons = useCallback(() => lessonsService.getAll(), [])
  const { data: lessons, loading, execute: reload } = useFetch(fetchLessons)

  const lessonList = Array.isArray(lessons) ? lessons : lessons?.lessons || []

  const columns = [
    { key: 'title', label: 'Tiêu đề' },
    {
      key: 'class',
      label: 'Lớp học',
      accessor: (row) => row.class?.name || row.class_name || '—',
    },
    {
      key: 'content_type',
      label: 'Loại nội dung',
      accessor: (row) => contentTypeMap[row.content_type] || row.content_type || '—',
    },
    { key: 'order_index', label: 'Thứ tự', accessor: (row) => row.order_index ?? '—' },
    {
      key: 'is_published',
      label: 'Trạng thái',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge
            status={row.is_published ? 'active' : 'inactive'}
            label={row.is_published ? 'Đã xuất bản' : 'Nháp'}
          />
          {row.is_template && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Mẫu</span>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Ngày tạo',
      accessor: (row) => formatDate(row.created_at),
    },
  ]

  const handleEdit = (lesson) => { setSelected(lesson); setShowForm(true) }
  const handleDelete = (lesson) => { setSelected(lesson); setShowDelete(true) }
  const handleView = (lesson) => { setSelected(lesson); setShowDetail(true) }

  const toggleTemplate = async (lesson) => {
    setToggling(true)
    try {
      const fn = lesson.is_template ? templatesService.unmarkTemplate : templatesService.markAsTemplate
      await fn({ type: 'lesson', ids: [lesson.id] })
      success(lesson.is_template ? 'Đã bỏ đánh dấu mẫu' : 'Đã đánh dấu làm mẫu')
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally { setToggling(false) }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await lessonsService.delete(selected.id)
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
      { key: 'class', header: 'Lớp học', accessor: (r) => r.class?.name || r.class_name || '' },
      { key: 'content_type', header: 'Loại nội dung', accessor: (r) => contentTypeMap[r.content_type] || '' },
      { key: 'order_index', header: 'Thứ tự' },
      { key: 'is_published', header: 'Xuất bản', accessor: (r) => r.is_published ? 'Có' : 'Không' },
    ]
    exportToExcel(lessonList, exportCols, 'danh-sach-bai-hoc')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bài học</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isTeacher ? 'Bài học các lớp bạn phụ trách' : 'Quản lý danh sách bài học'}
          </p>
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
        onDelete={isAdmin ? handleDelete : undefined}
        onView={handleView}
        actions={isAdmin ? (row) => (
          <button
            onClick={() => toggleTemplate(row)}
            disabled={toggling}
            className={`p-1 rounded-lg transition-colors ${
              row.is_template
                ? 'text-blue-600 hover:bg-blue-50'
                : 'text-gray-400 hover:bg-gray-100 hover:text-blue-500'
            }`}
            title={row.is_template ? 'Bỏ đánh dấu mẫu' : 'Đánh dấu làm mẫu'}
          >
            <BookCopy className="h-4 w-4" />
          </button>
        ) : undefined}
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

      {isAdmin && (
        <ConfirmDialog
          isOpen={showDelete}
          onClose={() => { setShowDelete(false); setSelected(null) }}
          onConfirm={confirmDelete}
          loading={deleting}
          title="Xóa bài học"
          message={`Bạn có chắc chắn muốn xóa bài học "${selected?.title}"?`}
        />
      )}
    </div>
  )
}
