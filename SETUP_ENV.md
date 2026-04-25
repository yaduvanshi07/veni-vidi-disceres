# Environment Setup Guide

## Step 1: Create .env File

Create a file named `.env` in the root directory of your project (same folder as `package.json`).

## Step 2: Copy This Template

Copy the following content into your `.env` file and fill in your actual values:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/document-assistant

# Session Secret (IMPORTANT: Change this to a random string!)
SESSION_SECRET=change-this-to-a-random-secret-key-minimum-32-characters-long

# Google Gemini API Configuration
GEMINI_API_KEY=your-actual-gemini-api-key-here
GEMINI_MODEL_NAME=gemini-1.5-flash
```

## Step 3: Fill In Your Values

### 1. MongoDB URI
- **Local MongoDB**: `mongodb://localhost:27017/document-assistant`
- **MongoDB Atlas**: `mongodb+srv://username:password@cluster.mongodb.net/document-assistant`

### 2. Session Secret
Generate a random string (at least 32 characters). You can use:
- Online generator: https://randomkeygen.com/
- Or run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 3. Gemini API Key
1. Go to: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it in `.env`

### 4. Model Name (Optional)
- `gemini-1.5-flash` - Fastest, recommended (default)
- `gemini-1.5-pro` - Higher quality
- `gemini-pro` - Older version

## Example .env File

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/document-assistant
SESSION_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
GEMINI_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456789
GEMINI_MODEL_NAME=gemini-1.5-flash
```

## Important Notes

1. **Never commit .env to git** - It's already in .gitignore
2. **Change SESSION_SECRET** - Use a strong random string
3. **Keep API keys secure** - Don't share them publicly
4. **Restart server** after changing .env file

## Verify Setup

After creating your `.env` file, restart your server:
```bash
npm start
```

If you see "Connected to MongoDB" and no errors, your setup is correct!


