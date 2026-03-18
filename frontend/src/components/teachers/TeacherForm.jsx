import { useState, useEffect, useContext } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import teachersService from '../../services/teachers.service'
import { validateForm, required, email, phone } from '../../utils/validators'

const initialForm = {
  name: '',
  email: '',
  phone: '',
  specialization: '',
  address: '',
  status: 'active',
  notes: '',
}

export default function TeacherForm({ isOpen, onClose, teacher, onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!teacher

  useEffect(() => {
    if (teacher) {
      setForm({
        name: teacher.name || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
        specialization: teacher.specialization || '',
        address: teacher.address || '',
        status: teacher.status || 'active',
        notes: teacher.notes || '',
      })
    } else {
      setForm(initialForm)
    }
    setErrors({})
  }, [teacher, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    return validateForm({
      name: [() => required(form.name, 'Họ tên')],
      email: [() => required(form.email, 'Email'), () => email(form.email)],
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
        await teachersService.update(teacher._id || teacher.id, form)
        success('Cập nhật giáo viên thành công')
      } else {
        await teachersService.create(form)
        success('Thêm giáo viên thành công')
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
      title={isEdit ? 'Chỉnh sửa giáo viên' : 'Thêm giáo viên mới'}
      size="lg"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Họ tên"
            name="name"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="Nguyễn Văn A"
            required
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="example@email.com"
            required
          />
          <Input
            label="Số điện thoại"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            error={errors.phone}
            placeholder="0901234567"
          />
          <Input
            label="Chuyên môn"
            name="specialization"
            value={form.specialization}
            onChange={handleChange}
            placeholder="Toán, Lý, Hóa..."
          />
          <Select
            label="Trạng thái"
            name="status"
            value={form.status}
            onChange={handleChange}
            options={[
              { value: 'active', label: 'Hoạt động' },
              { value: 'inactive', label: 'Ngừng hoạt động' },
            ]}
          />
          <Input
            label="Địa chỉ"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Địa chỉ..."
          />
        </div>
        <Input
          label="Ghi chú"
          name="notes"
          type="textarea"
          value={form.notes}
          onChange={handleChange}
          placeholder="Ghi chú thêm..."
          rows={3}
        />
      </form>
    </Modal>
  )
}
