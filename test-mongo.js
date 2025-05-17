import mongoose from 'mongoose';
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://abdurrahman:adventure90@tax-ai.0oilwjh.mongodb.net/').then(() => {
  console.log('Connected!');
  process.exit(0);
}).catch(err => {
  console.error('Failed to connect:', err);
  process.exit(1);
});