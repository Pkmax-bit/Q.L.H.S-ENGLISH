import { useCallback, useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays, Copy, CopyPlus, ExternalLink, Lock, LockOpen,
  Pencil, Plus, Trash2, Users,
} from 'lucide-react'
import Button from '../components/common/Button'
import LoadingSpinner from '../components/common/LoadingSpinner'
import EmptyState from '../components/common/EmptyState'
import ConfirmDialog from '../components/common/ConfirmDialog'
import BookingBoardForm from '../components/booking/BookingBoardForm'
import { useFetch } from '../hooks/useFetch'
import { ToastContext } from '../context/ToastContext'
import bookingService from '../services/booking.service'
import { formatDate } from '../lib/bookingUtils'

export default function BookingBoardsPage() {
  const { success, error: showError } = useContext(ToastContext)

  const fetchBoards = useCallback(() => bookingService.listBoards({ limit: 100 }), [])
  const { data, loading, execute: reload } = useFetch(fetchBoards, [])
  const boards = Array.isArray(data) ? data : []

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const publicUrl = (slug) => `${window.location.origin}/dk/${slug}`

  const copyLink = async (slug) => {
    try {
      await navigator.clipboard.writeText(publicUrl(slug))
      success('Đã copy link, gửi cho học viên được rồi')
    } catch {
      showError('Trình duyệt không cho copy, bạn copy thủ công từ thanh địa chỉ giúp nhé')
    }
  }

  const handleSubmit = async (payload) => {
    setSaving(true)
    try {
      if (editing) {
        await bookingService.updateBoard(editing.id, payload)
        success('Đã cập nhật bảng đăng ký')
      } else {
        await bookingService.createBoard(payload)
        success('Đã tạo bảng đăng ký')
      }
      setFormOpen(false)
      setEditing(null)
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Lưu thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleClone = async (board) => {
    try {
      const res = await bookingService.cloneBoard(board.id, {})
      success(res.data?.message || 'Đã nhân bản sang đợt kế tiếp')
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Nhân bản thất bại')
    }
  }

  const handleToggleOpen = async (board) => {
    try {
      await bookingService.updateBoard(board.id, { is_open: !board.is_open })
      success(board.is_open ? 'Đã đóng bảng' : 'Đã mở bảng')
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Không đổi được trạng thái')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await bookingService.deleteBoard(deleteTarget.id)
      success('Đã xóa bảng đăng ký')
      setDeleteTarget(null)
      reload()
    } catch (err) {
      showError(err.response?.data?.message || 'Xóa thất bại')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-stone-900">Bảng đăng ký lịch học</h1>
          <p className="mt-1 text-sm text-slate-500">
            Mỗi bảng phụ trách một hoặc nhiều tuần. Gửi link cho học viên, họ chỉ cần nhập số điện thoại là giữ chỗ được.
          </p>
        </div>
        <Button
          icon={Plus}
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          Tạo bảng mới
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : boards.length === 0 ? (
        <EmptyState
          message="Chưa có bảng đăng ký nào"
          icon={CalendarDays}
          action={
            <Button
              icon={Plus}
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              Tạo bảng đầu tiên
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {boards.map((board) => (
            <div key={board.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/booking-boards/${board.id}`}
                  className="min-w-0 font-display text-base font-semibold text-stone-900 hover:text-primary-700"
                >
                  {board.title}
                </Link>
                <span
                  className={
                    board.is_accepting
                      ? 'shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'
                      : 'shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500'
                  }
                >
                  {board.is_accepting ? 'Đang mở' : 'Đã đóng'}
                </span>
              </div>

              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <CalendarDays className="h-4 w-4" />
                {formatDate(board.week_start)} – {formatDate(board.week_end)}
                {board.week_count > 1 && (
                  <span className="rounded bg-primary-50 px-1.5 py-0.5 text-xs font-medium text-primary-700">
                    {board.week_count} tuần
                  </span>
                )}
              </p>

              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <span className="text-slate-600">
                  {board.slot_count} ca{board.week_count > 1 ? '/tuần' : ''}
                </span>
                <span className="flex items-center gap-1 font-medium text-primary-700">
                  <Users className="h-4 w-4" />
                  {board.registration_count}/{board.total_capacity} chỗ đã giữ
                </span>
              </div>

              <div className="mt-3 flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1.5">
                <code className="min-w-0 flex-1 truncate text-xs text-slate-500">{publicUrl(board.slug)}</code>
                <button
                  type="button"
                  onClick={() => copyLink(board.slug)}
                  title="Copy link"
                  className="rounded p-1 text-slate-400 hover:bg-white hover:text-primary-600"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <a
                  href={`/dk/${board.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Mở trang công khai"
                  className="rounded p-1 text-slate-400 hover:bg-white hover:text-primary-600"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={`/booking-boards/${board.id}`}>
                  <Button variant="outline" size="sm">Quản lý ca</Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={board.is_open ? Lock : LockOpen}
                  onClick={() => handleToggleOpen(board)}
                >
                  {board.is_open ? 'Đóng' : 'Mở'}
                </Button>
                <Button variant="ghost" size="sm" icon={CopyPlus} onClick={() => handleClone(board)}>
                  Nhân bản đợt sau
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Pencil}
                  onClick={() => {
                    setEditing(board)
                    setFormOpen(true)
                  }}
                >
                  Sửa
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  className="text-red-500 hover:bg-red-50"
                  onClick={() => setDeleteTarget(board)}
                >
                  Xóa
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BookingBoardForm
        isOpen={formOpen}
        board={editing}
        saving={saving}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        loading={deleting}
        title="Xóa bảng đăng ký"
        message={`Xóa "${deleteTarget?.title || ''}"? Chỉ xóa được bảng chưa có ai đăng ký — nếu đã có, hãy đóng bảng thay vì xóa.`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
