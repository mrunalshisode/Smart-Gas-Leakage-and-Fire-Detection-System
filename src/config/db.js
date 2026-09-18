const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/iotap_gas_fire_db';

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    console.log('[MongoDB] Make sure MongoDB is running or update MONGO_URI in .env');
  }
};

module.exports = connectDB;
