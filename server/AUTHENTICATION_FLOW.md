# Authentication & User Storage Flow

This document explains how authentication and user data storage works in UpCycle Connect.

## Overview

- **Firebase Authentication**: Handles user authentication (email/password, Google sign-in)
- **MongoDB Atlas**: Stores user profile data and information
- **Backend API**: Connects Firebase auth with MongoDB storage

## Complete Flow

### 1. User Sign Up (Email/Password)

```
Frontend                    Firebase              Backend API          MongoDB Atlas
   |                           |                      |                      |
   |-- Sign up with email ---->|                      |                      |
   |   and password            |                      |                      |
   |                           |                      |                      |
   |<-- Firebase ID Token -----|                      |                      |
   |                           |                      |                      |
   |-- Send token + user data ----------------------->|                      |
   |                           |                      |                      |
   |                           |                      |-- Verify token ----->|
   |                           |                      |                      |
   |                           |                      |-- Save user profile->|
   |                           |                      |                      |
   |<-- User data + success -------------------------|                      |
   |                           |                      |                      |
```

**What happens:**
1. User fills signup form (name, email, password, role, location)
2. Frontend creates Firebase account with email/password
3. Firebase returns ID token
4. Frontend sends token + user profile to backend `/api/auth/register`
5. Backend verifies token with Firebase Admin SDK
6. Backend saves user profile to MongoDB Atlas
7. Backend returns user data to frontend
8. Frontend stores token and navigates to dashboard

### 2. User Login (Email/Password)

```
Frontend                    Firebase              Backend API          MongoDB Atlas
   |                           |                      |                      |
   |-- Sign in with email ---->|                      |                      |
   |   and password            |                      |                      |
   |                           |                      |                      |
   |<-- Firebase ID Token -----|                      |                      |
   |                           |                      |                      |
   |-- Send token + email --------------------------->|                      |
   |                           |                      |                      |
   |                           |                      |-- Verify token ----->|
   |                           |                      |                      |
   |                           |                      |-- Get user profile -->|
   |                           |                      |                      |
   |<-- User data + success -------------------------|                      |
   |                           |                      |                      |
```

**What happens:**
1. User enters email and password
2. Frontend authenticates with Firebase
3. Firebase returns ID token
4. Frontend sends token + email to backend `/api/auth/login`
5. Backend verifies token
6. Backend retrieves user profile from MongoDB Atlas
7. Backend returns user data to frontend
8. Frontend stores token and navigates to dashboard

### 3. Google Sign-In

```
Frontend                    Firebase              Backend API          MongoDB Atlas
   |                           |                      |                      |
   |-- Sign in with Google --->|                      |                      |
   |                           |                      |                      |
   |<-- Firebase ID Token -----|                      |                      |
   |                           |                      |                      |
   |-- Send token + user data ----------------------->|                      |
   |                           |                      |                      |
   |                           |                      |-- Verify token ----->|
   |                           |                      |                      |
   |                           |                      |-- Check if exists --->|
   |                           |                      |                      |
   |                           |                      |-- Create if new ----->|
   |                           |                      |                      |
   |<-- User data + success -------------------------|                      |
   |                           |                      |                      |
```

**What happens:**
1. User clicks "Sign in with Google"
2. Frontend authenticates with Google via Firebase
3. Firebase returns ID token + user info
4. Frontend sends token + profile data to backend `/api/auth/google`
5. Backend verifies token
6. Backend checks if user exists in MongoDB Atlas
7. If new user, backend creates profile in MongoDB
8. Backend returns user data to frontend
9. Frontend stores token and navigates to dashboard

## Data Storage

### What's Stored in MongoDB Atlas

Each user document in MongoDB contains:

```javascript
{
  _id: ObjectId("..."),
  name: "John Doe",
  email: "john@example.com",        // Unique, indexed
  role: "provider" | "seeker" | "admin",
  authProvider: "email" | "google",
  organization: "MIT Labs",          // For providers
  college: "MIT",                    // For seekers
  location: {
    type: "Point",
    coordinates: [longitude, latitude]  // For geospatial queries
  },
  createdAt: Date
}
```

### What's NOT Stored in MongoDB

- **Passwords**: Never stored. Firebase handles password hashing and verification.
- **Firebase tokens**: Stored temporarily in frontend localStorage, not in MongoDB.

## Security

1. **Password Security**: Passwords are hashed by Firebase, never stored in MongoDB
2. **Token Verification**: All API requests verify Firebase ID tokens
3. **Protected Routes**: `/api/auth/me` requires valid token
4. **Data Validation**: All user input is validated before saving
5. **Unique Emails**: MongoDB enforces unique email constraint

## API Endpoints

### Public Endpoints (No token required)

- `POST /api/auth/register` - Register new user
  - Requires: Firebase ID token in Authorization header
  - Body: `{ name, email, role, organization/college, latitude, longitude }`
  - Saves user to MongoDB Atlas

- `POST /api/auth/login` - Login existing user
  - Requires: Firebase ID token in Authorization header
  - Body: `{ email }`
  - Retrieves user from MongoDB Atlas

- `POST /api/auth/google` - Google sign-in
  - Requires: Firebase ID token in Authorization header
  - Body: `{ name, email, role?, organization?, college?, latitude, longitude }`
  - Creates or retrieves user from MongoDB Atlas

### Protected Endpoints (Token required)

- `GET /api/auth/me` - Get current user
  - Requires: Valid Firebase ID token
  - Returns user data from MongoDB Atlas

## Verification

To verify users are being saved:

1. **Check Server Logs**: Look for `✅ User registered in MongoDB` messages
2. **MongoDB Atlas Dashboard**: 
   - Go to Database > Browse Collections
   - View the `users` collection
   - See all registered users

## Error Handling

The system handles:
- Duplicate email errors (user already exists)
- Validation errors (missing required fields)
- MongoDB connection errors
- Firebase token verification errors
- Network timeouts

All errors are logged and appropriate error messages are returned to the frontend.

