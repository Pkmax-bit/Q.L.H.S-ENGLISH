import { useState, useContext } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import Button from '../common/Button'
import { ToastContext } from '../../context/ToastContext'
import assignmentsService from '../../services/assignments.service'
import ToeicListeningQuestionBuilder from './ToeicListeningQuestionBuilder'
import ToeicReadingQuestionBuilder from './ToeicReadingQuestionBuilder'
import ToeicSWBuilder from './ToeicSWBuilder'
import {
  ASSIGNMENT_TYPE_TOEIC_FOUR_SKILLS,
  TOEIC_LISTENING_COUNT,
  TOEIC_LR_TOTAL,
  TOEIC_SPEAKING_COUNT,
} from '../../utils/toeicExamConfig'

export default function ToeicMultiSectionBuilder({ assignmentType, questions = [], onChange }) {
  const { success: toastOk, error: toastErr } = useContext(ToastContext)
  const isFour = assignmentType === ASSIGNMENT_TYPE_TOEIC_FOUR_SKILLS

  const listen = questions.slice(0, TOEIC_LISTENING_COUNT)
  const read = questions.slice(TOEIC_LISTENING_COUNT, TOEIC_LR_TOTAL)
  const speak = isFour ? questions.slice(TOEIC_LR_TOTAL, TOEIC_LR_TOTAL + TOEIC_SPEAKING_COUNT) : []
  const write = isFour ? questions.slice(TOEIC_LR_TOTAL + TOEIC_SPEAKING_COUNT) : []

  const patchListen = (lq) => {
    const rest = questions.slice(TOEIC_LISTENING_COUNT)
    onChange([...lq, ...rest])
  }

  const patchRead = (rq) => {
    const head = questions.slice(0, TOEIC_LISTENING_COUNT)
    const tail = isFour ? questions.slice(TOEIC_LR_TOTAL) : []
    onChange([...head, ...rq, ...tail])
  }

  const patchSpeak = (sq) => {
    const head = questions.slice(0, TOEIC_LR_TOTAL)
    const w = questions.slice(TOEIC_LR_TOTAL + TOEIC_SPEAKING_COUNT)
    onChange([...head, ...sq, ...w])
  }

  const patchWrite = (wq) => {
    const head = questions.slice(0, TOEIC_LR_TOTAL + TOEIC_SPEAKING_COUNT)
    onChange([...head, ...wq])
  }

  const [mainTab, setMainTab] = useState('listen')

  const exportType = isFour ? 'toeic_four_skills' : 'toeic_lr'
  const exportFilename =
    exportType === 'toeic_four_skills'
      ? 'toeic-4-ky-nang-cau-hoi-media.xlsx'
      : 'toeic-nghe-doc-cau-hoi-media.xlsx'

  const handleExportFullPaper = async () => {
    if (!questions.length) {
      toastErr('Chưa có câu hỏi.')
      return
    }
    try {
      const res = await assignmentsService.exportQuestionsExcel({
        questions,
        assignment_type: exportType,
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
      toastOk('Đã tải Excel — có STT, sheet theo Part, cột tên file media.')
    } catch (e) {
      toastErr(e.response?.data?.message || 'Không xuất được Excel')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
        <p className="text-xs text-gray-600">
          Xuất nhanh toàn đề (gồm Đọc + Nghe{isFour ? ' + Nói/Viết' : ''}) để đối chiếu tên file và nội dung trong Excel.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          icon={FileSpreadsheet}
          onClick={handleExportFullPaper}
          disabled={!questions.length}
        >
          Xuất toàn bộ ra Excel
        </Button>
      </div>
      <div className="flex flex-wrap rounded-xl border border-indigo-200 bg-indigo-50/50 p-1 gap-1">
        <button
          type="button"
          onClick={() => setMainTab('listen')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            mainTab === 'listen' ? 'bg-white shadow text-indigo-800' : 'text-gray-600'
          }`}
        >
          Nghe — 100 câu
        </button>
        <button
          type="button"
          onClick={() => setMainTab('read')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            mainTab === 'read' ? 'bg-white shadow text-emerald-800' : 'text-gray-600'
          }`}
        >
          Đọc — 100 câu
        </button>
        {isFour && (
          <button
            type="button"
            onClick={() => setMainTab('sw')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              mainTab === 'sw' ? 'bg-white shadow text-violet-800' : 'text-gray-600'
            }`}
          >
            Nói & Viết — 19 bài
          </button>
        )}
      </div>

      {mainTab === 'listen' && (
        <ToeicListeningQuestionBuilder
          questions={listen}
          onChange={patchListen}
          excelTemplateVariant={isFour ? 'toeic_four_skills' : 'toeic_lr'}
          exportAssignmentType={isFour ? 'toeic_four_skills' : 'toeic_lr'}
          allQuestionsForExport={questions}
        />
      )}
      {mainTab === 'read' && (
        <ToeicReadingQuestionBuilder questions={read} onChange={patchRead} />
      )}
      {isFour && mainTab === 'sw' && (
        <ToeicSWBuilder
          speakingQuestions={speak}
          writingQuestions={write}
          onChangeSpeaking={patchSpeak}
          onChangeWriting={patchWrite}
        />
      )}
    </div>
  )
}
