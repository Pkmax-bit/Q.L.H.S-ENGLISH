/** Số icon lửa hiển thị theo độ dài chuỗi (đồng bộ backend) */
export function getStreakFireCount(streakDays) {
  if (!streakDays || streakDays < 1) return 0
  if (streakDays >= 30) return 5
  if (streakDays >= 14) return 4
  if (streakDays >= 7) return 3
  if (streakDays >= 3) return 2
  return 1
}

export function getStreakLabel(streakDays) {
  if (!streakDays) return 'Bắt đầu chuỗi hôm nay!'
  if (streakDays >= 30) return 'Huyền thoại!'
  if (streakDays >= 14) return 'Siêu sao!'
  if (streakDays >= 7) return 'Giữ vững phong độ!'
  if (streakDays >= 3) return 'Đang lên!'
  return 'Khởi đầu tốt!'
}

export function getStreakTierClass(streakDays) {
  if (streakDays >= 30) return 'from-rose-500 via-orange-500 to-amber-400'
  if (streakDays >= 14) return 'from-orange-500 via-amber-500 to-yellow-400'
  if (streakDays >= 7) return 'from-amber-500 via-orange-400 to-yellow-300'
  if (streakDays >= 3) return 'from-orange-400 to-amber-300'
  return 'from-orange-300 to-amber-200'
}
