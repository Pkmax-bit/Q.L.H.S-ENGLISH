const assignmentsService = require('../services/assignments.service');
const response = require('../utils/response');
const { emitNotification } = require('../socket');
const XLSX = require('xlsx');
const path = require('path');
const {
  buildBlankTemplateWorkbook,
  buildExportWorkbookFromQuestions,
  workbookToBuffer,
} = require('../utils/toeicExcelWorkbook');

/** Khớp CHECK DB (sau migration 011_assignments_toeic_types_check.sql) */
const ALLOWED_ASSIGNMENT_TYPES = new Set([
  'essay',
  'multiple_choice',
  'mixed',
  'toeic_listening',
  'toeic_lr',
  'toeic_four_skills',
]);

const getAll = async (req, res, next) => {
  try {
    const result = await assignmentsService.getAll(req.query);
    return response.success(res, result.data, 'Assignments retrieved', 200, result.pagination);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const assignment = await assignmentsService.getById(req.params.id);
    if (!assignment) {
      return response.notFound(res, 'Assignment not found');
    }
    return response.success(res, assignment, 'Assignment retrieved');
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { questions, ...rest } = req.body;
    const data = { ...rest, created_by: req.user.id };
    if (
      data.assignment_type != null &&
      data.assignment_type !== '' &&
      !ALLOWED_ASSIGNMENT_TYPES.has(data.assignment_type)
    ) {
      return response.badRequest(
        res,
        `assignment_type không hợp lệ: "${data.assignment_type}". Các giá trị cho phép: ${[...ALLOWED_ASSIGNMENT_TYPES].join(', ')}`
      );
    }
    const assignment = await assignmentsService.create(data);

    // If questions are provided, bulk insert them
    if (questions && Array.isArray(questions) && questions.length > 0) {
      const savedQuestions = await assignmentsService.bulkAddQuestions(assignment.id, questions);
      assignment.questions = savedQuestions;
    } else {
      assignment.questions = [];
    }

    emitNotification('assignment:created', assignment);
    return response.created(res, assignment, 'Assignment created successfully');
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { questions, ...rest } = req.body;
    if (
      rest.assignment_type != null &&
      rest.assignment_type !== '' &&
      !ALLOWED_ASSIGNMENT_TYPES.has(rest.assignment_type)
    ) {
      return response.badRequest(
        res,
        `assignment_type không hợp lệ: "${rest.assignment_type}". Các giá trị cho phép: ${[...ALLOWED_ASSIGNMENT_TYPES].join(', ')}`
      );
    }
    const assignment = await assignmentsService.update(req.params.id, rest);
    if (!assignment) {
      return response.notFound(res, 'Assignment not found');
    }

    // If questions array is provided, sync (replace all)
    if (questions && Array.isArray(questions)) {
      const savedQuestions = await assignmentsService.syncQuestions(req.params.id, questions);
      assignment.questions = savedQuestions;
    }

    emitNotification('assignment:updated', assignment);
    return response.success(res, assignment, 'Assignment updated successfully');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await assignmentsService.remove(req.params.id);
    if (!result) {
      return response.notFound(res, 'Assignment not found');
    }
    emitNotification('assignment:deleted', { id: req.params.id });
    return response.success(res, null, 'Assignment deleted successfully');
  } catch (error) {
    next(error);
  }
};

const addQuestion = async (req, res, next) => {
  try {
    const question = await assignmentsService.addQuestion(req.params.id, req.body);
    return response.created(res, question, 'Question added successfully');
  } catch (error) {
    next(error);
  }
};

const updateQuestion = async (req, res, next) => {
  try {
    const question = await assignmentsService.updateQuestion(req.params.questionId, req.body);
    if (!question) {
      return response.notFound(res, 'Question not found');
    }
    return response.success(res, question, 'Question updated successfully');
  } catch (error) {
    next(error);
  }
};

const removeQuestion = async (req, res, next) => {
  try {
    const result = await assignmentsService.removeQuestion(req.params.questionId);
    if (!result) {
      return response.notFound(res, 'Question not found');
    }
    return response.success(res, null, 'Question removed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk add multiple questions to an assignment in one request.
 * POST /:id/questions/bulk
 * Body: { questions: [...] }
 */
const bulkAddQuestions = async (req, res, next) => {
  try {
    const { questions } = req.body;
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return response.badRequest(res, 'Vui lòng cung cấp danh sách câu hỏi');
    }
    const saved = await assignmentsService.bulkAddQuestions(req.params.id, questions);
    return response.created(res, saved, `Đã thêm ${saved.length} câu hỏi`);
  } catch (error) {
    next(error);
  }
};

/**
 * Replace all questions for an assignment (delete old + insert new).
 * PUT /:id/questions/sync
 * Body: { questions: [...] }
 */
const syncQuestions = async (req, res, next) => {
  try {
    const { questions } = req.body;
    if (!questions || !Array.isArray(questions)) {
      return response.badRequest(res, 'Vui lòng cung cấp danh sách câu hỏi');
    }
    const saved = await assignmentsService.syncQuestions(req.params.id, questions);
    return response.success(res, saved, `Đã đồng bộ ${saved.length} câu hỏi`);
  } catch (error) {
    next(error);
  }
};

/**
 * Đọc một dòng sheet trắc nghiệm (kèm URL ảnh / âm thanh tuỳ chọn — dùng cho TOEIC Part 1).
 */
function parseMultipleChoiceExcelRow(row) {
  const questionText = row['Câu hỏi'] ?? row['Cau hoi'] ?? row['Question'] ?? row['question'] ?? '';
  const fileUrl = String(
    row['URL ảnh']
    ?? row['URL anh']
    ?? row['URL ảnh (Part 1)']
    ?? row['file_url']
    ?? row['File URL']
    ?? ''
  ).trim();
  const youtubeUrl = String(
    row['URL âm thanh']
    ?? row['URL am thanh']
    ?? row['Audio URL']
    ?? row['youtube_url']
    ?? ''
  ).trim();
  const optA = row['Đáp án A'] ?? row['A'] ?? row['Option A'] ?? '';
  const optB = row['Đáp án B'] ?? row['B'] ?? row['Option B'] ?? '';
  const optC = row['Đáp án C'] ?? row['C'] ?? row['Option C'] ?? '';
  const optD = row['Đáp án D'] ?? row['D'] ?? row['Option D'] ?? '';
  const correctRaw = String(row['Đáp án đúng'] ?? row['Dap an dung'] ?? row['Correct'] ?? row['correct'] ?? '').trim().toUpperCase();
  const points = Number(row['Điểm'] ?? row['Diem'] ?? row['Points'] ?? row['points'] ?? 10) || 10;

  const stem = String(questionText).trim();
  const hasStem = !!stem;
  const hasMedia = !!fileUrl || !!youtubeUrl;
  const hasAnyOption = [optA, optB, optC, optD].some((o) => String(o || '').trim() !== '');

  if (!hasStem && !hasMedia && !hasAnyOption) {
    return { skip: true, reason: 'empty' };
  }

  const optionsRaw = [
    { text: String(optA).trim(), letter: 'A' },
    { text: String(optB).trim(), letter: 'B' },
    { text: String(optC).trim(), letter: 'C' },
    { text: String(optD).trim(), letter: 'D' },
  ].filter((o) => o.text !== '');

  if (optionsRaw.length === 0) {
    return { skip: true, reason: 'no_options', stem: hasStem };
  }

  const options = optionsRaw.map((o) => ({
    text: o.text,
    is_correct: correctRaw === o.letter,
  }));

  return {
    skip: false,
    question: {
      question_text: stem,
      question_type: 'multiple_choice',
      options,
      correct_answer: correctRaw,
      points,
      file_url: fileUrl,
      youtube_url: youtubeUrl,
    },
  };
}

/**
 * Parse an uploaded Excel file into question objects.
 * Expects sheets (tuỳ chọn):
 *   - "Trắc nghiệm" … | URL ảnh | URL âm thanh | … (URL tuỳ chọn, dùng cho Part 1 trong cùng sheet)
 *   - "Part 1 (TOEIC)" — 6 câu mô tả ảnh, cùng định dạng cột với trắc nghiệm + URL
 *   - "Tự luận" …
 */
const parseExcelQuestions = async (req, res, next) => {
  try {
    if (!req.file) {
      return response.badRequest(res, 'Vui lòng upload file Excel (.xlsx / .xls)');
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;
    const questions = [];
    let orderIndex = 0;
    const warnings = [];

    // --- Helper: normalize sheet name matching ---
    const findSheet = (keywords) => {
      return sheetNames.find((name) => {
        const lower = name.toLowerCase().trim();
        return keywords.some((kw) => lower.includes(kw));
      });
    };

    const findPart1Sheet = () => {
      return sheetNames.find((name) => {
        const lower = name.toLowerCase().trim();
        if (lower.includes('trắc nghiệm') || lower.includes('trac nghiem')) return false;
        return (
          lower === 'part 1 (toeic)'
          || lower === 'part 1'
          || (lower.includes('part 1') && lower.includes('toeic'))
          || lower.includes('listening part 1')
        );
      });
    };

    const pushMcRows = (rows, sheetLabel) => {
      for (let i = 0; i < rows.length; i++) {
        const parsed = parseMultipleChoiceExcelRow(rows[i]);
        if (parsed.skip) {
          if (parsed.reason === 'empty' && i > 0) {
            warnings.push(`${sheetLabel} dòng ${i + 2}: bỏ qua (dòng trống)`);
          } else if (parsed.reason === 'no_options') {
            warnings.push(`${sheetLabel} dòng ${i + 2}: bỏ qua (thiếu đáp án A–D)`);
          }
          continue;
        }

        const { question } = parsed;
        const hasCorrect = question.options.some((o) => o.is_correct);
        if (!hasCorrect && question.options.length > 0) {
          warnings.push(
            `${sheetLabel} dòng ${i + 2}: không khớp đáp án đúng "${String(question.correct_answer).trim()}" (cần A/B/C/D)`
          );
        }

        questions.push({
          ...question,
          order_index: orderIndex++,
        });
      }
    };

    // --- Part 1 (TOEIC): đọc trước để 6 dòng áp vào câu 1–6 khi import đề TOEIC ---
    const part1SheetName = findPart1Sheet();
    if (part1SheetName) {
      const ws = workbook.Sheets[part1SheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      pushMcRows(rows, `Sheet "${part1SheetName}"`);
    }

    // --- Parse "Trắc nghiệm" sheet ---
    const mcSheetName = findSheet(['trắc nghiệm', 'trac nghiem', 'multiple_choice', 'multiple choice', 'mcq']);
    if (mcSheetName && mcSheetName !== part1SheetName) {
      const ws = workbook.Sheets[mcSheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      pushMcRows(rows, `Sheet "${mcSheetName}"`);
    }

    // --- Parse "Tự luận" sheet ---
    const essaySheetName = findSheet(['tự luận', 'tu luan', 'essay']);
    if (essaySheetName) {
      const ws = workbook.Sheets[essaySheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const questionText = row['Câu hỏi'] ?? row['Cau hoi'] ?? row['Question'] ?? row['question'] ?? '';
        const answer = row['Đáp án'] ?? row['Dap an'] ?? row['Answer'] ?? row['answer'] ?? '';
        const points = Number(row['Điểm'] ?? row['Diem'] ?? row['Points'] ?? row['points'] ?? 10) || 10;

        if (!String(questionText).trim()) {
          if (i > 0) warnings.push(`Tự luận dòng ${i + 2}: bỏ qua (câu hỏi trống)`);
          continue;
        }

        questions.push({
          question_text: String(questionText).trim(),
          question_type: 'essay',
          options: [],
          correct_answer: String(answer).trim(),
          points,
          order_index: orderIndex++,
          file_url: '',
          youtube_url: '',
        });
      }
    }

    // --- If no recognized sheets, try the first non-guide sheet as generic ---
    if (questions.length === 0 && !mcSheetName && !essaySheetName && sheetNames.length > 0) {
      const skipGuide = (n) => {
        const l = String(n).toLowerCase();
        return l.includes('hướng dẫn') || l.includes('huong dan') || l.includes('guide');
      };
      const candidateName = sheetNames.find((n) => !skipGuide(n)) || sheetNames[0];
      const ws = workbook.Sheets[candidateName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const questionText = row['Câu hỏi'] ?? row['Cau hoi'] ?? row['Question'] ?? '';
        const answer = row['Đáp án'] ?? row['Dap an'] ?? row['Answer'] ?? '';
        const points = Number(row['Điểm'] ?? row['Diem'] ?? row['Points'] ?? 10) || 10;
        const typeRaw = String(row['Loại'] ?? row['Type'] ?? row['type'] ?? 'essay').trim().toLowerCase();
        const qType = (typeRaw.includes('trắc') || typeRaw.includes('trac') || typeRaw.includes('multiple') || typeRaw.includes('mcq'))
          ? 'multiple_choice' : 'essay';

        if (!String(questionText).trim()) continue;

        if (qType === 'multiple_choice') {
          const optA = row['Đáp án A'] ?? row['A'] ?? row['Option A'] ?? '';
          const optB = row['Đáp án B'] ?? row['B'] ?? row['Option B'] ?? '';
          const optC = row['Đáp án C'] ?? row['C'] ?? row['Option C'] ?? '';
          const optD = row['Đáp án D'] ?? row['D'] ?? row['Option D'] ?? '';
          const correctRaw = String(row['Đáp án đúng'] ?? row['Correct'] ?? '').trim().toUpperCase();

          const optionsRaw = [
            { text: String(optA).trim(), letter: 'A' },
            { text: String(optB).trim(), letter: 'B' },
            { text: String(optC).trim(), letter: 'C' },
            { text: String(optD).trim(), letter: 'D' },
          ].filter((o) => o.text !== '');

          const options = optionsRaw.map((o) => ({
            text: o.text,
            is_correct: correctRaw === o.letter,
          }));

          questions.push({
            question_text: String(questionText).trim(),
            question_type: 'multiple_choice',
            options,
            correct_answer: correctRaw,
            points,
            order_index: orderIndex++,
            file_url: '',
            youtube_url: '',
          });
        } else {
          questions.push({
            question_text: String(questionText).trim(),
            question_type: 'essay',
            options: [],
            correct_answer: String(answer).trim(),
            points,
            order_index: orderIndex++,
            file_url: '',
            youtube_url: '',
          });
        }
      }

      if (questions.length > 0) {
        warnings.push(`Không tìm thấy sheet "Trắc nghiệm" hoặc "Tự luận", đã đọc từ sheet "${candidateName}"`);
      }
    }

    if (questions.length === 0) {
      return response.badRequest(res, 'Không tìm thấy câu hỏi nào trong file Excel. Cần sheet "Trắc nghiệm", "Part 1 (TOEIC)" và/hoặc "Tự luận" đúng định dạng cột (xem file mẫu).');
    }

    const mcCount = questions.filter((q) => q.question_type === 'multiple_choice').length;
    const essayCount = questions.filter((q) => q.question_type === 'essay').length;

    return response.success(res, {
      questions,
      summary: {
        total: questions.length,
        multiple_choice: mcCount,
        essay: essayCount,
      },
      warnings,
    }, `Đã đọc ${questions.length} câu hỏi (${mcCount} trắc nghiệm, ${essayCount} tự luận)`);
  } catch (error) {
    console.error('[parseExcelQuestions] Error:', error);
    if (error.message && (error.message.includes('File is not') || error.message.includes('Unsupported'))) {
      return response.badRequest(res, 'File không đúng định dạng Excel. Vui lòng upload file .xlsx hoặc .xls');
    }
    next(error);
  }
};

/**
 * Xuất Excel: điền URL, tên file media (basename), đáp án — để đối chiếu khi soạn.
 * POST body: { questions: [...], assignment_type: string }
 */
const exportQuestionsExcel = async (req, res, next) => {
  try {
    const { questions, assignment_type: assignmentType } = req.body || {};
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return response.badRequest(res, 'Cần mảng questions không rỗng');
    }
    const allowed = ['toeic_listening', 'toeic_lr', 'toeic_four_skills'];
    if (!assignmentType || !allowed.includes(assignmentType)) {
      return response.badRequest(res, `assignment_type phải là một trong: ${allowed.join(', ')}`);
    }
    const workbook = buildExportWorkbookFromQuestions(questions, assignmentType);
    const buffer = workbookToBuffer(workbook);
    const fname =
      assignmentType === 'toeic_four_skills'
        ? 'toeic-4-ky-nang-cau-hoi-media.xlsx'
        : assignmentType === 'toeic_lr'
          ? 'toeic-nghe-doc-cau-hoi-media.xlsx'
          : 'toeic-listening-cau-hoi-media.xlsx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Download an Excel template for importing questions.
 * Query: variant = general | toeic_listening | toeic_lr | toeic_four_skills
 */
const downloadQuestionTemplate = async (req, res, next) => {
  try {
    const variant = String(req.query.variant || 'general').toLowerCase();
    const blank = buildBlankTemplateWorkbook(variant);
    if (blank) {
      const buffer = workbookToBuffer(blank);
      const fname =
        variant === 'toeic_four_skills'
          ? 'mau-toeic-4-ky-nang.xlsx'
          : variant === 'toeic_lr'
            ? 'mau-toeic-nghe-doc.xlsx'
            : variant === 'toeic_listening'
              ? 'mau-toeic-listening-theo-part.xlsx'
              : 'mau-import-cau-hoi.xlsx';
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
      res.send(buffer);
      return;
    }

    const workbook = XLSX.utils.book_new();

    // --- Sheet 1: Trắc nghiệm (cột URL dùng cho TOEIC Part 1 nếu nhập trong cùng sheet; để trống nếu dùng sheet Part 1 riêng) ---
    const mcData = [
      ['Câu hỏi', 'URL ảnh', 'URL âm thanh', 'Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D', 'Đáp án đúng', 'Điểm'],
    ];
    const mcSheet = XLSX.utils.aoa_to_sheet(mcData);
    mcSheet['!cols'] = [
      { wch: 42 },
      { wch: 36 },
      { wch: 36 },
      { wch: 28 },
      { wch: 28 },
      { wch: 28 },
      { wch: 28 },
      { wch: 14 },
      { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(workbook, mcSheet, 'Trắc nghiệm');

    // --- Sheet 2: Part 1 TOEIC Listening (6 câu — mô tả hình) ---
    const part1Data = [
      ['Câu hỏi', 'URL ảnh', 'URL âm thanh', 'Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D', 'Đáp án đúng', 'Điểm'],
      ['(Tuỳ chọn — có thể để trống)', 'https://example.com/part1/q01.jpg', 'https://example.com/part1/q01.mp3', 'He is reading', 'She is opening the door', 'They are sitting', 'It is raining', 'B', 5],
      ['', 'https://example.com/part1/q02.jpg', 'https://example.com/part1/q02.mp3', 'The plane is landing', 'The workers are lifting boxes', 'The car is parking', 'The ship is sailing', 'B', 5],
      ['', 'https://example.com/part1/q03.jpg', 'https://example.com/part1/q03.mp3', 'Fish are swimming', 'Birds are flying', 'Cats are sleeping', 'Dogs are running', 'A', 5],
      ['', 'https://example.com/part1/q04.jpg', 'https://example.com/part1/q04.mp3', 'Typing on a laptop', 'Writing on a board', 'Talking on the phone', 'Reading a newspaper', 'C', 5],
      ['', 'https://example.com/part1/q05.jpg', 'https://example.com/part1/q05.mp3', 'In a hospital', 'At a restaurant', 'In a library', 'At a train station', 'D', 5],
      ['', 'https://example.com/part1/q06.jpg', 'https://example.com/part1/q06.mp3', 'They are shaking hands', 'They are waving goodbye', 'They are arguing', 'They are cooking', 'A', 5],
    ];
    const part1Sheet = XLSX.utils.aoa_to_sheet(part1Data);
    part1Sheet['!cols'] = mcSheet['!cols'];
    XLSX.utils.book_append_sheet(workbook, part1Sheet, 'Part 1 (TOEIC)');

    // --- Sheet 3: Tự luận ---
    const essayData = [
      ['Câu hỏi', 'Đáp án', 'Điểm'],
      ['Describe your favorite holiday in English (100-150 words).', 'Sample: My favorite holiday is Tet because...', 20],
      ['Translate: "Tôi thích học tiếng Anh vì nó rất thú vị."', 'I like learning English because it is very interesting.', 10],
      ['Write 3 sentences using the Present Perfect tense.', '1. I have visited Paris. 2. She has finished her homework. 3. They have lived here for 5 years.', 15],
    ];
    const essaySheet = XLSX.utils.aoa_to_sheet(essayData);
    essaySheet['!cols'] = [
      { wch: 55 }, // Câu hỏi
      { wch: 65 }, // Đáp án
      { wch: 8 },  // Điểm
    ];
    XLSX.utils.book_append_sheet(workbook, essaySheet, 'Tự luận');

    // --- Sheet 4: Hướng dẫn ---
    const guideData = [
      ['📋 HƯỚNG DẪN — FILE MẪU IMPORT CÂU HỎI'],
      [''],
      ['Sheet "Part 1 (TOEIC)" — 6 câu Listening Part 1 (mô tả hình):'],
      ['  - Mỗi dòng = 1 câu (đủ 6 dòng cho Part 1).'],
      ['  - URL ảnh / URL âm thanh: link trực tiếp tới file .jpg .png … và .mp3 (hoặc URL Supabase public).'],
      ['  - Câu hỏi: có thể để trống nếu chỉ cần ảnh + audio + 4 lựa chọn.'],
      ['  - Đáp án đúng: A, B, C hoặc D.'],
      ['  - Import đề TOEIC: 6 dòng sheet này được áp vào câu 1–6 của khung 100 câu (trước sheet Trắc nghiệm trong file).'],
      [''],
      ['Sheet "Trắc nghiệm":'],
      ['  - Cột "URL ảnh", "URL âm thanh" (tuỳ chọn): dùng khi nhập Part 1 hoặc câu có media trong cùng sheet.'],
      ['  - Câu hỏi có thể để trống nếu đã có ít nhất URL hoặc đủ 4 đáp án.'],
      ['  - Đáp án A–D, Đáp án đúng, Điểm như bảng thường.'],
      [''],
      ['Sheet "Tự luận" (Essay):'],
      ['  - Câu hỏi | Đáp án | Điểm'],
      [''],
      ['Lưu ý:'],
      ['  - Dòng đầu mỗi sheet là tiêu đề cột; không đổi tên cột.'],
      ['  - File .xlsx hoặc .xls.'],
    ];
    const guideSheet = XLSX.utils.aoa_to_sheet(guideData);
    guideSheet['!cols'] = [{ wch: 70 }];
    XLSX.utils.book_append_sheet(workbook, guideSheet, 'Hướng dẫn');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="mau-import-cau-hoi.xlsx"');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll, getById, create, update, remove,
  addQuestion, updateQuestion, removeQuestion,
  bulkAddQuestions, syncQuestions,
  parseExcelQuestions, downloadQuestionTemplate, exportQuestionsExcel,
};
