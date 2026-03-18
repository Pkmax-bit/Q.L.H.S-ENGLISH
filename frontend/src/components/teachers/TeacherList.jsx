import { useState, useContext, useCallback } from 'react'
import { Plus, Download } from 'lucide-react'
import Table from '../common/Table'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import ConfirmDialog from '../common/ConfirmDialog'
import TeacherForm from './TeacherForm'
import TeacherDetail from './TeacherDetail'
import { useFetch } from '../../hooks/useFetch'
import { useExcelExport } from '../../hooks/useExcelExport'
import { ToastContext } from '../../context/ToastContext'
import teachersService from '../../services/teachers.service'
import { formatDate } from '../../utils/formatDate'

export default function TeacherList() {
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const { exportToExcel } = useExcelExport()

  const fetchTeachers = useCallback(() => teachersService.getAll(), [])
  const { data: teachers, loading, execute: reload } = useFetch(fetchTeachers)

  const teacherList = Array.isArray(teachers) ? teachers : teachers?.teachers || []

  const columns = [
    { key: 'name', label: 'Họ tên' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Số điện thoại' },
    { key: 'specialization', label: 'Chuyên môn' },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => <StatusBadge status={row.status || 'active'} />,
    },
    {
      key: 'createdAt',
      label: 'Ngày tạo',
      accessor: (row) => formatDate(row.createdAt),
    },
  ]

  const handleEdit = (teacher) => {
    setSelected(teacher)
    setShowForm(true)
  }

  const handleDelete = (teacher) => {
    setSelected(teacher)
    setShowDelete(true)
  }

  const handleView = (teacher) => {
    setSelected(teacher)
    setShowDetail(true)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await teachersService.delete(selected._id || selected.id)
      success('Xóa giáo viên thành công')
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa giáo viên thất bại')
    } finally {
      setDeleting(false)
      setShowDelete(false)
      setSelected(null)
    }
  }

  const handleExport = () => {
    const exportCols = [
      { key: 'name', header: 'Họ tên' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Số điện thoại' },
      { key: 'specialization', header: 'Chuyên môn' },
      { key: 'status', header: 'Trạng thái' },
    ]
    exportToExcel(teacherList, exportCols, 'danh-sach-giao-vien')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Giáo viên</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý danh sách giáo viên</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={Download} onClick={handleExport}>
            Xuất Excel
          </Button>
          <Button icon={Plus} onClick={() => { setSelected(null); setShowForm(true) }}>
            Thêm giáo viên
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={teacherList}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        searchPlaceholder="Tìm giáo viên..."
        emptyMessage="Chưa có giáo viên nào"
      />

      <TeacherForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setSelected(null) }}
        teacher={selected}
        onSuccess={() => { setShowForm(false); setSelected(null); reload() }}
      />

      <TeacherDetail
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelected(null) }}
        teacher={selected}
      />

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => { setShowDelete(false); setSelected(null) }}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Xóa giáo viên"
        message={`Bạn có chắc chắn muốn xóa giáo viên "${selected?.name}"? Hành động này không thể hoàn tác.`}
      />
    </div>
  )
}
