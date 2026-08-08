const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { createRefund, getAllRefunds, getRefundById } = require('../controllers/refund.controller');

router.use(protect, authorize('admin'));

router.post('/',    createRefund);
router.get('/',     getAllRefunds);
router.get('/:id',  getRefundById);

module.exports = router;
