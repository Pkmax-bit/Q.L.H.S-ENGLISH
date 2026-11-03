import { getUnitStudy } from '../data/tcoStudyBank'
import { enrichQuestion, getUnitAssets, LISTENING_UNITS } from '../data/tcoLessonAssets'
import { getLessonMedia } from '../data/lessonMedia'
import { parseTcoLesson, TCO_UNITS } from './lessonCurriculum'

function selectQuestions(bank, kind) {
  const questions = bank?.questions || []
  if (!questions.length) return []
  if (bank?.byKind?.[kind]) return questions
  if (kind === 'Mini Test') return questions
  if (kind === 'Mở rộng') return questions.slice(-4)
  if (kind === 'Bài 2') return questions.slice(1, 5)
  if (kind === 'Bài 3' || kind === 'Từ vựng') return questions.slice(0, 4)
  return questions.slice(0, 5)
}

export function buildLessonStudy(lesson) {
  const parsed = parseTcoLesson(lesson)
  const unitMeta = parsed ? TCO_UNITS[parsed.unit] || null : null
  const bank = parsed ? getUnitStudy(parsed.unit, parsed.kind) : null
  const vocab = bank?.vocab || []
  const rawQuestions = selectQuestions(bank, parsed?.kind)
  const questions = rawQuestions.map((item, idx) => enrichQuestion(item, parsed?.unit, idx))
  const speak = bank?.speak || (parsed ? 'Nói 20 giây tóm tắt ý chính của bài này.' : 'Nói 20 giây tóm tắt bài học.')
  const write = bank?.write || 'Viết 3–5 câu tóm tắt những gì bạn vừa học và một việc bạn sẽ luyện thêm.'
  const assets = parsed ? getUnitAssets(parsed.unit) : null
  const media = getLessonMedia(lesson)
  const isListening = parsed ? LISTENING_UNITS.has(parsed.unit) : false
  const isPhoto = media.images.length > 0

  const steps = [
    { id: 'learn', label: 'Học', skill: isListening ? 'Nghe' : 'Đọc' },
    vocab.length ? { id: 'vocab', label: 'Từ vựng', skill: 'Đọc' } : null,
    questions.length ? { id: 'practice', label: 'Luyện', skill: unitMeta?.skill || 'Đọc' } : null,
    { id: 'speak', label: 'Nói', skill: 'Nói' },
    { id: 'write', label: 'Viết', skill: 'Viết' },
    { id: 'result', label: 'Kết quả', skill: 'Tổng kết' },
  ].filter(Boolean)

  return {
    parsed,
    unitMeta,
    vocab,
    questions,
    speak,
    write,
    steps,
    isListening,
    isPhoto,
    sampleAudio: assets?.sample || '',
    media,
  }
}

export function scoreVocab(vocab, answers = {}) {
  let correct = 0
  vocab.forEach((item) => {
    const typed = String(answers[item.word] || '').trim().toLowerCase()
    if (typed && typed === item.word.toLowerCase()) correct += 1
  })
  return { correct, total: vocab.length }
}

export function scorePractice(questions, answers = {}) {
  let correct = 0
  questions.forEach((item, idx) => {
    if (Number(answers[idx]) === item.answer) correct += 1
  })
  return { correct, total: questions.length }
}

export function isStepComplete(stepId, study, answers = {}) {
  if (stepId === 'learn') return Boolean(answers.learnDone)
  if (stepId === 'vocab') {
    const { correct, total } = scoreVocab(study.vocab, answers.vocab)
    return total > 0 && correct === total
  }
  if (stepId === 'practice') return Boolean(answers.practiceChecked)
  if (stepId === 'speak') return Boolean(answers.speakDone)
  if (stepId === 'write') return String(answers.write || '').trim().length >= 12
  if (stepId === 'result') return Boolean(answers.completed)
  return false
}
