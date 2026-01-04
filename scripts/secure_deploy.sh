#!/bin/bash

################################################################################
# 安全部署脚本
# 在部署前执行安全检查
################################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}执行部署前安全检查...${NC}"

# 1. 检查是否有可疑进程
if ps aux | grep -E "javae|xmrig|minerd|supportxmr" | grep -v grep > /dev/null; then
    echo -e "${RED}错误: 发现可疑进程! 请先运行 ./scripts/security_cleanup.sh${NC}"
    exit 1
fi

# 2. 检查可疑文件
if [ -e "/tmp/.XIN-unix" ] || [ -e "/var/tmp/.unix" ]; then
    echo -e "${RED}错误: 发现恶意文件! 请先运行 ./scripts/security_cleanup.sh${NC}"
    exit 1
fi

# 3. 检查 CPU 使用率
cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 || echo "0")
if (( $(echo "$cpu_usage > 80" | bc -l 2>/dev/null || echo 0) )); then
    echo -e "${YELLOW}警告: CPU 使用率异常高 (${cpu_usage}%)${NC}"
    echo -e "${YELLOW}请检查系统进程${NC}"
fi

echo -e "${GREEN}安全检查通过!${NC}"
echo ""

# 继续部署
exec "$(dirname "$0")/../deploy.sh" "$@"
