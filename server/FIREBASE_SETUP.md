# Firebase Setup Guide for Backend

This guide helps you properly configure Firebase Admin SDK for the backend server.

## Error: "Failed to parse private key"

If you're seeing this error, it means your Firebase private key in the `.env` file is not properly formatted.

## Solution

### Option 1: Using Environment Variables (Recommended)

1. **Get your Firebase service account key:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to **Project Settings** > **Service accounts**
   - Click **Generate new private key**
   - Download the JSON file

2. **Extract values from the JSON file:**
   Open the downloaded JSON file and copy these values:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  ...
}
```

3. **Create/Update `.env` file in the `server` directory:**

```env
# MongoDB Connection String
MONGO_URI=mongodb://localhost:27017/upcycle-connect

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_CLIENT_ID=your-client-id

# Server Configuration
PORT=5000
```

**Important Notes:**
- The `FIREBASE_PRIVATE_KEY` must be wrapped in double quotes `"`
- The newlines in the private key must be escaped as `\n`
- Copy the ENTIRE private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Make sure there are no extra spaces or line breaks

### Option 2: Using JSON File (Alternative)

If you prefer to use the JSON file directly, you can modify `server/src/config/firebase.js` to load from a file:

```javascript
const serviceAccount = require('../path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
```

**⚠️ Security Warning:** Never commit the service account JSON file or `.env` file to version control!

## Common Issues

### Issue 1: "Only 8, 16, 24, or 32 bits supported: 88"
- **Cause:** Private key is not properly formatted or has incorrect newline characters
- **Solution:** Ensure the private key uses `\n` for newlines and is wrapped in quotes

### Issue 2: "Failed to parse private key"
- **Cause:** Private key is missing or malformed
- **Solution:** Double-check that you copied the entire private key from the JSON file

### Issue 3: "Invalid credential"
- **Cause:** Missing required environment variables
- **Solution:** Ensure all Firebase environment variables are set in `.env`

## Verification

After setting up your `.env` file, test the configuration:

```bash
cd server
npm start
```

You should see: `Firebase Admin initialized successfully`

If you see an error, check:
1. All environment variables are set
2. Private key is properly formatted with `\n` for newlines
3. Private key is wrapped in double quotes
4. No extra spaces or characters in the private key

