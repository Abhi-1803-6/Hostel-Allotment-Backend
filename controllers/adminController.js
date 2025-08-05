const Group = require('../models/groupModel');
const Room = require('../models/roomModel');
const RankList = require('../models/rankListModel');
const Admin = require('../models/adminModel');
const jwt = require('jsonwebtoken');
// Helper function to generate a token
const generateToken = (id) => {
  return jwt.sign({ id, isAdmin: true }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
};
// @desc    Authenticate admin & get token
exports.loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find admin by email in the new 'admins' collection
        const admin = await Admin.findOne({ email });

        if (admin && (await admin.matchPassword(password))) {
            res.json({
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                token: generateToken(admin._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
exports.unlockAllGroups = async (req, res) => {
    try {
        await Group.updateMany({}, { $set: { isFinalized: false } });
        res.json({ message: 'All groups have been unlocked.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Add this function to view all groups
exports.getAllGroups = async (req, res) => {
    try {
        const groups = await Group.find({})
        .populate('leader members', 'name rollNumber rank')
        .populate('allottedRoom', 'roomNumber');
        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.uploadRooms = async (req, res) => {
    const rooms = req.body; // Expecting an array of { roomNumber, capacity }

    if (!rooms || !Array.isArray(rooms)) {
        return res.status(400).json({ message: 'Invalid data format. Expecting an array of rooms.' });
    }

    try {
        // Clear the existing room list before uploading a new one
        await Room.deleteMany({});
        // Insert the new list of rooms
        const newRoomList = await Room.insertMany(rooms);
        res.status(201).json({ message: `${newRoomList.length} rooms have been uploaded successfully.` });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


// @desc    Upload a list of ranks
// @route   POST /api/admin/upload-ranks
exports.uploadRanks = async (req, res) => {
  const ranks = req.body; // Expecting an array of { rollNumber, rank }

  if (!ranks || !Array.isArray(ranks)) {
    return res.status(400).json({ message: 'Invalid data format. Expecting an array of ranks.' });
  }

  try {
    // Clear existing rank list before uploading a new one
    await RankList.deleteMany({}); 
    // Insert the new list
    const newRankList = await RankList.insertMany(ranks);
    res.status(201).json({ message: `${newRankList.length} ranks have been uploaded successfully.` });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
exports.lockAllGroups = async (req, res) => {
    try {
        const { modifiedCount } = await Group.updateMany(
            { isFinalized: false }, // Only update groups that are not already locked
            { $set: { isFinalized: true } }
        );
        
        if (modifiedCount === 0) {
            return res.json({ message: 'No new groups to lock. All groups were already locked.' });
        }

        res.json({ message: `${modifiedCount} group(s) have been locked for allotment.` });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};