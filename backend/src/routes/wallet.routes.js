const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  getMyWallet,
  getMyTransactions,
  getDoctorWallet,
  getDoctorWalletTransactions,
} = require('../controllers/wallet.controller');

router.use(protect);

router.get('/me', authorize('doctor'), getMyWallet);
router.get('/me/transactions', authorize('doctor'), getMyTransactions);
router.get('/:doctorId', authorize('admin'), getDoctorWallet);
router.get('/:doctorId/transactions', authorize('admin'), getDoctorWalletTransactions);

module.exports = router;
