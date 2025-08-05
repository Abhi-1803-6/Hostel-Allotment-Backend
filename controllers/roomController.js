const Room = require('../models/roomModel');

// @desc    Get all rooms
// @route   GET /api/rooms
exports.getRooms = async (req, res) => {
    try {
        const rooms = await Room.find({}).sort({ roomNumber: 1 });
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};