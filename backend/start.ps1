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

# 检查 uv 并按锁文件同步依赖
Write-Host "🔍 检查 uv 与后端依赖..." -ForegroundColor Yellow
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 未找到 uv，请先安装: https://docs.astral.sh/uv/" -ForegroundColor Red
    exit 1
}
uv sync --frozen
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "✅ 依赖检查完成" -ForegroundColor Green
Write-Host ""

# 显示启动信息
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 启动应用..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 访问地址:" -ForegroundColor Yellow
Write-Host "   - API 文档:    http://localhost:8080/api/v1/docs" -ForegroundColor White
Write-Host "   - ReDoc 文档:  http://localhost:8080/api/v1/redoc" -ForegroundColor White
Write-Host "   - 健康检查:    http://localhost:8080/health" -ForegroundColor White
Write-Host "   - 根路径:      http://localhost:8080/" -ForegroundColor White
Write-Host ""
Write-Host "⚙️  配置信息:" -ForegroundColor Yellow
Write-Host "   - 环境: backend/.venv (uv)" -ForegroundColor White
Write-Host "   - 端口: 8080" -ForegroundColor White
Write-Host "   - 热重载: 启用" -ForegroundColor White
Write-Host ""
Write-Host "💡 提示: 按 Ctrl+C 停止服务器" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 启动应用
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
