const lessonProgressService = require('../services/lessonProgress.service');
const response = require('../utils/response');

const listMine = async (req, res, next) => {
  try {
    const rows = await lessonProgressService.getMine(req.user.id, {
      classId: req.query.class_id || null,
    });
    return response.success(res, rows, 'Lesson progress retrieved');
  } catch (error) {
    next(error);
  }
};

const getOne = async (req, res, next) => {
  try {
    const row = await lessonProgressService.getOne(req.user.id, req.params.id);
    return response.success(res, row, 'Lesson progress retrieved');
  } catch (error) {
    next(error);
  }
};

const upsert = async (req, res, next) => {
  try {
    const row = await lessonProgressService.upsert(req.user.id, req.params.id, req.body || {});
    return response.success(res, row, 'Lesson progress saved');
  } catch (error) {
    next(error);
  }
};

module.exports = { listMine, getOne, upsert };
