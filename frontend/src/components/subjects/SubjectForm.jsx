import { useState, useEffect, useContext } from 'react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import subjectsService from '../../services/subjects.service'
import { validateForm, required } from '../../utils/validators'

const initialForm = { name: '', code: '', description: '', status: 'active' }

export default function SubjectForm({ isOpen, onClose, subject, onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!subject

  useEffect(() => {
    if (subject) {
      setForm({
        name: subject.name || '',
        code: subject.code || '',
        description: subject.description || '',
        status: subject.status || 'active',
      })
    } else {
      setForm(initialForm)
    }
    setErrors({})
  }, [subject, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    return validateForm({
      name: [() => required(form.name, 'Tên môn học')],
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
        await subjectsService.update(subject._id || subject.id, form)
        success('Cập nhật môn học thành công')
      } else {
        await subjectsService.create(form)
        success('Thêm môn học thành công')
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
      title={isEdit ? 'Chỉnh sửa môn học' : 'Thêm môn học mới'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
          <Button onClick={handleSubmit} loading={loading}>{isEdit ? 'Cập nhật' : 'Thêm mới'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Tên môn học" name="name" value={form.name} onChange={handleChange} error={errors.name} placeholder="Toán học" required />
        <Input label="Mã môn" name="code" value={form.code} onChange={handleChange} placeholder="MATH01" />
        <Input label="Mô tả" name="description" type="textarea" value={form.description} onChange={handleChange} placeholder="Mô tả môn học..." rows={3} />
        <Select
          label="Trạng thái"
          name="status"
          value={form.status}
          onChange={handleChange}
          options={[
            { value: 'active', label: 'Hoạt động' },
            { value: 'inactive', label: 'Ngừng' },
          ]}
        />
      </form>
    </Modal>
  )
}
