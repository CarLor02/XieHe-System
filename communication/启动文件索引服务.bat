@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: =====================================
:: 文件索引服务启动脚本 (Windows)
:: 自动检测 Python、启动服务、打开配置界面
:: =====================================

title 文件索引服务启动器

echo.
echo ========================================
echo    文件索引服务 - 启动中...
echo ========================================
echo.

:: 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
set "SERVICE_DIR=%SCRIPT_DIR%file_index_service"

:: 检查服务目录是否存在
if not exist "%SERVICE_DIR%" (
    echo [错误] 未找到服务目录: %SERVICE_DIR%
    echo.
    pause
    exit /b 1
)

cd /d "%SERVICE_DIR%"

:: 检测网卡 IP（优先选择 192.168.189.x）
echo [1/5] 检测网络地址...
set "SERVICE_IP=127.0.0.1"

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
    set "temp_ip=%%a"
    set "temp_ip=!temp_ip:~1!"
    echo     发现 IP: !temp_ip!
    
    :: 优先使用 192.168.189.x
    echo !temp_ip! | findstr /C:"192.168.189." >nul
    if !errorlevel! equ 0 (
        set "SERVICE_IP=!temp_ip!"
        echo     → 选择: !SERVICE_IP! (匹配目标网段)
        goto :ip_found
    )
    
    :: 否则使用第一个非 127.0.0.1 的 IP
    if "!SERVICE_IP!"=="127.0.0.1" (
        echo !temp_ip! | findstr /C:"127.0.0.1" >nul
        if !errorlevel! neq 0 (
            set "SERVICE_IP=!temp_ip!"
        )
    )
)

:ip_found
echo [✓] 服务地址: http://!SERVICE_IP!:9000
echo.

:: 检查 Python
echo [2/5] 检查 Python 环境...

set "PYTHON_CMD="

:: 优先尝试 conda 环境 (dp)
where conda >nul 2>&1
if !errorlevel! equ 0 (
    echo     尝试激活 conda 环境: dp
    call conda activate dp 2>nul
    if !errorlevel! equ 0 (
        set "PYTHON_CMD=python"
        echo [✓] 使用 conda 环境: dp
        goto :python_found
    )
)

:: 尝试 python3
where python3 >nul 2>&1
if !errorlevel! equ 0 (
    set "PYTHON_CMD=python3"
    echo [✓] 使用: python3
    goto :python_found
)

:: 尝试 python
where python >nul 2>&1
if !errorlevel! equ 0 (
    set "PYTHON_CMD=python"
    echo [✓] 使用: python
    goto :python_found
)

:: 未找到 Python
echo [✗] 未找到 Python 环境
echo.
echo 请安装 Python 3.8+ 或配置 conda 环境
echo.
pause
exit /b 1

:python_found
echo.

:: 检查依赖
echo [3/5] 检查依赖包...
%PYTHON_CMD% -c "import fastapi, uvicorn, sqlalchemy, pydicom" 2>nul
if !errorlevel! neq 0 (
    echo [!] 缺少依赖，尝试安装...
    if exist requirements.txt (
        %PYTHON_CMD% -m pip install -r requirements.txt
    ) else (
        echo [✗] 未找到 requirements.txt
        pause
        exit /b 1
    )
)
echo [✓] 依赖检查完成
echo.

:: 检查 .env 文件
echo [4/5] 检查配置文件...
if not exist ".env" (
    echo [!] 未找到 .env 文件，创建默认配置...
    (
        echo WATCH_PATH=./data
        echo SCAN_INTERVAL=300
        echo DB_PATH=./file_index.db
        echo LOG_LEVEL=INFO
        echo API_KEY=
        echo HOST=0.0.0.0
        echo PORT=9000
        echo MONTH_FOLDER_PATTERN=^IMG\d{4}$
        echo PRIMARY_EXTENSIONS=.dcm,.dicom
    ) > .env
    echo [✓] 已创建默认 .env 文件
) else (
    echo [✓] 配置文件已存在
)
echo.

:: 启动服务
echo [5/5] 启动服务...
echo.
echo ----------------------------------------
echo 服务启动中，请勿关闭此窗口
echo 按 Ctrl+C 可停止服务
echo ----------------------------------------
echo.

:: 等待 2 秒后打开浏览器
start "" /b timeout /t 2 /nobreak >nul && start "" "http://!SERVICE_IP!:9000/health" && start "" "%SCRIPT_DIR%config_manager.html"

:: 启动 Python 服务
%PYTHON_CMD% main.py

pause
