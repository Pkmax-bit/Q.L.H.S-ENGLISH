import { useState } from 'react'
import { Mic, PenLine } from 'lucide-react'
import Input from '../common/Input'
import {
  SPEAKING_TASK_BLUEPRINT,
  WRITING_TASK_BLUEPRINT,
} from '../../utils/toeicExamConfig'
import { mediaFileNameFromUrl } from '../../utils/mediaUrl'

/**
 * Soạn nhanh câu hỏi Speaking / Writing — đầy đủ logic timer trong toeic_meta (đã tạo khi sinh khung).
 */
export default function ToeicSWBuilder({ speakingQuestions = [], writingQuestions = [], onChangeSpeaking, onChangeWriting }) {
  const [tab, setTab] = useState('speaking')

  const updateSpeak = (idx, patch) => {
    const copy = [...speakingQuestions]
    copy[idx] = { ...copy[idx], ...patch }
    if (patch.question_text !== undefined || patch.text !== undefined) {
      const t = patch.question_text ?? patch.text
      copy[idx].question_text = t
      copy[idx].text = t
    }
    onChangeSpeaking(copy)
  }

  const updateWrite = (idx, patch) => {
    const copy = [...writingQuestions]
    copy[idx] = { ...copy[idx], ...patch }
    if (patch.question_text !== undefined || patch.text !== undefined) {
      const t = patch.question_text ?? patch.text
      copy[idx].question_text = t
      copy[idx].text = t
    }
    onChangeWriting(copy)
  }

  return (
    <div className="space-y-4">
      <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
        <button
          type="button"
          onClick={() => setTab('speaking')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'speaking' ? 'bg-white text-violet-800 shadow-sm border border-gray-100' : 'text-gray-600'
          }`}
        >
          <Mic className="h-4 w-4" /> Speaking ({speakingQuestions.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('writing')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'writing' ? 'bg-white text-violet-800 shadow-sm border border-gray-100' : 'text-gray-600'
          }`}
        >
          <PenLine className="h-4 w-4" /> Writing ({writingQuestions.length})
        </button>
      </div>

      {tab === 'speaking' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Ghi âm trả lời khi làm bài. Chuẩn bị / trả lời (giây): xem từng thẻ — khớp blueprint ETS-style.
          </p>
          {speakingQuestions.map((q, idx) => {
            const bp = SPEAKING_TASK_BLUEPRINT[idx]
            const meta = q.toeic_meta || {}
            return (
              <div key={q.id || idx} className="border border-violet-200 rounded-xl p-4 bg-white space-y-3">
                <div className="flex justify-between flex-wrap gap-2">
                  <span className="text-sm font-bold text-violet-900">
                    Speaking {bp?.order ?? idx + 1} — {bp?.label || meta.label_en}
                  </span>
                  <span className="text-xs text-violet-700">
                    Prep {meta.prep_seconds ?? bp?.prep_seconds}s · Trả lời {meta.answer_seconds ?? bp?.answer_seconds}s
                  </span>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Yêu cầu / đoạn đọc / prompt</label>
                  <textarea
                    value={q.question_text || q.text || ''}
                    onChange={(e) => updateSpeak(idx, { question_text: e.target.value, text: e.target.value })}
                    rows={bp?.task_code === 'read_aloud' ? 5 : 3}
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg border-gray-200"
                  />
                </div>
                <Input
                  label="URL stimulus (ảnh / tài liệu — tuỳ loại)"
                  value={q.file_url || ''}
                  onChange={(e) => updateSpeak(idx, { file_url: e.target.value })}
                />
                {q.file_url?.trim() && (
                  <p className="text-xs text-gray-500 -mt-2">
                    Tên media: <span className="font-medium text-gray-800 break-all">{mediaFileNameFromUrl(q.file_url)}</span>
                  </p>
                )}
                <Input
                  label="URL âm thanh câu hỏi (Part hỏi bằng audio)"
                  value={q.youtube_url || ''}
                  onChange={(e) => updateSpeak(idx, { youtube_url: e.target.value })}
                />
                {q.youtube_url?.trim() && (
                  <p className="text-xs text-gray-500 -mt-2">
                    Tên media: <span className="font-medium text-gray-800 break-all">{mediaFileNameFromUrl(q.youtube_url)}</span>
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'writing' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Viết theo thời gian giới hạn từng bài. Essay có đếm từ khi làm bài.
          </p>
          {writingQuestions.map((q, idx) => {
            const bp = WRITING_TASK_BLUEPRINT[idx]
            const meta = q.toeic_meta || {}
            return (
              <div key={q.id || idx} className="border border-sky-200 rounded-xl p-4 bg-white space-y-3">
                <div className="flex justify-between flex-wrap gap-2">
                  <span className="text-sm font-bold text-sky-900">
                    Writing {bp?.order ?? idx + 1} — {bp?.label || meta.label_en}
                  </span>
                  <span className="text-xs text-sky-700">
                    Thời gian đề xuất: {meta.time_minutes ?? bp?.time_minutes} phút
                  </span>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Đề bài / email / chủ đề</label>
                  <textarea
                    value={q.question_text || q.text || ''}
                    onChange={(e) => updateWrite(idx, { question_text: e.target.value, text: e.target.value })}
                    rows={bp?.task_code === 'opinion_essay' ? 6 : 4}
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg border-gray-200"
                  />
                </div>
                {(bp?.task_code === 'write_sentence' || meta.task_code === 'write_sentence') && (
                  <Input
                    label="2 từ khóa bắt buộc (phân cách bằng dấu phẩy)"
                    value={(Array.isArray(meta.keywords) ? meta.keywords : []).join(', ')}
                    onChange={(e) => {
                      const kw = e.target.value.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
                      const row = writingQuestions[idx]
                      const m = row?.toeic_meta || {}
                      updateWrite(idx, { toeic_meta: { ...m, keywords: kw } })
                    }}
                  />
                )}
                <Input
                  label="URL ảnh minh họa (write a sentence)"
                  value={q.file_url || ''}
                  onChange={(e) => updateWrite(idx, { file_url: e.target.value })}
                />
                {q.file_url?.trim() && (
                  <p className="text-xs text-gray-500 -mt-2">
                    Tên media: <span className="font-medium text-gray-800 break-all">{mediaFileNameFromUrl(q.file_url)}</span>
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
