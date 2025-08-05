const Invitation = require('../models/invitationModel');
const Group = require('../models/groupModel');
const Student = require('../models/studentModel');

// @desc    Get pending invitations for logged-in user
exports.getMyInvitations = async (req, res) => {
  try {
    const invitations = await Invitation.find({ inviteeId: req.student._id, status: 'pending' }).populate({
        path: 'groupId',
        populate: { path: 'leader members', select: 'name rollNumber' }
    });
    res.json(invitations);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Respond to an invitation (accept/reject)
exports.respondToInvitation = async (req, res) => {
  const { action } = req.body; // Expecting 'accept' or 'reject'
  const student = req.student;

  try {
    const invitation = await Invitation.findById(req.params.id);

    if (!invitation || invitation.inviteeId.toString() !== student._id.toString()) {
      return res.status(404).json({ message: 'Invitation not found or you are not authorized.' });
    }
    if(invitation.status !== 'pending') {
        return res.status(400).json({ message: 'This invitation has already been responded to.' });
    }

    if (action === 'accept') {
      const group = await Group.findById(invitation.groupId);
      if (group.members.length >= group.size) {
        invitation.status = 'rejected'; // Mark as rejected if group filled up
        await invitation.save();
        return res.status(400).json({ message: 'Group is now full.' });
      }

      // Add student to group and update student's record
      group.members.push(student._id);
      student.groupId = group._id;
      
      await group.save();
      await student.save();
      
      // Delete all pending invitations for this user since they've joined a group
      await Invitation.deleteMany({ inviteeId: student._id });

      res.json({ message: 'Invitation accepted successfully.' });

    } else if (action === 'reject') {
      await Invitation.deleteOne({ _id: req.params.id });
      res.json({ message: 'Invitation rejected.' });
    } else {
      res.status(400).json({ message: 'Invalid action.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};