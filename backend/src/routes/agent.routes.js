const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields } = require('../middlewares/validate.middleware');
const {
  createAgent,
  getAllAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  getMyDashboard,
  getMyDoctors,
  addClinicVisit,
  getMyVisits,
  getMyFollowUps,
  getMyVisitById,
  updateMyVisit,
  updateMyFollowUp,
  getAllClinicVisits,
} = require('../controllers/agent.controller');

router.use(protect);

router.get('/me/dashboard', authorize('agent'), getMyDashboard);
router.get('/me/doctors', authorize('agent'), getMyDoctors);
router.get('/me/follow-ups', authorize('agent'), getMyFollowUps);
router.get('/me/visits', authorize('agent'), getMyVisits);
router.post('/me/visits', authorize('agent'), requireFields('visitDate', 'outcome'), addClinicVisit);
router.get('/me/visits/:visitId', authorize('agent'), getMyVisitById);
router.patch('/me/visits/:visitId', authorize('agent'), updateMyVisit);
router.patch('/me/visits/:visitId/follow-up', authorize('agent'), requireFields('followUpStatus'), updateMyFollowUp);

router.get('/visits', authorize('admin'), getAllClinicVisits);

router.post('/', authorize('admin'), requireFields('fullName', 'mobile'), createAgent);
router.get('/', authorize('admin'), getAllAgents);
router.get('/:id', authorize('admin'), getAgentById);
router.put('/:id', authorize('admin'), updateAgent);
router.delete('/:id', authorize('admin'), deleteAgent);

module.exports = router;
