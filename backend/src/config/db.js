const mongoose = require('mongoose');

let connectionPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not configured');
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 10),
    })
      .then((instance) => {
        console.log(`✅ MongoDB connected: ${instance.connection.name}`);
        return instance.connection;
      })
      .catch((error) => {
        connectionPromise = null;
        console.error('❌ MongoDB connection failed:', error.message);
        throw error;
      });
  }

  return connectionPromise;
};

module.exports = connectDB;
