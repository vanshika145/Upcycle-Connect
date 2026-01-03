require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { initializeFirebase } = require('./config/firebase');

const PORT = process.env.PORT || 5000;

// Initialize Firebase
initializeFirebase();

// Connect to MongoDB
connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});