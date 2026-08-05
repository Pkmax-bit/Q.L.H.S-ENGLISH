import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Gamepad2, Loader2, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import { ToastContext } from '../context/ToastContext'
import shopService from '../services/shop.service'
import defaultPack from '../data/harvestShotDefaultContent.json'

const SLUG = 'harvest-shot'

function clonePack(p) {
  return JSON.parse(JSON.stringify(p || defaultPack))
}

function emptyFillQ() {
  return { q: '', a: '', wrong: ['', '', ''], vi: '', hint: '' }
}

function emptyWord() {
  return { w: '', vi: '', ipa: '' }
}

function emptyFillStage(n) {
  return {
    id: `f${n}`,
    title: `Màn ${n} — Mới`,
    reward: 40,
    timerMs: 14000,
    questions: [emptyFillQ()],
  }
}

function emptyVocabStage(n) {
  return {
    id: `v${n}`,
    title: `Màn ${n} — Mới`,
    reward: 40,
    timerMs: 16000,
    words: [emptyWord()],
  }
}

export default function HarvestContentPage() {
  const { success, error: toastError } = useContext(ToastContext)
  const [tab, setTab] = useState('fill') // fill | vocab | boss
  const [pack, setPack] = useState(() => clonePack(defaultPack))
  const [meta, setMeta] = useState({ is_default: true, updated_at: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stageIdx, setStageIdx] = useState(0)

  const stages = useMemo(() => {
    if (tab === 'fill') return pack.fillStages || []
    if (tab === 'vocab') return pack.vocabStages || []
    return pack.bossDefs || []
  }, [pack, tab])

  const stage = stages[stageIdx] || null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await shopService.getContent(SLUG)
      setPack(clonePack(data.payload || defaultPack))
      setMeta({ is_default: !!data.is_default, updated_at: data.updated_at })
      setStageIdx(0)
    } catch (err) {
      toastError?.(err.response?.data?.message || err.message || 'Không tải được nội dung')
      setPack(clonePack(defaultPack))
    } finally {
      setLoading(false)
    }
  }, [toastError])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setStageIdx(0)
  }, [tab])

  const updateStage = (patch) => {
    setPack((prev) => {
      const next = clonePack(prev)
      const key = tab === 'fill' ? 'fillStages' : tab === 'vocab' ? 'vocabStages' : 'bossDefs'
      const list = next[key]
      if (!list[stageIdx]) return prev
      list[stageIdx] = { ...list[stageIdx], ...patch }
      return next
    })
  }

  const addStage = () => {
    setPack((prev) => {
      const next = clonePack(prev)
      if (tab === 'fill') {
        next.fillStages.push(emptyFillStage(next.fillStages.length + 1))
        setStageIdx(next.fillStages.length - 1)
      } else if (tab === 'vocab') {
        next.vocabStages.push(emptyVocabStage(next.vocabStages.length + 1))
        setStageIdx(next.vocabStages.length - 1)
      }
      return next
    })
  }

  const removeStage = () => {
    if (tab === 'boss') {
      toastError?.('Boss giữ nguyên cấu trúc — chỉ sửa câu hỏi / từ')
      return
    }
    if (stages.length <= 1) {
      toastError?.('Cần ít nhất 1 màn')
      return
    }
    setPack((prev) => {
      const next = clonePack(prev)
      const key = tab === 'fill' ? 'fillStages' : 'vocabStages'
      next[key].splice(stageIdx, 1)
      return next
    })
    setStageIdx((i) => Math.max(0, i - 1))
  }

  const save = async () => {
    setSaving(true)
    try {
      const data = await shopService.putContent(SLUG, pack)
      setPack(clonePack(data.payload))
      setMeta({ is_default: false, updated_at: data.updated_at })
      success?.('Đã lưu nội dung Harvest Shot')
    } catch (err) {
      toastError?.(err.response?.data?.message || err.message || 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const resetDefault = async () => {
    if (!window.confirm('Khôi phục pack mặc định? Thay đổi chưa lưu sẽ mất.')) return
    setSaving(true)
    try {
      const data = await shopService.resetContent(SLUG)
      setPack(clonePack(data.payload))
      setMeta({ is_default: false, updated_at: data.updated_at })
      setStageIdx(0)
      success?.('Đã khôi phục mặc định')
    } catch (err) {
      toastError?.(err.response?.data?.message || err.message || 'Khôi phục thất bại')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] gap-2 text-stone-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Đang tải nội dung game…
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-stone-900 flex items-center gap-2">
            <Gamepad2 className="h-6 w-6 text-primary-600" />
            Nội dung Harvest Shot
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Setup màn Fill / Vocab / Boss cho game. Học sinh tải pack này khi chơi.
            {meta.updated_at
              ? ` · Cập nhật ${new Date(meta.updated_at).toLocaleString('vi-VN')}`
              : meta.is_default
                ? ' · Đang dùng mặc định (chưa lưu DB)'
                : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={resetDefault} disabled={saving}>
            <RotateCcw className="h-4 w-4" /> Khôi phục mặc định
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-stone-200 pb-2">
        {[
          { id: 'fill', label: 'Fill (điền từ)' },
          { id: 'vocab', label: 'Vocab (ghép chữ)' },
          { id: 'boss', label: 'Boss' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              tab === t.id
                ? 'bg-primary-600 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        <aside className="space-y-2">
          {stages.map((s, i) => (
            <button
              key={s.id || i}
              type="button"
              onClick={() => setStageIdx(i)}
              className={`w-full text-left rounded-xl px-3 py-2.5 text-sm border transition ${
                i === stageIdx
                  ? 'border-primary-500 bg-primary-50 text-primary-900 font-semibold'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="truncate">{s.title || s.name || s.id}</div>
              <div className="text-[11px] opacity-60 mt-0.5">
                {tab === 'fill' && `${s.questions?.length || 0} câu`}
                {tab === 'vocab' && `${s.words?.length || 0} từ`}
                {tab === 'boss' && (s.mode || 'boss')}
              </div>
            </button>
          ))}
          {tab !== 'boss' && (
            <Button type="button" variant="secondary" className="w-full" onClick={addStage}>
              <Plus className="h-4 w-4" /> Thêm màn
            </Button>
          )}
        </aside>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4">
          {!stage ? (
            <p className="text-sm text-stone-500">Chọn một màn bên trái.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-3 items-end">
                {tab === 'boss' ? (
                  <Input
                    label="Tên boss"
                    value={stage.name || ''}
                    onChange={(e) => updateStage({ name: e.target.value })}
                    className="flex-1 min-w-[180px]"
                  />
                ) : (
                  <Input
                    label="Tiêu đề màn"
                    value={stage.title || ''}
                    onChange={(e) => updateStage({ title: e.target.value })}
                    className="flex-1 min-w-[180px]"
                  />
                )}
                <Input
                  label="ID"
                  value={stage.id || ''}
                  onChange={(e) => updateStage({ id: e.target.value.trim() })}
                  className="w-28"
                />
                {tab !== 'boss' && (
                  <>
                    <Input
                      label="Thưởng ¢"
                      type="number"
                      value={stage.reward ?? 40}
                      onChange={(e) => updateStage({ reward: Number(e.target.value) || 0 })}
                      className="w-28"
                    />
                    <Input
                      label="Timer (ms)"
                      type="number"
                      value={stage.timerMs ?? (tab === 'fill' ? 14000 : 16000)}
                      onChange={(e) => updateStage({ timerMs: Number(e.target.value) || 14000 })}
                      className="w-32"
                    />
                  </>
                )}
                {tab !== 'boss' && (
                  <Button type="button" variant="danger" onClick={removeStage}>
                    <Trash2 className="h-4 w-4" /> Xóa màn
                  </Button>
                )}
              </div>

              {tab === 'fill' && (
                <FillEditor
                  questions={stage.questions || []}
                  onChange={(questions) => updateStage({ questions })}
                />
              )}
              {tab === 'vocab' && (
                <VocabEditor
                  words={stage.words || []}
                  onChange={(words) => updateStage({ words })}
                />
              )}
              {tab === 'boss' && stage.questions && (
                <FillEditor
                  questions={stage.questions || []}
                  onChange={(questions) => updateStage({ questions })}
                />
              )}
              {tab === 'boss' && stage.words && (
                <VocabEditor
                  words={stage.words || []}
                  onChange={(words) => updateStage({ words })}
                />
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function FillEditor({ questions, onChange }) {
  const setQ = (i, patch) => {
    const next = questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q))
    onChange(next)
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-800">Câu hỏi ({questions.length})</h3>
        <Button type="button" variant="secondary" onClick={() => onChange([...questions, emptyFillQ()])}>
          <Plus className="h-4 w-4" /> Thêm câu
        </Button>
      </div>
      {questions.map((q, i) => (
        <div key={i} className="rounded-xl border border-stone-150 bg-stone-50/80 p-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-stone-500">#{i + 1}</span>
            <button
              type="button"
              className="text-xs text-rose-600 hover:underline"
              onClick={() => onChange(questions.filter((_, j) => j !== i))}
              disabled={questions.length <= 1}
            >
              Xóa
            </button>
          </div>
          <Input label="Câu (EN)" value={q.q || ''} onChange={(e) => setQ(i, { q: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input label="Đáp án đúng" value={q.a || ''} onChange={(e) => setQ(i, { a: e.target.value })} />
            <Input label="Gợi ý IPA" value={q.hint || ''} onChange={(e) => setQ(i, { hint: e.target.value })} />
          </div>
          <Input label="Nghĩa VI" value={q.vi || ''} onChange={(e) => setQ(i, { vi: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((wi) => (
              <Input
                key={wi}
                label={`Sai ${wi + 1}`}
                value={(q.wrong || [])[wi] || ''}
                onChange={(e) => {
                  const wrong = [...(q.wrong || ['', '', ''])]
                  wrong[wi] = e.target.value
                  setQ(i, { wrong })
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function VocabEditor({ words, onChange }) {
  const setW = (i, patch) => {
    onChange(words.map((w, idx) => (idx === i ? { ...w, ...patch } : w)))
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-800">Từ vựng ({words.length})</h3>
        <Button type="button" variant="secondary" onClick={() => onChange([...words, emptyWord()])}>
          <Plus className="h-4 w-4" /> Thêm từ
        </Button>
      </div>
      {words.map((w, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end rounded-xl border border-stone-150 bg-stone-50/80 p-3">
          <Input
            label="Từ (IN HOA)"
            value={w.w || ''}
            onChange={(e) => setW(i, { w: e.target.value.toUpperCase() })}
          />
          <Input label="Nghĩa VI" value={w.vi || ''} onChange={(e) => setW(i, { vi: e.target.value })} />
          <Input label="IPA" value={w.ipa || ''} onChange={(e) => setW(i, { ipa: e.target.value })} />
          <button
            type="button"
            className="mb-1 text-xs text-rose-600 hover:underline h-10"
            onClick={() => onChange(words.filter((_, j) => j !== i))}
            disabled={words.length <= 1}
          >
            Xóa
          </button>
        </div>
      ))}
    </div>
  )
}
