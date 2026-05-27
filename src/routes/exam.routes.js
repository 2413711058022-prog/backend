const router = require('express').Router();
const ctrl = require('../controllers/exam.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

// Public (authenticated students)
router.get('/', authenticate, ctrl.listExams);
router.get('/:id', authenticate, ctrl.getExam);
router.post('/:id/start', authenticate, ctrl.startAttempt);
router.post('/:id/submit', authenticate, ctrl.submitAttempt);
router.post('/:id/answer', authenticate, ctrl.saveAnswer);

// Admin only
router.post('/', authenticate, requireAdmin, ctrl.createExam);
router.put('/:id', authenticate, requireAdmin, ctrl.updateExam);
router.delete('/:id', authenticate, requireAdmin, ctrl.deleteExam);
router.post('/:id/publish', authenticate, requireAdmin, ctrl.publishExam);
router.get('/:id/questions', authenticate, requireAdmin, ctrl.getExamQuestions);
router.post('/:id/questions', authenticate, requireAdmin, ctrl.addQuestionToExam);
router.delete('/:id/questions/:questionId', authenticate, requireAdmin, ctrl.removeQuestionFromExam);

module.exports = router;
