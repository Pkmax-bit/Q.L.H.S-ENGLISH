import { getToeicListeningMeta, pickGroupAudioUrl as legacyPickGroupAudioUrl } from './toeicListening'

/** @typedef {{ audio_group_id?: string, audio_group_leader?: boolean, audio_group_index?: number, audio_group_size?: number }} ToeicAudioGroupMeta */

/**
 * @param {object} q
 * @returns {ToeicAudioGroupMeta|null}
 */
function readAudioGroupMeta(q) {
  const m = q?.toeic_meta
  if (!m || typeof m !== 'object') return null
  if (!m.audio_group_id) return null
  return m
}

/**
 * @param {object[]} questions
 * @param {number} questionIndex — 0-based order_index position
 */
export function getAudioGroupInfo(questions, questionIndex) {
  const q = questions[questionIndex]
  const custom = readAudioGroupMeta(q)

  if (custom?.audio_group_id) {
    const groupId = custom.audio_group_id
    const indices = []
    questions.forEach((row, i) => {
      if (readAudioGroupMeta(row)?.audio_group_id === groupId) indices.push(i)
    })
    indices.sort((a, b) => a - b)
    const leaderIndex = indices.find((i) => readAudioGroupMeta(questions[i])?.audio_group_leader) ?? indices[0]
    const indexInGroup = indices.indexOf(questionIndex)
    return {
      inGroup: indices.length > 1,
      usesCustomGroup: true,
      groupId,
      groupSize: indices.length,
      indexInGroup: indexInGroup >= 0 ? indexInGroup : 0,
      isLeader: questionIndex === leaderIndex,
      leaderIndex,
      memberIndices: indices,
    }
  }

  const meta = getToeicListeningMeta(questionIndex)
  if ((meta.part === 3 || meta.part === 4) && meta.groupIndex != null) {
    const base = meta.part === 3 ? 31 : 70
    const leaderIndex = base + meta.groupIndex * 3
    const memberIndices = [leaderIndex, leaderIndex + 1, leaderIndex + 2].filter((i) => i < questions.length)
    return {
      inGroup: true,
      usesCustomGroup: false,
      groupId: null,
      groupSize: 3,
      indexInGroup: meta.indexInGroup ?? 0,
      isLeader: (meta.indexInGroup ?? 0) === 0,
      leaderIndex,
      memberIndices,
    }
  }

  return {
    inGroup: false,
    usesCustomGroup: false,
    groupId: null,
    groupSize: 1,
    indexInGroup: 0,
    isLeader: true,
    leaderIndex: questionIndex,
    memberIndices: [questionIndex],
  }
}

/** Nhóm có ≥2 câu nghe chung một audio */
export function hasMultiQuestionAudioGroup(questions, questionIndex) {
  const info = getAudioGroupInfo(questions, questionIndex)
  return info.inGroup && info.groupSize > 1
}

export function isAudioGroupLeader(questions, questionIndex) {
  return getAudioGroupInfo(questions, questionIndex).isLeader
}

/**
 * URL audio cho câu tại questionIndex (tùy chỉnh hoặc P3/P4 chuẩn).
 */
export function resolveQuestionAudioUrl(questions, questionIndex) {
  const info = getAudioGroupInfo(questions, questionIndex)
  if (info.inGroup && info.groupSize > 1) {
    for (const i of info.memberIndices) {
      const u = questions[i]?.youtube_url?.trim()
      if (u) return u
    }
    return null
  }
  return questions[questionIndex]?.youtube_url?.trim() || null
}

/** @deprecated — dùng resolveQuestionAudioUrl; giữ tương thích TakeAssignment */
export function pickGroupAudioUrl(questions, part, groupIndex) {
  if (part !== 3 && part !== 4) return null
  const base = part === 3 ? 31 : 70
  const leaderIndex = base + (groupIndex ?? 0) * 3
  const custom = readAudioGroupMeta(questions[leaderIndex])
  if (custom?.audio_group_id) {
    return resolveQuestionAudioUrl(questions, leaderIndex)
  }
  return legacyPickGroupAudioUrl(questions, part, groupIndex)
}

export function areIndicesContiguous(indices) {
  if (!indices?.length) return false
  const sorted = [...indices].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false
  }
  return true
}

function stripAudioGroupMeta(toeicMeta) {
  if (!toeicMeta || typeof toeicMeta !== 'object') return toeicMeta ?? null
  const {
    audio_group_id,
    audio_group_leader,
    audio_group_index,
    audio_group_size,
    ...rest
  } = toeicMeta
  return Object.keys(rest).length > 0 ? rest : null
}

function mergeToeicMeta(q, patch) {
  const base = q?.toeic_meta && typeof q.toeic_meta === 'object' ? { ...q.toeic_meta } : {}
  return { ...base, ...patch }
}

/**
 * Gộp các câu liên tiếp [startIdx..endIdx] để nghe chung một audio.
 */
export function applyAudioGroupToRange(questions, startIdx, endIdx) {
  if (startIdx > endIdx || startIdx < 0 || endIdx >= questions.length) {
    return questions
  }
  const size = endIdx - startIdx + 1
  if (size < 2) return questions

  const groupId = `ag_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  let audioUrl = ''
  for (let i = startIdx; i <= endIdx; i++) {
    const u = questions[i]?.youtube_url?.trim()
    if (u) {
      audioUrl = u
      break
    }
  }

  return questions.map((q, i) => {
    if (i < startIdx || i > endIdx) return q
    const indexInGroup = i - startIdx
    const isLeader = indexInGroup === 0
    return {
      ...q,
      youtube_url: audioUrl,
      toeic_meta: mergeToeicMeta(q, {
        audio_group_id: groupId,
        audio_group_leader: isLeader,
        audio_group_index: indexInGroup,
        audio_group_size: size,
      }),
    }
  })
}

/** Tách nhóm tại một câu thuộc nhóm tùy chỉnh */
export function ungroupAudioAtIndex(questions, questionIndex) {
  const custom = readAudioGroupMeta(questions[questionIndex])
  if (!custom?.audio_group_id) return questions
  const groupId = custom.audio_group_id
  return questions.map((q) => {
    const m = readAudioGroupMeta(q)
    if (m?.audio_group_id !== groupId) return q
    return {
      ...q,
      toeic_meta: stripAudioGroupMeta(q.toeic_meta),
    }
  })
}

/** Cập nhật URL audio và đồng bộ sang mọi câu trong nhóm tùy chỉnh */
export function setGroupAudioUrl(questions, questionIndex, url) {
  const info = getAudioGroupInfo(questions, questionIndex)
  if (!info.usesCustomGroup || !info.groupId) {
    const copy = [...questions]
    copy[questionIndex] = { ...copy[questionIndex], youtube_url: url }
    return copy
  }
  return questions.map((q, i) => {
    if (!info.memberIndices.includes(i)) return q
    return { ...q, youtube_url: url }
  })
}

/** Hiện ô nhập audio trên card giáo viên */
export function shouldShowAudioInputOnCard(questions, questionIndex) {
  const meta = getToeicListeningMeta(questionIndex)
  const info = getAudioGroupInfo(questions, questionIndex)

  if (info.usesCustomGroup && info.inGroup && info.groupSize > 1) {
    return info.isLeader
  }
  if (meta.part === 1 || meta.part === 2) return true
  if (meta.part === 3 || meta.part === 4) return (meta.indexInGroup ?? 0) === 0
  return true
}

/** Nhãn nhóm cho UI */
export function getAudioGroupLabel(questions, questionIndex) {
  const info = getAudioGroupInfo(questions, questionIndex)
  if (!info.inGroup || info.groupSize <= 1) return null
  const leaderNum = (info.leaderIndex ?? questionIndex) + 1
  return {
    size: info.groupSize,
    indexInGroup: info.indexInGroup,
    leaderQuestionNumber: leaderNum,
    isCustom: info.usesCustomGroup,
  }
}
