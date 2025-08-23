const RankList = require('../models/rankListModel');
const Student = require('../models/studentModel');
const jwt = require('jsonwebtoken');

// Helper function to generate a JSON Web Token (JWT)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

/**
 * @desc    Register a new student
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerStudent = async (req, res) => {
  // 'rank' is no longer received from the body
  const { name, rollNumber, password } = req.body;

  try {
    // Step 1: Check if this roll number is on the official rank list
    const rankListItem = await RankList.findOne({ rollNumber: rollNumber });

    if (!rankListItem) {
      return res.status(404).json({ message: 'This roll number is not on the official rank list.' });
    }

    // Step 2: Check if this roll number has already been used to register
    if (rankListItem.isRegistered) {
      return res.status(400).json({ message: 'An account has already been registered with this roll number.' });
    }

    // Step 3: Create the new student using the rank from the list
    const student = await Student.create({
      name,
      rollNumber,
      password,
      rank: rankListItem.rank, // Use the rank from the rank list
    });

    // If student created successfully, update the rank list and send response
    if (student) {
      // Step 4: Mark the roll number as registered
      rankListItem.isRegistered = true;
      await rankListItem.save();

      res.status(201).json({
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        token: generateToken(student._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid student data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Authenticate a student & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginStudent = async (req, res) => {
  const { rollNumber, password } = req.body;

  try {
    // Find student by roll number
    const student = await Student.findOne({ rollNumber });

    // Check if student exists and if the password matches
    if (student && (await student.matchPassword(password))) {
      res.json({
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        rank: student.rank,
        token: generateToken(student._id),
      });
    } else {
      // Use a generic message for security
      res.status(401).json({ message: 'Invalid roll number or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
const debugLogin = async (req, res) => {
    const { rollNumber, password } = req.body;
    console.log('\n--- STARTING DEBUG LOGIN ---');
    
    try {
        console.log(`[DEBUG] 1. Received request for roll number: ${rollNumber}`);
        
        const student = await Student.findOne({ rollNumber });
        if (!student) {
            console.log('[DEBUG] 2. Student not found in database.');
            return res.status(404).json({ message: 'Student not found.' });
        }

        console.log(`[DEBUG] 2. Student found: ${student.name}`);
        console.log(`[DEBUG] 3. Stored password hash is: ${student.password}`);
        console.log(`[DEBUG] 4. Now attempting to compare password...`);

        // This is the critical test
        const isMatch = await student.matchPassword(password);
        
        console.log(`[DEBUG] 5. bcrypt.compare result is: ${isMatch}`);

        if (isMatch) {
            console.log('[DEBUG] 6. Passwords MATCH. Login successful.');
            res.json({
                _id: student._id,
                name: student.name,
                token: generateToken(student._id),
            });
        } else {
            console.log('[DEBUG] 6. Passwords DO NOT MATCH. Login failed.');
            res.status(401).json({ message: 'Passwords do not match.' });
        }
        console.log('--- DEBUG LOGIN FINISHED ---');

    } catch (error) {
        console.error('[DEBUG] CRITICAL ERROR during debug login:', error);
        res.status(500).json({ message: 'A server error occurred during the login process.' });
    }
};

module.exports = {
  registerStudent,
  loginStudent,
  debugLogin,
};