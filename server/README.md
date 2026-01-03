# UpCycle Connect Backend

A production-ready backend server for UpCycle Connect, a hyper-local sustainability platform built with Node.js, Express.js, MongoDB, and Firebase Authentication.

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Firebase Authentication** - User authentication
- **Firebase Admin SDK** - Token verification

## Features

- User authentication with Email/Password and Google Sign-In
- User roles: provider (Labs/Industries), seeker (Students/Innovators), admin
- Geospatial user locations with MongoDB 2dsphere indexing
- Location-based material discovery using MongoDB geospatial queries
- Material management with Cloudinary image uploads
- Protected API routes
- CORS enabled
- Centralized error handling

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── firebase.js      # Firebase Admin SDK configuration
│   │   └── db.js            # MongoDB connection
│   ├── middleware/
│   │   └── authMiddleware.js # Authentication middleware
│   ├── models/
│   │   └── User.js          # User MongoDB model
│   ├── controllers/
│   │   └── authController.js # Authentication controllers
│   ├── routes/
│   │   └── authRoutes.js    # Authentication routes
│   ├── utils/               # Utility functions
│   ├── app.js               # Express app configuration
│   └── server.js            # Server entry point
├── .env                     # Environment variables
├── package.json             # Dependencies and scripts
└── README.md                # This file
```

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Firebase project with Authentication enabled

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd server
npm install
```

### 2. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable "Email/Password"
   - Enable "Google"
4. Create a service account:
   - Go to Project Settings > Service accounts
   - Click "Generate new private key"
   - Download the JSON file (keep it secure!)

### 3. Environment Variables

Create a `.env` file in the server root directory:

```env
# MongoDB Connection String
MONGO_URI=mongodb://localhost:27017/upcycle-connect

# Firebase Configuration (from service account JSON)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----\n"

# Server Configuration
PORT=5000
```

**Note:** Replace the Firebase values with the actual values from your service account JSON file. Make sure to keep the private key secure and never commit it to version control.

### 4. MongoDB Setup

Make sure MongoDB is running locally or update `MONGO_URI` to point to your cloud MongoDB instance.

## API Endpoints

### Authentication Routes

- `POST /api/auth/register` - Register user with email/password
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google` - Google sign-in
- `GET /api/auth/me` - Get current user (protected)

### Request/Response Examples

#### Register User
```bash
POST /api/auth/register
Content-Type: application/json
Authorization: Bearer <firebase_id_token>

{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "seeker",
  "college": "MIT",
  "latitude": 42.3601,
  "longitude": -71.0589
}
```

#### Google Sign-In
```bash
POST /api/auth/google
Content-Type: application/json
Authorization: Bearer <firebase_id_token>

{
  "name": "Jane Smith",
  "email": "jane@gmail.com",
  "role": "provider",
  "organization": "Green Labs Inc",
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

#### Get Current User
```bash
GET /api/auth/me
Authorization: Bearer <firebase_id_token>
```

### Material Routes

- `POST /api/materials` - Create a new material (protected, requires file upload)
- `GET /api/materials/my-materials` - Get all materials for logged-in provider (protected)
- `GET /api/materials/nearby` - Get nearby materials using geospatial query (public)
- `GET /api/materials/available` - Get all available materials (public)
- `GET /api/materials/:id` - Get material by ID (public)
- `PATCH /api/materials/:id/status` - Update material status (protected)
- `DELETE /api/materials/:id` - Delete material (protected)

#### Create Material (with images)
```bash
POST /api/materials
Content-Type: multipart/form-data
Authorization: Bearer <firebase_id_token>

Form Data:
- title: "Laboratory Glass Beakers"
- category: "Glassware"
- description: "Set of 10 beakers"
- quantity: "10 pieces"
- latitude: 40.7128
- longitude: -74.0060
- images: [File, File, ...] (max 5, optional)
```

#### Get Nearby Materials (Geospatial Query)
```bash
GET /api/materials/nearby?lat=40.7128&lng=-74.0060&radius=10&category=Glassware

Query Parameters:
- lat (required): Latitude of search center
- lng (required): Longitude of search center
- radius (optional): Search radius in kilometers (default: 10, max: 1000)
- category (optional): Filter by category
```

**Response:**
```json
{
  "materials": [
    {
      "id": "...",
      "title": "Laboratory Glass Beakers",
      "category": "Glassware",
      "location": {
        "type": "Point",
        "coordinates": [-74.0060, 40.7128]
      },
      "distance": 2.3,
      ...
    }
  ],
  "count": 1,
  "searchLocation": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "radius": 10
  }
}
```

**Note:** Coordinates are stored as `[longitude, latitude]` following GeoJSON standard. The endpoint uses MongoDB's `$near` operator with a 2dsphere index for efficient geospatial queries.

## Authentication Flow

### Email/Password Authentication

1. **Frontend**: User signs up/logs in using Firebase Authentication SDK
2. **Frontend**: Sends Firebase ID token + profile data to backend
3. **Backend**: Verifies token with Firebase Admin SDK
4. **Backend**: Saves/retrieves user profile from MongoDB
5. **Backend**: Returns user data

### Google Sign-In

1. **Frontend**: User signs in with Google using Firebase SDK
2. **Frontend**: Sends Firebase ID token to backend
3. **Backend**: Verifies token
4. **Backend**: Auto-creates user in MongoDB if doesn't exist
5. **Backend**: Returns user profile

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will start on the port specified in `.env` (default: 5000).

## Health Check

Visit `http://localhost:5000/health` to check if the server is running.

## User Model

```javascript
{
  name: String,
  email: String,
  role: 'provider' | 'seeker' | 'admin',
  authProvider: 'email' | 'google',
  organization: String, // For providers
  college: String,       // For seekers
  location: {
    type: 'Point',
    coordinates: [longitude, latitude]  // GeoJSON format
  },
  createdAt: Date
}
```

## Material Model

```javascript
{
  title: String,
  category: 'Chemicals' | 'Glassware' | 'Electronics' | 'Metals' | 'Plastics' | 'Bio Materials' | 'Other',
  description: String,
  quantity: String,
  images: [
    {
      url: String,        // Cloudinary secure URL
      publicId: String    // Cloudinary public ID for deletion
    }
  ],
  providerId: ObjectId,   // Reference to User
  location: {
    type: 'Point',
    coordinates: [longitude, latitude]  // GeoJSON format [lng, lat] for geospatial queries
  },
  status: 'available' | 'requested' | 'picked',
  createdAt: Date
}
```

**Geospatial Index:** The Material model includes a 2dsphere index on the `location` field for efficient nearby material searches using MongoDB's `$near` operator.

## Security Notes

- All sensitive data (Firebase credentials, MongoDB URI) are stored in environment variables
- Firebase ID tokens are verified on each protected request
- CORS is enabled for cross-origin requests
- Input validation is implemented for all endpoints

## Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include JSDoc comments for new functions
4. Test all endpoints before committing

## License

ISC