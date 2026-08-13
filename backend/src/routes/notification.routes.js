const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields } = require('../middlewares/validate.middleware');
const {
  getNotifications,
  markRead,
  createNotification,
} = require('../controllers/notification.controller');

router.use(protect);

router.get('/', getNotifications);
router.put('/:id/read', markRead);
router.post('/', authorize('admin'), requireFields('recipientType', 'title', 'message'), createNotification);

module.exports = router;
