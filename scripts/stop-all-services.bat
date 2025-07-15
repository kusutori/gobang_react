@echo off
chcp 65001 >nul
title 五子棋应用 - 停止所有服务

echo.
echo 🛑 停止五子棋应用所有服务
echo ==================================================

echo 🔍 查找并停止相关进程...

:: 停止占用端口 5000 的进程 (Python YiXin Service)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000 "') do (
    echo 🔴 停止 Python YiXin 服务 (PID: %%a)
    taskkill /PID %%a /F >nul 2>&1
)

:: 停止占用端口 3001 的进程 (Node.js Backend)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 "') do (
    echo 🔴 停止 Node.js 后端服务 (PID: %%a)
    taskkill /PID %%a /F >nul 2>&1
)

:: 停止占用端口 3000 的进程 (React Frontend)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 "') do (
    echo 🔴 停止前端开发服务器 (PID: %%a)
    taskkill /PID %%a /F >nul 2>&1
)

:: 强制停止相关的 cmd 窗口
taskkill /FI "WINDOWTITLE eq Python YiXin Service*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Node.js Backend*" /F >nul 2>&1  
taskkill /FI "WINDOWTITLE eq React Frontend*" /F >nul 2>&1

echo.
echo ✅ 所有服务已停止
echo ==================================================
echo.

pause
