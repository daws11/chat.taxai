import { Schema, model, models } from 'mongoose';

const attachmentSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  fileId: {
    type: String,
    required: false
  }
}, { _id: false });

const messageSchema = new Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant']
  },
  content: {
    type: String,
    required: true
  },
  attachments: [attachmentSchema],
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatSessionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  threadId: {
    type: String,
    sparse: true
  },
  title: {
    type: String,
    required: true
  },
  messages: [messageSchema]
}, {
  timestamps: true
});

// Add indexes for better performance
chatSessionSchema.index({ userId: 1, updatedAt: -1 }); // For user's chat sessions ordered by update time
chatSessionSchema.index({ threadId: 1 }); // For thread-based queries
chatSessionSchema.index({ createdAt: -1 }); // For general chat session queries

export const ChatSession = models.ChatSession || model('ChatSession', chatSessionSchema);