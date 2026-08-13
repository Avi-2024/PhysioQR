const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { getSettings, updateSettings } = require('../controllers/settings.controller');

router.use(protect, authorize('admin'));

router.get('/', getSettings);
router.put('/', updateSettings);

module.exports = router;
