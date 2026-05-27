const router = require('express').Router();
const ctrl = require('../controllers/result.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/my', authenticate, ctrl.myResults);
router.get('/leaderboard', authenticate, ctrl.leaderboard);
router.get('/:attemptId', authenticate, ctrl.getResult);
router.get('/:attemptId/review', authenticate, ctrl.reviewAttempt);

module.exports = router;
