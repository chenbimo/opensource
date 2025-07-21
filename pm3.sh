#!/bin/bash
# PM3 + Bun 别名配置文件
# 使用方法：在 ~/.bashrc 中添加 source ~/.pm3.sh

# 基础 PM3 命令
alias pm3='bunx --bun pm2'
alias pm3v='bunx --bun pm2 -v'
alias pm3list='bunx --bun pm2 ls'
alias pm3status='bunx --bun pm2 status'

# PM3 信息查看
alias pm3info='bunx --bun pm2 info'
alias pm3desc='bunx --bun pm2 describe'
alias pm3show='bunx --bun pm2 show'

# PM3 监控相关
alias pm3monit='bunx --bun pm2 monit'
alias pm3monitor='bunx --bun pm2 monitor'

# PM3 更新和维护
alias pm3update='bunx --bun pm2 update'
alias pm3reset='bunx --bun pm2 reset'
alias pm3kill='bunx --bun pm2 kill'

# PM3 重启应用（支持参数）
pm3rt() {
    if [ $# -eq 0 ]; then
        echo "用法: pm3r <name|id|all>"
        echo "示例: pm3r myapp"
        return 1
    fi
    bunx --bun pm2 restart "$@" -a
}

# PM3 停止应用（支持参数）
pm3st() {
    if [ $# -eq 0 ]; then
        echo "用法: pm3st <name|id|all>"
        echo "示例: pm3st myapp"
        return 1
    fi
    bunx --bun pm2 stop "$@"
}

# PM3 删除应用（支持参数）
pm3dn() {
    if [ $# -eq 0 ]; then
        echo "用法: pm3dn <name|id|all>"
        echo "示例: pm3dn myapp"
        return 1
    fi
    bunx --bun pm2 delete "$@"
}

# PM3 查看应用信息（支持参数）
pm3in() {
    if [ $# -eq 0 ]; then
        bunx --bun pm2 info
    else
        bunx --bun pm2 info "$@"
    fi
}

# PM3 查看日志（支持参数）
pm3log() {
    if [ $# -eq 0 ]; then
        bunx --bun pm2 logs
    else
        bunx --bun pm2 logs "$@"
    fi
}

# 快速重启所有应用
pm3ra() {
    bunx --bun pm2 restart all
}

# 快速停止所有应用
pm3sa() {
    bunx --bun pm2 stop all
}

# 快速删除所有应用
pm3da() {
    echo "确定要删除所有 PM3 应用吗? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        bunx --bun pm2 delete all
    else
        echo "操作已取消"
    fi
}

# PM3 状态概览
pm3stat() {
    echo "=== PM3 状态概览 ==="
    bunx --bun pm2 list
    echo ""
    echo "=== 系统资源 ==="
    bunx --bun pm2 monit --no-daemon
}



# 显示帮助信息
pm3h() {
    echo "=== PM3 + Bun 别名帮助 ==="
    echo ""
    echo "  pm3                 - PM2 基础命令"
    echo "  pm3list             - 列出所有应用"
    echo "  pm3status           - 显示应用状态"
    echo "  pm3monit            - 打开监控界面"
    echo "  pm3rt <name>        - 重启应用"
    echo "  pm3st <name>        - 停止应用"
    echo "  pm3dn <name>        - 删除应用"
    echo "  pm3in [name]        - 查看应用信息"
    echo "  pm3log [name]       - 查看日志"
    echo "  pm3ra               - 重启所有应用"
    echo "  pm3sa               - 停止所有应用"
    echo "  pm3da               - 删除所有应用（需确认）"
    echo "  pm3stat             - 状态概览"
    echo "  pm3update           - 更新 PM2"
    echo "  pm3reset            - 重置"
    echo "  pm3kill             - 杀死 PM2 守护进程"
    echo ""
    echo "说明: 大部分命令支持应用名称、ID 或 'all' 参数"
    echo "更多帮助: pm3 help"
}

# 设置命令补全（如果支持）
if command -v complete >/dev/null 2>&1; then
    # 为主要的 PM3 命令设置补全
    _pm3_completions() {
        local apps
        apps=$(bunx --bun pm2 list --no-header 2>/dev/null | awk '{print $2}' | grep -v '^$')
        COMPREPLY=($(compgen -W "$apps all" -- "${COMP_WORDS[COMP_CWORD]}"))
    }

    complete -F _pm3_completions pm3r pm3st pm3d pm3i pm3desc pm3l pm3log pm3reset
fi
