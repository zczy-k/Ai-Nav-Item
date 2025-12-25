#!/bin/bash

# Con-Nav-Item 通用Linux服务器一键部署脚本
# 支持：Ubuntu, Debian, CentOS, RHEL, Fedora 等

set -e

export LC_ALL=C
re="\033[0m"
red="\033[1;91m"
green="\e[1;32m"
yellow="\e[1;33m"
purple="\e[1;35m"

red() { echo -e "\e[1;91m$1\033[0m"; }
green() { echo -e "\e[1;32m$1\033[0m"; }
yellow() { echo -e "\e[1;33m$1\033[0m"; }
purple() { echo -e "\e[1;35m$1\033[0m"; }

echo ""
green "=========================================="
green "  Con-Nav-Item 通用Linux服务器部署脚本"
green "  GitHub: github.com/zczy-k/Con-Nav-Item"
green "=========================================="
echo ""

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        red "无法检测操作系统"
        exit 1
    fi
    
    yellow "检测到操作系统: $OS $VERSION"
}

# 安装 Node.js 20
install_nodejs() {
    yellow "检查 Node.js..."
    
    if command -v node &> /dev/null; then
        green "  ✔ Node.js 已安装: $(node --version)"
        return 0
    fi
    
    yellow "  → 安装 Node.js 20..."
    
    case "$OS" in
        ubuntu|debian)
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >/dev/null 2>&1
            sudo apt-get install -y nodejs >/dev/null 2>&1
            ;;
        centos|rhel|fedora)
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - >/dev/null 2>&1
            sudo yum install -y nodejs >/dev/null 2>&1
            ;;
        *)
            red "  ✗ 不支持的操作系统: $OS"
            exit 1
            ;;
    esac
    
    green "  ✔ Node.js 安装完成: $(node --version)"
}

# 安装 PM2
install_pm2() {
    yellow "检查 PM2..."
    
    if command -v pm2 &> /dev/null; then
        green "  ✔ PM2 已安装"
        return 0
    fi
    
    yellow "  → 安装 PM2..."
    sudo npm install -g pm2 >/dev/null 2>&1
    green "  ✔ PM2 安装完成"
}

# 安装项目
install_app() {
    yellow "安装 Con-Nav-Item..."
    
    INSTALL_DIR=${INSTALL_DIR:-"$HOME/Con-Nav-Item"}
    
    # 如果目录存在，询问是否备份
    if [ -d "$INSTALL_DIR" ]; then
        yellow "  ⚠ 检测到已存在的安装目录"
        read -p "是否备份并重新安装? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            BACKUP_DIR="${INSTALL_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
            mv "$INSTALL_DIR" "$BACKUP_DIR"
            green "  ✔ 已备份到: $BACKUP_DIR"
        else
            yellow "取消安装"
            exit 0
        fi
    fi
    
    # 克隆项目
    yellow "  → 克隆项目..."
    git clone --quiet https://github.com/zczy-k/Con-Nav-Item.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    green "  ✔ 项目克隆完成"
    
    # 安装后端依赖
    yellow "  → 安装后端依赖..."
    npm install --silent 2>/dev/null
    green "  ✔ 后端依赖安装完成"
    
    # 构建前端
    yellow "  → 构建前端..."
    cd web
    npm install --silent 2>/dev/null
    npm run build:prod >/dev/null 2>&1
    cd ..
    green "  ✔ 前端构建完成"
}

# 配置环境变量
configure_env() {
    yellow "配置环境变量..."
    echo ""
    
    # 读取用户输入
    read -p "设置管理员用户名 [admin]: " ADMIN_USER
    ADMIN_USER=${ADMIN_USER:-admin}
    
    # 验证用户名格式
    if ! [[ "$ADMIN_USER" =~ ^[a-zA-Z0-9_]{3,20}$ ]]; then
        yellow "用户名不符合要求，使用默认用户名: admin"
        ADMIN_USER="admin"
    fi
    
    # 密码输入和验证
    yellow "密码要求：至少8位，包含字母、数字、特殊字符中至少2种"
    echo ""
    
    while true; do
        read -sp "输入管理员密码: " ADMIN_PASS
        echo
        
        if [ -z "$ADMIN_PASS" ]; then
            red "✗ 密码不能为空"
            echo ""
            continue
        fi
        
        # 验证密码强度
        if [ ${#ADMIN_PASS} -lt 8 ]; then
            red "✗ 密码至少8位"
            echo ""
            continue
        fi
        
        # 检查是否包含字母、数字、特殊字符
        has_letter=0
        has_number=0
        has_special=0
        
        [[ "$ADMIN_PASS" =~ [a-zA-Z] ]] && has_letter=1
        [[ "$ADMIN_PASS" =~ [0-9] ]] && has_number=1
        [[ "$ADMIN_PASS" =~ [^a-zA-Z0-9] ]] && has_special=1
        
        strength=$((has_letter + has_number + has_special))
        
        if [ $strength -lt 2 ]; then
            red "✗ 密码强度不足，请包含字母、数字、特殊字符中至少2种"
            echo ""
            continue
        fi
        
        # 确认密码
        read -sp "再次输入密码确认: " ADMIN_PASS_CONFIRM
        echo
        
        if [ "$ADMIN_PASS" != "$ADMIN_PASS_CONFIRM" ]; then
            red "✗ 两次密码输入不一致，请重新输入"
            echo ""
            continue
        fi
        
        green "✓ 密码设置成功"
        echo ""
        break
    done
    
    read -p "设置运行端口 [3000]: " PORT
    PORT=${PORT:-3000}
    
    # 生成随机JWT密钥
    yellow "生成JWT安全密钥..."
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('base64'))")
    
    # 创建 .env 文件
    cat > "$INSTALL_DIR/.env" <<EOF
PORT=${PORT}
ADMIN_USERNAME=${ADMIN_USER}
ADMIN_PASSWORD=${ADMIN_PASS}
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
EOF
    
    chmod 600 "$INSTALL_DIR/.env"
    green "✓ 安全配置文件已生成"
    echo ""
}

# 使用 PM2 启动应用
start_with_pm2() {
    yellow "启动应用..."
    
    cd "$INSTALL_DIR"
    
    # 停止旧进程（如果存在）
    pm2 stop Con-Nav-Item 2>/dev/null || true
    pm2 delete Con-Nav-Item 2>/dev/null || true
    
    # 启动应用
    pm2 start app.js --name Con-Nav-Item >/dev/null 2>&1
    
    # 设置开机自启
    pm2 save >/dev/null 2>&1
    pm2 startup 2>/dev/null | tail -n 1 | bash >/dev/null 2>&1 || true
    
    green "  ✔ 应用已启动"
}

# 配置防火墙（可选）
configure_firewall() {
    read -p "是否开放端口 $PORT 的防火墙规则? (y/n): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return 0
    fi
    
    if command -v ufw &> /dev/null; then
        sudo ufw allow $PORT/tcp >/dev/null 2>&1
        green "  ✔ UFW 防火墙规则已添加"
    elif command -v firewall-cmd &> /dev/null; then
        sudo firewall-cmd --permanent --add-port=$PORT/tcp >/dev/null 2>&1
        sudo firewall-cmd --reload >/dev/null 2>&1
        green "  ✔ FirewallD 规则已添加"
    else
        yellow "  ⚠ 未检测到防火墙管理工具"
    fi
}

# 显示信息
show_info() {
    echo ""
    green "=========================================="
    green "  ✔ 安装完成！"
    green "=========================================="
    echo ""
    
    IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
    
    echo -e "${green}访问地址：${purple}http://${IP}:${PORT}${re}"
    echo -e "${green}后台管理：${purple}http://${IP}:${PORT}/admin${re}"
    echo -e "${green}管理账号：${purple}${ADMIN_USER}${re}"
    echo ""
    red "⚠️  请登录后立即修改密码！"
    echo ""
    yellow "常用命令："
    echo "  pm2 status              - 查看状态"
    echo "  pm2 logs Con-Nav-Item   - 查看日志"
    echo "  pm2 restart Con-Nav-Item - 重启应用"
    echo ""
}

# 主函数
main() {
    detect_os
    install_nodejs
    install_pm2
    install_app
    configure_env
    start_with_pm2
    configure_firewall
    show_info
}

main
