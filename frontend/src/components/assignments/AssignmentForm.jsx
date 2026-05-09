import { useState, useEffect, useContext, useCallback } from 'react'
import { FlaskConical } from 'lucide-react'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'
import QuestionBuilder from './QuestionBuilder'
import ToeicListeningQuestionBuilder from './ToeicListeningQuestionBuilder'
import ToeicMultiSectionBuilder from './ToeicMultiSectionBuilder'
import { ToastContext } from '../../context/ToastContext'
import {
  ASSIGNMENT_TYPE_TOEIC_LISTENING,
  TOEIC_FULL_QUESTIONS,
  buildToeicListeningSkeletonQuestions,
} from '../../utils/toeicListening'
import {
  ASSIGNMENT_TYPE_TOEIC_LR,
  ASSIGNMENT_TYPE_TOEIC_FOUR_SKILLS,
  TOEIC_LR_TOTAL,
  TOEIC_FOUR_SKILLS_TOTAL,
  buildToeicLRSkeletonQuestions,
  buildToeicFourSkillsSkeletonQuestions,
} from '../../utils/toeicExamConfig'
import { useFetch } from '../../hooks/useFetch'
import assignmentsService from '../../services/assignments.service'
import classesService from '../../services/classes.service'
import lessonsService from '../../services/lessons.service'
import { validateForm, required } from '../../utils/validators'
import { toInputDate } from '../../utils/formatDate'

const initialForm = {
  title: '',
  class_id: '',
  lesson_id: '',
  assignment_type: 'essay',
  total_points: '',
  due_date: '',
  is_published: false,
  allow_retake: false,
  max_attempts: '',
  time_limit_minutes: '',
  listening_exam_mode: false,
  listening_answer_seconds: 5,
  listening_part34_answer_seconds: 8,
  listening_directions_seconds: 25,
  questions: [],
}

/** Chế độ thi mô phỏng (audio liên tục + auto-next) hiện chỉ hỗ trợ TOEIC Listening thuần. */
function isListeningType(t) {
  return t === ASSIGNMENT_TYPE_TOEIC_LISTENING
}

export default function AssignmentForm({ isOpen, onClose, assignment, onSuccess, defaultClassId, onPreview }) {
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { success, error: showError } = useContext(ToastContext)
  const isEdit = !!(assignment && assignment.id)

  const fetchClasses = useCallback(() => classesService.getAll(), [])
  const { data: classesData } = useFetch(fetchClasses)
  const classes = Array.isArray(classesData) ? classesData : classesData?.classes || []
  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }))

  const fetchLessons = useCallback(() => lessonsService.getAll(), [])
  const { data: lessonsData } = useFetch(fetchLessons)
  const lessons = Array.isArray(lessonsData) ? lessonsData : lessonsData?.lessons || []
  // Filter lessons by selected class if possible
  const filteredLessons = form.class_id
    ? lessons.filter((l) => l.class_id === form.class_id || l.class?.id === form.class_id)
    : lessons
  const lessonOptions = filteredLessons.map((l) => ({ value: l.id, label: l.title }))

  useEffect(() => {
    if (!isOpen) return

    if (assignment && assignment.id) {
      // Map DB question format → QuestionBuilder format
      const mappedQuestions = (assignment.questions || []).map((q) => ({
        ...q,
        text: q.question_text || q.text || '',
        question_type: q.question_type || 'essay',
        points: q.points ?? 10,
        options: q.options || [],
        correct_answer: q.correct_answer || '',
        file_url: q.file_url || '',
        youtube_url: q.youtube_url || '',
        toeic_meta: q.toeic_meta ?? null,
      }))
      const classIdRaw = assignment.class_id ?? assignment.class?.id
      const lessonIdRaw = assignment.lesson_id ?? assignment.lesson?.id
      setForm({
        title: assignment.title || '',
        class_id: classIdRaw != null && classIdRaw !== '' ? String(classIdRaw) : '',
        lesson_id: lessonIdRaw != null && lessonIdRaw !== '' ? String(lessonIdRaw) : '',
        assignment_type: assignment.assignment_type || 'essay',
        total_points: assignment.total_points ?? '',
        due_date: toInputDate(assignment.due_date) || '',
        is_published: assignment.is_published || false,
        allow_retake: !!assignment.allow_retake,
        max_attempts:
          assignment.max_attempts != null && assignment.max_attempts !== ''
            ? String(assignment.max_attempts)
            : '',
        time_limit_minutes: assignment.time_limit_minutes ?? '',
        listening_exam_mode: !!assignment.listening_exam_mode,
        listening_answer_seconds: assignment.listening_answer_seconds ?? 5,
        listening_part34_answer_seconds: assignment.listening_part34_answer_seconds ?? 8,
        listening_directions_seconds: assignment.listening_directions_seconds ?? 25,
        questions: mappedQuestions,
      })
    } else {
      setForm({
        ...initialForm,
        class_id: defaultClassId != null && defaultClassId !== '' ? String(defaultClassId) : '',
      })
    }
    setErrors({})
  }, [assignment, isOpen, defaultClassId])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    if (name === 'assignment_type' && value === ASSIGNMENT_TYPE_TOEIC_LISTENING) {
      setForm((prev) => {
        if (prev.assignment_type === ASSIGNMENT_TYPE_TOEIC_LISTENING) return prev
        if (
          prev.questions?.length > 0 &&
          prev.questions.length !== TOEIC_FULL_QUESTIONS
        ) {
          if (
            !window.confirm(
              'Chuyển sang TOEIC Listening: tạo khung 100 câu chuẩn? Câu hỏi hiện tại sẽ bị thay thế.'
            )
          ) {
            return prev
          }
        }
        const ts = Date.now()
        const needSkeleton =
          !prev.questions?.length || prev.questions.length !== TOEIC_FULL_QUESTIONS
        const nextQuestions = needSkeleton
          ? buildToeicListeningSkeletonQuestions().map((q, i) => ({
              ...q,
              id: `toeic_${ts}_${i}`,
            }))
          : prev.questions
        return {
          ...prev,
          assignment_type: value,
          time_limit_minutes: prev.time_limit_minutes || 45,
          total_points: prev.total_points !== '' && prev.total_points !== undefined
            ? prev.total_points
            : 100,
          listening_exam_mode: true,
          questions: nextQuestions,
        }
      })
      if (errors.assignment_type) setErrors((prev) => ({ ...prev, assignment_type: null }))
      return
    }

    if (name === 'assignment_type' && value === ASSIGNMENT_TYPE_TOEIC_LR) {
      setForm((prev) => {
        if (prev.assignment_type === ASSIGNMENT_TYPE_TOEIC_LR) return prev
        if (
          prev.questions?.length > 0 &&
          prev.questions.length !== TOEIC_LR_TOTAL &&
          !window.confirm(
            `Chuyển sang TOEIC 2 kỹ năng (Nghe + Đọc): tạo khung ${TOEIC_LR_TOTAL} câu? Câu hiện tại sẽ bị thay thế.`
          )
        ) {
          return prev
        }
        const ts = Date.now()
        return {
          ...prev,
          assignment_type: value,
          time_limit_minutes: prev.time_limit_minutes || 120,
          total_points:
            prev.total_points !== '' && prev.total_points !== undefined ? prev.total_points : 200,
          questions: buildToeicLRSkeletonQuestions(ts),
        }
      })
      if (errors.assignment_type) setErrors((prev) => ({ ...prev, assignment_type: null }))
      return
    }

    if (name === 'assignment_type' && value === ASSIGNMENT_TYPE_TOEIC_FOUR_SKILLS) {
      setForm((prev) => {
        if (prev.assignment_type === ASSIGNMENT_TYPE_TOEIC_FOUR_SKILLS) return prev
        if (
          prev.questions?.length > 0 &&
          prev.questions.length !== TOEIC_FOUR_SKILLS_TOTAL &&
          !window.confirm(
            `Chuyển sang TOEIC 4 kỹ năng: tạo khung ${TOEIC_FOUR_SKILLS_TOTAL} phần (200 TN + 11 Speaking + 8 Writing)? Câu hiện tại sẽ bị thay thế.`
          )
        ) {
          return prev
        }
        const ts = Date.now()
        return {
          ...prev,
          assignment_type: value,
          time_limit_minutes: prev.time_limit_minutes || 300,
          total_points:
            prev.total_points !== '' && prev.total_points !== undefined ? prev.total_points : 400,
          questions: buildToeicFourSkillsSkeletonQuestions(ts),
        }
      })
      if (errors.assignment_type) setErrors((prev) => ({ ...prev, assignment_type: null }))
      return
    }

    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    return validateForm({
      title: [() => required(form.title, 'Tiêu đề')],
      class_id: [() => required(form.class_id, 'Lớp học')],
    })
  }

  /**
   * Mở chế độ xem trước (giáo viên làm thử) — không lưu, không gọi API submit/start.
   * Dùng đúng dữ liệu đang gõ trong form (chưa cần bấm Lưu).
   */
  const handlePreview = () => {
    if (!onPreview) return
    if (!form.questions || form.questions.length === 0) {
      showError('Bài tập chưa có câu hỏi nào để xem trước.')
      return
    }
    const previewQuestions = form.questions.map((q, idx) => ({
      id: q.id || `preview_${idx}`,
      question_text: q.question_text || q.text || '',
      question_type: q.question_type || 'essay',
      options: q.options || [],
      correct_answer: q.correct_answer || '',
      points: q.points !== '' && q.points !== undefined ? Number(q.points) : 10,
      order_index: idx,
      file_url: q.file_url || '',
      youtube_url: q.youtube_url || '',
      toeic_meta: q.toeic_meta ?? null,
    }))
    const previewAssignment = {
      id: assignment?.id || 'preview',
      title: form.title || 'Bài tập (xem trước)',
      description: assignment?.description || '',
      class_id: form.class_id || null,
      lesson_id: form.lesson_id || null,
      assignment_type: form.assignment_type,
      total_points: form.total_points !== '' ? Number(form.total_points) : null,
      due_date: form.due_date || null,
      time_limit_minutes: form.time_limit_minutes !== '' ? Number(form.time_limit_minutes) : null,
      allow_retake: form.allow_retake === true,
      max_attempts:
        form.allow_retake === true && form.max_attempts !== '' && form.max_attempts != null
          ? Number(form.max_attempts)
          : null,
      listening_exam_mode:
        isListeningType(form.assignment_type) && form.listening_exam_mode === true,
      listening_answer_seconds: Number(form.listening_answer_seconds) || 5,
      listening_part34_answer_seconds: Number(form.listening_part34_answer_seconds) || 8,
      listening_directions_seconds: Number(form.listening_directions_seconds) || 25,
      questions: previewQuestions,
    }
    onPreview(previewAssignment)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      // Map QuestionBuilder format → backend format
      const mappedQuestions = (form.questions || []).map((q, idx) => ({
        question_text: q.question_text || q.text || '',
        question_type: q.question_type || 'essay',
        options: q.options || [],
        correct_answer: q.correct_answer || '',
        points: q.points !== '' && q.points !== undefined ? Number(q.points) : 10,
        order_index: idx,
        file_url: q.file_url || '',
        youtube_url: q.youtube_url || '',
        toeic_meta: q.toeic_meta ?? null,
      }))

      const payload = {
        title: form.title,
        class_id: form.class_id,
        lesson_id: form.lesson_id || undefined,
        assignment_type: form.assignment_type,
        total_points: form.total_points !== '' ? Number(form.total_points) : undefined,
        due_date: form.due_date || undefined,
        is_published: form.is_published,
        allow_retake: form.allow_retake === true,
        max_attempts:
          form.allow_retake === true && form.max_attempts !== '' && form.max_attempts != null
            ? Number(form.max_attempts)
            : undefined,
        time_limit_minutes: form.time_limit_minutes !== '' ? Number(form.time_limit_minutes) : undefined,
        listening_exam_mode: isListeningType(form.assignment_type) && form.listening_exam_mode === true,
        listening_answer_seconds: Number(form.listening_answer_seconds) || 5,
        listening_part34_answer_seconds: Number(form.listening_part34_answer_seconds) || 8,
        listening_directions_seconds: Number(form.listening_directions_seconds) || 25,
        questions: mappedQuestions,
      }
      if (isEdit) {
        await assignmentsService.update(assignment.id, payload)
        success('Cập nhật bài tập thành công')
      } else {
        await assignmentsService.create(payload)
        success('Thêm bài tập thành công')
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
      title={
        form.assignment_type === ASSIGNMENT_TYPE_TOEIC_LISTENING
          ? isEdit
            ? 'Chỉnh sửa bài kiểm tra TOEIC Listening'
            : 'Tạo bài kiểm tra TOEIC Listening'
          : form.assignment_type === ASSIGNMENT_TYPE_TOEIC_LR
            ? isEdit
              ? 'Chỉnh sửa TOEIC — Nghe & Đọc'
              : 'Tạo bài TOEIC — Nghe & Đọc (200 câu)'
            : form.assignment_type === ASSIGNMENT_TYPE_TOEIC_FOUR_SKILLS
              ? isEdit
                ? 'Chỉnh sửa TOEIC 4 kỹ năng'
                : 'Tạo bài TOEIC 4 kỹ năng'
              : isEdit
                ? 'Chỉnh sửa bài tập'
                : 'Thêm bài tập mới'
      }
      size={
        form.assignment_type === ASSIGNMENT_TYPE_TOEIC_LISTENING ||
        form.assignment_type === ASSIGNMENT_TYPE_TOEIC_LR ||
        form.assignment_type === ASSIGNMENT_TYPE_TOEIC_FOUR_SKILLS
          ? 'full'
          : 'xl'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          {onPreview && (
            <Button
              variant="warning"
              icon={FlaskConical}
              onClick={handlePreview}
              disabled={loading || (form.questions || []).length === 0}
              title={
                (form.questions || []).length === 0
                  ? 'Thêm câu hỏi trước khi xem trước'
                  : 'Làm thử trải nghiệm học sinh — không lưu kết quả'
              }
            >
              Làm thử
            </Button>
          )}
          <Button onClick={handleSubmit} loading={loading}>
            {isEdit ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Tiêu đề"
            name="title"
            value={form.title}
            onChange={handleChange}
            error={errors.title}
            placeholder="Tên bài tập"
            required
          />
          <Select
            label="Lớp học"
            name="class_id"
            value={form.class_id}
            onChange={handleChange}
            options={classOptions}
            placeholder="Chọn lớp học"
            error={errors.class_id}
            required
          />
          <Select
            label="Bài học (tùy chọn)"
            name="lesson_id"
            value={form.lesson_id}
            onChange={handleChange}
            options={lessonOptions}
            placeholder="Chọn bài học"
          />
          <Select
            label="Loại bài tập"
            name="assignment_type"
            value={form.assignment_type}
            onChange={handleChange}
            options={[
              { value: 'essay', label: 'Tự luận' },
              { value: 'multiple_choice', label: 'Trắc nghiệm' },
              { value: 'mixed', label: 'Hỗn hợp' },
              { value: ASSIGNMENT_TYPE_TOEIC_LISTENING, label: 'TOEIC Listening (100 câu)' },
              { value: ASSIGNMENT_TYPE_TOEIC_LR, label: 'TOEIC Nghe & Đọc (200 câu)' },
              { value: ASSIGNMENT_TYPE_TOEIC_FOUR_SKILLS, label: 'TOEIC 4 kỹ năng (L+R+S+W)' },
            ]}
          />
          <Input
            label="Tổng điểm"
            name="total_points"
            type="number"
            value={form.total_points}
            onChange={handleChange}
            placeholder="100"
          />
          <Input
            label="Hạn nộp"
            name="due_date"
            type="date"
            value={form.due_date}
            onChange={handleChange}
          />
          <Input
            label="Thời gian làm bài (phút)"
            name="time_limit_minutes"
            type="number"
            value={form.time_limit_minutes}
            onChange={handleChange}
            placeholder="60"
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-6">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_published"
              name="is_published"
              checked={form.is_published}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_published" className="text-sm text-gray-700">
              Đã xuất bản
            </label>
          </div>
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="allow_retake"
              name="allow_retake"
              checked={form.allow_retake}
              onChange={handleChange}
              className="h-4 w-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="allow_retake" className="text-sm text-gray-700 leading-snug">
              Cho phép học sinh làm lại sau khi đã nộp
              <span className="block text-xs text-gray-500 font-normal mt-0.5">
                Mỗi lần làm lại tạo bài nộp mới (lượt chấm riêng).
              </span>
            </label>
          </div>
        </div>

        {form.allow_retake && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-4 py-3">
            <Input
              label="Giới hạn số lần nộp (tùy chọn)"
              name="max_attempts"
              type="number"
              min={1}
              step={1}
              value={form.max_attempts}
              onChange={handleChange}
              placeholder="Để trống = không giới hạn"
            />
            <p className="text-xs text-indigo-800/90 mt-1.5">
              Đếm mọi lần nộp bài (lượt đầu + làm lại). Ví dụ nhập <strong>3</strong> thì tối đa 3 lần nộp.
            </p>
          </div>
        )}

        {isListeningType(form.assignment_type) && (
          <div className="rounded-lg border border-rose-100 bg-rose-50/60 px-4 py-3 space-y-3">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="listening_exam_mode"
                name="listening_exam_mode"
                checked={!!form.listening_exam_mode}
                onChange={handleChange}
                className="h-4 w-4 mt-0.5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
              />
              <label htmlFor="listening_exam_mode" className="text-sm text-gray-800 leading-snug">
                <strong>Chế độ thi mô phỏng (Listening)</strong>
                <span className="block text-xs text-gray-600 font-normal mt-0.5">
                  Audio tự phát liên tục, có khoảng chờ tích đáp án rồi tự động chuyển câu —{' '}
                  <strong>khoá tương tác</strong> như thi thật:
                  không tua audio, không quay lại câu trước, không mở câu khác trên thanh điều hướng.
                </span>
              </label>
            </div>

            {form.listening_exam_mode && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Chờ chọn đáp án — Part 1/2 (giây)"
                  name="listening_answer_seconds"
                  type="number"
                  min={1}
                  max={120}
                  step={1}
                  value={form.listening_answer_seconds}
                  onChange={handleChange}
                  placeholder="5"
                />
                <Input
                  label="Chờ chọn đáp án — Part 3/4 (giây/câu)"
                  name="listening_part34_answer_seconds"
                  type="number"
                  min={1}
                  max={120}
                  step={1}
                  value={form.listening_part34_answer_seconds}
                  onChange={handleChange}
                  placeholder="8"
                />
                <Input
                  label="Directions đầu mỗi Part (giây)"
                  name="listening_directions_seconds"
                  type="number"
                  min={1}
                  max={120}
                  step={1}
                  value={form.listening_directions_seconds}
                  onChange={handleChange}
                  placeholder="25"
                />
                <p className="sm:col-span-3 text-xs text-rose-800/90 leading-relaxed">
                  Trình tự mỗi câu Part 1/2: <strong>phát audio</strong> → hết audio chờ{' '}
                  <strong>{form.listening_answer_seconds || 5}s</strong> để học sinh chọn đáp án →{' '}
                  <strong>tự chuyển câu kế tiếp</strong> + tự phát audio mới. Part 3/4: phát audio đoạn
                  một lần, sau đó mỗi câu trong nhóm có{' '}
                  <strong>{form.listening_part34_answer_seconds || 8}s</strong> để chọn rồi tự chuyển sang
                  câu kế. Đầu mỗi Part hiện <strong>Directions</strong> trong{' '}
                  <strong>{form.listening_directions_seconds || 25}s</strong>.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Question builder */}
        <div className="pt-4 border-t border-gray-100">
          {form.assignment_type === ASSIGNMENT_TYPE_TOEIC_LISTENING ? (
            <ToeicListeningQuestionBuilder
              questions={form.questions}
              onChange={(questions) => setForm((prev) => ({ ...prev, questions }))}
            />
          ) : form.assignment_type === ASSIGNMENT_TYPE_TOEIC_LR ||
            form.assignment_type === ASSIGNMENT_TYPE_TOEIC_FOUR_SKILLS ? (
            <ToeicMultiSectionBuilder
              assignmentType={form.assignment_type}
              questions={form.questions}
              onChange={(questions) => setForm((prev) => ({ ...prev, questions }))}
            />
          ) : (
            <QuestionBuilder
              questions={form.questions}
              onChange={(questions) => setForm((prev) => ({ ...prev, questions }))}
            />
          )}
        </div>
      </form>
    </Modal>
  )
}
