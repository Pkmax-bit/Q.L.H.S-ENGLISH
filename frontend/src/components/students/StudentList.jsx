import { useState, useContext, useCallback } from 'react'
import { Plus, Download } from 'lucide-react'
import Table from '../common/Table'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import ConfirmDialog from '../common/ConfirmDialog'
import StudentForm from './StudentForm'
import StudentDetail from './StudentDetail'
import { useFetch } from '../../hooks/useFetch'
import { useExcelExport } from '../../hooks/useExcelExport'
import { ToastContext } from '../../context/ToastContext'
import studentsService from '../../services/students.service'
import { formatDate } from '../../utils/formatDate'

export default function StudentList() {
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const { exportToExcel } = useExcelExport()

  const fetchStudents = useCallback(() => studentsService.getAll(), [])
  const { data: students, loading, execute: reload } = useFetch(fetchStudents)

  const studentList = Array.isArray(students) ? students : students?.students || []

  const columns = [
    { key: 'name', label: 'Họ tên' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Số điện thoại' },
    { key: 'dateOfBirth', label: 'Ngày sinh', accessor: (row) => formatDate(row.dateOfBirth) },
    { key: 'parentName', label: 'Phụ huynh' },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => <StatusBadge status={row.status || 'active'} />,
    },
  ]

  const handleEdit = (student) => { setSelected(student); setShowForm(true) }
  const handleDelete = (student) => { setSelected(student); setShowDelete(true) }
  const handleView = (student) => { setSelected(student); setShowDetail(true) }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await studentsService.delete(selected._id || selected.id)
      success('Xóa học sinh thành công')
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa học sinh thất bại')
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
      { key: 'dateOfBirth', header: 'Ngày sinh', accessor: (r) => formatDate(r.dateOfBirth) },
      { key: 'parentName', header: 'Phụ huynh' },
      { key: 'status', header: 'Trạng thái' },
    ]
    exportToExcel(studentList, exportCols, 'danh-sach-hoc-sinh')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Học sinh</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý danh sách học sinh</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={Download} onClick={handleExport}>Xuất Excel</Button>
          <Button icon={Plus} onClick={() => { setSelected(null); setShowForm(true) }}>Thêm học sinh</Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={studentList}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        searchPlaceholder="Tìm học sinh..."
        emptyMessage="Chưa có học sinh nào"
      />

      <StudentForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setSelected(null) }}
        student={selected}
        onSuccess={() => { setShowForm(false); setSelected(null); reload() }}
      />

      <StudentDetail
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelected(null) }}
        student={selected}
      />

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => { setShowDelete(false); setSelected(null) }}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Xóa học sinh"
        message={`Bạn có chắc chắn muốn xóa học sinh "${selected?.name}"?`}
      />
    </div>
  )
}
