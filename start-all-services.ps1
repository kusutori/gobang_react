# 五子棋应用一键启动脚本
# 启动所有必要的服务：Python YiXin HTTP 服务、Node.js 后端、前端开发服务器

param(
    [switch]$StopAll,
    [switch]$RestartAll
)

# 颜色输出函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# 检查端口是否被占用
function Test-Port {
    param([int]$Port)
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
        return $connection.TcpTestSucceeded
    } catch {
        return $false
    }
}

# 杀死占用指定端口的进程
function Stop-PortProcess {
    param([int]$Port)
    try {
        $processes = netstat -ano | findstr ":$Port "
        if ($processes) {
            $processes | ForEach-Object {
                $parts = $_ -split '\s+' | Where-Object { $_ -ne '' }
                if ($parts.Length -ge 5) {
                    $pid = $parts[4]
                    if ($pid -match '^\d+$') {
                        Write-ColorOutput "🔴 停止占用端口 $Port 的进程 (PID: $pid)" "Yellow"
                        taskkill /PID $pid /F 2>$null
                    }
                }
            }
        }
    } catch {
        Write-ColorOutput "⚠️  无法停止端口 $Port 的进程: $_" "Red"
    }
}

# 停止所有服务
function Stop-AllServices {
    Write-ColorOutput "🛑 停止所有服务..." "Red"
    
    # 停止各个端口的服务
    Stop-PortProcess 5000  # Python YiXin HTTP 服务
    Stop-PortProcess 3001  # Node.js 后端
    Stop-PortProcess 3000  # 前端开发服务器
    
    Write-ColorOutput "✅ 所有服务已停止" "Green"
}

# 启动 Python YiXin HTTP 服务
function Start-PythonService {
    Write-ColorOutput "🐍 启动 Python YiXin HTTP 服务..." "Cyan"
    
    $pythonDir = "c:\Users\kusut\Desktop\github\gobang_react\YiXin-Wuziqi-API"
    
    if (-not (Test-Path $pythonDir)) {
        Write-ColorOutput "❌ Python 服务目录不存在: $pythonDir" "Red"
        return $false
    }
    
    if (Test-Port 5000) {
        Write-ColorOutput "⚠️  端口 5000 已被占用，停止现有进程..." "Yellow"
        Stop-PortProcess 5000
        Start-Sleep 2
    }
    
    try {
        # 启动 Python 服务
        $pythonJob = Start-Job -ScriptBlock {
            param($dir)
            Set-Location $dir
            uv run python yixin_http_service.py
        } -ArgumentList $pythonDir
        
        # 等待服务启动
        Start-Sleep 5
        
        # 检查服务是否启动成功
        $testResult = try {
            Invoke-RestMethod -Uri "http://localhost:5000/test" -TimeoutSec 5
            $true
        } catch {
            $false
        }
        
        if ($testResult) {
            Write-ColorOutput "✅ Python YiXin HTTP 服务启动成功 (端口: 5000)" "Green"
            return $pythonJob
        } else {
            Write-ColorOutput "❌ Python YiXin HTTP 服务启动失败" "Red"
            Stop-Job $pythonJob -ErrorAction SilentlyContinue
            Remove-Job $pythonJob -ErrorAction SilentlyContinue
            return $false
        }
    } catch {
        Write-ColorOutput "❌ 启动 Python 服务时出错: $_" "Red"
        return $false
    }
}

# 启动 Node.js 后端服务
function Start-NodeBackend {
    Write-ColorOutput "🟢 启动 Node.js 后端服务..." "Cyan"
    
    $backendDir = "c:\Users\kusut\Desktop\github\gobang_react\server"
    
    if (-not (Test-Path $backendDir)) {
        Write-ColorOutput "❌ 后端服务目录不存在: $backendDir" "Red"
        return $false
    }
    
    if (Test-Port 3001) {
        Write-ColorOutput "⚠️  端口 3001 已被占用，停止现有进程..." "Yellow"
        Stop-PortProcess 3001
        Start-Sleep 2
    }
    
    try {
        # 启动后端服务
        $backendJob = Start-Job -ScriptBlock {
            param($dir)
            Set-Location $dir
            bun run dev
        } -ArgumentList $backendDir
        
        # 等待服务启动
        Start-Sleep 5
        
        # 检查服务是否启动成功
        $testResult = try {
            Invoke-RestMethod -Uri "http://localhost:3001/api/yixin/test" -TimeoutSec 5
            $true
        } catch {
            $false
        }
        
        if ($testResult) {
            Write-ColorOutput "✅ Node.js 后端服务启动成功 (端口: 3001)" "Green"
            return $backendJob
        } else {
            Write-ColorOutput "❌ Node.js 后端服务启动失败" "Red"
            Stop-Job $backendJob -ErrorAction SilentlyContinue
            Remove-Job $backendJob -ErrorAction SilentlyContinue
            return $false
        }
    } catch {
        Write-ColorOutput "❌ 启动 Node.js 后端服务时出错: $_" "Red"
        return $false
    }
}

# 启动前端开发服务器
function Start-Frontend {
    Write-ColorOutput "⚛️  启动前端开发服务器..." "Cyan"
    
    $frontendDir = "c:\Users\kusut\Desktop\github\gobang_react"
    
    if (-not (Test-Path $frontendDir)) {
        Write-ColorOutput "❌ 前端服务目录不存在: $frontendDir" "Red"
        return $false
    }
    
    if (Test-Port 3000) {
        Write-ColorOutput "⚠️  端口 3000 已被占用，停止现有进程..." "Yellow"
        Stop-PortProcess 3000
        Start-Sleep 2
    }
    
    try {
        # 启动前端服务
        $frontendJob = Start-Job -ScriptBlock {
            param($dir)
            Set-Location $dir
            bun run dev
        } -ArgumentList $frontendDir
        
        # 等待服务启动
        Start-Sleep 5
        
        # 检查服务是否启动成功
        if (Test-Port 3000) {
            Write-ColorOutput "✅ 前端开发服务器启动成功 (端口: 3000)" "Green"
            return $frontendJob
        } else {
            Write-ColorOutput "❌ 前端开发服务器启动失败" "Red"
            Stop-Job $frontendJob -ErrorAction SilentlyContinue
            Remove-Job $frontendJob -ErrorAction SilentlyContinue
            return $false
        }
    } catch {
        Write-ColorOutput "❌ 启动前端服务时出错: $_" "Red"
        return $false
    }
}

# 主逻辑
if ($StopAll) {
    Stop-AllServices
    exit 0
}

if ($RestartAll) {
    Stop-AllServices
    Start-Sleep 3
}

Write-ColorOutput "🚀 五子棋应用启动脚本" "Magenta"
Write-ColorOutput "=" * 50 "Magenta"

# 启动所有服务
$pythonJob = Start-PythonService
if (-not $pythonJob) {
    Write-ColorOutput "❌ Python 服务启动失败，终止启动流程" "Red"
    exit 1
}

$backendJob = Start-NodeBackend
if (-not $backendJob) {
    Write-ColorOutput "❌ 后端服务启动失败，停止 Python 服务" "Red"
    Stop-Job $pythonJob -ErrorAction SilentlyContinue
    Remove-Job $pythonJob -ErrorAction SilentlyContinue
    exit 1
}

$frontendJob = Start-Frontend
if (-not $frontendJob) {
    Write-ColorOutput "❌ 前端服务启动失败，停止所有服务" "Red"
    Stop-Job $pythonJob -ErrorAction SilentlyContinue
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $pythonJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    exit 1
}

Write-ColorOutput "" "White"
Write-ColorOutput "🎉 所有服务启动成功！" "Green"
Write-ColorOutput "=" * 50 "Green"
Write-ColorOutput "🐍 Python YiXin HTTP 服务: http://localhost:5000" "Cyan"
Write-ColorOutput "🟢 Node.js 后端服务:      http://localhost:3001" "Cyan"
Write-ColorOutput "⚛️  前端开发服务器:       http://localhost:3000" "Cyan"
Write-ColorOutput "=" * 50 "Green"
Write-ColorOutput ""

# 初始化 YiXin 引擎
Write-ColorOutput "🎯 初始化 YiXin 引擎..." "Yellow"
try {
    Start-Sleep 2
    $initResult = Invoke-RestMethod -Uri "http://localhost:3001/api/yixin/init" -Method POST -TimeoutSec 10
    if ($initResult.success) {
        Write-ColorOutput "✅ YiXin 引擎初始化成功！" "Green"
    } else {
        Write-ColorOutput "⚠️  YiXin 引擎初始化失败: $($initResult.error)" "Yellow"
    }
} catch {
    Write-ColorOutput "⚠️  无法初始化 YiXin 引擎: $_" "Yellow"
}

Write-ColorOutput ""
Write-ColorOutput "📝 使用说明:" "White"
Write-ColorOutput "  - 在浏览器中打开: http://localhost:3000" "Gray"
Write-ColorOutput "  - 按 Ctrl+C 停止所有服务" "Gray"
Write-ColorOutput "  - 或运行: .\start-all-services.ps1 -StopAll" "Gray"
Write-ColorOutput ""

# 保持脚本运行，直到用户按 Ctrl+C
try {
    Write-ColorOutput "⏳ 服务正在运行中... (按 Ctrl+C 停止)" "White"
    while ($true) {
        Start-Sleep 5
        
        # 检查作业状态
        if ($pythonJob.State -eq "Failed" -or $backendJob.State -eq "Failed" -or $frontendJob.State -eq "Failed") {
            Write-ColorOutput "❌ 检测到服务异常，停止所有服务" "Red"
            break
        }
    }
} catch {
    Write-ColorOutput "🛑 收到停止信号，正在关闭所有服务..." "Yellow"
} finally {
    # 清理所有作业
    Stop-Job $pythonJob, $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $pythonJob, $backendJob, $frontendJob -ErrorAction SilentlyContinue
    
    # 停止所有端口的进程
    Stop-AllServices
    
    Write-ColorOutput "👋 所有服务已停止，再见！" "Green"
}
