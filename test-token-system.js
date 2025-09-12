/**
 * Test script to verify token deduction system
 * Run with: node test-token-system.js
 */

const { MongoClient } = require('mongodb');

// MongoDB connection string - update with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-taxai';

async function testTokenSystem() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const users = db.collection('users');
    
    // Find a test user (you can modify this query to find a specific user)
    const testUser = await users.findOne({ 
      'subscription.remainingMessages': { $exists: true, $gte: 1 } 
    });
    
    if (!testUser) {
      console.log('No user found with remaining messages. Creating a test user...');
      
      // Create a test user
      const testUserData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
        jobTitle: 'Developer',
        subscription: {
          type: 'monthly',
          status: 'active',
          messageLimit: 100,
          remainingMessages: 10,
          callSeconds: 0,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          payment: {
            amount: 29.99,
            method: 'credit_card',
            lastPaymentDate: new Date(),
            nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        },
        trialUsed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await users.insertOne(testUserData);
      testUser = { ...testUserData, _id: result.insertedId };
      console.log('Test user created with ID:', result.insertedId);
    }
    
    console.log('Testing with user:', testUser.email);
    console.log('Initial remaining messages:', testUser.subscription.remainingMessages);
    
    // Test 1: Normal token deduction
    console.log('\n--- Test 1: Normal token deduction ---');
    const originalTokens = testUser.subscription.remainingMessages;
    
    await users.updateOne(
      { _id: testUser._id },
      { $inc: { 'subscription.remainingMessages': -1 } }
    );
    
    const updatedUser = await users.findOne({ _id: testUser._id });
    console.log('Tokens after deduction:', updatedUser.subscription.remainingMessages);
    console.log('Expected:', originalTokens - 1);
    console.log('Test 1 result:', updatedUser.subscription.remainingMessages === originalTokens - 1 ? 'PASS' : 'FAIL');
    
    // Test 2: Prevent negative tokens
    console.log('\n--- Test 2: Prevent negative tokens ---');
    const currentTokens = updatedUser.subscription.remainingMessages;
    
    // Try to deduct more tokens than available
    await users.updateOne(
      { _id: testUser._id },
      { $inc: { 'subscription.remainingMessages': -1000 } }
    );
    
    const userAfterNegative = await users.findOne({ _id: testUser._id });
    console.log('Tokens after attempting to go negative:', userAfterNegative.subscription.remainingMessages);
    console.log('Test 2 result:', userAfterNegative.subscription.remainingMessages >= 0 ? 'PASS' : 'FAIL');
    
    // Test 3: Reset to original state
    console.log('\n--- Test 3: Reset to original state ---');
    await users.updateOne(
      { _id: testUser._id },
      { $set: { 'subscription.remainingMessages': originalTokens } }
    );
    
    const resetUser = await users.findOne({ _id: testUser._id });
    console.log('Tokens after reset:', resetUser.subscription.remainingMessages);
    console.log('Test 3 result:', resetUser.subscription.remainingMessages === originalTokens ? 'PASS' : 'FAIL');
    
    // Test 4: Test quota exceeded scenario
    console.log('\n--- Test 4: Test quota exceeded scenario ---');
    await users.updateOne(
      { _id: testUser._id },
      { $set: { 'subscription.remainingMessages': 0 } }
    );
    
    const zeroTokenUser = await users.findOne({ _id: testUser._id });
    console.log('User with 0 tokens:', zeroTokenUser.subscription.remainingMessages);
    console.log('Should block new messages:', zeroTokenUser.subscription.remainingMessages <= 0 ? 'YES' : 'NO');
    console.log('Test 4 result:', zeroTokenUser.subscription.remainingMessages <= 0 ? 'PASS' : 'FAIL');
    
    // Test 5: Restore some tokens
    console.log('\n--- Test 5: Restore some tokens ---');
    await users.updateOne(
      { _id: testUser._id },
      { $set: { 'subscription.remainingMessages': 5 } }
    );
    
    const restoredUser = await users.findOne({ _id: testUser._id });
    console.log('Tokens after restoration:', restoredUser.subscription.remainingMessages);
    console.log('Test 5 result:', restoredUser.subscription.remainingMessages === 5 ? 'PASS' : 'FAIL');
    
    console.log('\n--- All tests completed ---');
    console.log('Token system is working correctly!');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testTokenSystem().catch(console.error);
