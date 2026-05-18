// Print helper: opens a new window and triggers browser print dialog
// `payment` may be null → prints the invoice itself instead of a single receipt.
import { resolveUploadUrl as resolveUrl } from '../../utils/uploadUrl'

const fmtMoney = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n) || 0)

const fmtDate = (s) => {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const methodLabels = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  card: 'Thẻ',
  other: 'Khác',
}

export function printReceipt({ invoice, payment }) {
  const isReceipt = !!payment
  const title = isReceipt ? 'Phiếu thu' : 'Hóa đơn học phí'
  const docNo = isReceipt ? payment.receipt_no : invoice.invoice_no

  const itemsHtml = (invoice.items || [])
    .map((it) => {
      const periodLabel = it.period_start
        ? (it.period_end && it.period_end !== it.period_start
            ? `${fmtDateOnly(it.period_start)} → ${fmtDateOnly(it.period_end)}`
            : fmtDateOnly(it.period_start))
        : '—'
      const mainRow = `
        <tr>
          <td>${escapeHtml(periodLabel)}</td>
          <td>${escapeHtml(it.description || '')}</td>
          <td class="num">${it.quantity}</td>
          <td class="num">${fmtMoney(it.unit_price)}</td>
          <td class="num">${fmtMoney(it.amount)}</td>
        </tr>`
      const itemImages =
        Array.isArray(it.attachment_urls) && it.attachment_urls.length > 0
          ? `
        <tr>
          <td colspan="5" style="padding:8px 8px 12px;background:#fafafa;border-bottom:1px solid #ddd;">
            <div style="font-size:11px;color:#666;margin-bottom:6px;">Ảnh dòng:</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${it.attachment_urls
                .map(
                  (u) =>
                    `<img src="${escapeHtml(resolveUrl(u))}" alt="" style="max-height:120px;max-width:45%;border:1px solid #ccc;border-radius:4px;object-fit:cover;" />`
                )
                .join('')}
            </div>
          </td>
        </tr>`
          : ''
      return mainRow + itemImages
    })
    .join('')

  const attachmentsHtml =
    !isReceipt && Array.isArray(invoice.attachment_urls) && invoice.attachment_urls.length > 0
      ? `
        <div style="margin-top:16px;">
          <div style="font-size:13px;color:#555;margin-bottom:6px;">Ảnh đính kèm:</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${invoice.attachment_urls
              .map(
                (u) =>
                  `<img src="${resolveUrl(u)}" style="max-height:160px;max-width:48%;border:1px solid #ccc;border-radius:4px;" />`
              )
              .join('')}
          </div>
        </div>`
      : ''

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>${title} ${docNo || ''}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Roboto, Arial, sans-serif; margin: 24px; color: #111; }
    .doc { max-width: 720px; margin: 0 auto; }
    .head { text-align: center; margin-bottom: 16px; }
    .head h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: 1px; }
    .head .sub { color: #555; font-size: 13px; }
    .meta { display: flex; justify-content: space-between; margin: 16px 0; font-size: 13px; }
    .meta .col { line-height: 1.6; }
    .meta b { display: inline-block; min-width: 90px; color: #555; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
    th, td { padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: left; }
    th { background: #f5f5f5; }
    td.num, th.num { text-align: right; }
    tfoot td { border-bottom: none; }
    .totals { margin-top: 8px; font-size: 13px; }
    .totals tr td:first-child { text-align: right; color: #555; }
    .totals tr td:last-child { text-align: right; font-weight: 600; }
    .grand { font-size: 16px !important; }
    .pay-box { margin-top: 16px; padding: 12px; border: 2px solid #1d4ed8; border-radius: 8px; background: #eff6ff; }
    .pay-box .row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 14px; }
    .pay-box .amt { font-size: 22px; font-weight: bold; color: #1d4ed8; }
    .signs { margin-top: 32px; display: flex; justify-content: space-around; font-size: 13px; text-align: center; }
    .signs .slot { width: 200px; }
    .signs .slot .role { font-weight: 600; margin-bottom: 60px; }
    .signs .slot .name { color: #555; font-style: italic; }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="doc">
    <div class="head">
      <h1>${title.toUpperCase()}</h1>
      <div class="sub">Số: <b>${docNo || ''}</b> • Ngày: ${fmtDate(isReceipt ? payment.paid_at : invoice.created_at)}</div>
    </div>

    <div class="meta">
      <div class="col">
        <div><b>Học sinh:</b> ${escapeHtml(invoice.student_name || '')}</div>
        <div><b>Lớp:</b> ${escapeHtml(invoice.class_name || '')}</div>
        ${invoice.student_phone ? `<div><b>SĐT:</b> ${escapeHtml(invoice.student_phone)}</div>` : ''}
      </div>
      <div class="col">
        <div><b>Số HĐ:</b> ${escapeHtml(invoice.invoice_no || '')}</div>
        <div><b>Kỳ:</b> ${fmtDateOnly(invoice.period_start)} → ${fmtDateOnly(invoice.period_end)}</div>
        ${invoice.due_date ? `<div><b>Hạn TT:</b> ${fmtDateOnly(invoice.due_date)}</div>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:140px;">Kỳ</th>
          <th>Nội dung</th>
          <th class="num" style="width:60px;">SL</th>
          <th class="num" style="width:120px;">Đơn giá</th>
          <th class="num" style="width:140px;">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || '<tr><td colspan="5" style="text-align:center;color:#888;">(Không có dòng chi tiết)</td></tr>'}
      </tbody>
    </table>

    ${attachmentsHtml}

    <table class="totals">
      <tbody>
        <tr><td>Tạm tính</td><td>${fmtMoney(invoice.subtotal)}</td></tr>
        ${Number(invoice.discount) > 0 ? `<tr><td>Giảm giá</td><td>- ${fmtMoney(invoice.discount)}</td></tr>` : ''}
        <tr><td>Tổng cộng</td><td class="grand">${fmtMoney(invoice.total)}</td></tr>
        <tr><td>Đã thu</td><td>${fmtMoney(invoice.paid_amount)}</td></tr>
        <tr><td>Còn lại</td><td>${fmtMoney(invoice.balance)}</td></tr>
      </tbody>
    </table>

    ${isReceipt ? `
    <div class="pay-box">
      <div class="row"><span>Số tiền nhận</span><span class="amt">${fmtMoney(payment.amount)}</span></div>
      <div class="row"><span>Phương thức</span><span>${methodLabels[payment.payment_method] || payment.payment_method}</span></div>
      <div class="row"><span>Thời điểm</span><span>${fmtDate(payment.paid_at)}</span></div>
      ${payment.note ? `<div class="row"><span>Ghi chú</span><span>${escapeHtml(payment.note)}</span></div>` : ''}
      ${payment.transfer_image_url ? `
      <div style="margin-top:8px;">
        <div style="font-size:12px;color:#555;margin-bottom:4px;">Ảnh chuyển khoản:</div>
        <img src="${resolveUrl(payment.transfer_image_url)}" alt="CK" style="max-width:100%;max-height:280px;border:1px solid #ccc;border-radius:4px;" />
      </div>` : ''}
    </div>` : ''}

    <div class="signs">
      <div class="slot">
        <div class="role">Người nộp tiền</div>
        <div class="name">(Ký, ghi rõ họ tên)</div>
      </div>
      <div class="slot">
        <div class="role">Người thu tiền</div>
        <div class="name">(Ký, ghi rõ họ tên)</div>
      </div>
    </div>
  </div>

  <div class="no-print" style="text-align:center;margin-top:24px;">
    <button onclick="window.print()" style="padding:8px 16px;font-size:14px;cursor:pointer;">In</button>
    <button onclick="window.close()" style="padding:8px 16px;font-size:14px;cursor:pointer;margin-left:8px;">Đóng</button>
  </div>

  <script>
    setTimeout(function(){ window.print(); }, 300);
  </script>
</body>
</html>`

  const w = window.open('', '_blank', 'width=820,height=900')
  if (!w) {
    alert('Trình duyệt đã chặn cửa sổ pop-up. Cho phép pop-up để in phiếu thu.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDateOnly(s) {
  if (!s) return ''
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default { printReceipt }
