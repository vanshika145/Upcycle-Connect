# Socket.IO Real-Time Implementation

## ✅ Implementation Complete

Socket.IO has been successfully integrated for real-time material alerts, request notifications, and approval/rejection updates.

## 📁 Files Created/Modified

### Backend

1. **`server/src/models/Request.js`** (NEW)
   - Request model for tracking material requests
   - Fields: `materialId`, `seekerId`, `providerId`, `status`, `message`
   - Indexes for efficient queries

2. **`server/src/config/socket.js`** (NEW)
   - Socket.IO server initialization
   - User-specific room management
   - Real-time matching logic for `materialAdded` event
   - Helper functions: `emitToUser`, `notifyMatchedSeekers`

3. **`server/src/controllers/requestController.js`** (NEW)
   - `createRequest`: Seeker sends request to provider
   - `getProviderRequests`: Get incoming requests for provider
   - `getSeekerRequests`: Get outgoing requests for seeker
   - `updateRequestStatus`: Approve/reject requests
   - All emit Socket.IO events after DB success

4. **`server/src/routes/requestRoutes.js`** (NEW)
   - REST API routes for request operations
   - Protected with authentication middleware

5. **`server/src/server.js`** (MODIFIED)
   - Integrated Socket.IO with HTTP server
   - Made socketIO available via `app.set('socketIO', socketIO)`

6. **`server/src/app.js`** (MODIFIED)
   - Added request routes: `/api/requests`

7. **`server/src/controllers/materialController.js`** (MODIFIED)
   - Added Socket.IO notification after material creation
   - Emits `materialAdded` to matched seekers

### Frontend

1. **`client/src/contexts/SocketContext.tsx`** (NEW)
   - Socket.IO client connection management
   - Auto-connects after user login
   - Listens for all real-time events
   - Shows toast notifications for events

2. **`client/src/App.tsx`** (MODIFIED)
   - Wrapped app with `SocketProvider`

3. **`client/src/lib/api.ts`** (MODIFIED)
   - Added `requestAPI` with all request operations
   - Added `MaterialRequest` interface

## 🔌 Socket.IO Events

### Client → Server

| Event | Description | Data |
|-------|-------------|------|
| `join` | User joins their personal room | `{ userId: string }` |

### Server → Client

| Event | Description | Recipient | Data |
|-------|-------------|-----------|------|
| `joined` | Confirmation of room join | User | `{ userId: string, message: string }` |
| `materialAdded` | New material available nearby | Matched Seekers | `{ material: {...}, message: string }` |
| `requestSent` | New request received | Provider | `{ request: {...}, message: string }` |
| `requestApproved` | Request approved | Seeker | `{ request: {...}, message: string }` |
| `requestRejected` | Request rejected | Seeker | `{ request: {...}, message: string }` |

## 🎯 Real-Time Matching Logic

### When Provider Adds Material

1. Material saved to MongoDB ✅
2. Find seekers within 10km radius using geospatial query
3. Emit `materialAdded` event to each matched seeker's room
4. Seeker receives notification via Socket.IO

**Code Location:** `server/src/config/socket.js` → `notifyMatchedSeekers()`

### When Seeker Sends Request

1. Request saved to MongoDB ✅
2. Material status updated to `'requested'`
3. Emit `requestSent` to provider's room
4. Provider receives notification via Socket.IO

**Code Location:** `server/src/controllers/requestController.js` → `createRequest()`

### When Provider Approves/Rejects

1. Request status updated in MongoDB ✅
2. Material status updated accordingly
3. Emit `requestApproved` or `requestRejected` to seeker's room
4. Seeker receives notification via Socket.IO

**Code Location:** `server/src/controllers/requestController.js` → `updateRequestStatus()`

## 🔐 User-Specific Rooms

- Each user joins a room named after their `userId`
- Events are emitted to specific rooms: `io.to(userId).emit(...)`
- No global broadcasts - prevents spam
- Automatic cleanup on disconnect

## 📡 REST API Endpoints

### Requests

- `POST /api/requests` - Create request (Seeker only)
- `GET /api/requests/provider` - Get provider's incoming requests
- `GET /api/requests/seeker` - Get seeker's outgoing requests
- `PATCH /api/requests/:requestId/status` - Update request status (Provider only)

## 🧪 Testing

### 1. Test Material Added Notification

1. **Provider**: Add a new material
2. **Seeker** (within 10km): Should receive `materialAdded` notification
3. **Check**: Toast notification appears on seeker's screen

### 2. Test Request Sent Notification

1. **Seeker**: Send request for a material
2. **Provider**: Should receive `requestSent` notification
3. **Check**: Toast notification appears on provider's screen

### 3. Test Request Approval

1. **Provider**: Approve a request
2. **Seeker**: Should receive `requestApproved` notification
3. **Check**: Toast notification appears on seeker's screen

### 4. Test Request Rejection

1. **Provider**: Reject a request
2. **Seeker**: Should receive `requestRejected` notification
3. **Check**: Toast notification appears on seeker's screen

## 🔍 Debugging

### Backend Logs

- `🔌 Socket connected:` - New socket connection
- `✅ User {userId} joined room:` - User joined their room
- `📤 Emitted "{event}" to user {userId}` - Event emitted
- `✅ Notified {count} seeker(s) about new material` - Matching notification

### Frontend Logs

- `🔌 Socket.IO connected:` - Socket connected
- `✅ Joined room for user:` - Room join success
- `📦 New material added notification:` - Material notification received
- `📩 New request received:` - Request notification received

## ⚙️ Configuration

### Environment Variables

**Backend:**
- `CLIENT_URL` - Frontend URL for CORS (default: `http://localhost:8082`)

**Frontend:**
- `VITE_API_BASE_URL` - Backend URL (default: `http://localhost:5000`)

## 🚀 Usage Examples

### Frontend: Using Socket Context

```typescript
import { useSocket } from '@/contexts/SocketContext';

const MyComponent = () => {
  const { socket, isConnected } = useSocket();
  
  // Socket is automatically connected and listening
  // Notifications are handled automatically via toast
};
```

### Frontend: Creating a Request

```typescript
import { requestAPI } from '@/lib/api';

// Seeker sends request
await requestAPI.create({
  materialId: 'material-id',
  message: 'I need this for my project',
});
```

### Frontend: Approving/Rejecting Request

```typescript
// Provider approves request
await requestAPI.updateStatus('request-id', 'approved');

// Provider rejects request
await requestAPI.updateStatus('request-id', 'rejected');
```

## 📝 Important Notes

1. **Data Persistence First**: All Socket.IO events are emitted AFTER successful MongoDB operations
2. **No Global Broadcasts**: Events are sent only to specific user rooms
3. **Automatic Reconnection**: Socket.IO automatically reconnects on disconnect
4. **Error Handling**: Socket errors don't break the application
5. **Room Management**: Users automatically join/leave rooms on connect/disconnect

## 🎨 UI Integration

- Toast notifications automatically appear for all Socket.IO events
- Connection status can be checked via `isConnected` from `useSocket()`
- No additional UI components needed - notifications handled by Sonner

## 🔄 Next Steps (Optional Enhancements)

1. Add notification badge/count in UI
2. Store notifications in database for history
3. Add notification preferences (email, push, etc.)
4. Implement notification center UI
5. Add read/unread status for notifications

