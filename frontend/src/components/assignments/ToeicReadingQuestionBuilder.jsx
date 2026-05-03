import { useState, useMemo } from 'react'
import { BookOpen, RefreshCw, Info, Check, Plus, Trash2 } from 'lucide-react'
import Button from '../common/Button'
import Input from '../common/Input'
import RichContentViewer from '../common/RichContentViewer'
import {
  TOEIC_READING_QUESTIONS,
  READING_PART_RANGES,
  buildToeicReadingSkeletonQuestions,
  getToeicReadingMeta,
} from '../../utils/toeicReading'
import { mediaFileNameFromUrl } from '../../utils/mediaUrl'
import { MCQ_OPTION_COUNT_MAX, MCQ_OPTION_COUNT_MIN, mcqLetter } from '../../utils/assignmentHelpers'

function qText(q) {
  return q.text || q.question_text || ''
}

function ReadingQuestionCard({ globalIndex, question, onUpdate }) {
  const meta = getToeicReadingMeta(globalIndex)
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
    onUpdate({
      ...question,
      options: opts.filter((_, i) => i !== optIdx),
    })
  }

  return (
    <div className="border border-emerald-200 rounded-xl p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-sm font-bold text-emerald-800">
          Reading · Câu {globalIndex + 1}
          <span className="font-normal text-gray-500 ml-2">
            · {meta.label}
            {meta.part === 6 && meta.groupIndex != null && (
              <span className="text-xs"> (đoạn {(meta.groupIndex ?? 0) + 1})</span>
            )}
          </span>
        </span>
      </div>

      {meta.part === 6 && meta.indexInGroup > 0 && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-3">
          Cùng đoạn văn với các chỗ trống trước trong nhóm — chỉnh nội dung đoạn ở câu đầu nhóm nếu cần.
        </p>
      )}

      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">Nội dung / đoạn / câu hỏi (HTML được)</label>
        <textarea
          value={stem}
          onChange={(e) => {
            const v = e.target.value
            onUpdate({ ...question, text: v, question_text: v })
          }}
          rows={meta.part === 7 ? 5 : 3}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 font-mono text-xs"
          placeholder="Nhập câu hỏi / đoạn có chỗ trống (____)…"
        />
        {stem && stem.includes('<') && (
          <div className="mt-2 text-sm border rounded-lg p-2 bg-gray-50">
            <RichContentViewer content={stem} />
          </div>
        )}
      </div>

      {meta.part === 7 && (
        <div className="mb-3">
          <Input
            label="URL ảnh / biểu đồ (tuỳ chọn — Part 7)"
            value={question.file_url || ''}
            onChange={(e) => handleChange('file_url', e.target.value)}
            placeholder="https://..."
          />
          {question.file_url?.trim() && (
            <p className="text-xs text-gray-500 mt-1.5">
              Tên media: <span className="font-medium text-gray-800 break-all">{mediaFileNameFromUrl(question.file_url)}</span>
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-gray-600">Đáp án — chọn đúng một phương án</p>
          <p className="text-[11px] text-gray-500">
            {opts.length} phương án · {MCQ_OPTION_COUNT_MIN}–{MCQ_OPTION_COUNT_MAX} lựa chọn
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
            >
              {opt.is_correct && <Check className="h-3 w-3" />}
            </button>
            <span className="text-xs font-semibold text-gray-500 w-5">{mcqLetter(optIdx)}</span>
            <input
              type="text"
              value={opt.text || ''}
              onChange={(e) => handleOptionChange(optIdx, 'text', e.target.value)}
              placeholder={`Đáp án ${mcqLetter(optIdx)}`}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-40 disabled:pointer-events-none"
        >
          <Plus className="h-3.5 w-3.5" /> Thêm đáp án
        </button>
      </div>
    </div>
  )
}

export default function ToeicReadingQuestionBuilder({ questions = [], onChange }) {
  const [activePart, setActivePart] = useState(5)

  const questionsWithIds = questions.map((q, i) => ({
    ...q,
    id: q.id || `toeic_r_${i}`,
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
      if (!window.confirm('Tạo khung 100 câu Reading mới? Nội dung hiện tại sẽ bị thay thế.')) return
    }
    const base = buildToeicReadingSkeletonQuestions()
    const ts = Date.now()
    const next = base.map((q, i) => ({
      ...q,
      id: `toeic_r_${ts}_${i}`,
    }))
    applyQuestions(next)
  }

  const range = READING_PART_RANGES.find((r) => r.part === activePart)
  const indicesInPart = useMemo(() => {
    if (!range) return []
    const out = []
    for (let i = range.start; i <= range.end; i++) out.push(i)
    return out
  }, [range])

  const countOk = questionsWithIds.length === TOEIC_READING_QUESTIONS

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-emerald-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-950 space-y-1">
            <p className="font-semibold">TOEIC Reading — 100 câu</p>
            <p className="text-emerald-900/90">
              Part 5: 30 câu · Part 6: 16 câu (4 đoạn × 4 chỗ trống) · Part 7: 54 câu.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="flex flex-wrap sm:flex-nowrap divide-y sm:divide-y-0 sm:divide-x divide-gray-100 border-b border-gray-100 bg-gradient-to-b from-emerald-50/40 to-white">
          {READING_PART_RANGES.map((r) => {
            const on = activePart === r.part
            const shortTitle = r.label.replace(/^Part \d+ — /, '')
            return (
              <button
                key={r.part}
                type="button"
                onClick={() => setActivePart(r.part)}
                className={`flex-1 min-w-[130px] px-3 py-3 text-left transition-colors ${
                  on
                    ? 'bg-white ring-2 ring-inset ring-emerald-500 z-[1]'
                    : 'hover:bg-emerald-50/60 text-gray-700'
                }`}
              >
                <span className={`text-[11px] font-bold uppercase tracking-wide ${on ? 'text-emerald-800' : 'text-gray-500'}`}>
                  Part {r.part}
                </span>
                <span className={`block text-sm font-semibold mt-0.5 leading-snug ${on ? 'text-gray-900' : 'text-gray-700'}`}>
                  {shortTitle}
                </span>
                <span className="block text-[11px] text-gray-500 mt-1">
                  Câu {r.start + 1}–{r.end + 1}
                </span>
              </button>
            )
          })}
        </div>
        {range && (
          <div className="px-4 py-2.5 bg-emerald-50/70 border-t border-emerald-100 text-xs text-emerald-950">
            <span className="font-semibold text-emerald-800">Part {activePart}:</span> {range.note}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${
            countOk ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'
          }`}
        >
          {questionsWithIds.length}/{TOEIC_READING_QUESTIONS} câu Reading
        </span>
        <Button type="button" size="sm" variant="outline" icon={RefreshCw} onClick={() => generateSkeleton()}>
          {questionsWithIds.length === 0 ? 'Tạo khung 100 câu Reading' : 'Làm mới khung 100 câu'}
        </Button>
      </div>

      {questionsWithIds.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-3">Tạo khung 100 câu để nhập Reading.</p>
          <Button type="button" icon={BookOpen} onClick={() => generateSkeleton()}>
            Tạo khung 100 câu Reading
          </Button>
        </div>
      ) : (
        <div className="space-y-3 max-h-[min(70vh,720px)] overflow-y-auto pr-1">
          {indicesInPart.map((globalIdx) => {
            const q = questionsWithIds[globalIdx]
            if (!q) return null
            return (
              <ReadingQuestionCard
                key={q.id || globalIdx}
                globalIndex={globalIdx}
                question={q}
                onUpdate={(updated) => updateAtIndex(globalIdx, updated)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
