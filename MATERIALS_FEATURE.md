# Materials Feature Implementation

This document describes the implementation of the Materials feature, including user profile display and material management.

## ✅ Completed Features

### 1. User Profile Display
- **Provider Dashboard**: Displays user name, organization, and role from MongoDB
- **Seeker Dashboard**: Displays user name, college, and role from MongoDB
- User data is fetched from MongoDB via the `/api/auth/me` endpoint
- User initials are displayed in the profile avatar

### 2. Material Model (MongoDB)
Created Material collection with the following schema:
```javascript
{
  title: String (required),
  category: String (required, enum),
  description: String,
  quantity: String (required),
  images: [String] (array of image URLs),
  providerId: ObjectId (reference to User),
  location: {
    type: 'Point',
    coordinates: [longitude, latitude]
  },
  status: String (enum: 'available' | 'requested' | 'picked'),
  createdAt: Date
}
```

### 3. Backend API Endpoints

#### Material Routes (`/api/materials`)
- `POST /api/materials` - Create a new material (protected)
- `GET /api/materials/my-materials` - Get all materials for logged-in provider (protected)
- `GET /api/materials/available` - Get all available materials (public, with optional filters)
- `GET /api/materials/:id` - Get material by ID (public)
- `PATCH /api/materials/:id/status` - Update material status (protected)
- `DELETE /api/materials/:id` - Delete material (protected)

### 4. Frontend Integration

#### Provider Dashboard
- **Add Material Form**: 
  - Connected to backend API
  - Captures user location automatically
  - Validates required fields
  - Shows success/error notifications
  - Resets form after successful submission

- **My Listings Section**:
  - Fetches materials from MongoDB on component mount
  - Displays all materials created by the logged-in provider
  - Shows material status (available/requested/picked)
  - Displays quantity and category
  - Shows empty state when no materials exist

#### User Profile Display
- Both dashboards now display real user data from MongoDB
- Shows user name, organization/college, and role
- Logout functionality connected to auth context

## 📁 Files Created/Modified

### Backend
- `server/src/models/Material.js` - Material MongoDB model
- `server/src/controllers/materialController.js` - Material CRUD operations
- `server/src/routes/materialRoutes.js` - Material API routes
- `server/src/app.js` - Added material routes

### Frontend
- `client/src/lib/api.ts` - Added material API functions
- `client/src/pages/ProviderDashboard.tsx` - Integrated with backend, displays user data
- `client/src/pages/SeekerDashboard.tsx` - Displays user data from MongoDB

## 🔄 Data Flow

### Adding a Material
1. User fills out the "Add Material" form in Provider Dashboard
2. Form captures: title, category, description, quantity, location
3. Frontend sends POST request to `/api/materials` with Firebase token
4. Backend verifies token and gets user from MongoDB
5. Backend creates material document with `providerId` reference
6. Material is saved to MongoDB
7. Frontend refreshes "My Listings" to show new material

### Viewing Materials
1. Provider navigates to "My Listings" tab
2. Frontend sends GET request to `/api/materials/my-materials`
3. Backend verifies token and finds user in MongoDB
4. Backend queries all materials where `providerId` matches user
5. Materials are returned with populated provider information
6. Frontend displays materials in a list

## 🎯 Key Features

### Material Status
- **available**: Material is available for pickup
- **requested**: Material has been requested by a seeker
- **picked**: Material has been picked up

### Location Support
- Materials store geospatial coordinates (longitude, latitude)
- MongoDB 2dsphere index enables location-based queries
- Future: Can find materials within a radius of user's location

### Category Support
- Categories: Chemicals, Glassware, Electronics, Metals, Plastics, Other
- Category filtering available in API (for future seeker browsing)

## 🚀 Usage

### For Providers
1. Log in to Provider Dashboard
2. Click "Add Material" or use the floating action button
3. Fill in material details:
   - Material Name (required)
   - Category (required - select one)
   - Description (optional)
   - Quantity (required)
4. Location is auto-detected from browser
5. Click "Add Material" to save
6. View materials in "My Listings" tab

### For Seekers
- User profile displays name and college from MongoDB
- (Future: Browse available materials)

## 📝 Notes

- Image upload is prepared in the UI but not yet implemented (placeholder shown)
- Location is auto-detected but map preview is a placeholder
- Material deletion and status updates are available via API but not yet in UI
- All API endpoints require Firebase authentication token (except public browse endpoint)

## 🔐 Security

- All material creation/update/delete operations require authentication
- Materials are linked to providers via `providerId`
- Users can only see/modify their own materials
- Firebase ID tokens are verified on each request

## 📊 Database Collections

### Users Collection
Stores user profiles with:
- Name, email, role
- Organization (for providers) or College (for seekers)
- Location coordinates
- Auth provider (email/google)

### Materials Collection
Stores material listings with:
- Title, category, description, quantity
- Images array (for future image uploads)
- Provider reference (ObjectId to User)
- Location coordinates
- Status (available/requested/picked)
- Created timestamp

## 🎨 UI/UX Features

- Loading states while fetching data
- Empty states when no materials exist
- Success/error toast notifications
- Form validation before submission
- Auto-location detection
- Responsive design
- Smooth animations

