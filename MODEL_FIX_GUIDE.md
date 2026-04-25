# Gemini Model Fix Guide

## Problem
The error `models/gemini-1.5-pro is not found` indicates that the model name doesn't match what's available in your API key/region.

## Solution Applied
I've updated the code to:
1. Use a centralized model getter function (`utils/getGeminiModel.js`)
2. Default to `gemini-1.5-flash` (usually more available)
3. Provide easy fallback options

## Quick Fix Options

### Option 1: Use Environment Variable (Recommended)
Add this to your `.env` file:
```env
GEMINI_MODEL_NAME=gemini-1.5-flash
```

Or try:
```env
GEMINI_MODEL_NAME=gemini-pro
```

### Option 2: Check Available Models
The Google Generative AI SDK doesn't always expose a listModels method. However, you can:

1. Check your Google AI Studio: https://makersuite.google.com/app/apikey
2. Look at the available models in the console
3. Common model names:
   - `gemini-1.5-flash` (fastest, most commonly available)
   - `gemini-1.5-pro` (higher quality)
   - `gemini-pro` (older, may still work)
   - `gemini-1.0-pro` (alternative)

### Option 3: Update Package
Make sure you have the latest `@google/generative-ai` package:
```bash
npm install @google/generative-ai@latest
```

## Current Configuration
The code now defaults to `gemini-1.5-flash` which is:
- ✅ Faster
- ✅ More cost-effective
- ✅ Usually available in all regions
- ✅ Good quality for text generation

## Testing
After updating, restart your server:
```bash
npm start
```

Then test the chatbot. If it still fails, try:
1. Check your API key is valid
2. Verify API key has access to Gemini models
3. Try different model names in `.env`

## Model Name Priority
The code tries models in this order:
1. `gemini-1.5-flash` (default)
2. `gemini-1.5-pro`
3. `gemini-pro`
4. `gemini-1.0-pro`

You can override by setting `GEMINI_MODEL_NAME` in `.env`.

