const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { requireFields } = require('../middlewares/validate.middleware');
const { supportLimiter } = require('../middlewares/rateLimit.middleware');
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  updateTicketStatus,
  addTicketMessage,
} = require('../controllers/support.controller');

router.use(protect);

router.post('/', supportLimiter, requireFields('category', 'subject'), createTicket);
router.get('/', getTickets);
router.get('/:id', getTicketById);
router.patch('/:id/status', updateTicketStatus);
router.post('/:id/messages', supportLimiter, requireFields('message'), addTicketMessage);
router.put('/:id', updateTicket);

module.exports = router;
