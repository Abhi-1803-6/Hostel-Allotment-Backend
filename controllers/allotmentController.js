const Group = require('../models/groupModel');
const Student = require('../models/studentModel');
const Room = require('../models/roomModel');

let allotmentQueue = [];
let allotmentInProgress = false;
let currentTurnTimeout = null;
let currentTurnGroup = null;
let currentTurnDeadline = null;

const processNextGroup = (io) => {
    console.log(`\n[PROCESS_NEXT_GROUP] Called. Queue size is now: ${allotmentQueue.length}`);
    if (allotmentQueue.length === 0) {
        console.log('[PROCESS_NEXT_GROUP] Allotment queue is empty. Finishing process.');
        allotmentInProgress = false;
        currentTurnGroup = null;
        io.emit('allotment_finished', { message: 'The allotment process has concluded.' });
        return;
    }

    currentTurnGroup = allotmentQueue.shift();
    const leader = currentTurnGroup.leader;
    currentTurnDeadline = Date.now() + 5 * 60 * 1000;

    console.log(`[PROCESS_NEXT_GROUP] Dequeued group for leader: ${leader.name} (Rank: ${leader.rank})`);
    console.log(`[PROCESS_NEXT_GROUP] Remaining groups in queue: ${allotmentQueue.length}`);

    io.to(leader.rollNumber).emit('your_turn', {
        group: currentTurnGroup,
        deadline: currentTurnDeadline,
    });
    
    currentTurnTimeout = setTimeout(() => {
        console.log(`[TIMEOUT] Time is up for leader: ${leader.name}`);
        io.to(leader.rollNumber).emit('turn_ended', { message: 'Your time is up.' });
        
        // FIX: Use 'currentTurnGroup' here, not 'currentGroup'
        Group.findByIdAndUpdate(currentTurnGroup._id, { $set: { isFinalized: true } }).exec();
        // FIX: Use 'currentTurnGroup' here as well
        Student.updateMany({ groupId: currentTurnGroup._id }, { $set: { allotmentStatus: 'Skipped' } }).exec();

        currentTurnGroup = null;
        currentTurnDeadline = null;
        processNextGroup(io);
    }, 5 * 60 * 1000);
};

exports.getAdminStatus = (req, res) => {
    res.json({ allotmentInProgress });
};

exports.startAllotment = async (req, res) => {
    if (allotmentInProgress) {
        return res.status(400).json({ message: 'Allotment is already in progress.' });
    }
    allotmentInProgress = true;
    try {
        console.log("\n--- Starting Allotment Process ---");
        
        const eligibleGroups = await Group.find({ isFinalized: true, allottedRoom: null })
            .populate('leader', 'name rank rollNumber')
            .populate('members', 'name');
        
        console.log(`Step 1: Found ${eligibleGroups.length} eligible groups from DB.`);

        if (eligibleGroups.some(g => !g.leader || typeof g.leader.rank !== 'number')) {
            console.error("ERROR: One or more groups has a missing leader or non-numeric rank after population.");
            return res.status(500).json({ message: 'Data inconsistency found in groups. Cannot sort.' });
        }

        console.log("Step 2: Sorting groups by leader's rank...");
        allotmentQueue = eligibleGroups.sort((a, b) => a.leader.rank - b.leader.rank);
        
        console.log("Step 3: Queue after sorting (Top rank first):");
        allotmentQueue.forEach(g => console.log(`  - Leader: ${g.leader.name}, Rank: ${g.leader.rank}`));

        // FIX #1: Store the queue size *before* processing the first group.
        const queueSize = allotmentQueue.length;

        if (queueSize === 0) {
            return res.status(400).json({ message: 'No finalized groups were found to begin allotment.' });
        }

        allotmentInProgress = true;
        const io = req.app.get('socketio');
        processNextGroup(io);

        console.log("Step 4: Sending success response to admin.");
        // FIX #2: Use the stored size for the response message.
        res.json({ message: `Allotment process started with ${queueSize} groups.` });
    } catch (error) {
        console.error('CRITICAL ERROR in startAllotment:', error);
        res.status(500).json({ message: 'A server error occurred while starting the allotment.' });
    }
};

exports.cancelAllotment = async (req, res) => {
    if (!allotmentInProgress) {
        return res.status(400).json({ message: 'Allotment is not currently in progress.' });
    }

    try {
        console.log('[CANCEL] Allotment cancellation requested by admin.');

        // 1. Stop the timer for the current turn
        clearTimeout(currentTurnTimeout);

        // 2. Find all groups that were successfully allotted a room during this process
        const allottedGroups = await Group.find({ allottedRoom: { $ne: null } });

        if (allottedGroups.length > 0) {
            const roomIdsToReset = allottedGroups.map(g => g.allottedRoom);
            const groupIdsToReset = allottedGroups.map(g => g._id);

            // 3. Reset the rooms to be available again
            await Room.updateMany({ _id: { $in: roomIdsToReset } }, { $set: { isAvailable: true } });

            // 4. Reset the groups to have no allotted room
            await Group.updateMany({ _id: { $in: groupIdsToReset } }, { $set: { allottedRoom: null } });
            
            // 5. Reset the allotment status for all students in those groups
            await Student.updateMany({ groupId: { $in: groupIdsToReset } }, { $set: { allotmentStatus: 'Not Allotted' } });
        }

        // 6. Reset the server-side state variables
        allotmentInProgress = false;
        allotmentQueue = [];
        currentTurnGroup = null;
        currentTurnDeadline = null;

        // 7. Notify all clients that the allotment was cancelled
        const io = req.app.get('socketio');
        io.emit('allotment_cancelled', { message: 'The allotment process has been cancelled by the admin.' });

        console.log('[CANCEL] Allotment successfully cancelled and state has been reset.');
        res.json({ message: 'Allotment process has been cancelled successfully.' });

    } catch (error) {
        console.error('CRITICAL ERROR cancelling allotment:', error);
        res.status(500).json({ message: 'A server error occurred while cancelling the allotment.' });
    }
};


exports.selectRoom = async (req, res) => {
    console.log('\n[SELECT_ROOM] Received a room selection request.');
    const { roomId } = req.body;
    const student = req.student;

    try {
        const group = await Group.findById(student.groupId);
        if (!group || group.leader.toString() !== student._id.toString()) {
            return res.status(403).json({ message: 'You are not the leader of a group.' });
        }
        if (!currentTurnGroup || currentTurnGroup._id.toString() !== group._id.toString()) {
            return res.status(400).json({ message: "It is not your group's turn." });
        }

        const room = await Room.findById(roomId);
        if (!room || !room.isAvailable || room.capacity !== group.size) {
            return res.status(400).json({ message: 'Room is not available or capacity does not match.' });
        }

        console.log(`[SELECT_ROOM] Allotting room ${room.roomNumber} to group of leader ${student.name}.`);
        room.isAvailable = false;
        group.allottedRoom = roomId;
        await room.save();
        await group.save();
        await Student.updateMany({ groupId: group._id }, { $set: { allotmentStatus: 'Allotted' } });

        clearTimeout(currentTurnTimeout);
        const io = req.app.get('socketio');
        io.to(student.rollNumber).emit('selection_successful', { message: `Room ${room.roomNumber} allotted successfully!` });
        
        currentTurnGroup = null;
        currentTurnDeadline = null;
        console.log('[SELECT_ROOM] Selection successful. Processing next group.');
        processNextGroup(io);

        res.json({ message: 'Room selected successfully.' });
    } catch (error) {
        console.error('CRITICAL ERROR in selectRoom:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
// @desc    Check the current turn status for a logged-in user
exports.getTurnStatus = async (req, res) => {
    if (allotmentInProgress && currentTurnGroup && req.student.groupId?.toString() === currentTurnGroup._id.toString()) {
        return res.json({ isMyTurn: true, deadline: currentTurnDeadline });
    }
    return res.json({ isMyTurn: false });
};