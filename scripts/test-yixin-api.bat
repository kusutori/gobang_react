@echo off
echo 🎯 测试弈心引擎API连接...
echo.

echo 📡 1. 测试服务器连接...
curl -s http://localhost:3001/api/yixin/test
echo.
echo.

echo 🔧 2. 初始化弈心引擎...
curl -s -X POST http://localhost:3001/api/yixin/init
echo.
echo.

echo 📊 3. 检查引擎状态...
curl -s http://localhost:3001/api/yixin/status
echo.
echo.

echo 🎮 4. 测试AI落子...
curl -s -X POST http://localhost:3001/api/yixin/move -H "Content-Type: application/json" -d "{\"moves\":[]}"
echo.
echo.

echo ✅ 弈心引擎API测试完成！
echo 如果以上所有测试都返回success:true，说明弈心引擎正常工作。
pause
