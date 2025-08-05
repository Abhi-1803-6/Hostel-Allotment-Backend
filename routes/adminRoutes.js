const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/adminMiddleware');
const { uploadRanks, loginAdmin, lockAllGroups, uploadRooms,unlockAllGroups, getAllGroups } = require('../controllers/adminController');

router.post('/login', loginAdmin);
router.post('/upload-ranks', protectAdmin, uploadRanks);
router.post('/upload-rooms', protectAdmin, uploadRooms);
router.post('/lock-groups', protectAdmin, lockAllGroups);
router.post('/unlock-groups', protectAdmin, unlockAllGroups);
router.get('/groups', protectAdmin, getAllGroups);

module.exports = router;