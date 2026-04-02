const assignmentsService = require('../services/assignments.service');
const response = require('../utils/response');
const { emitNotification } = require('../socket');
const XLSX = require('xlsx');
const path = require('path');

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
    const data = { ...req.body, created_by: req.user.id };
    const assignment = await assignmentsService.create(data);
    emitNotification('assignment:created', assignment);
    return response.created(res, assignment, 'Assignment created successfully');
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const assignment = await assignmentsService.update(req.params.id, req.body);
    if (!assignment) {
      return response.notFound(res, 'Assignment not found');
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
 * Parse an uploaded Excel file into question objects.
 * Expects two sheets:
 *   - "Trắc nghiệm" (Multiple Choice): columns Câu hỏi | Đáp án A | Đáp án B | Đáp án C | Đáp án D | Đáp án đúng | Điểm
 *   - "Tự luận" (Essay): columns Câu hỏi | Đáp án | Điểm
 * Either or both sheets can be present.
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

    // --- Parse "Trắc nghiệm" sheet ---
    const mcSheetName = findSheet(['trắc nghiệm', 'trac nghiem', 'multiple_choice', 'multiple choice', 'mcq']);
    if (mcSheetName) {
      const ws = workbook.Sheets[mcSheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // Flexible column name matching
        const questionText = row['Câu hỏi'] ?? row['Cau hoi'] ?? row['Question'] ?? row['question'] ?? '';
        const optA = row['Đáp án A'] ?? row['A'] ?? row['Option A'] ?? '';
        const optB = row['Đáp án B'] ?? row['B'] ?? row['Option B'] ?? '';
        const optC = row['Đáp án C'] ?? row['C'] ?? row['Option C'] ?? '';
        const optD = row['Đáp án D'] ?? row['D'] ?? row['Option D'] ?? '';
        const correctRaw = String(row['Đáp án đúng'] ?? row['Dap an dung'] ?? row['Correct'] ?? row['correct'] ?? '').trim().toUpperCase();
        const points = Number(row['Điểm'] ?? row['Diem'] ?? row['Points'] ?? row['points'] ?? 10) || 10;

        if (!String(questionText).trim()) {
          if (i > 0) warnings.push(`Trắc nghiệm dòng ${i + 2}: bỏ qua (câu hỏi trống)`);
          continue;
        }

        // Build options array
        const optionsRaw = [
          { text: String(optA).trim(), letter: 'A' },
          { text: String(optB).trim(), letter: 'B' },
          { text: String(optC).trim(), letter: 'C' },
          { text: String(optD).trim(), letter: 'D' },
        ].filter((o) => o.text !== '');

        // Mark correct
        const options = optionsRaw.map((o) => ({
          text: o.text,
          is_correct: correctRaw === o.letter,
        }));

        // Validate at least one correct
        const hasCorrect = options.some((o) => o.is_correct);
        if (!hasCorrect && options.length > 0) {
          warnings.push(`Trắc nghiệm dòng ${i + 2}: không tìm thấy đáp án đúng "${correctRaw}" (cần A/B/C/D)`);
        }

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
      }
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

    // --- If no recognized sheets, try the first sheet as generic ---
    if (!mcSheetName && !essaySheetName && sheetNames.length > 0) {
      const ws = workbook.Sheets[sheetNames[0]];
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
        warnings.push(`Không tìm thấy sheet "Trắc nghiệm" hoặc "Tự luận", đã đọc từ sheet "${sheetNames[0]}"`);
      }
    }

    if (questions.length === 0) {
      return response.badRequest(res, 'Không tìm thấy câu hỏi nào trong file Excel. Hãy đảm bảo file có sheet "Trắc nghiệm" và/hoặc "Tự luận" với đúng định dạng cột.');
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
 * Download an Excel template for importing questions.
 */
const downloadQuestionTemplate = async (req, res, next) => {
  try {
    const workbook = XLSX.utils.book_new();

    // --- Sheet 1: Trắc nghiệm ---
    const mcData = [
      ['Câu hỏi', 'Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D', 'Đáp án đúng', 'Điểm'],
      ['What is the capital of France?', 'London', 'Paris', 'Berlin', 'Madrid', 'B', 10],
      ['Which tense: "I have been studying"?', 'Past Simple', 'Present Perfect', 'Present Perfect Continuous', 'Past Continuous', 'C', 10],
      ['Choose the correct word: "She ___ to school every day."', 'go', 'goes', 'going', 'gone', 'B', 5],
    ];
    const mcSheet = XLSX.utils.aoa_to_sheet(mcData);
    mcSheet['!cols'] = [
      { wch: 45 }, // Câu hỏi
      { wch: 25 }, // A
      { wch: 30 }, // B
      { wch: 30 }, // C
      { wch: 25 }, // D
      { wch: 14 }, // Đáp án đúng
      { wch: 8 },  // Điểm
    ];
    XLSX.utils.book_append_sheet(workbook, mcSheet, 'Trắc nghiệm');

    // --- Sheet 2: Tự luận ---
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

    // --- Sheet 3: Hướng dẫn ---
    const guideData = [
      ['📋 HƯỚNG DẪN SỬ DỤNG FILE MẪU IMPORT CÂU HỎI'],
      [''],
      ['Sheet "Trắc nghiệm" (Multiple Choice):'],
      ['  - Câu hỏi: Nội dung câu hỏi (bắt buộc)'],
      ['  - Đáp án A, B, C, D: Nội dung các lựa chọn (ít nhất 2 đáp án)'],
      ['  - Đáp án đúng: Nhập chữ cái A, B, C hoặc D (bắt buộc)'],
      ['  - Điểm: Số điểm cho câu hỏi (mặc định 10)'],
      [''],
      ['Sheet "Tự luận" (Essay):'],
      ['  - Câu hỏi: Nội dung câu hỏi (bắt buộc)'],
      ['  - Đáp án: Đáp án mẫu / gợi ý chấm (tùy chọn)'],
      ['  - Điểm: Số điểm cho câu hỏi (mặc định 10)'],
      [''],
      ['Lưu ý:'],
      ['  - Có thể dùng 1 hoặc cả 2 sheet'],
      ['  - Dòng đầu tiên là tiêu đề cột, KHÔNG chỉnh sửa'],
      ['  - Các dòng trống sẽ bị bỏ qua'],
      ['  - File phải có định dạng .xlsx hoặc .xls'],
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
  parseExcelQuestions, downloadQuestionTemplate,
};
