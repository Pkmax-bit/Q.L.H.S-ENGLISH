import { useState, useContext, useCallback } from 'react'
import { Plus } from 'lucide-react'
import Table from '../common/Table'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import ConfirmDialog from '../common/ConfirmDialog'
import SubjectForm from './SubjectForm'
import { useFetch } from '../../hooks/useFetch'
import { ToastContext } from '../../context/ToastContext'
import subjectsService from '../../services/subjects.service'

export default function SubjectList() {
  const [showForm, setShowForm] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { success, error: showError } = useContext(ToastContext)

  const fetchSubjects = useCallback(() => subjectsService.getAll(), [])
  const { data: subjects, loading, execute: reload } = useFetch(fetchSubjects)

  const subjectList = Array.isArray(subjects) ? subjects : subjects?.subjects || []

  const columns = [
    { key: 'name', label: 'Tên môn học' },
    { key: 'code', label: 'Mã môn' },
    { key: 'description', label: 'Mô tả' },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => <StatusBadge status={row.status || 'active'} />,
    },
  ]

  const handleEdit = (subject) => { setSelected(subject); setShowForm(true) }
  const handleDelete = (subject) => { setSelected(subject); setShowDelete(true) }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await subjectsService.delete(selected._id || selected.id)
      success('Xóa môn học thành công')
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa môn học thất bại')
    } finally {
      setDeleting(false)
      setShowDelete(false)
      setSelected(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Môn học</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý danh sách môn học</p>
        </div>
        <Button icon={Plus} onClick={() => { setSelected(null); setShowForm(true) }}>Thêm môn học</Button>
      </div>

      <Table
        columns={columns}
        data={subjectList}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchPlaceholder="Tìm môn học..."
        emptyMessage="Chưa có môn học nào"
      />

      <SubjectForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setSelected(null) }}
        subject={selected}
        onSuccess={() => { setShowForm(false); setSelected(null); reload() }}
      />

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => { setShowDelete(false); setSelected(null) }}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Xóa môn học"
        message={`Bạn có chắc chắn muốn xóa môn học "${selected?.name}"?`}
      />
    </div>
  )
}
