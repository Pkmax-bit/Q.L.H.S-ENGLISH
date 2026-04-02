import { useState, useRef, useContext } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical, Plus, Trash2, CirclePlus, X, Check,
  FileSpreadsheet, Download, Upload, AlertTriangle, CheckCircle2, Loader2,
} from 'lucide-react'
import Button from '../common/Button'
import Input from '../common/Input'
import Select from '../common/Select'
import { ToastContext } from '../../context/ToastContext'
import assignmentsService from '../../services/assignments.service'

function SortableQuestion({ question, index, onUpdate, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleChange = (field, value) => {
    onUpdate(index, { ...question, [field]: value })
  }

  const handleOptionChange = (optIdx, field, value) => {
    const options = [...(question.options || [])]
    options[optIdx] = { ...options[optIdx], [field]: value }
    onUpdate(index, { ...question, options })
  }

  const addOption = () => {
    const options = [...(question.options || []), { text: '', is_correct: false }]
    onUpdate(index, { ...question, options })
  }

  const removeOption = (optIdx) => {
    const options = (question.options || []).filter((_, i) => i !== optIdx)
    onUpdate(index, { ...question, options })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-gray-200 rounded-lg p-4 bg-white"
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button
          type="button"
          className="mt-2 p-1 rounded hover:bg-gray-100 text-gray-400 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="flex-1 space-y-3">
          {/* Question header */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-500">Câu {index + 1}</span>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="ml-auto p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Question text */}
          <Input
            label="Nội dung câu hỏi"
            value={question.text || ''}
            onChange={(e) => handleChange('text', e.target.value)}
            placeholder="Nhập nội dung câu hỏi..."
            type="textarea"
            rows={2}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Loại"
              value={question.question_type || 'essay'}
              onChange={(e) => handleChange('question_type', e.target.value)}
              options={[
                { value: 'essay', label: 'Tự luận' },
                { value: 'multiple_choice', label: 'Trắc nghiệm' },
              ]}
            />
            <Input
              label="Điểm"
              type="number"
              value={question.points ?? ''}
              onChange={(e) => handleChange('points', e.target.value ? Number(e.target.value) : '')}
              placeholder="10"
            />
          </div>

          {/* Correct answer for essay */}
          {question.question_type !== 'multiple_choice' && (
            <Input
              label="Đáp án"
              value={question.correct_answer || ''}
              onChange={(e) => handleChange('correct_answer', e.target.value)}
              placeholder="Nhập đáp án..."
            />
          )}

          {/* Options for multiple choice (JSONB array) */}
          {question.question_type === 'multiple_choice' && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Đáp án</p>
              {(question.options || []).map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOptionChange(optIdx, 'is_correct', !opt.is_correct)}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      opt.is_correct
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                    title={opt.is_correct ? 'Đáp án đúng' : 'Đánh dấu đúng'}
                  >
                    {opt.is_correct && <Check className="h-3 w-3" />}
                  </button>
                  <input
                    type="text"
                    value={opt.text || ''}
                    onChange={(e) => handleOptionChange(optIdx, 'text', e.target.value)}
                    placeholder={`Đáp án ${String.fromCharCode(65 + optIdx)}`}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(optIdx)}
                    className="p-1 rounded hover:bg-red-50 text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 mt-1"
              >
                <CirclePlus className="h-4 w-4" />
                Thêm đáp án
              </button>
            </div>
          )}

          {/* File URL and YouTube URL */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="URL tệp tin"
              value={question.file_url || ''}
              onChange={(e) => handleChange('file_url', e.target.value)}
              placeholder="https://example.com/file.pdf"
            />
            <Input
              label="YouTube URL"
              value={question.youtube_url || ''}
              onChange={(e) => handleChange('youtube_url', e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}

let nextId = 1

// ─── Excel Import Panel ───────────────────────────────────────────────
function ExcelImportPanel({ onImport, onClose }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const { success: toastSuccess, error: toastError } = useContext(ToastContext)
  const [dragActive, setDragActive] = useState(false)

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return
    const ext = selectedFile.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls'].includes(ext)) {
      setError('Chỉ chấp nhận file Excel (.xlsx, .xls)')
      return
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File không được vượt quá 10MB')
      return
    }
    setFile(selectedFile)
    setError(null)
    setResult(null)
  }

  const handleParse = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const { data: res } = await assignmentsService.parseExcelQuestions(file)
      const parsed = res.data || res
      setResult(parsed)
      if (parsed.warnings && parsed.warnings.length > 0) {
        // Show warnings but don't block
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Lỗi khi đọc file Excel'
      setError(msg)
      toastError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmImport = () => {
    if (!result || !result.questions) return
    onImport(result.questions)
    toastSuccess(`Đã import ${result.questions.length} câu hỏi`)
    onClose()
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await assignmentsService.downloadQuestionTemplate()
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mau-import-cau-hoi.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toastError('Không thể tải file mẫu')
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0])
  }

  return (
    <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          <h4 className="text-sm font-semibold text-blue-800">Import câu hỏi từ Excel</h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-blue-100 text-blue-400 hover:text-blue-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Step 1: Download template */}
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
        <div className="flex-1">
          <p className="text-sm text-gray-700">Tải file mẫu Excel với 2 sheet: <strong>Trắc nghiệm</strong> và <strong>Tự luận</strong></p>
        </div>
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Tải file mẫu
        </button>
      </div>

      {/* Step 2: Upload file */}
      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
        <div className="flex-1 space-y-3">
          <p className="text-sm text-gray-700">Điền câu hỏi vào file rồi upload lên</p>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : file
                  ? 'border-green-300 bg-green-50/50'
                  : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-700 font-medium">{file.name}</span>
                <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                    setResult(null)
                    setError(null)
                  }}
                  className="ml-2 p-0.5 rounded hover:bg-red-100 text-red-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                <p className="text-sm text-gray-500">
                  Kéo thả hoặc <span className="text-blue-600 font-medium">chọn file Excel</span>
                </p>
                <p className="text-xs text-gray-400">.xlsx, .xls — tối đa 10MB</p>
              </>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Parse button */}
          {file && !result && (
            <button
              type="button"
              onClick={handleParse}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang đọc file...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  Đọc câu hỏi từ file
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Step 3: Preview results */}
      {result && (
        <div className="p-3 bg-white rounded-lg border border-blue-100 space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">Kết quả đọc file</p>
              <div className="mt-2 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  📝 Tổng: {result.summary?.total || 0} câu
                </span>
                {(result.summary?.multiple_choice || 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    ✅ Trắc nghiệm: {result.summary.multiple_choice} câu
                  </span>
                )}
                {(result.summary?.essay || 0) > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    ✍️ Tự luận: {result.summary.essay} câu
                  </span>
                )}
              </div>

              {/* Warnings */}
              {result.warnings && result.warnings.length > 0 && (
                <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs font-medium text-amber-700 mb-1">⚠️ Cảnh báo:</p>
                  {result.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-600">• {w}</p>
                  ))}
                </div>
              )}

              {/* Preview first few questions */}
              <div className="mt-3 max-h-48 overflow-y-auto space-y-1.5">
                {(result.questions || []).slice(0, 10).map((q, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs p-2 bg-gray-50 rounded-lg">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 truncate">{q.question_text}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          q.question_type === 'multiple_choice'
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-amber-100 text-amber-600'
                        }`}>
                          {q.question_type === 'multiple_choice' ? 'Trắc nghiệm' : 'Tự luận'}
                        </span>
                        <span className="text-gray-400">{q.points} điểm</span>
                        {q.question_type === 'multiple_choice' && (
                          <span className="text-gray-400">• {q.options?.length || 0} đáp án</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {(result.questions || []).length > 10 && (
                  <p className="text-xs text-gray-400 text-center py-1">
                    ... và {result.questions.length - 10} câu khác
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setResult(null)
                setFile(null)
              }}
              className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Chọn file khác
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              Thêm {result.questions?.length || 0} câu hỏi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main QuestionBuilder ─────────────────────────────────────────────
export default function QuestionBuilder({ questions = [], onChange }) {
  const [showImport, setShowImport] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Ensure all questions have unique ids
  const questionsWithIds = questions.map((q) => ({
    ...q,
    id: q.id || `q_${nextId++}`,
  }))

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = questionsWithIds.findIndex((q) => q.id === active.id)
    const newIndex = questionsWithIds.findIndex((q) => q.id === over.id)
    const reordered = arrayMove(questionsWithIds, oldIndex, newIndex)
    onChange(reordered)
  }

  const addQuestion = () => {
    const newQ = {
      id: `q_${nextId++}`,
      text: '',
      question_type: 'essay',
      points: '',
      options: [],
      correct_answer: '',
      file_url: '',
      youtube_url: '',
    }
    onChange([...questionsWithIds, newQ])
  }

  const updateQuestion = (index, updated) => {
    const copy = [...questionsWithIds]
    copy[index] = updated
    onChange(copy)
  }

  const removeQuestion = (index) => {
    onChange(questionsWithIds.filter((_, i) => i !== index))
  }

  /**
   * Handle imported questions from Excel.
   * Maps backend format → QuestionBuilder format and appends.
   */
  const handleExcelImport = (importedQuestions) => {
    const mapped = importedQuestions.map((q) => ({
      id: `q_${nextId++}`,
      text: q.question_text || '',
      question_type: q.question_type || 'essay',
      points: q.points ?? 10,
      options: q.options || [],
      correct_answer: q.correct_answer || '',
      order_index: q.order_index ?? 0,
      file_url: q.file_url || '',
      youtube_url: q.youtube_url || '',
    }))
    onChange([...questionsWithIds, ...mapped])
    setShowImport(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">
          Câu hỏi ({questionsWithIds.length})
        </h4>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showImport ? 'secondary' : 'outline'}
            icon={FileSpreadsheet}
            onClick={() => setShowImport(!showImport)}
          >
            Import Excel
          </Button>
          <Button size="sm" icon={Plus} onClick={addQuestion}>
            Thêm câu hỏi
          </Button>
        </div>
      </div>

      {/* Excel Import Panel */}
      {showImport && (
        <div className="mb-4">
          <ExcelImportPanel
            onImport={handleExcelImport}
            onClose={() => setShowImport(false)}
          />
        </div>
      )}

      {questionsWithIds.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          Chưa có câu hỏi. Nhấn &quot;Thêm câu hỏi&quot; hoặc &quot;Import Excel&quot; để bắt đầu.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={questionsWithIds.map((q) => q.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {questionsWithIds.map((question, index) => (
                <SortableQuestion
                  key={question.id}
                  question={question}
                  index={index}
                  onUpdate={updateQuestion}
                  onRemove={removeQuestion}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
