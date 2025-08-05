const mongoose = require('mongoose');

const rankListSchema = new mongoose.Schema({
  rollNumber: {
    type: String,
    required: true,
    unique: true,
  },
  rank: {
    type: Number,
    required: true,
  },
  isRegistered: {
    type: Boolean,
    default: false,
  },
});

const RankList = mongoose.model('RankList', rankListSchema);
module.exports = RankList;