const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    rollNumber: {
      type: String,
      required: true,
      unique: true,
    },
    rank: {
      type: Number,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    isGroupLeader: {
      type: Boolean,
      default: false,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
    },
    allotmentStatus: {
      type: String,
      enum: ['Not Allotted', 'Allotted', 'Skipped'],
      default: 'Not Allotted',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving the student model
studentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with hashed password
studentSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;