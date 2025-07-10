@echo off
chcp 65001 >nul
title 五子棋应用 - 一键启动

echo.
echo 🚀 五子棋应用启动脚本
echo ==================================================

:: 检查并停止占用端口的进程
echo 🔍 检查端口占用情况...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000 "') do (
    echo 🔴 停止占用端口 5000 的进程 %%a
    taskkill /PID %%a /F >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 "') do (
    echo 🔴 停止占用端口 3001 的进程 %%a
    taskkill /PID %%a /F >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 "') do (
    echo 🔴 停止占用端口 3000 的进程 %%a
    taskkill /PID %%a /F >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo.
echo 🐍 启动 Python YiXin HTTP 服务...
start "Python YiXin Service" cmd /k "cd /d \"c:\Users\kusut\Desktop\github\gobang_react\YiXin-Wuziqi-API\" && uv run python yixin_http_service.py"

echo ⏳ 等待 Python 服务启动...
timeout /t 8 /nobreak >nul

echo.
echo 🟢 启动 Node.js 后端服务...
start "Node.js Backend" cmd /k "cd /d \"c:\Users\kusut\Desktop\github\gobang_react\server\" && bun run dev"

echo ⏳ 等待后端服务启动...
timeout /t 8 /nobreak >nul

echo.
echo ⚛️ 启动前端开发服务器...
start "React Frontend" cmd /k "cd /d \"c:\Users\kusut\Desktop\github\gobang_react\" && bun run dev"

echo ⏳ 等待前端服务启动...
timeout /t 8 /nobreak >nul

echo.
echo 🎯 初始化 YiXin 引擎...
curl -X POST http://localhost:3001/api/yixin/init >nul 2>&1

echo.
echo 🎉 所有服务启动完成！
echo ==================================================
echo 🐍 Python YiXin HTTP 服务: http://localhost:5000
echo 🟢 Node.js 后端服务:      http://localhost:3001  
echo ⚛️ 前端开发服务器:       http://localhost:3000
echo ==================================================
echo.
echo 📝 使用说明:
echo   - 在浏览器中打开: http://localhost:3000
echo   - 关闭此窗口或按 Ctrl+C 不会停止服务
echo   - 要停止所有服务请运行: stop-all-services.bat
echo.

echo ✅ 启动脚本执行完成！
pause
