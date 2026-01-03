# Authentication Setup Guide

This guide explains how to set up authentication for the UpCycle Connect frontend.

## Prerequisites

1. Firebase project with Authentication enabled
2. Backend server running (default: http://localhost:5000)

## Environment Variables

Create a `.env` file in the `client` directory with the following variables:

```env
# Firebase Configuration
# Get these values from Firebase Console > Project Settings > General
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Backend API URL
VITE_API_BASE_URL=http://localhost:5000
```

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Go to **Authentication** > **Sign-in method**
4. Enable the following sign-in methods:
   - **Email/Password**
   - **Google** (optional, but recommended)

## How Authentication Works

### Flow Overview

1. **User signs up/logs in** using Firebase Authentication SDK
2. **Frontend** gets Firebase ID token
3. **Frontend** sends token + user data to backend API
4. **Backend** verifies token and saves/retrieves user profile
5. **Frontend** stores token and user data
6. **Frontend** navigates to appropriate dashboard

### Components

- **`/src/config/firebase.ts`** - Firebase SDK configuration
- **`/src/lib/api.ts`** - API client for backend communication
- **`/src/contexts/AuthContext.tsx`** - Authentication state management
- **`/src/pages/Login.tsx`** - Login page with form handling
- **`/src/pages/Signup.tsx`** - Signup page with form handling

### API Endpoints Used

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login existing user
- `POST /api/auth/google` - Google sign-in
- `GET /api/auth/me` - Get current user (protected)

## Usage

### Using Auth Context

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;

  return (
    <div>
      <p>Welcome, {user.name}!</p>
      <button onClick={signOut}>Logout</button>
    </div>
  );
}
```

### Protected Routes

To protect routes, check the `user` state from `useAuth()`:

```tsx
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

function ProtectedPage() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return <div>Protected content</div>;
}
```

## Notes

- Tokens are stored in `localStorage` under the key `firebase_id_token`
- User location is required for signup (enabled via browser geolocation)
- The auth state is automatically synced with Firebase auth state changes
- All API requests automatically include the auth token in the Authorization header

