const router = require('express').Router();
const ctrl = require('../controllers/question.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');

const upload = multer({
  dest: 'uploads/imports/',
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls', '.csv'].includes(ext)) cb(null, true);
    else cb(new Error('Only Excel/CSV files allowed'));
  },
});

router.get('/', authenticate, ctrl.listQuestions);
router.get('/topics', authenticate, ctrl.listTopics);
router.get('/:id', authenticate, ctrl.getQuestion);
router.post('/', authenticate, requireAdmin, ctrl.createQuestion);
router.put('/:id', authenticate, requireAdmin, ctrl.updateQuestion);
router.delete('/:id', authenticate, requireAdmin, ctrl.deleteQuestion);
router.post('/import/excel', authenticate, requireAdmin, upload.single('file'), ctrl.importFromExcel);

module.exports = router;
