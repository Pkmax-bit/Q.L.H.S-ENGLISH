import { useState } from 'react'
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
import { GripVertical, Plus, Trash2, CirclePlus, X, Check } from 'lucide-react'
import Button from '../common/Button'
import Input from '../common/Input'
import Select from '../common/Select'

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

export default function QuestionBuilder({ questions = [], onChange }) {
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

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">
          Câu hỏi ({questionsWithIds.length})
        </h4>
        <Button size="sm" icon={Plus} onClick={addQuestion}>
          Thêm câu hỏi
        </Button>
      </div>

      {questionsWithIds.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          Chưa có câu hỏi. Nhấn &quot;Thêm câu hỏi&quot; để bắt đầu.
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
