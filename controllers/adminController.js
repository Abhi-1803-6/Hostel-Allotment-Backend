const Group = require('../models/groupModel');
const Room = require('../models/roomModel');
const RankList = require('../models/rankListModel');
const Admin = require('../models/adminModel');
const { resetAllotmentProcess } = require('./allotmentController');
const Student = require('../models/studentModel');
const Invitation = require('../models/invitationModel');

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
    console.log("--- Starting Full System Reset for New Rank List ---");

    // 1. Stop any currently running allotment process
    resetAllotmentProcess();
    console.log("Stopped any active allotment process.");

    // 2. Delete all existing groups
    await Group.deleteMany({});
    console.log("All existing groups deleted.");

    // 3. Delete all existing invitations
    await Invitation.deleteMany({});
    console.log("All existing invitations deleted.");

    // 4. Delete all existing student accounts
    await Student.deleteMany({});
    console.log("All existing student accounts deleted.");

    // 5. Clear the old rank list
    await RankList.deleteMany({});
    console.log("Old rank list cleared.");
    
    // 6. Insert the new rank list
    const newRankList = await RankList.insertMany(ranks);
    console.log("New rank list uploaded.");

    res.status(201).json({ message: `System reset and ${newRankList.length} ranks have been uploaded successfully.` });
  } catch (error) {
    console.error("Error during rank list upload and system reset:", error);
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
exports.resetAllotmentState = async (req, res) => {
    try {
        // 1. Stop any running allotment process
        resetAllotmentProcess();
        
        // 2. Make all rooms available again
        await Room.updateMany({}, { $set: { isAvailable: true } });

        // 3. Reset all groups (unlock them and remove allotted rooms)
        await Group.updateMany({}, { $set: { allottedRoom: null, isFinalized: false } });

        // 4. Reset all students' allotment status
        await Student.updateMany({}, { $set: { allotmentStatus: 'Not Allotted' } });

        res.json({ message: 'The demo state has been reset successfully.' });
    } catch (error) {
        console.error('Error resetting allotment state:', error);
        res.status(500).json({ message: 'Server Error while resetting state.' });
    }
};