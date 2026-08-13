const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const { requireFields } = require('../middlewares/validate.middleware');
const {
  createTicket,
  getTickets,
  updateTicket,
} = require('../controllers/support.controller');

router.use(protect);

router.post('/', requireFields('category', 'subject'), createTicket);
router.get('/', getTickets);
router.put('/:id', updateTicket);

module.exports = router;
