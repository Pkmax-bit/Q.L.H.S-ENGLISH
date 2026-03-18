import { useState, useContext, useCallback } from 'react'
import { Plus, Download, Building2 } from 'lucide-react'
import Table from '../common/Table'
import Button from '../common/Button'
import StatusBadge from '../common/StatusBadge'
import ConfirmDialog from '../common/ConfirmDialog'
import FacilityForm from './FacilityForm'
import RoomManager from './RoomManager'
import { useFetch } from '../../hooks/useFetch'
import { useExcelExport } from '../../hooks/useExcelExport'
import { ToastContext } from '../../context/ToastContext'
import facilitiesService from '../../services/facilities.service'

export default function FacilityList() {
  const [showForm, setShowForm] = useState(false)
  const [showRooms, setShowRooms] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const { exportToExcel } = useExcelExport()

  const fetchFacilities = useCallback(() => facilitiesService.getAll(), [])
  const { data: facilities, loading, execute: reload } = useFetch(fetchFacilities)

  const facilityList = Array.isArray(facilities) ? facilities : facilities?.facilities || []

  const columns = [
    { key: 'name', label: 'Tên cơ sở' },
    { key: 'address', label: 'Địa chỉ' },
    { key: 'phone', label: 'Số điện thoại' },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => <StatusBadge status={row.status || 'active'} />,
    },
  ]

  const handleEdit = (item) => { setSelected(item); setShowForm(true) }
  const handleDelete = (item) => { setSelected(item); setShowDelete(true) }
  const handleView = (item) => { setSelected(item); setShowRooms(true) }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await facilitiesService.delete(selected._id || selected.id)
      success('Xóa cơ sở thành công')
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa cơ sở thất bại')
    } finally {
      setDeleting(false)
      setShowDelete(false)
      setSelected(null)
    }
  }

  const handleExport = () => {
    const exportCols = [
      { key: 'name', header: 'Tên cơ sở' },
      { key: 'address', header: 'Địa chỉ' },
      { key: 'phone', header: 'Số điện thoại' },
      { key: 'status', header: 'Trạng thái' },
    ]
    exportToExcel(facilityList, exportCols, 'danh-sach-co-so')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cơ sở & Phòng học</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý cơ sở vật chất và phòng học</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={Download} onClick={handleExport}>
            Xuất Excel
          </Button>
          <Button icon={Plus} onClick={() => { setSelected(null); setShowForm(true) }}>
            Thêm cơ sở
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={facilityList}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        searchPlaceholder="Tìm cơ sở..."
        emptyMessage="Chưa có cơ sở nào"
        actions={(item) => (
          <button
            onClick={() => { setSelected(item); setShowRooms(true) }}
            className="p-1.5 rounded-lg hover:bg-purple-100 text-purple-500 transition-colors"
            title="Quản lý phòng học"
          >
            <Building2 className="h-4 w-4" />
          </button>
        )}
      />

      <FacilityForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setSelected(null) }}
        facility={selected}
        onSuccess={() => { setShowForm(false); setSelected(null); reload() }}
      />

      <RoomManager
        isOpen={showRooms}
        onClose={() => { setShowRooms(false); setSelected(null) }}
        facility={selected}
      />

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => { setShowDelete(false); setSelected(null) }}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Xóa cơ sở"
        message={`Bạn có chắc chắn muốn xóa cơ sở "${selected?.name}"? Tất cả phòng học trong cơ sở cũng sẽ bị xóa.`}
      />
    </div>
  )
}
