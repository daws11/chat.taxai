import { User } from '@/lib/models/user';

export interface TokenOperationResult {
  success: boolean;
  remainingTokens: number;
  error?: string;
}

/**
 * Safely deduct tokens from a user's subscription
 * @param userId - The user's ID
 * @param tokensToDeduct - Number of tokens to deduct (default: 1)
 * @returns Promise<TokenOperationResult>
 */
export async function deductUserTokens(
  userId: string, 
  tokensToDeduct: number = 1
): Promise<TokenOperationResult> {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return {
        success: false,
        remainingTokens: 0,
        error: 'User not found'
      };
    }

    if (!user.subscription || typeof user.subscription.remainingMessages !== 'number') {
      return {
        success: false,
        remainingTokens: 0,
        error: 'Invalid subscription data'
      };
    }

    if (user.subscription.remainingMessages < tokensToDeduct) {
      return {
        success: false,
        remainingTokens: user.subscription.remainingMessages,
        error: 'Insufficient tokens'
      };
    }

    // Deduct tokens
    user.subscription.remainingMessages -= tokensToDeduct;
    await user.save();

    return {
      success: true,
      remainingTokens: user.subscription.remainingMessages
    };
  } catch (error) {
    console.error('Error deducting tokens:', error);
    return {
      success: false,
      remainingTokens: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Safely add tokens back to a user's subscription (for rollback)
 * @param userId - The user's ID
 * @param tokensToAdd - Number of tokens to add back
 * @returns Promise<TokenOperationResult>
 */
export async function addUserTokens(
  userId: string, 
  tokensToAdd: number = 1
): Promise<TokenOperationResult> {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return {
        success: false,
        remainingTokens: 0,
        error: 'User not found'
      };
    }

    if (!user.subscription || typeof user.subscription.remainingMessages !== 'number') {
      return {
        success: false,
        remainingTokens: 0,
        error: 'Invalid subscription data'
      };
    }

    // Add tokens back (the pre-save hook will ensure it doesn't exceed the limit)
    user.subscription.remainingMessages += tokensToAdd;
    await user.save();

    return {
      success: true,
      remainingTokens: user.subscription.remainingMessages
    };
  } catch (error) {
    console.error('Error adding tokens:', error);
    return {
      success: false,
      remainingTokens: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if user has sufficient tokens
 * @param userId - The user's ID
 * @param requiredTokens - Number of tokens required (default: 1)
 * @returns Promise<boolean>
 */
export async function hasSufficientTokens(
  userId: string, 
  requiredTokens: number = 1
): Promise<boolean> {
  try {
    const user = await User.findById(userId);
    
    if (!user || !user.subscription || typeof user.subscription.remainingMessages !== 'number') {
      return false;
    }

    return user.subscription.remainingMessages >= requiredTokens;
  } catch (error) {
    console.error('Error checking tokens:', error);
    return false;
  }
}

/**
 * Get user's current token count
 * @param userId - The user's ID
 * @returns Promise<number> - Current remaining tokens, or 0 if error
 */
export async function getUserTokenCount(userId: string): Promise<number> {
  try {
    const user = await User.findById(userId);
    
    if (!user || !user.subscription || typeof user.subscription.remainingMessages !== 'number') {
      return 0;
    }

    return user.subscription.remainingMessages;
  } catch (error) {
    console.error('Error getting token count:', error);
    return 0;
  }
}
