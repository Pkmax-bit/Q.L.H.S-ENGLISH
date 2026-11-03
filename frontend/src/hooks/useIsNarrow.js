import { useEffect, useState } from 'react'

/**
 * Màn hình hẹp (điện thoại) hay không — theo đúng ngưỡng `md` của Tailwind.
 *
 * Dùng matchMedia chứ không đọc window.innerWidth trong render: innerWidth
 * không báo cho React biết lúc xoay ngang máy, còn matchMedia thì có sự kiện.
 *
 * Khác với class `md:` của Tailwind ở chỗ đây là quyết định LOGIC — lưới đổi
 * hẳn sang một ngày, thao tác đổi từ chuột phải sang nhấn giữ — chứ không chỉ
 * ẩn hiện, nên phải biết ở JS.
 */
export function useIsNarrow(query = '(max-width: 767px)') {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = (e) => setNarrow(e.matches)
    setNarrow(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return narrow
}
