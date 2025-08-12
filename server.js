const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require("socket.io");
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Initialize Express app and create an HTTP server
const app = express();
const allowedOrigins = ['https://hostel-allotment-frontend-22bcs004.vercel.app/']; 
const corsOptions = {
    origin: (origin, callback) => {
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
};
app.use(cors(corsOptions));
const server = http.createServer(app);

// Attach Socket.IO to the HTTP server
const io = new Server(server, {
  cors: {
    origin: allowedOrigins, // In production,i have now restricted this to my front-end's URL
    methods: ["GET", "POST"]
  }
});

// Middleware to parse incoming JSON requests
app.use(express.json());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- API Routes ---
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/invitations', require('./routes/invitationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/allotment', require('./routes/allotmentRoutes'));
// --- Socket.IO Connection Logic ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Example: student joins a room based on their roll number to receive personal notifications
  socket.on('join_notification_room', (rollNumber) => {
      socket.join(rollNumber);
      console.log(`User ${socket.id} with roll number ${rollNumber} joined their notification room.`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make the `io` instance available to other parts of the app (e.g., controllers)
app.set('socketio', io);

// --- Start the Server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));