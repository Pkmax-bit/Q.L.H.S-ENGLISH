const submissionsService = require('../services/submissions.service');
const response = require('../utils/response');

const start = async (req, res, next) => {
  try {
    const { assignment_id } = req.body;
    if (!assignment_id) return response.error(res, 'assignment_id là bắt buộc', 400);
    const result = await submissionsService.start(assignment_id, req.user.id);
    return response.success(res, result, 'Submission started');
  } catch (error) {
    if (error.statusCode) return response.error(res, error.message, error.statusCode);
    next(error);
  }
};

const submit = async (req, res, next) => {
  try {
    const { answers } = req.body;
    const result = await submissionsService.submit(req.params.id, answers, req.user.id);
    return response.success(res, result, 'Bài đã được nộp thành công');
  } catch (error) {
    if (error.statusCode) return response.error(res, error.message, error.statusCode);
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const result = await submissionsService.getById(req.params.id);
    if (!result) return response.notFound(res, 'Submission not found');
    return response.success(res, result, 'Submission retrieved');
  } catch (error) { next(error); }
};

const getMySubmission = async (req, res, next) => {
  try {
    const result = await submissionsService.getByStudentAndAssignment(req.params.assignmentId, req.user.id);
    return response.success(res, result, 'Submission retrieved');
  } catch (error) { next(error); }
};

const getByAssignment = async (req, res, next) => {
  try {
    const result = await submissionsService.getByAssignment(req.params.assignmentId, req.query);
    return response.success(res, result.data, 'Submissions retrieved', 200, result.pagination);
  } catch (error) { next(error); }
};

const getMySubmissions = async (req, res, next) => {
  try {
    const result = await submissionsService.getByStudent(req.user.id, req.query);
    return response.success(res, result.data, 'My submissions retrieved', 200, result.pagination);
  } catch (error) { next(error); }
};

const grade = async (req, res, next) => {
  try {
    const result = await submissionsService.grade(req.params.id, req.body, req.user.id);
    return response.success(res, result, 'Chấm điểm thành công');
  } catch (error) {
    if (error.statusCode) return response.error(res, error.message, error.statusCode);
    next(error);
  }
};

const getGradeBook = async (req, res, next) => {
  try {
    const result = await submissionsService.getGradeBook(req.params.classId);
    return response.success(res, result, 'Grade book retrieved');
  } catch (error) { next(error); }
};

module.exports = { start, submit, getById, getMySubmission, getByAssignment, getMySubmissions, grade, getGradeBook };
