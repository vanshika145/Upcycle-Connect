# Frontend-Backend Image Upload Integration

## ✅ Integration Complete

The frontend and backend are now properly integrated for image uploads.

## 🔄 What Changed

### Frontend Updates

1. **API Client (`client/src/lib/api.ts`)**
   - Updated `Material` interface to use `MaterialImage[]` (objects with `url` and `publicId`)
   - Updated `CreateMaterialData` to accept `File[]` instead of `string[]`
   - Modified `materialAPI.create()` to send `FormData` instead of JSON
   - Sends `multipart/form-data` with image files

2. **Provider Dashboard (`client/src/pages/ProviderDashboard.tsx`)**
   - Added file input handling
   - Added image preview functionality
   - Added image removal capability
   - Validates file types and sizes (max 5MB, max 5 images)
   - Updated image display to handle new format

### Backend Updates

1. **Material Model** - Stores images as `{url, publicId}` objects
2. **Upload Middleware** - Handles multipart/form-data with multer
3. **Material Controller** - Uploads to Cloudinary and stores URLs

## 📤 Upload Flow

```
User selects images in frontend
    ↓
Files stored in state (selectedImages)
    ↓
Form submission creates FormData
    ↓
POST /api/materials with multipart/form-data
    ↓
Multer processes files in memory
    ↓
Backend uploads to Cloudinary
    ↓
Cloudinary returns URLs + publicIds
    ↓
MongoDB stores image data
    ↓
Response sent back to frontend
```

## 🎯 How to Use

### For Users

1. Go to "Add Material" tab
2. Fill in material details
3. Click on the image upload area or drag & drop images
4. Select up to 5 images (max 5MB each)
5. Preview images before submitting
6. Remove images by clicking the × button
7. Submit the form

### Features

- ✅ **File Validation**: Only image files accepted
- ✅ **Size Limit**: 5MB per file
- ✅ **Count Limit**: Maximum 5 images
- ✅ **Image Preview**: See images before upload
- ✅ **Remove Images**: Remove selected images before upload
- ✅ **Progress Feedback**: Loading states and error messages

## 🔧 Technical Details

### Request Format

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `title` (string)
- `category` (string)
- `description` (string, optional)
- `quantity` (string)
- `latitude` (number)
- `longitude` (number)
- `images` (File[], optional, max 5)

### Response Format

```json
{
  "message": "Material created successfully",
  "material": {
    "id": "...",
    "title": "...",
    "images": [
      {
        "url": "https://res.cloudinary.com/.../image.jpg",
        "publicId": "upcycle-connect/materials/abc123"
      }
    ],
    ...
  }
}
```

## 🐛 Troubleshooting

### Images not uploading

1. **Check Cloudinary credentials** in `server/.env`
2. **Check file size** - must be < 5MB
3. **Check file type** - must be an image (JPEG, PNG, GIF, WebP, SVG)
4. **Check browser console** for errors
5. **Check server logs** for upload errors

### Common Errors

- **"Maximum 5 images allowed"** - Select 5 or fewer images
- **"File too large"** - Compress images before upload
- **"Invalid file type"** - Use image files only
- **"Authentication required"** - Make sure you're logged in

## ✅ Testing Checklist

- [ ] Can select multiple images
- [ ] Images show preview
- [ ] Can remove images before upload
- [ ] File validation works (type and size)
- [ ] Upload succeeds with images
- [ ] Images appear in "My Listings"
- [ ] Images display correctly in listings

## 📝 Notes

- Images are uploaded to Cloudinary (cloud storage)
- URLs are stored in MongoDB
- Images are automatically optimized by Cloudinary
- Images are deleted from Cloudinary when material is deleted
- Old format (string[]) is still supported for backward compatibility

