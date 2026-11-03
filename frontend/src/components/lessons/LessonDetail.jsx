import { useCallback, useEffect, useState } from 'react'
import Modal from '../common/Modal'
import StatusBadge from '../common/StatusBadge'
import LessonStudyPanel from './LessonStudyPanel'
import { formatDate } from '../../utils/formatDate'
import { BookOpen, Calendar, Hash, FileText } from 'lucide-react'
import lessonProgressService from '../../services/lessonProgress.service'

const contentTypeMap = {
  text: 'Văn bản',
  video: 'Video',
  file: 'Tệp tin',
}

export default function LessonDetail({ isOpen, onClose, lesson }) {
  const [progress, setProgress] = useState(null)

  const loadProgress = useCallback(async () => {
    if (!lesson?.id) return
    try {
      const res = await lessonProgressService.getOne(lesson.id)
      setProgress(res.data?.data ?? res.data ?? null)
    } catch {
      setProgress(null)
    }
  }, [lesson?.id])

  useEffect(() => {
    if (isOpen) loadProgress()
  }, [isOpen, loadProgress])

  if (!lesson) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Học bài" size="full">
      <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold text-gray-900">{lesson.title}</h3>
          <StatusBadge
            status={lesson.is_published ? 'active' : 'inactive'}
            label={lesson.is_published ? 'Đã xuất bản' : 'Nháp'}
          />
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-gray-400" />
            <span>Lớp: {lesson.class?.name || lesson.class_name || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-gray-400" />
            <span>Loại: {contentTypeMap[lesson.content_type] || lesson.content_type || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Hash className="h-4 w-4 text-gray-400" />
            <span>Thứ tự: {lesson.order_index ?? '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>{formatDate(lesson.created_at)}</span>
          </div>
        </div>

        <LessonStudyPanel
          lesson={lesson}
          progress={progress}
          onSave={async (payload) => {
            const res = await lessonProgressService.save(lesson.id, payload)
            const row = res.data?.data ?? res.data
            setProgress(row)
          }}
        />
      </div>
    </Modal>
  )
}
