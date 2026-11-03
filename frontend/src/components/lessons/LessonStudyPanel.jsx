import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen, CheckCircle2, Headphones, Mic, Pause, PenLine, RotateCcw, Volume2,
} from 'lucide-react'
import RichContentViewer from '../common/RichContentViewer'
import { buildLessonStudy, isStepComplete, scorePractice, scoreVocab } from '../../utils/lessonStudy'
import { resolveUploadUrl } from '../../utils/uploadUrl'
import { speakEnglish, stopSpeech } from '../../utils/speech'

const STEP_ICONS = {
  learn: BookOpen,
  vocab: Volume2,
  practice: Headphones,
  speak: Mic,
  write: PenLine,
  result: CheckCircle2,
}

export default function LessonStudyPanel({
  lesson,
  progress,
  onSave,
  footer,
}) {
  const study = useMemo(() => buildLessonStudy(lesson), [lesson])
  const [stepId, setStepId] = useState(progress?.current_step || 'learn')
  const [answers, setAnswers] = useState(() => progress?.answers || {})
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef(null)

  useEffect(() => {
    setAnswers(progress?.answers || {})
    setStepId(progress?.current_step || 'learn')
    return () => stopSpeech()
  }, [lesson?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const persist = (nextAnswers, extra = {}) => {
    if (!onSave) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        const completedSteps = study.steps
          .filter((step) => step.id !== 'result' && isStepComplete(step.id, study, nextAnswers))
          .map((step) => step.id)
        const practice = scorePractice(study.questions, nextAnswers.practice)
        await onSave({
          current_step: extra.current_step || stepId,
          answers: nextAnswers,
          completed_steps: completedSteps,
          practice_score: practice.total ? practice.correct : null,
          practice_total: practice.total || null,
          status: extra.status || (nextAnswers.completed ? 'completed' : 'in_progress'),
        })
      } finally {
        setSaving(false)
      }
    }, 250)
  }

  const updateAnswers = (patch, extra) => {
    setAnswers((prev) => {
      const next = { ...prev, ...patch }
      persist(next, extra)
      return next
    })
  }

  const goTo = (id) => {
    setStepId(id)
    persist(answers, { current_step: id })
  }

  const currentIndex = Math.max(0, study.steps.findIndex((step) => step.id === stepId))
  const current = study.steps[currentIndex] || study.steps[0]
  const media = study.media

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {study.steps.map((step, idx) => {
          const Icon = STEP_ICONS[step.id] || BookOpen
          const done = isStepComplete(step.id, study, answers)
          const active = step.id === current.id
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => goTo(step.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                active
                  ? 'bg-amber-500 text-white border-amber-500'
                  : done
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {idx + 1}. {step.label}
              <span className="opacity-80">· {step.skill}</span>
            </button>
          )
        })}
      </div>

      {saving && <p className="text-xs text-gray-400">Đang lưu tiến độ…</p>}

      {current.id === 'learn' && (
        <section className="space-y-4">
          {study.unitMeta && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">{study.parsed?.kind} · {study.unitMeta.topic}</p>
              <p className="text-amber-800 mt-0.5">Kỹ năng chính: {study.unitMeta.skill}. Làm lần lượt Học → Từ vựng → Luyện → Nói → Viết.</p>
            </div>
          )}
          <LessonMediaBlock
            media={media}
            title={lesson.title}
            sampleAudio={study.sampleAudio || media.sampleAudio}
            isListening={study.isListening}
            isPhoto={study.isPhoto}
          />
          {lesson.content && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
              <RichContentViewer content={lesson.content} />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              updateAnswers({ learnDone: true }, { current_step: study.steps[1]?.id || 'result' })
              goTo(study.steps[1]?.id || 'result')
            }}
            className="px-4 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600"
          >
            Đã đọc xong — sang bước sau
          </button>
        </section>
      )}

      {current.id === 'vocab' && (
        <VocabStep
          vocab={study.vocab}
          values={answers.vocab || {}}
          image={media.images[0]?.url}
          onChange={(vocab) => updateAnswers({ vocab })}
          onFinish={() => goTo('practice')}
        />
      )}

      {current.id === 'practice' && (
        <PracticeStep
          questions={study.questions}
          values={answers.practice || {}}
          checked={Boolean(answers.practiceChecked)}
          isListening={study.isListening}
          onChange={(practice) => updateAnswers({ practice, practiceChecked: false })}
          onCheck={() => updateAnswers({ practiceChecked: true })}
          onFinish={() => goTo('speak')}
        />
      )}

      {current.id === 'speak' && (
        <SpeakStep
          prompt={study.speak}
          done={Boolean(answers.speakDone)}
          onDone={() => updateAnswers({ speakDone: true })}
          onFinish={() => goTo('write')}
        />
      )}

      {current.id === 'write' && (
        <WriteStep
          prompt={study.write}
          value={answers.write || ''}
          onChange={(write) => updateAnswers({ write })}
          onFinish={() => goTo('result')}
        />
      )}

      {current.id === 'result' && (
        <ResultStep
          study={study}
          answers={answers}
          onComplete={() => updateAnswers({ completed: true, learnDone: true }, { status: 'completed', current_step: 'result' })}
        />
      )}

      {footer}
    </div>
  )
}

function mediaSrc(url) {
  if (!url) return ''
  if (url.startsWith('/lesson-media/')) return url
  return resolveUploadUrl(url)
}

function AudioPlayButton({ text, label = 'Phát âm thanh', className = '' }) {
  const [playing, setPlaying] = useState(false)
  if (!text) return null

  const toggle = () => {
    if (playing) {
      stopSpeech()
      setPlaying(false)
      return
    }
    setPlaying(true)
    const ok = speakEnglish(text, {
      onend: () => setPlaying(false),
      onerror: () => setPlaying(false),
    })
    if (!ok) setPlaying(false)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
        playing ? 'bg-red-600 text-white' : 'bg-sky-600 text-white hover:bg-sky-700'
      } ${className}`}
    >
      {playing ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      {playing ? 'Dừng' : label}
    </button>
  )
}

function isHomemadeMedia(url) {
  return /\/lesson-media\/(scenes\/|unit-\d+)/i.test(String(url || ''))
}

function LessonMediaBlock({ media, title, sampleAudio, isListening, isPhoto }) {
  if (!media) return null
  const showImages = (media.images || []).filter((img) => !isHomemadeMedia(img.url))

  return (
    <div className="space-y-3">
      {isListening && sampleAudio && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-sky-900">Audio bài nghe</p>
            <p className="text-xs text-sky-800 mt-0.5">Bấm phát để nghe giọng tiếng Anh của bài (loa máy phải bật).</p>
          </div>
          <AudioPlayButton text={sampleAudio} label="Nghe mẫu" />
        </div>
      )}
      {showImages.map((img) => (
        <figure key={img.url} className="rounded-2xl overflow-hidden border border-amber-200 bg-amber-50">
          <img src={mediaSrc(img.url)} alt={img.caption || title} className="w-full max-h-[380px] object-contain bg-white" />
          {img.caption && <figcaption className="px-4 py-2 text-xs font-medium text-amber-900">{img.caption}</figcaption>}
        </figure>
      ))}
      {(media.youtubeId || media.videoFile || media.extraVideos?.length) && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Video bài giảng</p>
          {media.youtubeId && (
            <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
              <iframe
                src={`https://www.youtube.com/embed/${media.youtubeId}`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          )}
          {media.videoFile && (
            <video controls src={mediaSrc(media.videoFile)} className="w-full rounded-xl bg-black mt-2" />
          )}
          {(media.extraVideos || []).map((url, idx) => (
            <video
              key={url}
              controls
              src={mediaSrc(url)}
              className="w-full rounded-xl bg-black mt-2"
              aria-label={`Video bài giảng phần ${idx + 2}`}
            />
          ))}
        </div>
      )}
      {media.audioFile && (
        <audio controls src={mediaSrc(media.audioFile)} className="w-full" />
      )}
      <div className="flex flex-wrap gap-2">
        {media.driveUrl && (
          <a href={media.driveUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
            Google Drive
          </a>
        )}
        {media.fileUrl && !media.videoFile && !media.audioFile && !media.images.some((img) => img.url === media.fileUrl) && (
          <a href={mediaSrc(media.fileUrl)} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            Tệp đính kèm
          </a>
        )}
      </div>
    </div>
  )
}

function VocabStep({ vocab, values, image, onChange, onFinish }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const item = vocab[index]
  const { correct, total } = scoreVocab(vocab, values)

  if (!item) return null

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Lật thẻ, nghe phát âm — nói theo — rồi gõ lại từ tiếng Anh.</p>
      {image && (
        <img src={mediaSrc(image)} alt="" className="w-full max-h-40 object-contain rounded-xl border border-gray-200 bg-white" />
      )}
      <AudioPlayButton text={`${item.word}. ${item.example || item.meaning || ''}`} label="Nghe phát âm" />
      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        className="w-full min-h-[160px] rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white px-6 py-8 text-center"
      >
        {!flipped ? (
          <>
            <p className="text-2xl font-bold text-gray-900">{item.word}</p>
            <p className="text-sm text-gray-500 mt-2">Bấm để xem nghĩa</p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-amber-800">{item.meaning}</p>
            <p className="text-sm text-gray-600 mt-2 italic">{item.example}</p>
          </>
        )}
      </button>
      <input
        value={values[item.word] || ''}
        onChange={(e) => onChange({ ...values, [item.word]: e.target.value })}
        placeholder="Gõ lại từ tiếng Anh"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <div className="flex items-center justify-between text-sm">
        <button type="button" disabled={index === 0} onClick={() => { setIndex((i) => i - 1); setFlipped(false) }} className="px-3 py-2 rounded-lg bg-gray-100 disabled:opacity-40">Trước</button>
        <span className="text-gray-500">{index + 1}/{vocab.length} · Đúng {correct}/{total}</span>
        {index < vocab.length - 1 ? (
          <button type="button" onClick={() => { setIndex((i) => i + 1); setFlipped(false) }} className="px-3 py-2 rounded-lg bg-amber-500 text-white">Từ tiếp</button>
        ) : (
          <button type="button" onClick={onFinish} className="px-3 py-2 rounded-lg bg-emerald-600 text-white">Sang luyện</button>
        )}
      </div>
    </div>
  )
}

function PracticeStep({ questions, values, checked, isListening, onChange, onCheck, onFinish }) {
  const { correct, total } = scorePractice(questions, values)
  const answered = questions.every((_, idx) => values[idx] != null)
  const [showScript, setShowScript] = useState({})

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {isListening
          ? 'Bài nghe: bấm Phát âm thanh, nghe rồi chọn đáp án. Có tranh thì xem tranh trước khi nghe.'
          : 'Luyện theo dạng bài của unit. Có hình thì nhìn hình rồi trả lời.'}
      </p>
      {questions.map((item, idx) => {
        const chosen = values[idx]
        const hasAudio = Boolean(item.audio)
        const revealed = checked || showScript[idx]
        return (
          <div key={idx} className="rounded-xl border border-gray-200 p-4 bg-white space-y-3">
            {item.image && !isHomemadeMedia(item.image) && (
              <img src={mediaSrc(item.image)} alt={`Câu ${idx + 1}`} className="w-full max-h-64 object-contain rounded-lg border border-gray-100 bg-slate-50" />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{idx + 1}.</span>
              {hasAudio ? (
                <AudioPlayButton text={item.audio} label="Phát âm thanh" />
              ) : null}
              {hasAudio && !checked && (
                <button
                  type="button"
                  onClick={() => setShowScript((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600"
                >
                  {revealed ? 'Ẩn lời thoại' : 'Hiện lời thoại'}
                </button>
              )}
            </div>
            {(!hasAudio || revealed) && (
              <p className="text-sm font-semibold text-gray-900">{item.prompt}</p>
            )}
            {hasAudio && !revealed && (
              <p className="text-xs text-sky-800">Nghe audio rồi chọn A–D. Bấm “Hiện lời thoại” nếu cần đọc lại.</p>
            )}
            <div className="space-y-2">
              {item.options.map((option, optIdx) => {
                const selected = Number(chosen) === optIdx
                const isCorrect = optIdx === item.answer
                let tone = 'border-gray-200 hover:border-amber-300'
                if (selected) tone = 'border-amber-400 bg-amber-50'
                if (checked && isCorrect) tone = 'border-emerald-400 bg-emerald-50'
                if (checked && selected && !isCorrect) tone = 'border-red-300 bg-red-50'
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => onChange({ ...values, [idx]: optIdx })}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm ${tone}`}
                  >
                    {String.fromCharCode(65 + optIdx)}. {option}
                  </button>
                )
              })}
            </div>
            {checked && <p className="mt-2 text-xs text-gray-600">{item.explain}</p>}
          </div>
        )
      })}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!answered} onClick={onCheck} className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold disabled:opacity-40">
          Chấm bài {checked ? `(${correct}/${total})` : ''}
        </button>
        {checked && (
          <button type="button" onClick={onFinish} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold">
            Sang bước Nói
          </button>
        )}
      </div>
    </div>
  )
}

function SpeakStep({ prompt, done, onDone, onFinish }) {
  const [recording, setRecording] = useState(false)
  const [url, setUrl] = useState('')
  const recorderRef = useRef(null)
  const chunksRef = useRef([])

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      onDone()
      return
    }
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      onDone()
      return
    }
    const recorder = new MediaRecorder(stream)
    chunksRef.current = []
    recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop())
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
      setUrl(URL.createObjectURL(blob))
      onDone()
    }
    recorderRef.current = recorder
    recorder.start()
    setRecording(true)
  }

  const stop = () => {
    recorderRef.current?.stop()
    setRecording(false)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <p className="font-semibold mb-1">Đề nói</p>
        <p>{prompt}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <button type="button" onClick={start} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-semibold">
            <Mic className="h-4 w-4" /> Thu âm
          </button>
        ) : (
          <button type="button" onClick={stop} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">
            <Pause className="h-4 w-4" /> Dừng
          </button>
        )}
        <button type="button" onClick={onDone} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm">
          Tôi đã nói xong (không thu)
        </button>
      </div>
      {url && (
        <audio controls src={url} className="w-full" />
      )}
      {done && (
        <button type="button" onClick={onFinish} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold">
          Sang bước Viết
        </button>
      )}
    </div>
  )
}

function WriteStep({ prompt, value, onChange, onFinish }) {
  const ready = value.trim().length >= 12
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
        <p className="font-semibold mb-1">Đề viết</p>
        <p>{prompt}</p>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={7}
        placeholder="Viết câu trả lời tại đây (tối thiểu vài câu)..."
        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
      />
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{value.trim().length} ký tự</span>
        <button type="button" disabled={!ready} onClick={onFinish} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40">
          Xem kết quả
        </button>
      </div>
    </div>
  )
}

function ResultStep({ study, answers, onComplete }) {
  const vocab = scoreVocab(study.vocab, answers.vocab)
  const practice = scorePractice(study.questions, answers.practice)
  const items = [
    { label: 'Học lý thuyết', ok: Boolean(answers.learnDone) },
    study.vocab.length ? { label: `Từ vựng (${vocab.correct}/${vocab.total})`, ok: vocab.total > 0 && vocab.correct === vocab.total } : null,
    study.questions.length ? { label: `Luyện (${practice.correct}/${practice.total})`, ok: Boolean(answers.practiceChecked) } : null,
    { label: 'Nói', ok: Boolean(answers.speakDone) },
    { label: 'Viết', ok: String(answers.write || '').trim().length >= 12 },
  ].filter(Boolean)
  const doneCount = items.filter((item) => item.ok).length

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm font-semibold text-emerald-900">Tiến độ bài này: {doneCount}/{items.length} chức năng</p>
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-sm text-emerald-900">
              {item.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <RotateCcw className="h-4 w-4 text-amber-500" />}
              {item.label}
            </li>
          ))}
        </ul>
      </div>
      {answers.write && (
        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-700 whitespace-pre-wrap">{answers.write}</div>
      )}
      {!answers.completed ? (
        <button type="button" onClick={onComplete} className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold">
          Đánh dấu hoàn thành bài
        </button>
      ) : (
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Đã hoàn thành bài học
        </p>
      )}
    </div>
  )
}
