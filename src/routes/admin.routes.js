const router = require('express').Router();
const ctrl = require('../controllers/admin.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const multer = require('multer');

const upload = multer({ dest: 'uploads/imports/', limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate, requireAdmin);

router.get('/users', ctrl.listUsers);
router.post('/users', ctrl.createUser);
router.put('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);
router.post('/users/bulk-upload', upload.single('file'), ctrl.bulkUploadUsers);
router.get('/attempts', ctrl.listAttempts);
router.get('/logs', ctrl.activityLogs);

module.exports = router;
