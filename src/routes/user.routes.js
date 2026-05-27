const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const multer = require('multer');
const path = require('path');

const avatarStorage = multer.diskStorage({
  destination: 'uploads/avatars/',
  filename: (req, file, cb) => cb(null, `${req.user?.id}-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage: avatarStorage, limits: { fileSize: 2 * 1024 * 1024 } });

router.get('/profile', authenticate, ctrl.getProfile);
router.put('/profile', authenticate, ctrl.updateProfile);
router.put('/change-password', authenticate, ctrl.changePassword);
router.post('/avatar', authenticate, upload.single('avatar'), ctrl.uploadAvatar);

module.exports = router;
