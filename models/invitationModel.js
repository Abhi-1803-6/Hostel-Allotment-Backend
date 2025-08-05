const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    inviterId: { // The group leader
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    inviteeId: { // The student being invited
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

const Invitation = mongoose.model('Invitation', invitationSchema);
module.exports = Invitation;