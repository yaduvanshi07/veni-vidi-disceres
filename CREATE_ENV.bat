@echo off
echo Creating .env file...
echo.
echo Please enter your configuration values:
echo.

set /p PORT="PORT (default: 3000): "
if "%PORT%"=="" set PORT=3000

set /p MONGODB_URI="MongoDB URI (default: mongodb://localhost:27017/document-assistant): "
if "%MONGODB_URI%"=="" set MONGODB_URI=mongodb://localhost:27017/document-assistant

set /p SESSION_SECRET="SESSION_SECRET (press Enter to generate random): "
if "%SESSION_SECRET%"=="" (
    for /f %%i in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set SESSION_SECRET=%%i
)

set /p GEMINI_API_KEY="GEMINI_API_KEY: "
set /p GEMINI_MODEL_NAME="GEMINI_MODEL_NAME (default: gemini-1.5-flash): "
if "%GEMINI_MODEL_NAME%"=="" set GEMINI_MODEL_NAME=gemini-1.5-flash

(
echo PORT=%PORT%
echo NODE_ENV=development
echo MONGODB_URI=%MONGODB_URI%
echo SESSION_SECRET=%SESSION_SECRET%
echo GEMINI_API_KEY=%GEMINI_API_KEY%
echo GEMINI_MODEL_NAME=%GEMINI_MODEL_NAME%
) > .env

echo.
echo .env file created successfully!
echo.

