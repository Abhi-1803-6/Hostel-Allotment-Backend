const express = require('express');
const router = express.Router();
const { getRooms } = require('../controllers/roomController');

// This route only handles getting the list of all rooms
router.route('/').get(getRooms);

module.exports = router;