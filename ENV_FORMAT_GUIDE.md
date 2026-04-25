# .env File Format Guide

## Correct Format

Your `.env` file should look exactly like this (with your actual values):

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/document-assistant
SESSION_SECRET=your-secret-key-here-minimum-32-characters-long
GEMINI_API_KEY=your-actual-api-key-here
GEMINI_MODEL_NAME=gemini-1.5-flash
```

## Common Mistakes to Avoid

### ❌ Wrong Format:
```env
PORT = 3000                    # ❌ Spaces around =
PORT="3000"                    # ❌ Quotes (usually not needed)
PORT: 3000                     # ❌ Using colon instead of =
GEMINI_API_KEY='your-key'      # ❌ Quotes around values
```

### ✅ Correct Format:
```env
PORT=3000                      # ✅ No spaces, no quotes
GEMINI_API_KEY=your-key        # ✅ No quotes needed
```

## Step-by-Step to Fix Your .env

1. **Open your .env file** (create it if it doesn't exist)

2. **Make sure each line follows this format:**
   ```
   VARIABLE_NAME=value
   ```
   - No spaces before or after `=`
   - No quotes (unless the value itself contains spaces)
   - One variable per line

3. **Required Variables:**
   - `PORT` - Server port (usually 3000)
   - `MONGODB_URI` - Your MongoDB connection string
   - `SESSION_SECRET` - Random secret key (32+ characters)
   - `GEMINI_API_KEY` - Your Gemini API key
   - `GEMINI_MODEL_NAME` - Model name (gemini-1.5-flash recommended)

4. **Save the file** (make sure it's named `.env` not `.env.txt`)

5. **Restart your server** after making changes

## Quick Fix Script

If you're on Windows, you can run:
```bash
CREATE_ENV.bat
```

Or manually create the file with this exact content (replace with your values):

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/document-assistant
SESSION_SECRET=73187655bc7f83b73d902063aba8509a8fb3818211173f926999373a3567a812
GEMINI_API_KEY=YOUR_ACTUAL_API_KEY_HERE
GEMINI_MODEL_NAME=gemini-1.5-flash
```

## Verify Your .env File

After creating/editing, check:
- [ ] File is named `.env` (not `.env.txt`)
- [ ] No spaces around `=` signs
- [ ] Each variable on its own line
- [ ] No extra blank lines with spaces
- [ ] All values filled in (especially GEMINI_API_KEY)

## Test Your Configuration

After fixing your .env file, restart the server:
```bash
npm start
```

You should see:
- ✅ "Connected to MongoDB"
- ✅ "Server running on http://localhost:3000"
- ✅ No errors about missing environment variables

