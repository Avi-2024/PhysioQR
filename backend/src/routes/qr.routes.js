const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields } = require('../middlewares/validate.middleware');
const { recordScan, getHistory } = require('../controllers/qr.controller');

router.post('/scan', requireFields('doctorCode'), recordScan);
router.get('/history/:doctorId', protect, authorize('admin'), getHistory);

module.exports = router;
