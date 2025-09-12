import mongoose from 'mongoose';

let isConnected: boolean = false;
let connectionPromise: Promise<void> | null = null;

export const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  // Prevent multiple simultaneous connection attempts
  if (connectionPromise) {
    return connectionPromise;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in the environment variables');
  }

  connectionPromise = (async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI!, {
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        // Removed bufferMaxEntries and bufferCommands as they're not supported in newer versions
      });
      isConnected = true;
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      isConnected = false;
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
};

// Graceful shutdown
export const disconnectFromDatabase = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    connectionPromise = null;
    console.log('Disconnected from MongoDB');
  }
};