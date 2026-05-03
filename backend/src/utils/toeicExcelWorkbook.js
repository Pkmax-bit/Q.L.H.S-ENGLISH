const XLSX = require('xlsx');

/** Cột chuẩn — khớp parseMultipleChoiceExcelRow (URL ảnh / URL âm thanh / Đáp án A–D…) */
const MC_HEADERS = [
  'STT trong phần',
  'STT toàn đề',
  'Tên file ảnh',
  'Tên file âm thanh',
  'URL ảnh',
  'URL âm thanh',
  'Nội dung câu hỏi',
  'Đáp án A',
  'Đáp án B',
  'Đáp án C',
  'Đáp án D',
  'Đáp án đúng',
  'Điểm',
];

function mediaNameFromUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const path = url.trim().split('?')[0];
    const parts = path.split('/').filter(Boolean);
    return decodeURIComponent(parts[parts.length - 1] || '');
  } catch {
    return '';
  }
}

function correctLetterFromQuestion(q) {
  const opts = q.options || [];
  const ix = opts.findIndex((o) => o.is_correct);
  if (ix >= 0) return ['A', 'B', 'C', 'D'][ix] || '';
  const raw = String(q.correct_answer || '').trim().toUpperCase();
  return raw.charAt(0) || '';
}

function rowFromQuestion(q, sttPart, sttGlobal) {
  const imgUrl = q.file_url || '';
  const audUrl = q.youtube_url || '';
  const opts = q.options || [];
  return [
    sttPart,
    sttGlobal,
    mediaNameFromUrl(imgUrl),
    mediaNameFromUrl(audUrl),
    imgUrl,
    audUrl,
    String(q.question_text || q.text || '').trim(),
    opts[0]?.text != null ? String(opts[0].text) : '',
    opts[1]?.text != null ? String(opts[1].text) : '',
    opts[2]?.text != null ? String(opts[2].text) : '',
    opts[3]?.text != null ? String(opts[3].text) : '',
    correctLetterFromQuestion(q),
    q.points != null ? Number(q.points) : 1,
  ];
}

function blankMcRows(count, globalStartOneBased) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push([
      i + 1,
      globalStartOneBased + i,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      1,
    ]);
  }
  return rows;
}

/** Listening: chỉ 4 sheet — đủ 100 câu */
const LISTENING_BLANK_SEGMENTS = [
  { sheet: 'L-P1', label: 'Listening Part 1 — Photographs', count: 6, globalStart: 1 },
  { sheet: 'L-P2', label: 'Listening Part 2 — Q&R', count: 25, globalStart: 7 },
  { sheet: 'L-P3', label: 'Listening Part 3 — Conversations', count: 39, globalStart: 32 },
  { sheet: 'L-P4', label: 'Listening Part 4 — Talks', count: 30, globalStart: 71 },
];

const READING_BLANK_SEGMENTS = [
  { sheet: 'R-P5', label: 'Reading Part 5', count: 30, globalStart: 101 },
  { sheet: 'R-P6', label: 'Reading Part 6', count: 16, globalStart: 131 },
  { sheet: 'R-P7', label: 'Reading Part 7', count: 54, globalStart: 147 },
];

function appendMcSheet(workbook, title, rows) {
  const data = [MC_HEADERS, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 28 },
    { wch: 28 },
    { wch: 36 },
    { wch: 36 },
    { wch: 40 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 10 },
    { wch: 6 },
  ];
  const safeName = title.slice(0, 31);
  XLSX.utils.book_append_sheet(workbook, ws, safeName);
}

function buildGuideSheet(workbook, lines) {
  const ws = XLSX.utils.aoa_to_sheet(lines.map((l) => [l]));
  ws['!cols'] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(workbook, ws, 'Hướng dẫn');
}

/**
 * Mẫu trống — chỉ STT + sheet theo phần.
 * variant: toeic_listening | toeic_lr | toeic_four_skills | general
 */
function buildBlankTemplateWorkbook(variant) {
  const workbook = XLSX.utils.book_new();

  if (variant === 'toeic_listening') {
    LISTENING_BLANK_SEGMENTS.forEach((seg) => {
      appendMcSheet(workbook, seg.sheet, blankMcRows(seg.count, seg.globalStart));
    });
    buildGuideSheet(workbook, [
      '📋 TOEIC Listening — mẫu nhập theo từng Part',
      'Mỗi sheet = một Part. Điền URL ảnh / âm thanh và đáp án. Cột "Tên file" tự đối chiếu từ URL khi xuất từ hệ thống.',
      'Import API: dùng sheet trùng tên hoặc sheet Part 1 (TOEIC) / Trắc nghiệm như trước — có thể copy cột từ đây.',
    ]);
    return workbook;
  }

  if (variant === 'toeic_lr') {
    LISTENING_BLANK_SEGMENTS.forEach((seg) => {
      appendMcSheet(workbook, seg.sheet, blankMcRows(seg.count, seg.globalStart));
    });
    READING_BLANK_SEGMENTS.forEach((seg) => {
      appendMcSheet(workbook, seg.sheet, blankMcRows(seg.count, seg.globalStart));
    });
    buildGuideSheet(workbook, [
      '📋 TOEIC 2 kỹ năng (Nghe + Đọc) — 200 câu',
      'STT toàn đề: 1–100 Nghe, 101–200 Đọc.',
      'Điền URL và nội dung câu. Cột "Tên file ảnh / âm thanh" gợi ý đặt tên file khi soạn trên máy.',
    ]);
    return workbook;
  }

  if (variant === 'toeic_four_skills') {
    LISTENING_BLANK_SEGMENTS.forEach((seg) => {
      appendMcSheet(workbook, seg.sheet, blankMcRows(seg.count, seg.globalStart));
    });
    READING_BLANK_SEGMENTS.forEach((seg) => {
      appendMcSheet(workbook, seg.sheet, blankMcRows(seg.count, seg.globalStart));
    });
    const swHeaders = [
      'STT',
      'STT toàn đề',
      'Kỹ năng',
      'Loại nhiệm vụ',
      'Chuẩn bị (giây)',
      'Trả lời / Thời gian',
      'Prompt / Yêu cầu',
      'URL stimulus',
      'Ghi chú',
    ];
    const speakingRows = [];
    for (let i = 0; i < 11; i++) {
      speakingRows.push([i + 1, 200 + i + 1, 'Speaking', '', '', '', '', '', '']);
    }
    const wsS = XLSX.utils.aoa_to_sheet([swHeaders, ...speakingRows]);
    wsS['!cols'] = [{ wch: 6 }, { wch: 10 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 45 }, { wch: 36 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(workbook, wsS, 'S-Speaking');

    const writingRows = [];
    for (let i = 0; i < 8; i++) {
      writingRows.push([i + 1, 211 + i + 1, 'Writing', '', '', '', '', '', '']);
    }
    const wsW = XLSX.utils.aoa_to_sheet([swHeaders, ...writingRows]);
    wsW['!cols'] = wsS['!cols'];
    XLSX.utils.book_append_sheet(workbook, wsW, 'W-Writing');

    buildGuideSheet(workbook, [
      '📋 TOEIC 4 kỹ năng — L+R: sheet L-P*, R-P*; Speaking 11 dòng; Writing 8 dòng.',
      'STT toàn đề: 1–200 trắc nghiệm, 201–211 Speaking, 212–219 Writing.',
    ]);
    return workbook;
  }

  return null;
}

function sliceQuestionsSorted(questions) {
  return [...questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
}

/**
 * Xuất workbook có điền URL + tên file + đáp án từ mảng câu hỏi (đã sort order_index).
 */
function buildExportWorkbookFromQuestions(questions, assignmentType) {
  const qs = sliceQuestionsSorted(questions);
  const workbook = XLSX.utils.book_new();

  const fillSegment = (sheetTitle, startIdx, count, globalOffsetOneBased) => {
    const slice = qs.slice(startIdx, startIdx + count);
    const rows = [];
    for (let i = 0; i < count; i++) {
      const q = slice[i];
      if (q) {
        rows.push(rowFromQuestion(q, i + 1, globalOffsetOneBased + i));
      } else {
        rows.push(blankMcRows(1, globalOffsetOneBased + i)[0]);
      }
    }
    appendMcSheet(workbook, sheetTitle, rows);
  };

  if (assignmentType === 'toeic_listening' || assignmentType === 'toeic_lr' || assignmentType === 'toeic_four_skills') {
    LISTENING_BLANK_SEGMENTS.forEach((seg) => {
      const start = seg.globalStart - 1;
      fillSegment(seg.sheet, start, seg.count, seg.globalStart);
    });
  }

  if (assignmentType === 'toeic_lr' || assignmentType === 'toeic_four_skills') {
    READING_BLANK_SEGMENTS.forEach((seg) => {
      const start = seg.globalStart - 1;
      fillSegment(seg.sheet, start, seg.count, seg.globalStart);
    });
  }

  if (assignmentType === 'toeic_four_skills') {
    const swHeaders = [
      'STT',
      'STT toàn đề',
      'Kỹ năng',
      'Loại nhiệm vụ',
      'Chuẩn bị (giây)',
      'Trả lời / Thời gian',
      'Prompt / Yêu cầu',
      'URL stimulus',
      'Ghi chú',
    ];
    const speakBody = [];
    for (let i = 0; i < 11; i++) {
      const q = qs[200 + i];
      const m = q?.toeic_meta || {};
      speakBody.push([
        i + 1,
        201 + i,
        'Speaking',
        m.task_code || '',
        m.prep_seconds ?? '',
        m.answer_seconds ?? '',
        q?.question_text || q?.text || '',
        q?.file_url || q?.youtube_url || '',
        m.label_en || '',
      ]);
    }
    const wsS = XLSX.utils.aoa_to_sheet([swHeaders, ...speakBody]);
    wsS['!cols'] = [{ wch: 6 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 45 }, { wch: 36 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(workbook, wsS, 'S-Speaking');

    const writeBody = [];
    for (let i = 0; i < 8; i++) {
      const q = qs[211 + i];
      const m = q?.toeic_meta || {};
      writeBody.push([
        i + 1,
        212 + i,
        'Writing',
        m.task_code || '',
        '',
        m.time_minutes != null ? `${m.time_minutes} phút` : '',
        q?.question_text || q?.text || '',
        q?.file_url || '',
        Array.isArray(m.keywords) ? m.keywords.join(', ') : '',
      ]);
    }
    const wsW = XLSX.utils.aoa_to_sheet([swHeaders, ...writeBody]);
    wsW['!cols'] = wsS['!cols'];
    XLSX.utils.book_append_sheet(workbook, wsW, 'W-Writing');
  }

  buildGuideSheet(workbook, [
    '📤 Xuất từ hệ thống — cột "Tên file ảnh / âm thanh" suy ra từ URL.',
    `Loại bài: ${assignmentType || '—'}`,
    'Chỉnh sửa nội dung câu / đáp án rồi có thể import lại (sheet Trắc nghiệm / Part 1 hoặc copy cột).',
  ]);

  return workbook;
}

function workbookToBuffer(workbook) {
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  MC_HEADERS,
  mediaNameFromUrl,
  buildBlankTemplateWorkbook,
  buildExportWorkbookFromQuestions,
  workbookToBuffer,
  LISTENING_BLANK_SEGMENTS,
  READING_BLANK_SEGMENTS,
};
