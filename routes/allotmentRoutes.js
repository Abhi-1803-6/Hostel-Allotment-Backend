const express = require('express');
const router = express.Router();
const { startAllotment, selectRoom,getTurnStatus, getAdminStatus, cancelAllotment } = require('../controllers/allotmentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/start', startAllotment); // Should be protected by admin middleware in a real app
router.post('/select-room', protect, selectRoom);
router.get('/status', protect, getTurnStatus);
router.get('/admin-status', getAdminStatus); 
router.post('/cancel', cancelAllotment);

module.exports = router;