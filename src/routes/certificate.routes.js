const router = require('express').Router();
const ctrl = require('../controllers/certificate.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/my', authenticate, ctrl.myCertificates);
router.get('/:certNumber/download', authenticate, ctrl.downloadCertificate);
router.get('/:certNumber/verify', ctrl.verifyCertificate); // public

module.exports = router;
