const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  financialReport,
  doctorReport,
  agentReport,
  patientReport,
  programReport,
} = require('../controllers/report.controller');

router.use(protect, authorize('admin'));

router.get('/financial', financialReport);
router.get('/doctor/:doctorId', doctorReport);
router.get('/agent/:agentId', agentReport);
router.get('/patients', patientReport);
router.get('/programs', programReport);

module.exports = router;
