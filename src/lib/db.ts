import mongoose from 'mongoose';

let isConnected: boolean = false;

export const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in the environment variables');
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
};
