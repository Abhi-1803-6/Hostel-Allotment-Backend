const Invitation = require('../models/invitationModel');
const Group = require('../models/groupModel');
const Student = require('../models/studentModel');

// @desc    Create a new group
// @route   POST /api/groups/create
exports.createGroup = async (req, res) => {
  const { size } = req.body; // Expecting size (3 or 4) from the front-end

  if (![3, 4].includes(size)) {
    return res.status(400).json({ message: 'Group size must be 3 or 4' });
  }

  const student = req.student; // The logged-in student from our 'protect' middleware

  if (student.groupId) {
    return res.status(400).json({ message: 'You are already in a group' });
  }

  try {
    const group = await Group.create({
      leader: student._id,
      members: [student._id], // The leader is the first member
      size: size,
    });

    // Update the student to be a leader and link their group
    student.isGroupLeader = true;
    student.groupId = group._id;
    await student.save();

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Invite a student to a group
// @route   POST /api/groups/:groupId/invite
exports.inviteToGroup = async (req, res) => {
    const { rollNumberToInvite } = req.body;
    const inviter = req.student; // Logged-in group leader
    const { groupId } = req.params;
  
    try {
      const group = await Group.findById(groupId);
      if (!group || group.leader.toString() !== inviter._id.toString()) {
        return res.status(403).json({ message: 'Not authorized or group not found.' });
      }
      if (group.members.length >= group.size) {
        return res.status(400).json({ message: 'Group is already full.' });
      }
  
      const studentToInvite = await Student.findOne({ rollNumber: rollNumberToInvite });
      if (!studentToInvite) {
        return res.status(404).json({ message: 'Student not found.' });
      }
      if (studentToInvite.groupId) {
        return res.status(400).json({ message: 'Student is already in a group.' });
      }
  
      const existingInvitation = await Invitation.findOne({ inviteeId: studentToInvite._id, status: 'pending' });
      if (existingInvitation) {
          return res.status(400).json({ message: 'This student already has a pending invitation.' });
      }
  
      // Create the invitation
      await Invitation.create({
        groupId: group._id,
        inviterId: inviter._id,
        inviteeId: studentToInvite._id,
      });
  
      res.status(201).json({ message: `Invitation sent successfully to ${studentToInvite.name}` });
    } catch (error) {
      res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


// @desc    Accept an invite and join a group
// @route   POST /api/groups/:groupId/accept
exports.acceptInvite = async (req, res) => {
    const student = req.student; // The student who wants to join
    const { groupId } = req.params;

    if (student.groupId) {
        return res.status(400).json({ message: 'You are already in a group' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
        return res.status(404).json({ message: 'Group not found' });
    }

    if (group.members.length >= group.size) {
        return res.status(400).json({ message: 'This group is already full' });
    }

    // Add student to group and update student's record
    group.members.push(student._id);
    student.groupId = group._id;
    
    await group.save();
    await student.save();

    res.status(200).json({ message: 'Successfully joined group', group });
};


// @desc    Get details of the logged-in user's group
// @route   GET /api/groups/my-group
exports.getMyGroup = async (req, res) => {
    if (!req.student.groupId) {
      return res.status(404).json({ message: 'You are not in a group' });
    }
  
    try {
      // --- THIS IS THE FIX ---
      // We now populate both the 'leader' and 'members' fields.
      const group = await Group.findById(req.student.groupId)
        .populate('leader', 'name rollNumber rank')
        .populate('members', 'name rollNumber rank')
        .populate('allottedRoom', 'roomNumber');
      if (!group) {
        // This is a failsafe in case the group was deleted but the student's record wasn't updated
        return res.status(404).json({ message: 'Group not found.' });
      }
  
      res.json(group);
    } catch (error) {
      res.status(500).json({ message: 'Server Error' });
    }
};
// Replace your old leaveGroup function with this one
exports.leaveGroup = async (req, res) => {
  const student = req.student; // Logged-in user

  try {
    if (!student.groupId) {
      return res.status(400).json({ message: 'You are not in a group.' });
    }

    const group = await Group.findById(student.groupId);
    if (!group) {
      student.groupId = null;
      await student.save();
      return res.status(400).json({ message: 'Group not found, your status has been corrected.' });
    }

    if (group.isFinalized) {
      return res.status(403).json({ message: 'This group is locked and cannot be changed.' });
    }

    // If the leader leaves, dissolve the group
    if (group.leader.toString() === student._id.toString()) {
      const memberIds = group.members; // Get all member IDs before deleting

      // 1. Delete the group document itself
      await Group.findByIdAndDelete(group._id);

      // 2. Update all former members to remove their group affiliation
      await Student.updateMany(
        { _id: { $in: memberIds } },
        { $set: { groupId: null, isGroupLeader: false } }
      );

      return res.json({ message: 'As leader, you have left and the group has been dissolved.' });
    } else {
      // If a regular member leaves
      group.members.pull(student._id);
      student.groupId = null;
      await student.save();
      await group.save();
      return res.json({ message: 'You have successfully left the group.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Group leader removes a member from their group
exports.removeMember = async (req, res) => {
    const leader = req.student;
    const { memberId } = req.params;

    try {
        if (!leader.groupId) {
            return res.status(400).json({ message: 'You are not in a group.' });
        }
        
        const group = await Group.findById(leader.groupId);
        if (!group) {
            return res.status(404).json({ message: 'Group not found.' });
        }
        
        if (group.isFinalized) {
            return res.status(403).json({ message: 'This group is locked and cannot be changed.' });
        }

        // Verify the user is the leader
        if (group.leader.toString() !== leader._id.toString()) {
            return res.status(403).json({ message: 'Only the group leader can remove members.' });
        }

        // Leader cannot remove themself
        if (memberId === leader._id.toString()) {
            return res.status(400).json({ message: 'Leader cannot remove themself. To leave, dissolve the group.' });
        }

        // Remove the member
        const memberToRemove = await Student.findById(memberId);
        if (!memberToRemove || !group.members.includes(memberId)) {
            return res.status(404).json({ message: 'Member not found in this group.' });
        }
        
        group.members.pull(memberId);
        memberToRemove.groupId = null;
        
        await memberToRemove.save();
        await group.save();
        
        res.json({ message: `Successfully removed ${memberToRemove.name} from the group.` });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
// module.exports = {
//   createGroup,
//   inviteToGroup,
//   acceptInvite,
//   getMyGroup,
//   leaveGroup,
//   removeMember
// };