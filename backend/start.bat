@echo off
chcp 65001 >nul
cd /d "E:\ems-backend"
del /q data\ems.db 2>nul
echo Starting server...
node app.js
