const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { createServer } = require('http');
const { Server } = require('socket.io');

dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');

// Import middlewares
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const isVercel = process.env.VERCEL === '1';

let httpServer = null;
let io = null;

if (!isVercel) {
  httpServer = createServer(app);
  io = new Server(httpServer, {
    cors: {
      origin: process.env.SOCKET_IO_CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });
}

app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let isDbConnected = false;

const connectDB = async () => {
  if (isDbConnected || mongoose.connection.readyState === 1) {
    isDbConnected = true;
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in environment variables');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  isDbConnected = true;
  console.log('MongoDB connected');
};

if (isVercel) {
  app.use(async (req, res, next) => {
    try {
      await connectDB();
      next();
    } catch (error) {
      console.error('Vercel DB connection error:', error.message);
      res.status(500).json({ success: false, message: 'Database connection failed' });
    }
  });
}

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running' });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);

if (!isVercel && io) {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join-appointment', (appointmentId) => {
      socket.join(`appointment-${appointmentId}`);
      console.log(`Client ${socket.id} joined appointment ${appointmentId}`);
    });

    socket.on('leave-appointment', (appointmentId) => {
      socket.leave(`appointment-${appointmentId}`);
      console.log(`Client ${socket.id} left appointment ${appointmentId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}

// Error Handler Middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    if (!httpServer) {
      throw new Error('HTTP server is not initialized');
    }

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

if (require.main === module && !isVercel) {
  startServer();
}

module.exports = app;
