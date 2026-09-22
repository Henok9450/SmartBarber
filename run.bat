@echo off
title SmartBarber Ethiopia - POS & Management System
color 0A
echo ========================================================
echo    💈 SmartBarber ET - Barbershop Management System 💈
echo       Built for Ethiopian Barbershops & Salons
echo ========================================================
echo.
echo Starting SmartBarber Server on http://localhost:5000 ...
echo.

cd /d "%~dp0"
start "" http://localhost:5000
node server/src/index.js

pause
