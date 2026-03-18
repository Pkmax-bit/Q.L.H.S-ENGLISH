import { useState, useEffect, useContext } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import facilitiesService from '../../services/facilities.service'
import { validateForm, required, positiveNumber } from '../../utils/validators'

const initialForm = {
  name: '',
  type: 'building',
  parent_id: '',
  capacity: '',
  equipment: '',
  status: 'active',
}

export default function FacilityForm({ isOpen, onClose, facility, parentId, onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!facility

  useEffect(() => {
    if (facility) {
      setForm({
        name: facility.name || '',
        type: facility.type || 'building',
        parent_id: facility.parent_id || '',
        capacity: facility.capacity ?? '',
        equipment: facility.equipment || '',
        status: facility.status || 'active',
      })
    } else {
      setForm({
        ...initialForm,
        parent_id: parentId || '',
        type: parentId ? 'classroom' : 'building',
      })
    }
    setErrors({})
  }, [facility, parentId, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    return validateForm({
      name: [() => required(form.name, 'Tên')],
      capacity: [() => positiveNumber(form.capacity, 'Sức chứa')],
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      const payload = {
        ...form,
        capacity: form.capacity !== '' ? Number(form.capacity) : undefined,
        parent_id: form.parent_id || undefined,
      }
      if (isEdit) {
        await facilitiesService.update(facility.id, payload)
        success('Cập nhật thành công')
      } else {
        await facilitiesService.create(payload)
        success('Thêm mới thành công')
      }
      onSuccess()
    } catch (err) {
      showError(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa cơ sở' : (parentId ? 'Thêm phòng mới' : 'Thêm cơ sở mới')}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            {isEdit ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Tên"
          name="name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          placeholder={parentId ? 'Phòng 101' : 'Cơ sở 1'}
          required
        />
        <Select
          label="Loại"
          name="type"
          value={form.type}
          onChange={handleChange}
          options={[
            { value: 'building', label: 'Tòa nhà' },
            { value: 'classroom', label: 'Phòng học' },
            { value: 'lab', label: 'Phòng thí nghiệm' },
          ]}
        />
        <Input
          label="Sức chứa"
          name="capacity"
          type="number"
          value={form.capacity}
          onChange={handleChange}
          error={errors.capacity}
          placeholder="30"
        />
        <Input
          label="Trang thiết bị"
          name="equipment"
          value={form.equipment}
          onChange={handleChange}
          placeholder="Máy chiếu, bảng trắng..."
        />
        <Select
          label="Trạng thái"
          name="status"
          value={form.status}
          onChange={handleChange}
          options={[
            { value: 'active', label: 'Hoạt động' },
            { value: 'inactive', label: 'Ngừng sử dụng' },
          ]}
        />
      </form>
    </Modal>
  )
}
