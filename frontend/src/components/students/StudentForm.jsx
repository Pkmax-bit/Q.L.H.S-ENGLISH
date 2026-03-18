import { useState, useEffect, useContext } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import studentsService from '../../services/students.service'
import { validateForm, required, email, phone } from '../../utils/validators'

const initialForm = {
  full_name: '',
  email: '',
  phone: '',
  avatar_url: '',
  is_active: true,
}

export default function StudentForm({ isOpen, onClose, student, onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!student

  useEffect(() => {
    if (student) {
      setForm({
        full_name: student.full_name || '',
        email: student.email || '',
        phone: student.phone || '',
        avatar_url: student.avatar_url || '',
        is_active: student.is_active !== undefined ? student.is_active : true,
      })
    } else {
      setForm(initialForm)
    }
    setErrors({})
  }, [student, isOpen])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    return validateForm({
      full_name: [() => required(form.full_name, 'Họ tên')],
      email: [() => email(form.email)],
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
        await studentsService.update(student.id, form)
        success('Cập nhật học sinh thành công')
      } else {
        await studentsService.create(form)
        success('Thêm học sinh thành công')
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
      title={isEdit ? 'Chỉnh sửa học sinh' : 'Thêm học sinh mới'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
          <Button onClick={handleSubmit} loading={loading}>{isEdit ? 'Cập nhật' : 'Thêm mới'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Họ tên" name="full_name" value={form.full_name} onChange={handleChange} error={errors.full_name} placeholder="Nguyễn Văn A" required />
          <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} placeholder="example@email.com" />
          <Input label="Số điện thoại" name="phone" value={form.phone} onChange={handleChange} error={errors.phone} placeholder="0901234567" />
          <Input label="Ảnh đại diện (URL)" name="avatar_url" value={form.avatar_url} onChange={handleChange} placeholder="https://example.com/avatar.jpg" />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            name="is_active"
            checked={form.is_active}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700">
            Đang hoạt động
          </label>
        </div>
      </form>
    </Modal>
  )
}
