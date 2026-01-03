# Cloudinary Image Upload Setup

This guide explains how to set up Cloudinary for image uploads in the UpCycle Connect backend.

## Prerequisites

1. Create a free Cloudinary account at [cloudinary.com](https://cloudinary.com)
2. Get your Cloudinary credentials from the Dashboard

## Setup Steps

### 1. Get Cloudinary Credentials

1. Sign up/login to [Cloudinary Dashboard](https://console.cloudinary.com/)
2. Go to **Dashboard** (you'll see your credentials)
3. Copy the following values:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### 2. Add Environment Variables

Add the following to your `server/.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**Example:**
```env
CLOUDINARY_CLOUD_NAME=my-app
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

### 3. Verify Setup

Start your server:
```bash
npm start
```

You should see:
```
✅ Cloudinary initialized
```

## How It Works

### Upload Flow

1. **Frontend** sends images as `multipart/form-data` with field name `images`
2. **Multer middleware** receives files in memory (no disk writes)
3. **Cloudinary** uploads each image and returns:
   - `secure_url` - HTTPS URL for the image
   - `public_id` - Unique identifier for deletion
4. **MongoDB** stores both URL and publicId for each image

### Image Storage Structure

Images are stored in MongoDB as:
```javascript
images: [
  {
    url: "https://res.cloudinary.com/.../image.jpg",
    publicId: "upcycle-connect/materials/abc123"
  }
]
```

### Features

- ✅ **Multiple Images**: Up to 5 images per material
- ✅ **File Validation**: Only image files (JPEG, PNG, GIF, WebP, SVG)
- ✅ **Size Limit**: Maximum 5MB per file
- ✅ **Auto Optimization**: Cloudinary automatically optimizes images
- ✅ **Secure URLs**: All images use HTTPS
- ✅ **Cleanup**: Images are deleted from Cloudinary when material is deleted

## API Usage

### Create Material with Images

**Endpoint:** `POST /api/materials`

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `title` (string, required)
- `category` (string, required)
- `description` (string, optional)
- `quantity` (string, required)
- `latitude` (number, required)
- `longitude` (number, required)
- `images` (file[], optional, max 5 files)

**Example using curl:**
```bash
curl -X POST http://localhost:5000/api/materials \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Lab Glass Beakers" \
  -F "category=Glassware" \
  -F "description=Set of 10 beakers" \
  -F "quantity=10 pieces" \
  -F "latitude=40.7128" \
  -F "longitude=-74.0060" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

## Error Handling

### Common Errors

1. **Missing Cloudinary credentials**
   - Error: `CLOUDINARY_CLOUD_NAME is required in .env file`
   - Solution: Add credentials to `.env` file

2. **File too large**
   - Error: `File size too large. Maximum size is 5MB per file.`
   - Solution: Compress images before upload

3. **Invalid file type**
   - Error: `Invalid file type. Only image files are allowed`
   - Solution: Use JPEG, PNG, GIF, WebP, or SVG

4. **Too many files**
   - Error: `Too many files. Maximum 5 images allowed.`
   - Solution: Upload 5 or fewer images

## Security Notes

- ✅ Files are stored in memory (no disk writes)
- ✅ Files are validated before upload
- ✅ Only authenticated users can upload
- ✅ Images are stored in Cloudinary (not on server)
- ✅ Secure HTTPS URLs are used
- ✅ Images are automatically cleaned up on material deletion

## Cloudinary Free Tier Limits

- **Storage**: 25 GB
- **Bandwidth**: 25 GB/month
- **Transformations**: 25,000/month

For production, consider upgrading if you exceed these limits.

## Troubleshooting

### Images not uploading

1. Check Cloudinary credentials in `.env`
2. Verify server logs for Cloudinary initialization
3. Check file size (must be < 5MB)
4. Verify file type is an image

### Images not displaying

1. Check that `secure_url` is being stored in MongoDB
2. Verify Cloudinary URLs are accessible
3. Check browser console for CORS errors

### Cleanup issues

- If material deletion fails, images may remain in Cloudinary
- Check server logs for cleanup errors
- Manually delete from Cloudinary dashboard if needed

## Next Steps

- Implement image editing (crop, resize)
- Add image compression before upload
- Implement image caching
- Add image CDN configuration

