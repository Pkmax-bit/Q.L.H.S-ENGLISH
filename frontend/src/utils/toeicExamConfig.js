import { buildToeicListeningSkeletonQuestions } from './toeicListening'
import { buildToeicReadingSkeletonQuestions } from './toeicReading'

/** @typedef {'listening'|'reading'|'speaking'|'writing'} ToeicSkill */

export const ASSIGNMENT_TYPE_TOEIC_LR = 'toeic_lr'
export const ASSIGNMENT_TYPE_TOEIC_FOUR_SKILLS = 'toeic_four_skills'

export const TOEIC_LISTENING_COUNT = 100
export const TOEIC_READING_COUNT = 100
export const TOEIC_SPEAKING_COUNT = 11
export const TOEIC_WRITING_COUNT = 8

export const TOEIC_LR_TOTAL = TOEIC_LISTENING_COUNT + TOEIC_READING_COUNT
export const TOEIC_FOUR_SKILLS_TOTAL =
  TOEIC_LR_TOTAL + TOEIC_SPEAKING_COUNT + TOEIC_WRITING_COUNT

/** Thuyết minh + read aloud */
export const SPEAKING_TASK_BLUEPRINT = [
  { order: 1, task_code: 'read_aloud', prep_seconds: 45, answer_seconds: 45, label: 'Read a text aloud' },
  { order: 2, task_code: 'read_aloud', prep_seconds: 45, answer_seconds: 45, label: 'Read a text aloud' },
  { order: 3, task_code: 'describe_picture', prep_seconds: 45, answer_seconds: 45, label: 'Describe a picture' },
  { order: 4, task_code: 'describe_picture', prep_seconds: 45, answer_seconds: 45, label: 'Describe a picture' },
  { order: 5, task_code: 'respond_question', prep_seconds: 3, answer_seconds: 15, label: 'Respond to question' },
  { order: 6, task_code: 'respond_question', prep_seconds: 3, answer_seconds: 15, label: 'Respond to question' },
  { order: 7, task_code: 'respond_question', prep_seconds: 3, answer_seconds: 30, label: 'Respond to question' },
  { order: 8, task_code: 'respond_with_info', prep_seconds: 45, answer_seconds: 15, label: 'Respond using information', shared_doc: true },
  { order: 9, task_code: 'respond_with_info', prep_seconds: 45, answer_seconds: 30, label: 'Respond using information', shared_doc: true },
  { order: 10, task_code: 'respond_with_info', prep_seconds: 45, answer_seconds: 30, label: 'Respond using information', shared_doc: true },
  { order: 11, task_code: 'express_opinion', prep_seconds: 45, answer_seconds: 60, label: 'Express an opinion' },
]

export const WRITING_TASK_BLUEPRINT = [
  { order: 1, task_code: 'write_sentence', time_minutes: 8, label: 'Write a sentence (picture + 2 keywords)' },
  { order: 2, task_code: 'write_sentence', time_minutes: 8, label: 'Write a sentence' },
  { order: 3, task_code: 'write_sentence', time_minutes: 8, label: 'Write a sentence' },
  { order: 4, task_code: 'write_sentence', time_minutes: 8, label: 'Write a sentence' },
  { order: 5, task_code: 'write_sentence', time_minutes: 8, label: 'Write a sentence' },
  { order: 6, task_code: 'reply_email', time_minutes: 10, label: 'Respond to an email' },
  { order: 7, task_code: 'reply_email', time_minutes: 10, label: 'Respond to an email' },
  { order: 8, task_code: 'opinion_essay', time_minutes: 30, label: 'Write an opinion essay' },
]

function withIds(rows, prefix, ts) {
  return rows.map((q, i) => ({
    ...q,
    id: `${prefix}_${ts}_${i}`,
  }))
}

export function buildSpeakingSkeletonQuestions(ts = Date.now()) {
  return SPEAKING_TASK_BLUEPRINT.map((bp, i) => ({
    text: `[Speaking ${bp.order}] ${bp.label}`,
    question_text: `[Speaking ${bp.order}] ${bp.label}`,
    question_type: 'toeic_speaking',
    points: 1,
    options: [],
    correct_answer: '',
    file_url: '',
    youtube_url: '',
    toeic_meta: {
      skill: 'speaking',
      task_order: bp.order,
      task_code: bp.task_code,
      prep_seconds: bp.prep_seconds,
      answer_seconds: bp.answer_seconds,
      shared_stimulus: bp.shared_doc || false,
      label_en: bp.label,
    },
    id: `toeic_sp_${ts}_${i}`,
  }))
}

export function buildWritingSkeletonQuestions(ts = Date.now()) {
  return WRITING_TASK_BLUEPRINT.map((bp, i) => ({
    text: `[Writing ${bp.order}] ${bp.label}`,
    question_text: `[Writing ${bp.order}] ${bp.label}`,
    question_type: 'toeic_writing',
    points: 1,
    options: [],
    correct_answer: '',
    file_url: '',
    youtube_url: '',
    toeic_meta: {
      skill: 'writing',
      task_order: bp.order,
      task_code: bp.task_code,
      time_minutes: bp.time_minutes,
      label_en: bp.label,
    },
    id: `toeic_wr_${ts}_${i}`,
  }))
}

export function buildToeicLRSkeletonQuestions(ts = Date.now()) {
  const L = buildToeicListeningSkeletonQuestions()
  const R = buildToeicReadingSkeletonQuestions()
  const merged = [...L, ...R].map((q, i) => ({
    ...q,
    toeic_meta: {
      skill: i < TOEIC_LISTENING_COUNT ? 'listening' : 'reading',
      section_index: i,
    },
    id: `toeic_lr_${ts}_${i}`,
  }))
  return merged
}

export function buildToeicFourSkillsSkeletonQuestions(ts = Date.now()) {
  const lr = buildToeicLRSkeletonQuestions(ts)
  const speak = buildSpeakingSkeletonQuestions(ts)
  const write = buildWritingSkeletonQuestions(ts)
  return [
    ...lr.map((q, i) => ({ ...q, id: `toeic4_${ts}_${i}` })),
    ...speak.map((q, i) => ({ ...q, id: `toeic4_${ts}_${TOEIC_LR_TOTAL + i}` })),
    ...write.map((q, i) => ({
      ...q,
      id: `toeic4_${ts}_${TOEIC_LR_TOTAL + TOEIC_SPEAKING_COUNT + i}`,
    })),
  ]
}

/** Global index (0-based) → kỹ năng */
export function getSkillAtIndex(globalIndex) {
  if (globalIndex < TOEIC_LISTENING_COUNT) return 'listening'
  if (globalIndex < TOEIC_LR_TOTAL) return 'reading'
  if (globalIndex < TOEIC_LR_TOTAL + TOEIC_SPEAKING_COUNT) return 'speaking'
  return 'writing'
}
