# MongoDB Atlas Setup Guide

This guide helps you configure MongoDB Atlas for the UpCycle Connect backend.

## What is MongoDB Atlas?

MongoDB Atlas is a cloud-hosted MongoDB service. All user login details and profiles are stored in your MongoDB Atlas database.

## Setup Steps

### 1. Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account (or log in if you already have one)
3. Create a new project (or use an existing one)

### 2. Create a Cluster

1. Click **"Build a Database"** or **"Create"** > **"Database"**
2. Choose **FREE (M0)** tier (perfect for development)
3. Select a cloud provider and region (choose one closest to you)
4. Click **"Create"** (cluster name is optional)

### 3. Create Database User

1. Go to **Database Access** (left sidebar)
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Enter a username and generate a secure password
5. **Save the password** - you'll need it for the connection string
6. Set user privileges to **"Atlas admin"** (or "Read and write to any database")
7. Click **"Add User"**

### 4. Whitelist Your IP Address

1. Go to **Network Access** (left sidebar)
2. Click **"Add IP Address"**
3. For development, click **"Add Current IP Address"**
4. Or click **"Allow Access from Anywhere"** (0.0.0.0/0) - **⚠️ Only for development!**
5. Click **"Confirm"**

### 5. Get Your Connection String

1. Go to **Database** (left sidebar)
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Select **"Node.js"** as the driver
5. Copy the connection string (it looks like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 6. Update Your .env File

In your `server/.env` file, update the `MONGO_URI`:

```env
# MongoDB Atlas Connection String
# Replace <username> and <password> with your database user credentials
# Replace <dbname> with your database name (e.g., upcycle-connect)
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority

# Example:
# MONGO_URI=mongodb+srv://admin:MySecurePassword123@cluster0.abc123.mongodb.net/upcycle-connect?retryWrites=true&w=majority
```

**Important:**
- Replace `<username>` with your database username
- Replace `<password>` with your database password (URL-encode special characters if needed)
- Replace `<dbname>` with your database name (e.g., `upcycle-connect`)
- Keep the rest of the connection string as-is

### 7. URL Encoding Special Characters

If your password contains special characters, you need to URL-encode them:

| Character | Encoded |
|-----------|---------|
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |
| `+` | `%2B` |
| `=` | `%3D` |
| `?` | `%3F` |

**Example:**
- Password: `MyP@ss#123`
- Encoded: `MyP%40ss%23123`
- Connection string: `mongodb+srv://admin:MyP%40ss%23123@cluster0.xxxxx.mongodb.net/upcycle-connect?retryWrites=true&w=majority`

## What Gets Stored in MongoDB?

When users sign up or log in, the following information is stored in MongoDB:

- **User Profile:**
  - Name
  - Email (unique)
  - Role (provider/seeker/admin)
  - Auth Provider (email/google)
  - Organization (for providers)
  - College (for seekers)
  - Location (latitude/longitude)
  - Created Date

- **Authentication:**
  - Firebase handles authentication (passwords are NOT stored in MongoDB)
  - MongoDB stores user profile data only
  - Firebase ID tokens are used for API authentication

## Verify Connection

After setting up your `.env` file, start your server:

```bash
cd server
npm start
```

You should see:
```
✅ MongoDB Connected: cluster0-shard-00-00.xxxxx.mongodb.net
📊 Database: upcycle-connect
🚀 Server running on port 5000
```

## Troubleshooting

### Error: "authentication failed"
- **Cause:** Wrong username or password
- **Solution:** Double-check your database user credentials in MongoDB Atlas

### Error: "ENOTFOUND" or "getaddrinfo"
- **Cause:** Network issue or wrong connection string
- **Solution:** 
  - Verify your connection string is correct
  - Check your internet connection
  - Ensure your IP is whitelisted in Network Access

### Error: "timeout"
- **Cause:** IP address not whitelisted or network issue
- **Solution:** 
  - Go to Network Access in MongoDB Atlas
  - Add your current IP address
  - Or temporarily allow access from anywhere (0.0.0.0/0) for testing

### Error: "MongoServerError: bad auth"
- **Cause:** Database user doesn't have proper permissions
- **Solution:** 
  - Go to Database Access
  - Edit your user
  - Set privileges to "Atlas admin" or "Read and write to any database"

## Security Best Practices

1. **Never commit your `.env` file** to version control
2. **Use strong passwords** for your database user
3. **Restrict IP access** - only allow your server's IP in production
4. **Use environment variables** - never hardcode connection strings
5. **Rotate passwords** regularly in production

## Testing User Storage

After a user signs up, you can verify they're stored in MongoDB:

1. Go to MongoDB Atlas > **Database** > **Browse Collections**
2. You should see a `users` collection
3. Click on it to see all registered users
4. Each user document contains their profile information

## Next Steps

Once MongoDB Atlas is configured:
1. ✅ Users will be automatically saved when they sign up
2. ✅ User profiles will be retrieved on login
3. ✅ All user data is stored securely in the cloud
4. ✅ You can view/manage users in MongoDB Atlas dashboard

