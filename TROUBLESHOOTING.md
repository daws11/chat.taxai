# Troubleshooting Guide

## Common Errors and Solutions

### 1. MongoDB Connection Errors

#### Error: `MongoParseError: option buffermaxentries is not supported`

**Problem**: The MongoDB driver version doesn't support the `bufferMaxEntries` option.

**Solution**: Remove deprecated options from mongoose connection configuration.

```typescript
// ❌ Old configuration (causes error)
await mongoose.connect(process.env.MONGODB_URI!, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0,        // ❌ Not supported
  bufferCommands: false,      // ❌ Not supported
});

// ✅ New configuration (fixed)
await mongoose.connect(process.env.MONGODB_URI!, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  // Removed deprecated options
});
```

#### Error: `MONGODB_URI is not defined`

**Problem**: Environment variable `MONGODB_URI` is not set.

**Solution**: Add the MongoDB URI to your `.env` file:

```env
MONGODB_URI=mongodb://localhost:27017/chat-taxai
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chat-taxai
```

### 2. Mongoose Schema Warnings

#### Warning: `Duplicate schema index on {"email":1} found`

**Problem**: Duplicate index definition on the `email` field.

**Cause**: 
- Field has `unique: true` (creates index automatically)
- Additional explicit index: `userSchema.index({ email: 1 })`

**Solution**: Remove the explicit index since `unique: true` already creates it.

```typescript
// ❌ Causes duplicate index warning
const userSchema = new Schema({
  email: {
    type: String,
    unique: true  // This creates an index automatically
  }
});

// Later in code:
userSchema.index({ email: 1 }); // ❌ Duplicate!

// ✅ Fixed - remove explicit index
const userSchema = new Schema({
  email: {
    type: String,
    unique: true  // This creates the index
  }
});

// No need for explicit email index
userSchema.index({ 'subscription.status': 1 }); // ✅ Other indexes are fine
```

### 3. Authentication Errors

#### Error: `Auth error: [MongoDB Error]`

**Problem**: Database connection issues during authentication.

**Solutions**:
1. Check MongoDB connection string
2. Verify MongoDB server is running
3. Check network connectivity
4. Verify database permissions

#### Error: `User not found` or `Password validation failed`

**Problem**: User authentication issues.

**Solutions**:
1. Check if user exists in database
2. Verify password hashing is working
3. Check email normalization
4. Verify database queries

### 4. Environment Variables

#### Missing Environment Variables

**Required Variables**:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/chat-taxai

# NextAuth
NEXTAUTH_SECRET=your-super-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional
COOKIE_DOMAIN=.taxai.ae
NODE_ENV=development
```

**Validation**: Add environment variable validation:

```typescript
// Add to your app startup
const requiredEnvVars = [
  'MONGODB_URI',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'OPENAI_API_KEY'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

### 5. Performance Issues

#### Slow Database Queries

**Solutions**:
1. Add proper indexes
2. Use `.select()` to limit fields
3. Use `.lean()` for read-only queries
4. Implement connection pooling

```typescript
// ✅ Optimized query
const user = await User.findById(id)
  .select('email name subscription')
  .lean();

// ✅ Add indexes for frequently queried fields
userSchema.index({ email: 1 });
userSchema.index({ 'subscription.status': 1 });
```

#### Memory Leaks

**Solutions**:
1. Close database connections properly
2. Clear caches when needed
3. Use connection pooling
4. Monitor memory usage

### 6. Development vs Production

#### Development Issues

**Common Problems**:
- Missing environment variables
- Database not running
- Wrong MongoDB URI
- CORS issues

**Solutions**:
1. Use `.env.local` for local development
2. Start MongoDB service
3. Check localhost vs production URLs
4. Configure CORS properly

#### Production Issues

**Common Problems**:
- Environment variables not set
- Database connection limits
- SSL/TLS issues
- Performance bottlenecks

**Solutions**:
1. Set environment variables in deployment platform
2. Configure connection pooling
3. Use MongoDB Atlas for production
4. Monitor performance metrics

### 7. Debugging Tips

#### Enable Debug Logging

```typescript
// Add to your app startup
if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', true);
}
```

#### Check Database Connection

```typescript
// Add connection event listeners
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});
```

#### Monitor Performance

```typescript
// Add query timing
const start = Date.now();
const result = await User.findOne({ email });
console.log(`Query took ${Date.now() - start}ms`);
```

### 8. Quick Fixes

#### Restart Services
```bash
# Stop and restart MongoDB
sudo systemctl stop mongod
sudo systemctl start mongod

# Or for macOS with Homebrew
brew services stop mongodb-community
brew services start mongodb-community
```

#### Clear Database
```bash
# Connect to MongoDB
mongosh

# Switch to your database
use chat-taxai

# Clear collections (be careful!)
db.users.drop()
db.chatsessions.drop()
```

#### Reset Environment
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Or with pnpm
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 9. Prevention

#### Best Practices
1. Always validate environment variables
2. Use proper error handling
3. Add logging for debugging
4. Test database connections
5. Monitor performance
6. Keep dependencies updated
7. Use TypeScript for type safety
8. Add proper indexes
9. Implement connection pooling
10. Handle errors gracefully

#### Code Quality
- Use ESLint and Prettier
- Add unit tests
- Use proper TypeScript types
- Implement proper error boundaries
- Add monitoring and logging
- Use environment-specific configurations
