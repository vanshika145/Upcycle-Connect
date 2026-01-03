# MongoDB Connection String Fix

## Your Current Connection String

```
MONGO_URI=mongodb+srv://2023vanshikasomnani_db_user:Vanshi@1234@cluster0.xcualla.mongodb.net/Upcycle-connect?retryWrites=true&w=majority
```

## The Problem

Your password `Vanshi@1234` contains special characters (`@` and `:`) that need to be **URL-encoded** in the connection string. The `@` symbol in your password is conflicting with the `@` that separates credentials from the hostname.

## The Solution

You need to URL-encode the special characters in your password:

| Character | Encoded |
|-----------|---------|
| `@` | `%40` |
| `:` | `%3A` |

### Your Password: `Vanshi@1234`
### Encoded Password: `Vanshi%401234`

## Corrected Connection String

Update your `.env` file with this corrected connection string:

```env
MONGO_URI=mongodb+srv://2023vanshikasomnani_db_user:Vanshi%401234@cluster0.xcualla.mongodb.net/Upcycle-connect?retryWrites=true&w=majority
```

**Key Changes:**
- `Vanshi@1234` → `Vanshi%401234` (the `@` is now encoded as `%40`)

## Quick Reference: URL Encoding

If your password contains other special characters, here's how to encode them:

| Character | Encoded | Example |
|-----------|---------|---------|
| `@` | `%40` | `pass@word` → `pass%40word` |
| `#` | `%23` | `pass#word` → `pass%23word` |
| `$` | `%24` | `pass$word` → `pass%24word` |
| `%` | `%25` | `pass%word` → `pass%25word` |
| `&` | `%26` | `pass&word` → `pass%26word` |
| `+` | `%2B` | `pass+word` → `pass%2Bword` |
| `=` | `%3D` | `pass=word` → `pass%3Dword` |
| `?` | `%3F` | `pass?word` → `pass%3Fword` |
| `:` | `%3A` | `pass:word` → `pass%3Aword` |
| `/` | `%2F` | `pass/word` → `pass%2Fword` |
| ` ` (space) | `%20` | `pass word` → `pass%20word` |

## After Updating

1. Save your `.env` file with the corrected connection string
2. Restart your server:
   ```bash
   npm start
   ```

3. You should see:
   ```
   ✅ MongoDB Connected: cluster0-shard-00-00.xcualla.mongodb.net
   📊 Database: Upcycle-connect
   🚀 Server running on port 5000
   ```

## Alternative: Change Your Password

If you prefer, you can change your MongoDB Atlas password to one without special characters:

1. Go to MongoDB Atlas > **Database Access**
2. Click the **Edit** button next to your user
3. Click **Edit Password**
4. Generate or set a new password without special characters
5. Update your connection string with the new password

## Verification

After fixing the connection string, you can verify it works by:
- Checking server logs for successful connection message
- Testing user registration (users should be saved to MongoDB)
- Viewing users in MongoDB Atlas dashboard

