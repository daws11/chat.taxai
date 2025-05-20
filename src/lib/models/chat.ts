import { Schema, model, models } from 'mongoose';

const messageSchema = new Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant']
  },
  content: {
    type: String,
    required: true
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
    required: true
  },
  title: {
    type: String,
    required: true
  },
  messages: [messageSchema]
}, {
  timestamps: true
});

export const ChatSession = models.ChatSession || model('ChatSession', chatSessionSchema);
