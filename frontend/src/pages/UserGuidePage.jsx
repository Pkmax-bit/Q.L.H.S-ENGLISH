import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpenCheck,
  Users,
  GraduationCap,
  BookOpen,
  School,
  FileText,
  Wallet,
  CalendarDays,
  Building2,
  ChevronDown,
  ExternalLink,
  MousePointerClick,
  CheckCircle2,
  ArrowRight,
  ListOrdered,
  Play,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../hooks/useAuth'
import { useTour } from '../context/TourContext'

/** Một bước thao tác: nơi bấm + điền gì */
function Step({ n, where, action, tip }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
        <p className="text-sm font-medium text-gray-900">
          <span className="inline-flex items-center gap-1 text-primary-700">
            <MousePointerClick className="h-3.5 w-3.5" />
            {where}
          </span>
        </p>
        <p className="mt-1 text-sm text-gray-700">{action}</p>
        {tip && (
          <p className="mt-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
            {tip}
          </p>
        )}
      </div>
    </li>
  )
}

function GuideCard({ id, icon: Icon, title, roles, summary, href, hrefLabel, steps, tourId, openId, setOpenId, onStartTour }) {
  const open = openId === id
  return (
    <article
      id={id}
      className={clsx(
        'rounded-2xl border bg-white overflow-hidden transition-shadow',
        open ? 'border-primary-200 shadow-md' : 'border-gray-200 hover:border-gray-300'
      )}
    >
      <button
        type="button"
        onClick={() => setOpenId(open ? null : id)}
        className="w-full flex items-start gap-3 p-4 sm:p-5 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {tourId && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                Có tour
              </span>
            )}
            {roles?.map((r) => (
              <span
                key={r}
                className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
              >
                {r}
              </span>
            ))}
          </div>
          <p className="mt-0.5 text-sm text-gray-500">{summary}</p>
        </div>
        <ChevronDown
          className={clsx('h-5 w-5 text-gray-400 shrink-0 mt-1 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="px-4 sm:px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
          {tourId && (
            <button
              type="button"
              onClick={() => onStartTour(tourId)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-600 shadow-sm"
            >
              <Play className="h-4 w-4 fill-current" />
              Bắt đầu tour — bấm theo từng bước
            </button>
          )}
          <ol className="space-y-3">{steps.map((s, i) => <Step key={i} n={i + 1} {...s} />)}</ol>
          <div className="flex flex-wrap gap-2">
            {href && (
              <Link
                to={href}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                {hrefLabel || 'Mở trang thao tác'}
                <ExternalLink className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

const GUIDES = [
  {
    id: 'order',
    icon: ListOrdered,
    title: 'Thứ tự nên làm lần đầu',
    roles: ['Admin'],
    summary: 'Làm đúng thứ tự này để tránh thiếu dữ liệu khi tạo lớp / thu phí.',
    href: null,
    tourId: null,
    steps: [
      {
        where: 'Menu bên trái → Hướng dẫn thao tác',
        action:
          'Mở từng mục bên dưới và bấm Bắt đầu tour. Màn hình sẽ làm tối, khoanh sáng chỗ cần bấm, và ghi rõ sẽ hiện gì tiếp theo.',
      },
      {
        where: 'Thứ tự tour nên chạy',
        action:
          '① Giáo viên → ② Môn học → ③ Học sinh → ④ Lớp → ⑤ Thêm HS vào lớp → ⑥ Thời khóa biểu → ⑦ Học phí → ⑧ Bài học.',
        tip: 'Tour dẫn bạn bấm đúng nút; phần điền số liệu (tên, email…) bạn tự nhập rồi bấm Tiếp.',
      },
    ],
  },
  {
    id: 'teacher',
    icon: Users,
    title: 'Tạo giáo viên',
    roles: ['Admin'],
    summary: 'Tour sáng chỗ bấm: menu → Thêm giáo viên → form → Lưu.',
    href: '/teachers',
    hrefLabel: 'Mở trang Giáo viên',
    tourId: 'teacher',
    steps: [
      {
        where: 'Menu → Giáo viên',
        action: 'Tour khoanh sáng mục Giáo viên — bấm vào đó.',
      },
      {
        where: 'Nút Thêm giáo viên',
        action: 'Bấm nút được highlight → cửa sổ form hiện ra.',
      },
      {
        where: 'Từng ô: Họ tên → Email → SĐT → Thêm mới',
        action: 'Tour dẫn từng ô. Có “Điền mẫu”. Điền xong bấm Tiếp; cuối cùng bấm Thêm mới.',
      },
    ],
  },
  {
    id: 'subject',
    icon: BookOpen,
    title: 'Tạo môn học',
    roles: ['Admin'],
    summary: 'Tour chi tiết: menu → Thêm → Tên môn → Mã → Mô tả → Lưu.',
    href: '/subjects',
    hrefLabel: 'Mở trang Môn học',
    tourId: 'subject',
    steps: [
      { where: 'Menu → Môn học → Thêm', action: 'Bấm đúng chỗ sáng.' },
      { where: 'Từng ô trên form', action: 'Tên môn (bắt buộc) → mã → mô tả → Thêm mới.' },
    ],
  },
  {
    id: 'facility',
    icon: Building2,
    title: 'Tạo cơ sở & phòng học (tuỳ chọn)',
    roles: ['Admin'],
    summary: 'Cần khi xếp lịch theo phòng. (Chưa có tour — mở trang và thêm cơ sở.)',
    href: '/facilities',
    hrefLabel: 'Mở Cơ sở & Phòng học',
    tourId: null,
    steps: [
      {
        where: 'Menu → Vận hành → Cơ sở & Phòng học',
        action: 'Bấm Thêm cơ sở, rồi thêm phòng thuộc cơ sở.',
      },
    ],
  },
  {
    id: 'student',
    icon: GraduationCap,
    title: 'Tạo học sinh',
    roles: ['Admin'],
    summary: 'Tour chi tiết từng ô: Họ tên → Email → SĐT → Lưu.',
    href: '/students',
    hrefLabel: 'Mở trang Học sinh',
    tourId: 'student',
    steps: [
      { where: 'Menu → Học sinh → Thêm', action: 'Bấm chỗ được highlight.' },
      { where: 'Form từng bước', action: 'Điền theo spotlight; cuối bấm Thêm mới. Sau đó chạy tour thêm vào lớp.' },
    ],
  },
  {
    id: 'class',
    icon: School,
    title: 'Tạo lớp học',
    roles: ['Admin'],
    summary: 'Tour 9 bước: tên → môn → GV → sĩ số → ngày bắt đầu/kết thúc → lưu.',
    href: '/classes',
    hrefLabel: 'Mở trang Lớp học',
    tourId: 'class',
    steps: [
      { where: 'Menu → Lớp → Thêm lớp', action: 'Bấm chỗ sáng.' },
      { where: 'Từng ô form', action: 'Chọn môn + GV; bắt buộc ngày bắt đầu và kết thúc rồi lưu.' },
    ],
  },
  {
    id: 'enroll',
    icon: GraduationCap,
    title: 'Thêm học sinh vào lớp',
    roles: ['Admin', 'GV'],
    summary: 'Tour: lớp → tab Học sinh → Thêm học viên → chọn HS → xác nhận.',
    href: '/classes',
    hrefLabel: 'Mở danh sách lớp',
    tourId: 'enroll',
    steps: [
      { where: 'Mở một lớp', action: 'Bấm tên lớp rồi Tiếp trên khung tour.' },
      { where: 'Tab Học sinh → Thêm → chọn', action: 'Làm theo từng bước spotlight.' },
    ],
  },
  {
    id: 'schedule',
    icon: CalendarDays,
    title: 'Tạo thời khóa biểu',
    roles: ['Admin', 'GV'],
    summary: 'Tour: Thêm lịch → chế độ Lặp lại → lớp → giờ → ngày → lưu.',
    href: '/schedules',
    hrefLabel: 'Mở Thời khóa biểu',
    tourId: 'schedule',
    steps: [
      { where: 'Menu → Thời khóa biểu → Thêm', action: 'Bấm chỗ sáng.' },
      { where: 'Form từng phần', action: 'Chọn Lặp lại (khuyến nghị), lớp, giờ, ngày rồi lưu.' },
    ],
  },
  {
    id: 'tuition',
    icon: Wallet,
    title: 'Thiết lập & thu học phí',
    roles: ['Admin'],
    summary: 'Tour 9 bước: tab Học phí → Sửa → hình thức → giá → Lưu → Sinh hóa đơn → Thu tiền.',
    href: '/finances?tab=tuition_payment',
    hrefLabel: 'Mở Thu tiền',
    tourId: 'tuition',
    steps: [
      { where: 'Mở lớp → tab Học phí', action: 'Làm theo spotlight.' },
      { where: 'Cấu hình → hóa đơn → thu', action: 'Sinh hóa đơn trước rồi mới Thu tiền.' },
    ],
  },
  {
    id: 'lesson',
    icon: FileText,
    title: 'Tạo bài học',
    roles: ['Admin', 'GV'],
    summary: 'Tour: tiêu đề → lớp → nội dung → xuất bản → lưu.',
    href: '/lessons',
    hrefLabel: 'Mở trang Bài học',
    tourId: 'lesson',
    steps: [
      { where: 'Menu → Bài học → Thêm', action: 'Bấm chỗ sáng.' },
      { where: 'Từng phần form', action: 'Điền theo spotlight; tick xuất bản nếu muốn HS thấy ngay.' },
    ],
  },
]

export default function UserGuidePage() {
  const { user } = useAuth()
  const { startTour, active } = useTour()
  const [openId, setOpenId] = useState('order')
  const role = user?.role

  const visibleGuides = useMemo(() => {
    return GUIDES.filter((g) => {
      if (role === 'admin') return true
      if (role === 'teacher') {
        return g.id === 'order' || g.roles?.includes('GV')
      }
      return g.id === 'order' || g.id === 'lesson'
    })
  }, [role])

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <header className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shrink-0">
            <BookOpenCheck className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Hướng dẫn thao tác (Tour)</h1>
            <p className="mt-1 text-sm text-gray-600">
              Bấm <strong>Bắt đầu tour</strong> — mỗi bước khoanh sáng đúng nút/ô cần thao tác, ghi rõ <em>Làm gì</em>, <em>Điền mẫu</em>, <em>Sẽ hiện gì</em> và các lưu ý. Form được tách từng ô (Họ tên → Email → … → Lưu).
            </p>
          </div>
        </div>

        {active && (
          <p className="mt-3 text-sm font-medium text-amber-900 bg-amber-100/80 rounded-lg px-3 py-2">
            Tour đang chạy — làm theo khung hướng dẫn trên màn hình (hoặc bấm ✕ để dừng).
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {visibleGuides.filter((g) => g.tourId).map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => startTour(g.tourId)}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50"
            >
              <Play className="h-3 w-3 fill-current" />
              {g.title}
            </button>
          ))}
        </div>
      </header>

      {role === 'admin' && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          <p>
            Gợi ý: chạy lần lượt các nút Play phía trên. Hoặc dùng{' '}
            <Link to="/admin-hub" className="font-semibold underline underline-offset-2">
              Trung tâm quản trị
            </Link>{' '}
            sau khi đã quen thao tác.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {visibleGuides.map((g) => (
          <GuideCard
            key={g.id}
            {...g}
            openId={openId}
            setOpenId={setOpenId}
            onStartTour={startTour}
          />
        ))}
      </div>

      <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
        Chỗ sáng = chỗ cần bấm
        <ArrowRight className="h-3 w-3" />
        Khung trắng = giải thích + sẽ hiện gì
      </p>
    </div>
  )
}
