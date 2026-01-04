#!/bin/bash

################################################################################
# 安全检查和清理脚本
# 用于检测和清理加密货币挖矿恶意软件
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}================================${NC}"
echo -e "${RED}  恶意软件检测和清理工具${NC}"
echo -e "${RED}================================${NC}"
echo ""

# 1. 停止所有 Docker 容器
echo -e "${YELLOW}[1/8] 停止所有 Docker 容器...${NC}"
docker stop $(docker ps -aq) 2>/dev/null || true

# 2. 查找并终止可疑进程
echo -e "${YELLOW}[2/8] 查找可疑进程...${NC}"
suspicious_processes=$(ps aux | grep -E "javae|XIN-unix|xmrig|minerd|supportxmr|cryptonight" | grep -v grep || true)
if [ ! -z "$suspicious_processes" ]; then
    echo -e "${RED}发现可疑进程:${NC}"
    echo "$suspicious_processes"
    
    # 终止可疑进程
    pkill -9 javae 2>/dev/null || true
    pkill -9 -f "XIN-unix" 2>/dev/null || true
    pkill -9 -f "supportxmr" 2>/dev/null || true
    pkill -9 xmrig 2>/dev/null || true
    pkill -9 minerd 2>/dev/null || true
    echo -e "${GREEN}已终止可疑进程${NC}"
else
    echo -e "${GREEN}未发现可疑进程${NC}"
fi

# 3. 清理恶意文件
echo -e "${YELLOW}[3/8] 清理恶意文件...${NC}"
malware_paths=(
    "/tmp/.XIN-unix"
    "/var/tmp/.unix"
    "/var/tmp/.bin"
    "/dev/shm/duet"
    "/tmp/.ICE-unix/javae"
    "/tmp/.X11-unix/javae"
)

for path in "${malware_paths[@]}"; do
    if [ -e "$path" ]; then
        echo -e "${RED}删除: $path${NC}"
        rm -rf "$path"
    fi
done

# 4. 检查网络连接
echo -e "${YELLOW}[4/8] 检查可疑网络连接...${NC}"
suspicious_connections=$(netstat -antp 2>/dev/null | grep -E "supportxmr|104.243.43.115|:3333|:4444|:5555" | grep -v grep || true)
if [ ! -z "$suspicious_connections" ]; then
    echo -e "${RED}发现可疑连接:${NC}"
    echo "$suspicious_connections"
else
    echo -e "${GREEN}未发现可疑连接${NC}"
fi

# 5. 检查 crontab
echo -e "${YELLOW}[5/8] 检查 crontab...${NC}"
if crontab -l 2>/dev/null | grep -E "curl|wget|supportxmr|javae" >/dev/null; then
    echo -e "${RED}发现可疑的 crontab 条目!${NC}"
    crontab -l
    echo -e "${YELLOW}请手动检查并清理 crontab${NC}"
else
    echo -e "${GREEN}crontab 正常${NC}"
fi

# 6. 检查启动服务
echo -e "${YELLOW}[6/8] 检查系统服务...${NC}"
if systemctl list-unit-files 2>/dev/null | grep -E "xmrig|minerd" >/dev/null; then
    echo -e "${RED}发现可疑服务!${NC}"
    systemctl list-unit-files | grep -E "xmrig|minerd"
else
    echo -e "${GREEN}系统服务正常${NC}"
fi

# 7. 清理 Docker 镜像和容器
echo -e "${YELLOW}[7/8] 清理 Docker...${NC}"
docker system prune -af --volumes
echo -e "${GREEN}Docker 清理完成${NC}"

# 8. 显示 CPU 和网络使用情况
echo -e "${YELLOW}[8/8] 当前系统状态...${NC}"
echo "CPU 使用率:"
top -bn1 | head -n 5
echo ""
echo "活动网络连接:"
netstat -antp 2>/dev/null | grep ESTABLISHED | head -n 10 || ss -tnp | grep ESTAB | head -n 10

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  清理完成!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}建议执行以下操作:${NC}"
echo "1. 更改所有密码(SSH、数据库、应用等)"
echo "2. 更新 SSH 密钥"
echo "3. 启用防火墙规则"
echo "4. 安装入侵检测系统(如 fail2ban)"
echo "5. 定期监控系统资源使用"
