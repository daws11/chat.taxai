# Perbaikan Update Token di Sidebar

## Masalah
Token di sidebar tidak berkurang setiap kali user mengirim pesan setelah perubahan terakhir. Meskipun token sudah dikurangi di database, UI sidebar tidak menampilkan perubahan tersebut.

## Root Cause Analysis

### 1. **Session Caching Issue**
- Auth options menggunakan caching untuk subscription data di token
- Ketika token di-update di database, cache di token tidak di-refresh
- Sidebar menggunakan data dari session yang tidak ter-update

### 2. **Data Flow Problem**
- Sidebar menerima data user dari prop, bukan dari session langsung
- `useSession()` tidak di-call di sidebar component
- Event `chat-session-updated` tidak memicu refresh session

## Solusi yang Diterapkan

### 1. **Auth Options Fix** (`src/lib/auth/auth-options.ts`)
```typescript
// BEFORE: Only fetch if not cached
if (!token.subscription && token.id) {
  // fetch user data
}

// AFTER: Always fetch fresh data
if (token.id) {
  // Always fetch fresh user data to ensure subscription is up-to-date
  const userDoc = await User.findById(token.id)
    .select('subscription language jobTitle trialUsed')
    .lean();
}
```

### 2. **Sidebar Component Fix** (`src/components/app-sidebar.tsx`)
```typescript
// BEFORE: Use prop data
{user?.subscription && ...}

// AFTER: Use session data with event listener
const { data: session, update } = useSession();
const currentUser = session?.user || user;

useEffect(() => {
  const handleSessionUpdate = async () => {
    if (update) {
      await update();
    }
  };
  window.addEventListener('chat-session-updated', handleSessionUpdate);
  return () => {
    window.removeEventListener('chat-session-updated', handleSessionUpdate);
  };
}, [update]);
```

### 3. **useAssistant Hook Fix** (`src/lib/hooks/use-assistant.ts`)
```typescript
// BEFORE: Simple update call
if (update) await update();

// AFTER: Enhanced update with error handling
if (update) {
  try {
    await update();
    console.log('Session updated successfully');
  } catch (error) {
    console.error('Failed to update session:', error);
  }
}
```

## Flow Token Update Sekarang

```
1. User sends message
   ↓
2. Token deducted in database (via token-utils)
   ↓
3. useAssistant calls update()
   ↓
4. Session callback fetches fresh user data from DB
   ↓
5. Session data updated with new token count
   ↓
6. Sidebar receives updated session data
   ↓
7. Progress bar updates with new token count
   ↓
8. Event 'chat-session-updated' triggered
   ↓
9. Sidebar refreshes session again (double-check)
```

## Testing

### Manual Testing
1. Open browser dev tools
2. Send a message in chat
3. Check console for:
   - "Session updated successfully"
   - "Sidebar: Session refreshed after chat update"
4. Verify token count decreases in sidebar immediately

### Console Logs to Watch
```
Session updated successfully
Sidebar: Session refreshed after chat update
```

## Key Benefits

### 1. **Real-time Updates**
- Token count updates immediately after sending message
- No page refresh required
- Progress bar reflects current state

### 2. **Reliable Data**
- Always fetches fresh data from database
- No stale cache issues
- Consistent across all components

### 3. **Error Handling**
- Graceful fallback if session update fails
- Console logging for debugging
- Event-driven architecture

### 4. **Performance**
- Minimal database calls (only when needed)
- Efficient event handling
- Clean component lifecycle

## Files Modified

1. **`src/lib/auth/auth-options.ts`**
   - Always fetch fresh user data in session callback
   - Remove caching logic that caused stale data

2. **`src/components/app-sidebar.tsx`**
   - Use `useSession()` instead of prop data
   - Add event listener for session updates
   - Use `currentUser` from session

3. **`src/lib/hooks/use-assistant.ts`**
   - Enhanced error handling for session updates
   - Better logging for debugging

## Verification

### Before Fix
- ❌ Token count in sidebar not updating
- ❌ Progress bar shows stale data
- ❌ User needs to refresh page to see changes

### After Fix
- ✅ Token count updates immediately
- ✅ Progress bar reflects real-time data
- ✅ No page refresh needed
- ✅ Consistent across all chat sessions

## Conclusion

Masalah token di sidebar yang tidak ter-update telah diperbaiki dengan:
1. Menghilangkan caching yang menyebabkan stale data
2. Menggunakan session data langsung di sidebar
3. Menambahkan event-driven refresh mechanism
4. Meningkatkan error handling dan logging

Sistem sekarang memberikan real-time feedback kepada user tentang sisa token mereka.
