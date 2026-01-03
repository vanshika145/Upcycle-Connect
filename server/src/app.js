const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const materialRoutes = require('./routes/materialRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'UpCycle Connect Backend is running' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app;