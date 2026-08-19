const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields } = require('../middlewares/validate.middleware');
const { adminJobLimiter } = require('../middlewares/rateLimit.middleware');
const {
  getNotifications,
  markRead,
  markAllRead,
  createNotification,
  deliverNotification,
  processPendingNotifications,
} = require('../controllers/notification.controller');

router.use(protect);

router.get('/', getNotifications);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);
router.post('/', authorize('admin'), requireFields('recipientType', 'title', 'message'), createNotification);
router.post('/process-pending', authorize('admin'), adminJobLimiter, processPendingNotifications);
router.post('/:id/deliver', authorize('admin'), adminJobLimiter, deliverNotification);

module.exports = router;
