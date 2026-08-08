const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { submitDayProgress, getDayContent, adminUnlockDay } = require('../controllers/progress.controller');

router.use(protect);

// Patient submits day progress (SRS §20)
router.post('/submit-day', submitDayProgress);

// Patient gets day content + unlock check (SRS §19)
router.get('/:patientProgramId/day/:dayNumber', getDayContent);

// Admin manually unlocks a day (SRS §19)
router.post('/admin-unlock', authorize('admin'), adminUnlockDay);

module.exports = router;
