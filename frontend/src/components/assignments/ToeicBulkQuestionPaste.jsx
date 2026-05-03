import { useState, useContext, useEffect } from 'react'
import { FileText, Wand2 } from 'lucide-react'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import {
  parseBulkToeicQuestionLines,
  applyBulkRowsToQuestions,
  TOEIC_FULL_QUESTIONS,
  TOEIC_PART_RANGES,
} from '../../utils/toeicListening'

export default function ToeicBulkQuestionPaste({ questions, onApply, disabled, activePart = 1 }) {
  const [text, setText] = useState('')
  const [startQ, setStartQ] = useState(1)
  const { success, error: showError } = useContext(ToastContext)

  useEffect(() => {
    const r = TOEIC_PART_RANGES.find((x) => x.part === activePart)
    if (r) setStartQ(r.start + 1)
  }, [activePart])

  const handleApply = () => {
    const rows = parseBulkToeicQuestionLines(text)
    if (rows.length === 0) {
      showError('Không đọc được dòng nào. Kiểm tra định dạng (TAB hoặc |).')
      return
    }
    const startZero = Math.max(0, Math.min(TOEIC_FULL_QUESTIONS - 1, Number(startQ) - 1 || 0))
    const maxRows = TOEIC_FULL_QUESTIONS - startZero
    const slice = rows.slice(0, maxRows)
    const next = applyBulkRowsToQuestions(questions, slice, startZero)
    onApply(next)
    if (slice.length < rows.length) {
      success(
        `Đã nhập ${slice.length}/${rows.length} câu (đủ slot đến câu ${TOEIC_FULL_QUESTIONS}; phần còn lại bị bỏ qua).`
      )
    } else {
      success(`Đã nhập ${slice.length} câu vào vị trí ${startQ}–${startZero + slice.length}.`)
    }
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <FileText className="h-5 w-5 text-violet-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="font-semibold text-violet-900">Nhập nhanh câu hỏi & đáp án (theo thứ tự)</p>
          <p className="text-xs text-violet-800">
            Mỗi <strong>một dòng = một câu</strong>. Dùng <strong>TAB</strong> (copy từ Excel) hoặc ký tự{' '}
            <strong>|</strong>.
          </p>
          <ul className="text-xs text-violet-800 list-disc list-inside space-y-0.5">
            <li>
              <strong>4 lựa chọn:</strong> Nội dung câu [TAB] A [TAB] B [TAB] C [TAB] D [TAB] Đáp đúng (A/B/C/D)
            </li>
            <li>
              <strong>3 lựa chọn:</strong> Nội dung câu [TAB] A [TAB] B [TAB] C [TAB] Đáp đúng (A/B/C)
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-gray-700">
          Bắt đầu từ câu (1–100, tự khớp Part đang chọn)
          <input
            type="number"
            min={1}
            max={TOEIC_FULL_QUESTIONS}
            value={startQ}
            onChange={(e) => setStartQ(Number(e.target.value))}
            className="mt-1 block w-24 px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
          />
        </label>
        <Button
          type="button"
          size="sm"
          icon={Wand2}
          onClick={handleApply}
          disabled={disabled || !text.trim()}
        >
          Áp vào đề
        </Button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={`Ví dụ (4 đáp án):\nThey are discussing the budget\tOption A\tOption B\tOption C\tOption D\tA\n\nVí dụ (3 đáp án):\nWhere is the meeting?\tRoom 1\tRoom 2\tRoom 3\tB`}
        className="w-full px-3 py-2 rounded-lg border border-violet-200 text-sm font-mono focus:ring-2 focus:ring-violet-300"
      />
    </div>
  )
}
