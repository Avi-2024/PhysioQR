const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { requireFields } = require('../middlewares/validate.middleware');
const {
  createAgent, getAllAgents, getAgentById, updateAgent,
  getMyDashboard, getMyDoctors, addClinicVisit, getMyVisits,
} = require('../controllers/agent.controller');

router.use(protect);

// ⚠️ Static /me routes before dynamic /:id
router.get('/me/dashboard', authorize('agent'), getMyDashboard);
router.get('/me/doctors',   authorize('agent'), getMyDoctors);
router.get('/me/visits',    authorize('agent'), getMyVisits);
router.post('/me/visits',   authorize('agent'), addClinicVisit);

// Admin only
router.post('/',     authorize('admin'), requireFields('fullName', 'mobile'), createAgent);
router.get('/',      authorize('admin'), getAllAgents);
router.get('/:id',   authorize('admin'), getAgentById);
router.put('/:id',   authorize('admin'), updateAgent);

module.exports = router;
