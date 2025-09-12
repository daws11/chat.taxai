import { Schema, model, models } from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    minLength: [3, 'Name must be at least 3 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minLength: [6, 'Password must be at least 6 characters long']
  },
  jobTitle: {
    type: String,
    required: [true, 'Job title is required'],
    // enum: {
    //   values: jobTitles,
    //   message: 'Please select a valid job title'
    // }
  },
  language: {
    type: String,
    default: null
  },
  subscription: {
    type: new Schema({
      type: { type: String, required: true },
      status: { type: String, required: true },
      messageLimit: { type: Number, required: true, min: 0 },
      remainingMessages: { 
        type: Number, 
        required: true, 
        min: 0,
        validate: {
          validator: function(v: number) {
            return v >= 0;
          },
          message: 'Remaining messages cannot be negative'
        }
      },
      callSeconds: { type: Number, required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      payment: {
        type: new Schema({
          amount: { type: Number, required: true },
          method: { type: String, required: true },
          lastPaymentDate: { type: Date, required: true },
          nextPaymentDate: { type: Date, required: true },
        }, { _id: true })
      }
    }, { _id: true })
  },
  trialUsed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Add indexes for better performance
// Note: email index is already created by unique: true in schema
userSchema.index({ 'subscription.status': 1 }); // For subscription queries
userSchema.index({ createdAt: -1 }); // For user listing queries

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Validate subscription data before saving
userSchema.pre('save', function(next) {
  if (this.subscription) {
    // Ensure remainingMessages is not negative
    if (this.subscription.remainingMessages < 0) {
      this.subscription.remainingMessages = 0;
    }
    
    // Ensure messageLimit is not negative
    if (this.subscription.messageLimit < 0) {
      this.subscription.messageLimit = 0;
    }
    
    // Ensure remainingMessages doesn't exceed messageLimit
    if (this.subscription.remainingMessages > this.subscription.messageLimit) {
      this.subscription.remainingMessages = this.subscription.messageLimit;
    }
  }
  next();
});

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = models.User || model('User', userSchema);