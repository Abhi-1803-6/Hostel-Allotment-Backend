const express = require('express');
const router = express.Router();
const { getMyInvitations, respondToInvitation } = require('../controllers/invitationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getMyInvitations);
router.post('/:id/respond', protect, respondToInvitation);

module.exports = router;