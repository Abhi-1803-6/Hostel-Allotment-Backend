//This file defines the schema for student groups, linking together a leader and members
const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
    size: {
      type: Number,
      required: true,
      enum: [3, 4],
    },
    isFinalized: {
      type: Boolean,
      default: false,
    },
    allottedRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;