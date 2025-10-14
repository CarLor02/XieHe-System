# XieHe 医疗影像诊断系统 - 启动脚本
# 用于 Windows PowerShell

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  XieHe 医疗影像诊断系统" -ForegroundColor Green
Write-Host "  Medical Imaging Diagnosis System" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在 backend 目录
if (-not (Test-Path "app/main.py")) {
    Write-Host "❌ 错误: 请在 backend 目录下运行此脚本" -ForegroundColor Red
    Write-Host ""
    Write-Host "正确的运行方式:" -ForegroundColor Yellow
    Write-Host "  cd backend" -ForegroundColor White
    Write-Host "  .\start.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ 当前目录正确" -ForegroundColor Green
Write-Host ""

# 激活 conda 环境
Write-Host "📦 激活 conda 环境: xiehe" -ForegroundColor Yellow
$env:CONDA_DEFAULT_ENV = "xiehe"

# 检查 uvicorn 是否安装
Write-Host "🔍 检查依赖..." -ForegroundColor Yellow
$uvicornCheck = & conda run -n xiehe python -c "import uvicorn; print('ok')" 2>&1
if ($uvicornCheck -notmatch "ok") {
    Write-Host "❌ uvicorn 未安装，正在安装..." -ForegroundColor Red
    conda run -n xiehe pip install uvicorn
}

Write-Host "✅ 依赖检查完成" -ForegroundColor Green
Write-Host ""

# 显示启动信息
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 启动应用..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 访问地址:" -ForegroundColor Yellow
Write-Host "   - API 文档:    http://localhost:8000/api/v1/docs" -ForegroundColor White
Write-Host "   - ReDoc 文档:  http://localhost:8000/api/v1/redoc" -ForegroundColor White
Write-Host "   - 健康检查:    http://localhost:8000/health" -ForegroundColor White
Write-Host "   - 根路径:      http://localhost:8000/" -ForegroundColor White
Write-Host ""
Write-Host "⚙️  配置信息:" -ForegroundColor Yellow
Write-Host "   - 环境: xiehe" -ForegroundColor White
Write-Host "   - 端口: 8000" -ForegroundColor White
Write-Host "   - 热重载: 启用" -ForegroundColor White
Write-Host ""
Write-Host "💡 提示: 按 Ctrl+C 停止服务器" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 启动应用
conda run -n xiehe uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

