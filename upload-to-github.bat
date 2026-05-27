@echo off
echo ========================================
echo Uploading Backend to GitHub
echo ========================================

cd /d "c:\Users\U Menushaa\Downloads\quiz 1\backend"

echo.
echo Step 1: Installing Git...
winget install --id Git.Git -e --source winget

echo.
echo Step 2: Initializing Git repository...
git init

echo.
echo Step 3: Adding all files...
git add .

echo.
echo Step 4: Creating first commit...
git commit -m "Initial commit"

echo.
echo Step 5: Setting main branch...
git branch -M main

echo.
echo Step 6: Adding remote repository...
git remote add origin https://github.com/241371105802-prog/govexam-backend.git

echo.
echo Step 7: Pushing to GitHub...
git push -u origin main

echo.
echo ========================================
echo Done! Your code is on GitHub!
echo ========================================
pause
