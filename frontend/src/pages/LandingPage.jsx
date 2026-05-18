import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, GraduationCap, Menu, X } from 'lucide-react'

/** Ảnh minh họa — có thể thay bằng URL ảnh thật của trung tâm */
const BANNER_IMAGE =
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1920&q=80&auto=format&fit=crop'

/** Mục 04 zigzag */
const LIBRARY_ZIGZAG_IMAGE = 'https://lac.edu.vn/images/.post/thu-vien-dien-tu.jpg'

/** Banner đại hình cuối section Hoạt động */
const LIBRARY_SHOWCASE_IMAGE =
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1920&q=88&auto=format&fit=crop'

const LIBRARY_SHOWCASE = {
  eyebrow: 'Không gian trung tâm',
  title: 'Góc đọc sách & tự học',
  text: 'Yên tĩnh, đủ sách và tài liệu — học viên chủ động ôn luyện ngoài giờ lên lớp.',
}

const TRIO_IMAGES = [
  {
    src: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&q=80&auto=format&fit=crop',
    title: 'Lớp học năng động',
    caption: 'Môi trường học tập hiện đại, tương tác cao',
  },
  {
    src: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80&auto=format&fit=crop',
    title: 'Giáo viên tận tâm',
    caption: 'Đội ngũ giảng dạy chuyên nghiệp',
  },
  {
    src: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80&auto=format&fit=crop',
    title: 'Học viên tự tin',
    caption: 'Phát triển kỹ năng Anh ngữ toàn diện',
  },
]

const ZIGZAG_IMAGES = [
  {
    side: 'left',
    src: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=80&auto=format&fit=crop',
    title: 'Học nhóm & thảo luận',
    text: 'Phương pháp học theo nhóm giúp học viên giao tiếp tự nhiên và tự tin hơn.',
  },
  {
    side: 'right',
    src: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&q=80&auto=format&fit=crop',
    title: 'Luyện thi TOEIC',
    text: 'Đề nghe–đọc chuẩn, thi mô phỏng trên hệ thống — sát trải nghiệm phòng thi thật.',
  },
  {
    side: 'left',
    src: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=85&auto=format&fit=crop',
    title: 'Theo dõi tiến độ',
    text: 'Học viên và phụ huynh xem bài tập, điểm số mọi lúc trên cổng học tập.',
  },
  {
    side: 'right',
    src: LIBRARY_ZIGZAG_IMAGE,
    title: 'Thư viện & tự học',
    text: 'Sách tham khảo, tài liệu luyện thi và góc tự học sau giờ lên lớp — hỗ trợ học viên ôn tập mỗi ngày.',
  },
  {
    side: 'left',
    src: 'https://images.unsplash.com/photo-1529390079861-591de354faf5?w=900&q=80&auto=format&fit=crop',
    title: 'Sự kiện & cộng đồng',
    text: 'Hoạt động ngoại khóa, giao lưu — học tiếng Anh trong môi trường thân thiện.',
  },
]

/** Vùng 30% dưới viewport — tâm ảnh chạm vào đây (cuộn lên) mới trượt ra; giữa màn vẫn hiện. */
const EXIT_ZONE_TOP_RATIO = 0.7
const EXIT_ORDER_STEP_RATIO = 0.04

/** Cuộn xuống → trượt vào; cuộn lên → giữ tới khi tâm ảnh xuống 30% đáy màn hình mới ra (lần lượt). */
function useScrollSlide(baseFrom = 'right', exitOrder = 0) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let scrollDir = 'down'
    let lastY = window.scrollY

    const sync = () => {
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      const inViewport = rect.top < vh * 0.98 && rect.bottom > vh * 0.02

      if (!inViewport) {
        setVisible(false)
        return
      }

      if (scrollDir === 'down') {
        setVisible(true)
        return
      }

      // Cuộn lên: còn hiện ở giữa màn; chỉ ẩn khi tâm khối vào 30% dưới (hình dưới ra trước)
      const centerY = rect.top + rect.height / 2
      const exitLine = vh * EXIT_ZONE_TOP_RATIO + exitOrder * vh * EXIT_ORDER_STEP_RATIO
      const inBottomZone = centerY >= exitLine
      setVisible(!inBottomZone)
    }

    const onScroll = () => {
      const y = window.scrollY
      if (y > lastY) scrollDir = 'down'
      else if (y < lastY) scrollDir = 'up'
      lastY = y
      sync()
    }

    sync()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', sync)
    }
  }, [exitOrder])

  return { ref, visible, from: baseFrom }
}

function SlideIn({ children, from = 'right', delay = 0, exitDelay = 0, exitOrder = 0, className = '' }) {
  const { ref, visible, from: slideFrom } = useScrollSlide(from, exitOrder)
  const fromRight = slideFrom === 'right'
  return (
    <div
      ref={ref}
      className={`landing-slide ${fromRight ? 'landing-slide--from-right' : 'landing-slide--from-left'} ${
        visible ? 'landing-slide--visible' : ''
      } ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : `${exitDelay}ms` }}
    >
      {children}
    </div>
  )
}

function IntroImageCard({ src, title, caption, index }) {
  return (
    <SlideIn
      from="right"
      delay={index * 390}
      exitDelay={(TRIO_IMAGES.length - 1 - index) * 680}
      exitOrder={TRIO_IMAGES.length - 1 - index}
      className="w-full"
    >
      <figure className="landing-image-card group overflow-hidden rounded-2xl border border-amber-200/80 shadow-xl shadow-amber-200/50">
        <div className="aspect-[4/3] overflow-hidden">
          <img
            src={src}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        </div>
        <figcaption className="p-4 sm:p-5 bg-white border-t border-amber-200/80">
          <p className="font-semibold text-stone-900">{title}</p>
          <p className="text-sm text-stone-600 mt-1">{caption}</p>
        </figcaption>
      </figure>
    </SlideIn>
  )
}

function LibraryShowcaseBanner() {
  return (
    <div className="pt-4 sm:pt-8">
      <SlideIn from="right" delay={120} exitDelay={0} exitOrder={-1} className="w-full">
        <figure className="landing-library-hero overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-200/90 shadow-2xl shadow-amber-200/40">
          <div className="relative aspect-[16/7] sm:aspect-[21/9] min-h-[220px] sm:min-h-[320px] md:min-h-[380px]">
            <img
              src={LIBRARY_SHOWCASE_IMAGE}
              alt={LIBRARY_SHOWCASE.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </figure>
      </SlideIn>

      <SlideIn from="left" delay={280} exitDelay={120} exitOrder={-1} className="max-w-3xl mx-auto mt-8 sm:mt-10 text-center">
        <p className="text-amber-600 text-sm font-semibold uppercase tracking-[0.2em] mb-3">
          {LIBRARY_SHOWCASE.eyebrow}
        </p>
        <h3 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-4">{LIBRARY_SHOWCASE.title}</h3>
        <p className="text-stone-600 text-base sm:text-lg leading-relaxed">{LIBRARY_SHOWCASE.text}</p>
      </SlideIn>
    </div>
  )
}

function ZigzagRow({ item, index }) {
  const fromLeft = item.side === 'left'
  const exitRank = ZIGZAG_IMAGES.length - 1 - index
  return (
    <div
      className={`flex flex-col gap-8 lg:gap-12 items-center ${
        fromLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'
      }`}
    >
      <SlideIn
        from={fromLeft ? 'left' : 'right'}
        delay={0}
        exitDelay={exitRank * 570}
        exitOrder={exitRank * 2}
        className="w-full lg:w-[48%] flex-shrink-0"
      >
        <figure className="landing-image-card overflow-hidden rounded-2xl border border-amber-200/80 shadow-lg shadow-amber-100/80">
          <div className="aspect-[16/10] overflow-hidden">
            <img
              src={item.src}
              alt={item.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </figure>
      </SlideIn>

      <SlideIn
        from={fromLeft ? 'right' : 'left'}
        delay={540}
        exitDelay={exitRank * 570 + 360}
        exitOrder={exitRank * 2 + 1}
        className="w-full lg:w-[48%] flex-shrink-0"
      >
        <div className={`${fromLeft ? 'lg:pr-4 lg:text-left' : 'lg:pl-4 lg:text-right'} text-center lg:text-inherit`}>
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-4">{item.title}</h3>
          <p className="text-stone-600 leading-relaxed text-base sm:text-lg">{item.text}</p>
        </div>
      </SlideIn>
    </div>
  )
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="landing-page min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50/90 text-stone-800 overflow-x-hidden">
      <div className="landing-bg-mesh fixed inset-0 pointer-events-none" aria-hidden />
      <div className="landing-orb landing-orb--1" aria-hidden />
      <div className="landing-orb landing-orb--2" aria-hidden />

      {/* Nav — không bắt buộc đăng nhập */}
      <header
        className={`landing-nav fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled ? 'landing-nav--scrolled py-3' : 'py-4'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-500/25 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-stone-900 block leading-none">Q.L.H.S</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-amber-700 font-semibold">English</span>
            </div>
          </Link>

          <div className="hidden sm:flex items-center gap-6">
            <button
              type="button"
              onClick={() => scrollTo('gioi-thieu')}
              className="text-sm text-stone-600 hover:text-amber-800 transition-colors"
            >
              Giới thiệu
            </button>
            <button
              type="button"
              onClick={() => scrollTo('hoat-dong')}
              className="text-sm text-stone-600 hover:text-amber-800 transition-colors"
            >
              Hoạt động
            </button>
            <Link
              to="/login"
              className="text-sm font-semibold text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-200/80 px-4 py-2 rounded-full transition-colors shadow-sm"
            >
              Đăng nhập hệ thống
            </Link>
          </div>

          <button
            type="button"
            className="sm:hidden p-2 text-stone-600"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="sm:hidden mx-4 mt-2 p-4 rounded-xl bg-white/95 border border-amber-200 shadow-lg backdrop-blur-xl">
            <button type="button" className="block w-full text-left py-2 text-stone-700" onClick={() => scrollTo('gioi-thieu')}>
              Giới thiệu
            </button>
            <button type="button" className="block w-full text-left py-2 text-stone-700" onClick={() => scrollTo('hoat-dong')}>
              Hoạt động
            </button>
            <Link to="/login" className="block mt-3 text-center py-3 rounded-lg bg-amber-100 text-amber-950 font-medium border border-amber-200">
              Đăng nhập
            </Link>
          </div>
        )}
      </header>

      {/* ——— Banner trên cùng ——— */}
      <section className="relative min-h-[88vh] sm:min-h-[92vh] flex items-end">
        <div className="absolute inset-0">
          <img
            src={BANNER_IMAGE}
            alt="Q.L.H.S English — Trung tâm Anh ngữ"
            className="landing-banner-photo w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-amber-50/95 via-white/45 to-white/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-amber-100/35 to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24 pt-28">
          <p className="text-amber-700 text-sm font-semibold uppercase tracking-[0.25em] mb-4 landing-fade-banner">
            Trung tâm Anh ngữ
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-stone-900 leading-[1.08] max-w-4xl landing-fade-banner landing-fade-banner--2">
            Q.L.H.S English
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-stone-700 max-w-2xl leading-relaxed landing-fade-banner landing-fade-banner--3">
            Nơi học viên bứt phá kỹ năng tiếng Anh — luyện thi TOEIC, giao tiếp và nền tảng vững chắc cho tương lai.
          </p>
          <button
            type="button"
            onClick={() => scrollTo('gioi-thieu')}
            className="mt-10 inline-flex items-center gap-2 text-amber-800 hover:text-amber-900 transition-colors landing-fade-banner landing-fade-banner--4"
          >
            <span className="text-sm font-medium">Cuộn để khám phá</span>
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </button>
        </div>
      </section>

      {/* ——— 3 hình trượt từ phải vào ——— */}
      <section id="gioi-thieu" className="py-20 sm:py-28 px-4 sm:px-6 scroll-mt-20 bg-white/60">
        <div className="max-w-6xl mx-auto">
          <SlideIn from="left" delay={0} className="max-w-2xl mb-14">
              <p className="text-amber-600 text-sm font-semibold uppercase tracking-widest mb-3">Giới thiệu</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
                Học tiếng Anh trong môi trường chuẩn quốc tế
              </h2>
              <p className="mt-5 text-stone-600 leading-relaxed">
                Q.L.H.S English đồng hành cùng học viên từ nền tảng cơ bản đến luyện thi chứng chỉ.
                Lớp học sĩ số vừa phải, giáo trình rõ ràng và công nghệ hỗ trợ học tập hiện đại.
              </p>
          </SlideIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {TRIO_IMAGES.map((img, i) => (
              <IntroImageCard key={img.title} {...img} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ——— 5 hình chẵn lẻ trái–phải ——— */}
      <section id="hoat-dong" className="py-20 sm:py-28 px-4 sm:px-6 scroll-mt-20 border-t border-amber-200/80 bg-amber-50/50">
        <div className="max-w-6xl mx-auto">
          <SlideIn from="left" className="text-center max-w-2xl mx-auto mb-16 sm:mb-20">
            <p className="text-amber-600 text-sm font-semibold uppercase tracking-widest mb-3">Hoạt động</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900">Điểm nổi bật tại trung tâm</h2>
            <p className="mt-4 text-stone-600">
              Xen kẽ trái–phải; cuộn lên hoặc xuống đều có animation đối chiều.
            </p>
          </SlideIn>

          <div className="space-y-20 sm:space-y-28">
            {ZIGZAG_IMAGES.map((item, i) => (
              <ZigzagRow key={item.title} item={item} index={i} />
            ))}
            <LibraryShowcaseBanner />
          </div>
        </div>
      </section>

      {/* CTA — tuỳ chọn đăng nhập */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <SlideIn from="right">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-4">
              Bạn là học viên hoặc cán bộ trung tâm?
            </h2>
            <p className="text-stone-600 mb-8">
              Trang này chỉ để giới thiệu. Đăng nhập khi cần vào hệ thống quản lý và học tập trực tuyến.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-stone-950 font-semibold shadow-lg shadow-amber-500/40 hover:scale-[1.02] transition-transform"
            >
              Vào cổng đăng nhập
              <ArrowRight className="h-5 w-5" />
            </Link>
          </SlideIn>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-amber-200/80 bg-amber-50 text-center text-sm text-stone-500">
        <p>© {new Date().getFullYear()} Q.L.H.S English — Trang giới thiệu</p>
      </footer>
    </div>
  )
}
