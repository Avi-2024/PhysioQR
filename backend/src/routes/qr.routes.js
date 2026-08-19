const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields } = require('../middlewares/validate.middleware');
const { recordScan, getHistory } = require('../controllers/qr.controller');
const { qrLimiter } = require('../middlewares/rateLimit.middleware');

router.post('/scan', qrLimiter, requireFields('doctorCode'), recordScan);
router.get('/history/:doctorId', protect, authorize('admin'), getHistory);

module.exports = router;
