const jwt = require('jsonwebtoken');
const Admin = require('../models/adminModel.js'); // Import the Admin model

/**
 * This function acts as a security guard for our admin routes.
 * It checks for a valid token and ensures the user is a real admin.
 */
const protectAdmin = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Get token from the "Bearer <token>" header
            token = req.headers.authorization.split(' ')[1];

            // 2. Verify the token is valid
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Find the user in the 'admins' collection using the ID from the token
            // We attach the admin user to the request object for later use
            req.admin = await Admin.findById(decoded.id).select('-password');
            
            // 4. Check if the user was found and the token was generated for an admin
            if (req.admin && decoded.isAdmin) {
                next(); // If everything is okay, proceed to the actual route logic
            } else {
                res.status(403).json({ message: 'Not authorized as an admin' });
            }
        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protectAdmin };