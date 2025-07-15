@echo off
echo 🎯 启动弈心五子棋服务器...
echo.

echo 📁 切换到服务器目录...
cd /d "%~dp0server"

echo 🔧 启动服务器...
bun run dev

pause
