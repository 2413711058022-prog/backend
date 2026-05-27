const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

const registerRules = [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
    .matches(/^(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase letter and number'),
];

router.post('/register', registerRules, ctrl.register);
router.post('/login', loginRules, ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.post('/forgot-password', body('email').isEmail(), ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);

module.exports = router;
