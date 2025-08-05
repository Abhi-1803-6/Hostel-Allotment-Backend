// routes/authRoutes.js

// 1. Import Express and create a router
const express = require('express');
const router = express.Router();

// 2. Import the controller functions that contain the logic
const { registerStudent, loginStudent } = require('../controllers/authController');

// 3. Define the routes
// When a POST request is made to /register, run the registerStudent function
router.post('/register', registerStudent);

// When a POST request is made to /login, run the loginStudent function
router.post('/login', loginStudent);

// 4. Export the router
module.exports = router;