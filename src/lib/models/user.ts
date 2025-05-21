import { Schema, model, models } from 'mongoose';
import bcrypt from 'bcryptjs';

const jobTitles = [
  'Tax Accountant',
  'Tax Consultant',
  'Tax Auditor (for government tax authorities)',
  'Tax Manager / Head of Tax (in a company)',
  'Tax Investigator',
  'Tax Attorney / Tax Lawyer',
  'Fiscal Policy Analyst',
  'Tax Staff / Tax Officer',
  'Tax Auditor (at a Public Accounting Firm)',
  'Tax Educator / University Lecturer (in Taxation)',
  'Other'
] as const;

const userSchema = new Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    minLength: [3, 'Username must be at least 3 characters long']
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
    enum: {
      values: jobTitles,
      message: 'Please select a valid job title'
    }
  }
}, {
  timestamps: true
});

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

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = models.User || model('User', userSchema);
