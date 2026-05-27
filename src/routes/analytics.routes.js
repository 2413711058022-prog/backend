const router = require('express').Router();
const ctrl = require('../controllers/analytics.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.get('/dashboard', authenticate, requireAdmin, ctrl.adminDashboard);
router.get('/student', authenticate, ctrl.studentAnalytics);
router.get('/subject-performance', authenticate, ctrl.subjectPerformance);

module.exports = router;
