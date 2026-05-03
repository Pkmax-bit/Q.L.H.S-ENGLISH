import { useState, useMemo, useContext } from 'react'
import { Headphones, RefreshCw, Info, Check, Layers, ListChecks, FileSpreadsheet, Plus, Trash2 } from 'lucide-react'
import Button from '../common/Button'
import Input from '../common/Input'
import RichContentViewer from '../common/RichContentViewer'
import ToeicMediaQueues from './ToeicMediaQueues'
import ToeicBulkQuestionPaste from './ToeicBulkQuestionPaste'
import ToeicExcelImportReview from './ToeicExcelImportReview'
import {
  TOEIC_FULL_QUESTIONS,
  TOEIC_PART_RANGES,
  buildToeicListeningSkeletonQuestions,
  getToeicListeningMeta,
} from '../../utils/toeicListening'
import { ToastContext } from '../../context/ToastContext'
import assignmentsService from '../../services/assignments.service'
import { mediaFileNameFromUrl } from '../../utils/mediaUrl'
import { MCQ_OPTION_COUNT_MAX, MCQ_OPTION_COUNT_MIN, mcqLetter } from '../../utils/assignmentHelpers'

let toeicBuilderNextId = 1

function qText(q) {
  return q.text || q.question_text || ''
}

function ToeicQuestionCard({ globalIndex, question, onUpdate }) {
  const meta = getToeicListeningMeta(globalIndex)
  const stem = qText(question)
  const opts = question.options || []

  const handleChange = (field, value) => {
    onUpdate({ ...question, [field]: value })
  }

  const handleOptionChange = (optIdx, field, value) => {
    const options = [...(question.options || [])]
    options[optIdx] = { ...options[optIdx], [field]: value }
    if (field === 'is_correct' && value === true) {
      options.forEach((o, i) => {
        if (i !== optIdx) o.is_correct = false
      })
    }
    onUpdate({ ...question, options })
  }

  const addOption = () => {
    if (opts.length >= MCQ_OPTION_COUNT_MAX) return
    onUpdate({
      ...question,
      options: [...opts, { text: '', is_correct: false }],
    })
  }

  const removeOption = (optIdx) => {
    if (opts.length <= MCQ_OPTION_COUNT_MIN) return
    const next = opts.filter((_, i) => i !== optIdx)
    onUpdate({ ...question, options: next })
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-sm font-bold text-indigo-700">
          Câu {globalIndex + 1}
          <span className="font-normal text-gray-500 ml-2">
            · {meta.label}
            {meta.part === 3 && meta.groupIndex != null && (
              <span className="text-xs"> (hội thoại {meta.groupIndex + 1})</span>
            )}
            {meta.part === 4 && meta.groupIndex != null && (
              <span className="text-xs"> (bài nói {meta.groupIndex + 1})</span>
            )}
          </span>
        </span>
      </div>

      {(meta.part === 3 || meta.part === 4) && meta.indexInGroup > 0 && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-3">
          Cùng file âm thanh với câu đầu nhóm (câu {globalIndex + 1 - meta.indexInGroup}) — có thể dán URL ở bất kỳ câu nào trong 3 câu.
        </p>
      )}

      {stem && (
        <div className="mb-3 text-sm text-gray-600">
          {stem.includes('<') ? (
            <RichContentViewer content={stem} />
          ) : (
            <p>{stem}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {meta.part === 1 && (
          <div>
            <Input
              label="URL ảnh (Part 1)"
              value={question.file_url || ''}
              onChange={(e) => handleChange('file_url', e.target.value)}
              placeholder="https://.../photo.jpg"
            />
            {question.file_url?.trim() && (
              <p className="text-xs text-gray-500 mt-1.5">
                Tên media (ảnh):{' '}
                <span className="font-medium text-gray-800 break-all">{mediaFileNameFromUrl(question.file_url)}</span>
              </p>
            )}
          </div>
        )}
        {(meta.part === 1 || meta.part === 2 || meta.indexInGroup === 0) && (
          <div>
            <Input
              label={
                meta.part === 1
                  ? 'URL file âm thanh (.mp3, …)'
                  : meta.part === 2
                    ? 'URL âm thanh (.mp3, …)'
                    : 'URL âm thanh đoạn (.mp3, …)'
              }
              value={question.youtube_url || ''}
              onChange={(e) => handleChange('youtube_url', e.target.value)}
              placeholder="https://.../audio.mp3"
            />
            {question.youtube_url?.trim() && (
              <p className="text-xs text-gray-500 mt-1.5">
                Tên media: <span className="font-medium text-gray-800 break-all">{mediaFileNameFromUrl(question.youtube_url)}</span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-gray-600">Đáp án — chọn đúng một phương án</p>
          <p className="text-[11px] text-gray-500">
            {opts.length} phương án · có thể chỉnh {MCQ_OPTION_COUNT_MIN}–{MCQ_OPTION_COUNT_MAX} (vd. 3 hoặc 4)
          </p>
        </div>
        {opts.map((opt, optIdx) => (
          <div key={optIdx} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOptionChange(optIdx, 'is_correct', true)}
              className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors ${
                opt.is_correct
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-300 hover:border-green-400'
              }`}
              title={opt.is_correct ? 'Đáp án đúng' : 'Đánh dấu đúng'}
            >
              {opt.is_correct && <Check className="h-3 w-3" />}
            </button>
            <span className="text-xs font-semibold text-gray-500 w-5">{mcqLetter(optIdx)}</span>
            <input
              type="text"
              value={opt.text || ''}
              onChange={(e) => handleOptionChange(optIdx, 'text', e.target.value)}
              placeholder={`Nội dung ${mcqLetter(optIdx)}`}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              type="button"
              onClick={() => removeOption(optIdx)}
              disabled={opts.length <= MCQ_OPTION_COUNT_MIN}
              className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:pointer-events-none"
              title="Xóa phương án"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addOption}
          disabled={opts.length >= MCQ_OPTION_COUNT_MAX}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm đáp án
        </button>
      </div>
    </div>
  )
}

export default function ToeicListeningQuestionBuilder({
  questions = [],
  onChange,
  /** Mẫu Excel tải về / import — khớp backend ?variant */
  excelTemplateVariant = 'toeic_listening',
  /** Loại gửi khi xuất Excel (ảnh + đề) */
  exportAssignmentType = 'toeic_listening',
  /** Khi nằm trong đề Nghe+Đọc / 4 kỹ năng: truyền toàn bộ mảng câu để xuất đủ sheet */
  allQuestionsForExport,
}) {
  const [mainStep, setMainStep] = useState('media') // 'media' | 'questions'
  const [activePart, setActivePart] = useState(1)
  const [imageItems, setImageItems] = useState([])
  const [audioItems, setAudioItems] = useState([])
  const [excelReviewOpen, setExcelReviewOpen] = useState(false)
  const { success: toastSuccess, error: toastError } = useContext(ToastContext)

  const questionsWithIds = questions.map((q) => ({
    ...q,
    id: q.id || `toeic_q_${toeicBuilderNextId++}`,
  }))

  const applyQuestions = (next) => {
    onChange(next)
  }

  const updateAtIndex = (idx, updated) => {
    const copy = [...questionsWithIds]
    copy[idx] = updated
    applyQuestions(copy)
  }

  const generateSkeleton = () => {
    if (questionsWithIds.length > 0) {
      if (!window.confirm('Tạo khung 100 câu mới? Toàn bộ câu hiện tại sẽ bị thay thế.')) return
    }
    const base = buildToeicListeningSkeletonQuestions()
    const ts = Date.now()
    const next = base.map((q, i) => ({
      ...q,
      id: `toeic_${ts}_${i}`,
    }))
    applyQuestions(next)
  }

  const range = TOEIC_PART_RANGES.find((r) => r.part === activePart)
  const indicesInPart = useMemo(() => {
    if (!range) return []
    const out = []
    for (let i = range.start; i <= range.end; i++) out.push(i)
    return out
  }, [range])

  const countOk = questionsWithIds.length === TOEIC_FULL_QUESTIONS

  const questionsPayloadForExport = allQuestionsForExport ?? questionsWithIds

  const exportFilename =
    exportAssignmentType === 'toeic_four_skills'
      ? 'toeic-4-ky-nang-cau-hoi-media.xlsx'
      : exportAssignmentType === 'toeic_lr'
        ? 'toeic-nghe-doc-cau-hoi-media.xlsx'
        : 'toeic-listening-cau-hoi-media.xlsx'

  const handleExportExcel = async () => {
    if (!questionsPayloadForExport.length) {
      toastError('Chưa có câu hỏi để xuất.')
      return
    }
    try {
      const res = await assignmentsService.exportQuestionsExcel({
        questions: questionsPayloadForExport,
        assignment_type: exportAssignmentType,
      })
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = exportFilename
      a.click()
      URL.revokeObjectURL(url)
      toastSuccess('Đã tải file Excel (có tên file media).')
    } catch (e) {
      toastError(e.response?.data?.message || 'Không xuất được Excel')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-900 space-y-1">
            <p className="font-semibold">Đề TOEIC Listening (chuẩn format)</p>
            <p className="text-indigo-800/90">
              100 câu · Part 1: 6 ảnh · Part 2: 25 câu · Part 3: 13 đoạn × 3 câu · Part 4: 10 bài × 3 câu · Gợi ý thời gian 45 phút.
            </p>
            <p className="text-xs text-indigo-700">
              Nên làm <strong>Bước 1</strong> (chọn ảnh/audio → sắp xếp → upload → gán Part), sau đó <strong>Bước 2</strong> (dán hoặc sửa từng câu).
            </p>
          </div>
        </div>
      </div>

      {/* Main workflow tabs */}
      <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
        <button
          type="button"
          onClick={() => setMainStep('media')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            mainStep === 'media'
              ? 'bg-white text-indigo-700 shadow-sm border border-gray-100'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Layers className="h-4 w-4" /> Bước 1 — Ảnh & audio
        </button>
        <button
          type="button"
          onClick={() => setMainStep('questions')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            mainStep === 'questions'
              ? 'bg-white text-indigo-700 shadow-sm border border-gray-100'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ListChecks className="h-4 w-4" /> Bước 2 — Câu hỏi & đáp án
        </button>
      </div>

      {/* Tab theo Part (TOEIC) — dùng chung cho Bước 1 & 2 */}
      {questionsWithIds.length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-white overflow-hidden shadow-sm">
          <div className="flex flex-wrap sm:flex-nowrap divide-y sm:divide-y-0 sm:divide-x divide-gray-100 border-b border-gray-100 bg-gradient-to-b from-indigo-50/40 to-white">
            {TOEIC_PART_RANGES.map((r) => {
              const qCount = r.end - r.start + 1
              const shortTitle = r.label.replace(/^Part \d+ — /, '')
              const on = activePart === r.part
              return (
                <button
                  key={r.part}
                  type="button"
                  onClick={() => setActivePart(r.part)}
                  className={`flex-1 min-w-[130px] px-3 py-3 text-left transition-colors ${
                    on
                      ? 'bg-white ring-2 ring-inset ring-indigo-500 z-[1]'
                      : 'hover:bg-indigo-50/60 text-gray-700'
                  }`}
                >
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${on ? 'text-indigo-700' : 'text-gray-500'}`}>
                    Part {r.part}
                  </span>
                  <span className={`block text-sm font-semibold mt-0.5 leading-snug ${on ? 'text-gray-900' : 'text-gray-700'}`}>
                    {shortTitle}
                  </span>
                  <span className="block text-[11px] text-gray-500 mt-1">
                    Câu {r.start + 1}–{r.end + 1} · {qCount} câu
                  </span>
                </button>
              )
            })}
          </div>
          {range && (
            <div className="px-4 py-2.5 bg-indigo-50/70 border-t border-indigo-100 text-xs text-indigo-950">
              <span className="font-semibold text-indigo-800">Part {activePart}:</span>{' '}
              {range.note}
            </div>
          )}
        </div>
      )}

      {mainStep === 'media' && (
        <div className="space-y-4">
          {questionsWithIds.length === 0 ? (
            <div className="text-center py-8 bg-amber-50/50 rounded-xl border border-amber-100">
              <p className="text-sm text-amber-900 mb-3">Cần có khung 100 câu trước khi gán media vào đề.</p>
              <Button type="button" icon={Headphones} onClick={() => generateSkeleton()}>
                Tạo khung 100 câu
              </Button>
            </div>
          ) : (
            <ToeicMediaQueues
              imageItems={imageItems}
              onImageItemsChange={setImageItems}
              audioItems={audioItems}
              onAudioItemsChange={setAudioItems}
              questions={questionsWithIds}
              onApplyQuestions={applyQuestions}
              activePart={activePart}
            />
          )}
        </div>
      )}

      {mainStep === 'questions' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-gray-600">
                Đang soạn <strong className="text-indigo-700">Part {activePart}</strong> — chọn Part ở tab phía trên.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={FileSpreadsheet}
                onClick={() => setExcelReviewOpen(true)}
                disabled={questionsWithIds.length === 0}
              >
                Import Excel — Review
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={FileSpreadsheet}
                onClick={handleExportExcel}
                disabled={questionsPayloadForExport.length === 0}
              >
                Xuất Excel (media + đề)
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  countOk ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'
                }`}
              >
                {questionsWithIds.length}/{TOEIC_FULL_QUESTIONS} câu
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                icon={RefreshCw}
                onClick={() => generateSkeleton()}
              >
                {questionsWithIds.length === 0 ? 'Tạo khung 100 câu' : 'Làm mới khung 100 câu'}
              </Button>
            </div>
          </div>

          <ToeicBulkQuestionPaste
            questions={questionsWithIds}
            onApply={applyQuestions}
            disabled={questionsWithIds.length === 0}
            activePart={activePart}
          />

          {questionsWithIds.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Headphones className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">Chưa có câu hỏi. Tạo khung 100 câu chuẩn TOEIC để bắt đầu nhập nội dung.</p>
              <Button type="button" icon={Headphones} onClick={() => generateSkeleton()}>
                Tạo khung 100 câu
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[min(70vh,720px)] overflow-y-auto pr-1">
              {indicesInPart.map((globalIdx) => {
                const q = questionsWithIds[globalIdx]
                if (!q) return null
                return (
                  <ToeicQuestionCard
                    key={q.id || globalIdx}
                    globalIndex={globalIdx}
                    question={q}
                    onUpdate={(updated) => updateAtIndex(globalIdx, updated)}
                  />
                )
              })}
            </div>
          )}
        </>
      )}

      <ToeicExcelImportReview
        isOpen={excelReviewOpen}
        onClose={() => setExcelReviewOpen(false)}
        skeletonQuestions={questionsWithIds}
        imageItems={imageItems}
        audioItems={audioItems}
        onApply={applyQuestions}
        templateVariant={excelTemplateVariant}
        exportAssignmentType={exportAssignmentType}
        questionsForExport={questionsPayloadForExport}
      />
    </div>
  )
}
