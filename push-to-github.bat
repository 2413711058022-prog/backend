@echo off
echo Pushing updated code to GitHub...
cd /d "c:\Users\U Menushaa\Downloads\quiz 1\backend"

echo.
echo Opening GitHub Desktop...
start "" "C:\Users\%USERNAME%\AppData\Local\GitHubDesktop\GitHubDesktop.exe"

echo.
echo ========================================
echo INSTRUCTIONS:
echo ========================================
echo 1. GitHub Desktop should open
echo 2. You'll see "1 changed file" (database.js)
echo 3. Enter commit message: "Add SSL support for Aiven"
echo 4. Click "Commit to main"
echo 5. Click "Push origin"
echo ========================================
pause
