# Fix .env file
$secret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})

$content = @"
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/document-assistant
SESSION_SECRET=$secret
GEMINI_API_KEY=AIzaSyBltMPVz29HYy6uld8ylZ8B6694UPD-7rM
GEMINI_MODEL_NAME=gemini-1.5-flash
"@

$content | Out-File -FilePath .env -Encoding utf8 -NoNewline

Write-Host "✅ .env file has been fixed!" -ForegroundColor Green
Write-Host "Added GEMINI_MODEL_NAME and generated new SESSION_SECRET"
Write-Host ""
Write-Host "Your .env file now contains:"
Get-Content .env

