const express = require('express');
const router = express.Router();
const {
  createGroup,
  getMyGroup,
  inviteToGroup,
  acceptInvite,
  leaveGroup,removeMember,
} = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');

// All routes here are protected and require a valid token
router.post('/create', protect, createGroup);
router.get('/my-group', protect, getMyGroup);
router.post('/:groupId/invite', protect, inviteToGroup);
router.post('/:groupId/accept', protect, acceptInvite);
router.post('/leave', protect, leaveGroup);
router.delete('/remove/:memberId', protect, removeMember);

module.exports = router;