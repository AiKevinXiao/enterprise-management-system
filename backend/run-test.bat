@echo off
chcp 65001 >nul
cd /d "E:\ems-backend"
call npm install
echo RUNNING_TESTS
call npx jest --verbose --forceExit --detectOpenHandles
