@echo off
chcp 65001 >nul
title 五子棋应用 - 服务状态检查

echo.
echo 🔍 五子棋应用服务状态检查
echo ==================================================

echo 📡 检查 Python YiXin HTTP 服务 (端口 5000)...
curl -s http://localhost:5000/test 2>nul
if %errorlevel% equ 0 (
    echo ✅ Python YiXin HTTP 服务正常运行
) else (
    echo ❌ Python YiXin HTTP 服务未运行
)

echo.
echo 📡 检查 Node.js 后端服务 (端口 3001)...
curl -s http://localhost:3001/api/yixin/test 2>nul
if %errorlevel% equ 0 (
    echo ✅ Node.js 后端服务正常运行
) else (
    echo ❌ Node.js 后端服务未运行
)

echo.
echo 📡 检查前端开发服务器 (端口 3000)...
curl -s http://localhost:3000 2>nul
if %errorlevel% equ 0 (
    echo ✅ 前端开发服务器正常运行
) else (
    echo ❌ 前端开发服务器未运行
)

echo.
echo 🎯 检查 YiXin 引擎状态...
curl -s http://localhost:3001/api/yixin/status 2>nul
if %errorlevel% equ 0 (
    echo ✅ YiXin 引擎状态正常
) else (
    echo ❌ YiXin 引擎状态异常
)

echo.
echo ==================================================
echo 📝 如果有服务未运行，请执行:
echo   - 启动所有服务: start-all-services.bat
echo   - 或使用 PowerShell: .\start-all-services.ps1
echo ==================================================
echo.

pause
