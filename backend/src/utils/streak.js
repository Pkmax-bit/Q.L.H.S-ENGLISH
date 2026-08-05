/**
 * Tính chuỗi ngày học tập liên tiếp từ danh sách ngày có hoạt động (YYYY-MM-DD).
 * Quy ước: nếu hôm nay chưa học nhưng hôm qua có → chuỗi vẫn còn (grace 1 ngày).
 */
function toDateKey(isoOrDate) {
  if (!isoOrDate) return null;
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function addDays(dateKey, delta) {
  const d = new Date(`${dateKey}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function computeStreakFromDateKeys(dateKeys) {
  const unique = [...new Set(dateKeys.filter(Boolean))].sort((a, b) => b.localeCompare(a));
  if (unique.length === 0) {
    return { current: 0, longest: 0, active_today: false, last_active: null };
  }

  const today = toDateKey(new Date());
  const yesterday = addDays(today, -1);

  let anchor = null;
  if (unique.includes(today)) anchor = today;
  else if (unique.includes(yesterday)) anchor = yesterday;

  let current = 0;
  if (anchor) {
    let cursor = anchor;
    while (unique.includes(cursor)) {
      current += 1;
      cursor = addDays(cursor, -1);
    }
  }

  let longest = 0;
  let run = 0;
  let prev = null;
  for (const key of unique) {
    if (!prev || addDays(prev, -1) === key) {
      run += 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = key;
  }

  return {
    current,
    longest,
    active_today: unique.includes(today),
    last_active: unique[0],
  };
}

/** Số icon lửa hiển thị theo độ dài chuỗi */
function getStreakFireCount(streakDays) {
  if (!streakDays || streakDays < 1) return 0;
  if (streakDays >= 30) return 5;
  if (streakDays >= 14) return 4;
  if (streakDays >= 7) return 3;
  if (streakDays >= 3) return 2;
  return 1;
}

function buildStreakPayload(dateKeys) {
  const base = computeStreakFromDateKeys(dateKeys);
  return {
    ...base,
    fires: getStreakFireCount(base.current),
  };
}

module.exports = {
  toDateKey,
  computeStreakFromDateKeys,
  getStreakFireCount,
  buildStreakPayload,
};
