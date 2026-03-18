import { useState, useEffect, useContext } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import facilitiesService from '../../services/facilities.service'
import { validateForm, required, phone } from '../../utils/validators'

const initialForm = {
  name: '',
  address: '',
  phone: '',
}

export default function FacilityForm({ isOpen, onClose, facility, onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!facility

  useEffect(() => {
    if (facility) {
      setForm({
        name: facility.name || '',
        address: facility.address || '',
        phone: facility.phone || '',
      })
    } else {
      setForm(initialForm)
    }
    setErrors({})
  }, [facility, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    return validateForm({
      name: [() => required(form.name, 'Tên cơ sở')],
      phone: [() => phone(form.phone)],
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      if (isEdit) {
        await facilitiesService.update(facility._id || facility.id, form)
        success('Cập nhật cơ sở thành công')
      } else {
        await facilitiesService.create(form)
        success('Thêm cơ sở thành công')
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
      title={isEdit ? 'Chỉnh sửa cơ sở' : 'Thêm cơ sở mới'}
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
          label="Tên cơ sở"
          name="name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          placeholder="Cơ sở 1"
          required
        />
        <Input
          label="Địa chỉ"
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="123 Đường ABC, Quận XYZ"
        />
        <Input
          label="Số điện thoại"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          error={errors.phone}
          placeholder="0901234567"
        />
      </form>
    </Modal>
  )
}
