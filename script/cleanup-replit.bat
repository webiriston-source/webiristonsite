@echo off
REM Removes common Replit/IDE artifacts from the repository.

cd /d %~dp0\..

rmdir /s /q .local 2>nul
rmdir /s /q node_modules 2>nul
rmdir /s /q dist 2>nul
rmdir /s /q build 2>nul
rmdir /s /q out 2>nul
rmdir /s /q .vercel 2>nul
rmdir /s /q attached_assets 2>nul

echo Cleanup complete.
