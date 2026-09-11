const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
  getAssessmentPathways,
  createCaseType,
  updateCaseType,
  createSurgeryType,
  updateSurgeryType,
} = require('../controllers/admin/assessment-pathways.controller');

router.use(protect, authorize('admin'));

router.get('/', getAssessmentPathways);
router.post('/case-types', createCaseType);
router.patch('/case-types/:id', updateCaseType);
router.post('/surgery-types', createSurgeryType);
router.patch('/surgery-types/:id', updateSurgeryType);

module.exports = router;
