import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDown, Check, Lock, RotateCcw, Scissors } from 'lucide-react'
import clsx from 'clsx'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { DAY_SHORT, colorClasses, formatShortDate } from '../../lib/bookingUtils'

const pad = (n) => String(n).padStart(2, '0')
const fmt = (t) => `${pad(Math.floor(t / 60))}:${pad(t % 60)}`
const toMin = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':')
  return (Number(h) || 0) * 60 + (Number(m) || 0)
}

/**
 * Thả một buổi vào chỗ đã có người: mở bảng chỉnh giờ chứ không chỉ báo lỗi.
 *
 * Sửa được CẢ HAI phía — thẻ đang kéo và từng thẻ đang chắn — vì ngoài đời
 * cách xử lý tùy trường hợp: có lúc rút ngắn buổi mới, có lúc đẩy buổi cũ
 * xuống sau, có lúc chỉ cần xê dịch một trong hai mươi phút là vừa.
 *
 * Hai nút nhanh chỉ điền sẵn vào ô giờ chứ không tự lưu: còn nhìn thấy kết quả
 * trước khi bấm Áp dụng, và vẫn sửa tay tiếp được.
 *
 * Ca trung tâm đã mở thì khóa, không cho sửa ở đây — đó là lịch của lớp, đổi
 * nó phải vào form ca học.
 */
export default function DropConflictDialog({ conflict, busy = false, onClose, onApply }) {
  const [target, setTarget] = useState({ start: '', end: '' })
  const [edits, setEdits] = useState({})

  useEffect(() => {
    if (!conflict) return
    setTarget({ start: fmt(conflict.start), end: fmt(conflict.end) })
    setEdits(
      Object.fromEntries(conflict.blockers.map((b) => [b.id, { start: fmt(b.start), end: fmt(b.end) }]))
    )
  }, [conflict])

  const movable = useMemo(
    () => (conflict?.blockers || []).filter((b) => b.kind !== 'slot'),
    [conflict]
  )

  // Còn chồng nhau không, tính theo giá trị ĐANG gõ chứ không phải lúc mới mở
  const stillOverlapping = useMemo(() => {
    if (!conflict) return []
    const ts = toMin(target.start)
    const te = toMin(target.end)
    return conflict.blockers.filter((b) => {
      const e = edits[b.id] || {}
      const bs = toMin(e.start ?? fmt(b.start))
      const be = toMin(e.end ?? fmt(b.end))
      return bs < te && be > ts
    })
  }, [conflict, target, edits])

  if (!conflict) return null

  const { request, date, blockers = [], freeUntil } = conflict
  const dow = new Date(`${date}T00:00:00`).getDay()
  const targetValid = toMin(target.end) > toMin(target.start)
  const editsValid = blockers.every((b) => {
    const e = edits[b.id] || {}
    return toMin(e.end) > toMin(e.start)
  })
  const canApply = targetValid && editsValid && stillOverlapping.length === 0 && !busy

  // Giá trị lúc mới thả — mốc để mọi gợi ý tính lại từ đầu
  const baseTarget = { start: fmt(conflict.start), end: fmt(conflict.end) }
  const baseEdits = Object.fromEntries(
    blockers.map((b) => [b.id, { start: fmt(b.start), end: fmt(b.end) }])
  )

  const resetAll = () => {
    setTarget(baseTarget)
    setEdits(baseEdits)
  }

  /**
   * Hai nút gợi ý đều TRẢ VỀ BAN ĐẦU rồi mới tính.
   *
   * Trước đây chúng cộng dồn: bấm "rút ngắn" xong bấm "đẩy xuống" thì các thẻ
   * chắn bị xếp sau cái giờ đã rút, ra kết quả chẳng giống cách nào — người
   * dùng tưởng mình chọn một trong hai, hóa ra thành cái thứ ba.
   */
  const quickShorten = () => {
    setEdits(baseEdits)
    setTarget({ ...baseTarget, end: fmt(freeUntil) })
  }

  const quickPush = () => {
    setTarget(baseTarget)
    let cursor = conflict.end
    const next = { ...baseEdits }
    for (const b of blockers) {
      if (b.kind === 'slot') continue
      const len = b.end - b.start
      next[b.id] = { start: fmt(cursor), end: fmt(Math.min(24 * 60 - 1, cursor + len)) }
      cursor += len
    }
    setEdits(next)
  }

  const dirty =
    target.start !== baseTarget.start ||
    target.end !== baseTarget.end ||
    blockers.some(
      (b) => edits[b.id]?.start !== baseEdits[b.id].start || edits[b.id]?.end !== baseEdits[b.id].end
    )

  const submit = () =>
    onApply({
      target: { start_time: target.start, end_time: target.end },
      moves: blockers
        .filter((b) => b.kind !== 'slot')
        .filter((b) => edits[b.id].start !== fmt(b.start) || edits[b.id].end !== fmt(b.end))
        .map((b) => ({ id: b.id, start_time: edits[b.id].start, end_time: edits[b.id].end })),
    })

  /**
   * Một THẺ giống hệt khối trên lưới: viền trái theo màu học viên, tên, giờ
   * hiện tại, rồi tới hai ô sửa giờ. Nhìn thẻ là nhận ra ngay buổi nào trên
   * lưới đang nói tới, thay vì phải đọc một dòng chữ rồi tự dò lại.
   */
  const Card = ({ name, note, color, value, onChange, disabled, tone, badge }) => {
    const c = colorClasses(color)
    return (
      <div
        className={clsx(
          'rounded-xl border border-l-4 px-3 py-2',
          color ? clsx(c.border, c.bg) : 'border-slate-200 bg-white',
          tone === 'target' && 'ring-2 ring-primary-400',
          tone === 'clash' && 'ring-2 ring-red-300'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-stone-900">
              {disabled && <Lock className="h-3 w-3 shrink-0 text-slate-400" />}
              {name}
            </p>
            {note && <p className="truncate text-xs italic text-slate-500">{note}</p>}
          </div>
          {badge && (
            <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {badge}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-1">
          <input
            type="time"
            value={value.start}
            disabled={disabled || busy}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-400"
          />
          <span className="text-slate-400">–</span>
          <input
            type="time"
            value={value.end}
            disabled={disabled || busy}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-sm disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>
      </div>
    )
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Trùng giờ — chỉnh lại"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Để nguyên
          </Button>
          <Button icon={Check} onClick={submit} loading={busy} disabled={!canApply}>
            Áp dụng
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Thả vào {DAY_SHORT[dow]} {formatShortDate(date)} nhưng giờ này đã có{' '}
            {blockers.length} buổi. Sửa giờ bên dưới, hoặc dùng hai nút gợi ý.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" icon={Scissors} disabled={busy} onClick={quickShorten}>
            Rút ngắn thẻ đang kéo
          </Button>
          <Button
            size="sm"
            variant="outline"
            icon={ArrowDown}
            disabled={busy || movable.length === 0}
            onClick={quickPush}
          >
            Đẩy {movable.length} buổi chắn xuống sau
          </Button>
          {dirty && (
            <Button size="sm" variant="ghost" icon={RotateCcw} disabled={busy} onClick={resetAll}>
              Về giờ ban đầu
            </Button>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Thẻ đang kéo
          </p>
          <Card
            name={request.full_name || 'Buổi học'}
            note={request.note}
            color={request.color}
            value={target}
            onChange={setTarget}
            tone="target"
            badge={`${Math.max(0, toMin(target.end) - toMin(target.start))} phút`}
          />
          {!targetValid && (
            <p className="mt-1 text-[11px] text-red-500">Giờ kết thúc phải sau giờ bắt đầu</p>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {blockers.length} thẻ đang chắn
          </p>
          <div className="space-y-2">
            {blockers.map((b) => {
              const locked = b.kind === 'slot'
              const clashing = stillOverlapping.some((x) => x.id === b.id)
              const value = edits[b.id] || { start: fmt(b.start), end: fmt(b.end) }
              return (
                <Card
                  key={b.id}
                  name={b.label || 'Buổi học'}
                  note={b.note}
                  color={b.color}
                  value={value}
                  disabled={locked}
                  tone={clashing ? 'clash' : undefined}
                  badge={locked ? 'ca đã mở' : clashing ? 'còn chồng' : 'đã tránh'}
                  onChange={(v) => setEdits((prev) => ({ ...prev, [b.id]: v }))}
                />
              )
            })}
          </div>
        </div>

        {stillOverlapping.length > 0 && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            Vẫn còn {stillOverlapping.length} buổi chồng giờ — sửa tiếp hoặc dùng nút gợi ý rồi mới
            áp dụng được.
          </p>
        )}
      </div>
    </Modal>
  )
}
