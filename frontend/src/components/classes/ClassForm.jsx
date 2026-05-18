import { useState, useEffect, useContext, useCallback } from 'react'
import { Users } from 'lucide-react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import ClassStudentManager from './ClassStudentManager'
import { ToastContext } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import classesService from '../../services/classes.service'
import teachersService from '../../services/teachers.service'
import subjectsService from '../../services/subjects.service'
import { validateForm, required, positiveNumber } from '../../utils/validators'
import { toInputDate } from '../../utils/formatDate'

const initialForm = {
  name: '',
  subject_id: '',
  teacher_id: '',
  max_students: '',
  status: 'active',
  start_date: '',
  end_date: '',
  description: '',
}

export default function ClassForm({ isOpen, onClose, classData, onSuccess }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [studentsList, setStudentsList] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!classData

  const loadStudentsForClass = useCallback(async () => {
    if (!classData?.id) return
    setLoadingStudents(true)
    try {
      const res = await classesService.getStudents(classData.id)
      const list = res.data?.data ?? res.data
      setStudentsList(Array.isArray(list) ? list : [])
    } catch (err) {
      showError(err.response?.data?.message || 'Không tải được danh sách học sinh')
      setStudentsList([])
    } finally {
      setLoadingStudents(false)
    }
  }, [classData?.id, showError])

  const fetchTeachers = useCallback(() => teachersService.getAll(), [])
  const { data: teachersData } = useFetch(fetchTeachers)
  const fetchSubjects = useCallback(() => subjectsService.getAll(), [])
  const { data: subjectsData } = useFetch(fetchSubjects)

  const teachers = Array.isArray(teachersData) ? teachersData : teachersData?.teachers || []
  const teacherOptions = teachers.map((t) => ({ value: t.id, label: t.full_name }))
  const subjectsArr = Array.isArray(subjectsData) ? subjectsData : subjectsData?.subjects || subjectsData?.data || []
  const subjectOptions = subjectsArr.map((s) => ({ value: s.id, label: s.name + (s.code ? ` (${s.code})` : '') }))

  useEffect(() => {
    if (classData) {
      setForm({
        name: classData.name || '',
        subject_id: classData.subject_id || classData.subject?.id || '',
        teacher_id: classData.teacher_id || classData.teacher?.id || '',
        max_students: classData.max_students ?? '',
        status: classData.status || 'active',
        start_date: toInputDate(classData.start_date) || '',
        end_date: toInputDate(classData.end_date) || '',
        description: classData.description || '',
      })
    } else {
      setForm(initialForm)
    }
    setErrors({})
  }, [classData, isOpen])

  useEffect(() => {
    if (isOpen && isEdit && classData?.id) loadStudentsForClass()
    else setStudentsList([])
  }, [isOpen, isEdit, classData?.id, loadStudentsForClass])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    return validateForm({
      name: [() => required(form.name, 'Tên lớp')],
      max_students: [() => positiveNumber(form.max_students, 'Sĩ số tối đa')],
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
        max_students: form.max_students ? Number(form.max_students) : undefined,
        teacher_id: form.teacher_id || undefined,
        subject_id: form.subject_id || undefined,
      }
      if (isEdit) {
        await classesService.update(classData.id, payload)
        success('Cập nhật lớp học thành công')
      } else {
        await classesService.create(payload)
        success('Thêm lớp học thành công')
      }
      onSuccess()
    } catch (err) {
      showError(err.response?.data?.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const handleStudentsReload = () => {
    loadStudentsForClass()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa lớp học' : 'Thêm lớp học mới'}
      size={isEdit ? '3xl' : 'lg'}
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
            label="Tên lớp"
            name="name"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="Lớp Toán A1"
            required
          />
          <Select
            label="Môn học"
            name="subject_id"
            value={form.subject_id}
            onChange={handleChange}
            options={subjectOptions}
            placeholder="Chọn môn học"
          />
          <Select
            label="Giáo viên"
            name="teacher_id"
            value={form.teacher_id}
            onChange={handleChange}
            options={teacherOptions}
            placeholder="Chọn giáo viên"
          />
          <Input
            label="Sĩ số tối đa"
            name="max_students"
            type="number"
            value={form.max_students}
            onChange={handleChange}
            error={errors.max_students}
            placeholder="30"
          />
          <Select
            label="Trạng thái"
            name="status"
            value={form.status}
            onChange={handleChange}
            options={[
              { value: 'active', label: 'Hoạt động' },
              { value: 'inactive', label: 'Ngừng hoạt động' },
              { value: 'completed', label: 'Hoàn thành' },
            ]}
          />
          <Input
            label="Ngày bắt đầu"
            name="start_date"
            type="date"
            value={form.start_date}
            onChange={handleChange}
          />
          <Input
            label="Ngày kết thúc"
            name="end_date"
            type="date"
            value={form.end_date}
            onChange={handleChange}
          />
        </div>
        <Input
          label="Mô tả"
          name="description"
          type="textarea"
          value={form.description}
          onChange={handleChange}
          placeholder="Mô tả lớp học..."
          rows={3}
        />
      </form>

      {isEdit && classData?.id && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-semibold text-gray-900">Học sinh trong lớp</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Thêm, xóa hoặc đề xuất học sinh (GV chỉ đề xuất; admin duyệt).
          </p>
          <div className="max-h-[min(420px,55vh)] overflow-y-auto pr-1">
            <ClassStudentManager
              classId={classData.id}
              students={studentsList}
              loading={loadingStudents}
              onReload={handleStudentsReload}
              readOnly={false}
            />
          </div>
        </div>
      )}
    </Modal>
  )
}
