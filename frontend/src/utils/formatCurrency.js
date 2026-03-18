export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

export function formatNumber(num) {
  if (num == null || isNaN(num)) return '0'
  return new Intl.NumberFormat('vi-VN').format(num)
}
