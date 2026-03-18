import { useState, useContext, useCallback } from 'react'
import { Plus, Download } from 'lucide-react'
import Table from '../common/Table'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import ConfirmDialog from '../common/ConfirmDialog'
import ClassForm from './ClassForm'
import ClassDetail from './ClassDetail'
import { useFetch } from '../../hooks/useFetch'
import { useExcelExport } from '../../hooks/useExcelExport'
import { ToastContext } from '../../context/ToastContext'
import classesService from '../../services/classes.service'
import { formatDate } from '../../utils/formatDate'

export default function ClassList() {
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const { exportToExcel } = useExcelExport()

  const fetchClasses = useCallback(() => classesService.getAll(), [])
  const { data: classes, loading, execute: reload } = useFetch(fetchClasses)

  const classList = Array.isArray(classes) ? classes : classes?.classes || []

  const columns = [
    { key: 'name', label: 'Tên lớp' },
    { key: 'subject', label: 'Môn học', accessor: (row) => row.subject?.name || row.subjectName || '—' },
    { key: 'teacher', label: 'Giáo viên', accessor: (row) => row.teacher?.name || row.teacherName || '—' },
    { key: 'studentCount', label: 'Sĩ số', accessor: (row) => row.studentCount ?? row.students?.length ?? 0 },
    { key: 'startDate', label: 'Ngày bắt đầu', accessor: (row) => formatDate(row.startDate) },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => <StatusBadge status={row.status || 'active'} />,
    },
  ]

  const handleEdit = (cls) => { setSelected(cls); setShowForm(true) }
  const handleDelete = (cls) => { setSelected(cls); setShowDelete(true) }
  const handleView = (cls) => { setSelected(cls); setShowDetail(true) }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await classesService.delete(selected._id || selected.id)
      success('Xóa lớp học thành công')
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa lớp học thất bại')
    } finally {
      setDeleting(false)
      setShowDelete(false)
      setSelected(null)
    }
  }

  const handleExport = () => {
    const exportCols = [
      { key: 'name', header: 'Tên lớp' },
      { key: 'subject', header: 'Môn học', accessor: (r) => r.subject?.name || '' },
      { key: 'teacher', header: 'Giáo viên', accessor: (r) => r.teacher?.name || '' },
      { key: 'studentCount', header: 'Sĩ số', accessor: (r) => r.studentCount ?? 0 },
      { key: 'status', header: 'Trạng thái' },
    ]
    exportToExcel(classList, exportCols, 'danh-sach-lop-hoc')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lớp học</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý danh sách lớp học</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={Download} onClick={handleExport}>Xuất Excel</Button>
          <Button icon={Plus} onClick={() => { setSelected(null); setShowForm(true) }}>Thêm lớp học</Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={classList}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        searchPlaceholder="Tìm lớp học..."
        emptyMessage="Chưa có lớp học nào"
      />

      <ClassForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setSelected(null) }}
        classData={selected}
        onSuccess={() => { setShowForm(false); setSelected(null); reload() }}
      />

      <ClassDetail
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelected(null) }}
        classData={selected}
      />

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => { setShowDelete(false); setSelected(null) }}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Xóa lớp học"
        message={`Bạn có chắc chắn muốn xóa lớp học "${selected?.name}"?`}
      />
    </div>
  )
}
