import { useCallback, useContext, useMemo, useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, closestCenter, useDraggable, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  Clock, GripVertical, Hand, MapPin, Plus, Tag, Trash2, UserMinus, UserRound, Users, X,
} from 'lucide-react'
import clsx from 'clsx'
import Button from '../common/Button'
import Input from '../common/Input'
import Select from '../common/Select'
import LoadingSpinner from '../common/LoadingSpinner'
import ContextMenu from './ContextMenu'
import { useContextMenu } from '../../hooks/useContextMenu'
import PriceTierModal from './PriceTierModal'
import { ToastContext } from '../../context/ToastContext'
import bookingService from '../../services/booking.service'
import { DAY_SHORT, WEEK_ORDER, colorClasses, formatDate, formatMoney, formatShortDate } from '../../lib/bookingUtils'

/* ------------------------------------------------------------ kéo thả */

function PoolCard({ item, onContextMenu }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `pool:${item.id}`,
    data: { kind: 'pool', item },
  })

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      onContextMenu={(e) => onContextMenu(e, { kind: 'pool', item, title: item.full_name })}
      className={clsx(
        'flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-2',
        isDragging && 'opacity-40'
      )}
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        className="mt-0.5 cursor-grab touch-none text-amber-400 hover:text-amber-600 active:cursor-grabbing"
        title="Kéo vào ca để xếp lịch"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-stone-900">{item.full_name}</p>
        <a href={`tel:${item.phone}`} className="text-xs text-primary-700 hover:underline">
          {item.phone}
        </a>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {item.duration_minutes} phút
          </span>
          {item.price_name && (
            <span className="flex items-center gap-1 text-amber-700">
              <Tag className="h-3 w-3" />
              {item.price_name} · {formatMoney(item.price_amount)}
            </span>
          )}
        </p>
        {item.source === 'removed' && (
          <p className="mt-0.5 text-[11px] italic text-amber-600">vừa gỡ khỏi một ca</p>
        )}
      </div>
    </div>
  )
}

function EntryChip({ entry, slot, onContextMenu }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `entry:${entry.id}`,
    data: { kind: 'entry', entry, slot },
  })

  return (
    <li
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      onContextMenu={(e) => onContextMenu(e, { kind: 'entry', entry, slot, title: entry.full_name })}
      className={clsx(
        'flex items-start justify-between gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-50',
        isDragging && 'opacity-40'
      )}
    >
      <div className="flex min-w-0 items-start gap-1.5">
        <button
          type="button"
          {...listeners}
          {...attributes}
          className="mt-0.5 cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing"
          title="Kéo sang ca khác"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm text-stone-800">
            {entry.full_name}
            {entry.status === 'waitlist' && <span className="ml-1 text-xs text-amber-600">(chờ)</span>}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs">
            <a href={`tel:${entry.phone}`} className="text-primary-700 hover:underline">
              {entry.phone}
            </a>
            {entry.price_amount !== null && entry.price_amount !== undefined ? (
              <span className="text-emerald-700">{formatMoney(entry.price_amount)}</span>
            ) : (
              <span className="text-slate-300">chưa có giá</span>
            )}
          </p>
        </div>
      </div>
    </li>
  )
}

function SlotDropCard({ slot, onContextMenu }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${slot.id}`, data: { kind: 'slot', slot } })
  const tone = colorClasses(slot.color)
  const full = slot.confirmed_count >= slot.capacity

  const total = (slot.entries || []).reduce((sum, e) => sum + (Number(e.price_amount) || 0), 0)

  return (
    <div
      ref={setNodeRef}
      onContextMenu={(e) => onContextMenu(e, { kind: 'slot', slot, title: `${DAY_SHORT[slot.day_of_week]} ${slot.start_time}` })}
      className={clsx(
        'rounded-2xl border-l-4 border-y border-r bg-white p-3 transition-all',
        slot.is_active ? tone.border : 'border-dashed border-slate-300 bg-slate-50',
        isOver && 'ring-2 ring-primary-500 ring-offset-2'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-900">
            {DAY_SHORT[slot.day_of_week]} {formatShortDate(slot.date)} · {slot.start_time}–{slot.end_time}
          </p>
          {slot.label && <p className="truncate text-sm text-slate-600">{slot.label}</p>}
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
            {slot.teacher_name && (
              <span className="flex items-center gap-1">
                <UserRound className="h-3 w-3" />
                {slot.teacher_name}
              </span>
            )}
            {slot.room_name && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {slot.room_name}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={clsx(
              'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
              full ? 'bg-red-50 text-red-600' : 'bg-primary-50 text-primary-700'
            )}
          >
            <Users className="h-3.5 w-3.5" />
            {slot.confirmed_count}/{slot.capacity}
          </span>
          {slot.price_amount !== null && slot.price_amount !== undefined && (
            <span
              className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
              title="Học phí mặc định của ca này, dùng khi học viên chưa có mức giá riêng"
            >
              {formatMoney(slot.price_amount)}
            </span>
          )}
        </div>
      </div>

      {slot.entries?.length > 0 ? (
        <>
          <ul className="mt-2 divide-y divide-slate-100 border-t border-slate-100 pt-1">
            {slot.entries.map((e) => (
              <EntryChip key={e.id} entry={e} slot={slot} onContextMenu={onContextMenu} />
            ))}
          </ul>
          {total > 0 && (
            <p className="mt-1 border-t border-slate-100 pt-1 text-right text-xs font-semibold text-emerald-700">
              Tổng: {formatMoney(total)}
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-slate-200 py-3 text-center text-xs text-slate-300">
          Kéo người từ "giờ chờ sắp" vào đây
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ màn chính */

/**
 * Màn xếp lịch của admin.
 *
 * Dựng trên các thẻ ca chứ không trên lưới giờ: mỗi dòng cần chỗ cho tên, số
 * điện thoại và số tiền — nhồi vào ô lưới 96px thì không đọc nổi.
 *
 * Thao tác: kéo thả để xếp/chuyển ca, chuột phải để đổi giá / gỡ / xóa.
 */
export default function SchedulingBoard({ board, slots = [], pool = [], loading = false, onChanged }) {
  const { success, error: showError } = useContext(ToastContext)
  const menu = useContextMenu()
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(null)
  const [tierTarget, setTierTarget] = useState(null)
  const [priceTarget, setPriceTarget] = useState(null)
  const [priceTiers, setPriceTiers] = useState([])
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ phone: '', full_name: '', duration_minutes: 60 })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const activeSlots = useMemo(
    () =>
      WEEK_ORDER.flatMap((dow) =>
        slots.filter((s) => s.day_of_week === dow).sort((a, b) => (a.start_time < b.start_time ? -1 : 1))
      ),
    [slots]
  )

  const run = useCallback(
    async (fn, okMsg) => {
      setBusy(true)
      try {
        const res = await fn()
        success(res?.data?.message || okMsg)
        onChanged?.()
        return true
      } catch (err) {
        showError(err.response?.data?.message || 'Thao tác thất bại')
        return false
      } finally {
        setBusy(false)
      }
    },
    [success, showError, onChanged]
  )

  const handleDragEnd = async ({ active, over }) => {
    setDragging(null)
    if (!over) return
    const src = active.data.current
    const dst = over.data.current
    if (!src || dst?.kind !== 'slot') return

    const slot = dst.slot

    if (src.kind === 'pool') {
      await run(
        () =>
          bookingService.assignToSlot(slot.id, {
            registrant_id: src.item.registrant_id,
            session_date: slot.date,
            price_tier_id: src.item.price_tier_id,
            pool_item_id: src.item.id,
          }),
        'Đã xếp vào ca'
      )
      return
    }

    if (src.kind === 'entry') {
      if (src.slot.id === slot.id) return
      await run(
        () => bookingService.moveEntry(src.entry.id, { slot_id: slot.id, session_date: slot.date }),
        'Đã chuyển sang ca mới'
      )
    }
  }

  const openPriceMenu = async (entry) => {
    try {
      const res = await bookingService.listPriceTiers(entry.registrant_id)
      const list = res.data?.data ?? res.data ?? []
      if (list.length === 0) {
        showError('Người này chưa có mức giá nào — thêm ở mục "Mức giá" trước')
        return
      }
      setPriceTiers(list)
      setPriceTarget(entry)
    } catch (err) {
      showError(err.response?.data?.message || 'Không tải được mức giá')
    }
  }

  const menuItems = [
    {
      label: 'Đổi mức giá',
      icon: Tag,
      hidden: menu.state?.payload?.kind !== 'entry',
      onClick: (p) => openPriceMenu(p.entry),
    },
    {
      label: 'Gỡ về giờ chờ sắp',
      icon: UserMinus,
      hidden: menu.state?.payload?.kind !== 'entry',
      onClick: (p) => run(() => bookingService.detachToPool(p.entry.id), 'Đã gỡ về giờ chờ sắp'),
    },
    {
      label: 'Hủy hẳn chỗ này',
      icon: X,
      danger: true,
      hidden: menu.state?.payload?.kind !== 'entry',
      onClick: (p) => run(() => bookingService.adminCancelEntry(p.entry.id), 'Đã hủy chỗ'),
    },
    {
      label: 'Sửa mức giá của người này',
      icon: Tag,
      hidden: menu.state?.payload?.kind !== 'pool',
      onClick: (p) => setTierTarget({ id: p.item.registrant_id, full_name: p.item.full_name }),
    },
    {
      label: 'Bỏ khỏi giờ chờ sắp',
      icon: Trash2,
      danger: true,
      hidden: menu.state?.payload?.kind !== 'pool',
      onClick: (p) => run(() => bookingService.removeFromPool(p.item.id), 'Đã bỏ khỏi giờ chờ sắp'),
    },
    {
      label: 'Thêm người vào giờ chờ sắp',
      icon: Plus,
      hidden: menu.state?.payload?.kind !== 'slot',
      onClick: () => setAddOpen(true),
    },
  ]

  const submitAdd = async (e) => {
    e.preventDefault()
    const okDone = await run(
      () =>
        bookingService.addToPool(board.id, {
          phone: addForm.phone,
          full_name: addForm.full_name.trim() || undefined,
          duration_minutes: Number(addForm.duration_minutes) || 60,
        }),
      'Đã thêm vào giờ chờ sắp'
    )
    if (okDone) {
      setAddOpen(false)
      setAddForm({ phone: '', full_name: '', duration_minutes: 60 })
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setDragging(active.data.current)}
      onDragCancel={() => setDragging(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Các ca của tuần đang xem */}
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Tuần {formatDate(board?.selected_week)} – {formatDate(board?.selected_week_end)} · kéo người
            vào ca để xếp · <b>chuột phải</b> để đổi giá, gỡ hoặc hủy
          </p>
          {activeSlots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
              <p className="text-sm text-slate-500">Tuần này chưa có ca nào để xếp.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {activeSlots.map((slot) => (
                <SlotDropCard key={slot.id} slot={slot} onContextMenu={menu.open} />
              ))}
            </div>
          )}
        </div>

        {/* Giờ chờ sắp */}
        <div className="space-y-2 lg:sticky lg:top-4 lg:self-start">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 font-display text-sm font-semibold text-stone-900">
              <Hand className="h-4 w-4 text-amber-500" />
              Giờ chờ sắp ({pool.length})
            </h3>
            <Button variant="ghost" size="sm" icon={Plus} onClick={() => setAddOpen(true)} disabled={busy}>
              Thêm
            </Button>
          </div>

          {pool.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-8 text-center text-xs text-slate-400">
              Trống. Gỡ một người khỏi ca thì họ rơi xuống đây, hoặc bấm "Thêm".
            </p>
          ) : (
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {pool.map((item) => (
                <PoolCard key={item.id} item={item} onContextMenu={menu.open} />
              ))}
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {dragging && (
          <div className="rounded-xl border border-primary-300 bg-white px-3 py-2 shadow-lg">
            <p className="text-sm font-medium text-stone-900">
              {dragging.item?.full_name || dragging.entry?.full_name}
            </p>
            <p className="text-xs text-slate-400">Thả vào một ca để xếp</p>
          </div>
        )}
      </DragOverlay>

      <ContextMenu state={menu.state} onClose={menu.close} items={menuItems} />

      <PriceTierModal
        registrant={tierTarget}
        isOpen={Boolean(tierTarget)}
        onClose={() => setTierTarget(null)}
        onChanged={onChanged}
      />

      {/* Chọn mức giá cho một lượt đã xếp */}
      {priceTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={() => setPriceTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 font-display text-base font-semibold text-stone-900">
              Mức giá cho {priceTarget.full_name}
            </p>
            <div className="space-y-1">
              {priceTiers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const done = await run(
                      () => bookingService.updateEntryPrice(priceTarget.id, t.id),
                      `Đã đổi sang ${t.name}`
                    )
                    if (done) setPriceTarget(null)
                  }}
                  className={clsx(
                    'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    priceTarget.price_tier_id === t.id
                      ? 'border-primary-500 bg-primary-50 text-primary-800'
                      : 'border-slate-200 hover:border-primary-300 hover:bg-primary-50/50'
                  )}
                >
                  <span>{t.name}</span>
                  <span className="font-semibold">{formatMoney(t.amount)}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPriceTarget(null)
                  setTierTarget({ id: priceTarget.registrant_id, full_name: priceTarget.full_name })
                }}
              >
                Quản lý mức giá
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPriceTarget(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Thêm người vào giờ chờ sắp */}
      {addOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={() => setAddOpen(false)}>
          <form
            className="w-full max-w-md space-y-3 rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitAdd}
          >
            <p className="font-display text-base font-semibold text-stone-900">Thêm vào giờ chờ sắp</p>
            <Input
              label="Số điện thoại"
              type="tel"
              inputMode="numeric"
              placeholder="0912345678"
              value={addForm.phone}
              onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
              required
              autoFocus
            />
            <Input
              label="Họ và tên"
              placeholder="Bỏ trống nếu số này đã có trong hệ thống"
              value={addForm.full_name}
              onChange={(e) => setAddForm((f) => ({ ...f, full_name: e.target.value }))}
            />
            <Select
              label="Thời lượng"
              value={String(addForm.duration_minutes)}
              onChange={(e) => setAddForm((f) => ({ ...f, duration_minutes: e.target.value }))}
              options={[30, 45, 60, 90, 120].map((n) => ({ value: String(n), label: `${n} phút` }))}
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setAddOpen(false)} disabled={busy}>
                Hủy
              </Button>
              <Button type="submit" size="sm" loading={busy}>
                Thêm
              </Button>
            </div>
          </form>
        </div>
      )}
    </DndContext>
  )
}
