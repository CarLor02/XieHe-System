@echo off
chcp 65001 >nul

:: =====================================
:: 停止文件索引服务
:: =====================================

title 停止文件索引服务

echo.
echo ========================================
echo    停止文件索引服务
echo ========================================
echo.

:: 查找并终止 Python 进程（运行 main.py 的）
echo 正在查找服务进程...
echo.

tasklist /FI "IMAGENAME eq python.exe" /FO CSV | findstr "python.exe" >nul
if %errorlevel% equ 0 (
    echo 找到 Python 进程，正在终止...
    
    :: 使用 wmic 查找运行 main.py 的进程
    for /f "tokens=2" %%a in ('wmic process where "name='python.exe' and commandline like '%%main.py%%'" get processid /format:value 2^>nul ^| findstr "ProcessId"') do (
        set "PID=%%a"
        echo 终止进程 PID: !PID!
        taskkill /F /PID !PID! >nul 2>&1
    )
    
    echo [✓] 服务已停止
) else (
    echo [!] 未找到运行中的服务
)

echo.
pause
