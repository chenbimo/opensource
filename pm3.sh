#!/bin/bash
# PM3 + Bun 别名配置文件
# 使用方法：在 ~/.bashrc 中添加 source ~/.pm3_bun_aliases

# 基础 PM3 命令
alias pm3='bunx --bun pm2'
alias pm3-ls='bunx --bun pm2 ls'
alias pm3-list='bunx --bun pm2 list'
alias pm3-status='bunx --bun pm2 status'

# PM3 信息查看
alias pm3-info='bunx --bun pm2 info'
alias pm3-desc='bunx --bun pm2 describe'
alias pm3-show='bunx --bun pm2 show'

# PM3 监控相关
alias pm3-monit='bunx --bun pm2 monit'
alias pm3-monitor='bunx --bun pm2 monitor'

# PM3 更新和维护
alias pm3-update='bunx --bun pm2 update'
alias pm3-reset='bunx --bun pm2 reset'
alias pm3-unstartup='bunx --bun pm2 unstartup'
alias pm3-kill='bunx --bun pm2 kill'

# 支持参数的函数定义
# PM3 启动应用（支持参数）
pm3s() {
    if [ $# -eq 0 ]; then
        echo "用法: pm3s <file> [options]"
        echo "示例: pm3s app.js --name myapp"
        return 1
    fi
    bunx --bun pm2 start "$@"
}

# PM3 重启应用（支持参数）
pm3r() {
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
pm3d() {
    if [ $# -eq 0 ]; then
        echo "用法: pm3d <name|id|all>"
        echo "示例: pm3d myapp"
        return 1
    fi
    bunx --bun pm2 delete "$@"
}

# PM3 查看应用信息（支持参数）
pm3i() {
    if [ $# -eq 0 ]; then
        echo "用法: pm3i <name|id>"
        echo "示例: pm3i myapp"
        return 1
    fi
    bunx --bun pm2 info "$@"
}

# PM3 查看应用详情（支持参数）
pm3desc() {
    if [ $# -eq 0 ]; then
        echo "用法: pm3desc <name|id>"
        echo "示例: pm3desc myapp"
        return 1
    fi
    bunx --bun pm2 describe "$@"
}

# PM3 查看日志（支持参数）
pm3l() {
    if [ $# -eq 0 ]; then
        bunx --bun pm2 logs
    else
        bunx --bun pm2 logs "$@"
    fi
}

# PM3 重载日志（支持参数）
pm3rl() {
    if [ $# -eq 0 ]; then
        bunx --bun pm2 reloadLogs
    else
        bunx --bun pm2 reloadLogs "$@"
    fi
}

# PM3 重置重启次数（支持参数）
pm3reset() {
    if [ $# -eq 0 ]; then
        echo "用法: pm3reset <name|id|all>"
        echo "示例: pm3reset myapp"
        return 1
    fi
    bunx --bun pm2 reset "$@"
}

# PM3 缩放应用实例（支持参数）
pm3scale() {
    if [ $# -lt 2 ]; then
        echo "用法: pm3scale <name> <number>"
        echo "示例: pm3scale myapp 4"
        return 1
    fi
    bunx --bun pm2 scale "$@"
}

# PM3 更新应用环境变量（支持参数）
pm3env() {
    if [ $# -lt 2 ]; then
        echo "用法: pm3env <name> <key=value>"
        echo "示例: pm3env myapp NODE_ENV=production"
        return 1
    fi
    local app_name=$1
    shift
    bunx --bun pm2 restart "$app_name" --update-env --env "$@"
}

# 便捷的组合命令
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

# PM3 快速启动（使用 ecosystem 文件）
pm3eco() {
    if [ $# -eq 0 ]; then
        if [ -f "ecosystem.config.js" ]; then
            bunx --bun pm2 start ecosystem.config.js
        elif [ -f "ecosystem.config.json" ]; then
            bunx --bun pm2 start ecosystem.config.json
        elif [ -f "pm3.config.js" ]; then
            bunx --bun pm2 start pm2.config.js
        else
            echo "未找到 ecosystem 配置文件"
            return 1
        fi
    else
        bunx --bun pm2 start "$@"
    fi
}

# PM3 备份当前状态
pm3backup() {
    local backup_file="pm3_backup_$(date +%Y%m%d_%H%M%S).json"
    bunx --bun pm2 dump "$backup_file"
    echo "PM3 状态已备份到: $backup_file"
}

# PM3 恢复状态
pm3restore() {
    if [ $# -eq 0 ]; then
        bunx --bun pm2 resurrect
    else
        bunx --bun pm2 start "$1"
    fi
}

# 显示帮助信息
pm3help() {
    echo "=== PM3 + Bun 别名帮助 ==="
    echo ""
    echo "基础命令:"
    echo "  pm3-ls, pm3-list    - 列出所有应用"
    echo "  pm3-status          - 显示应用状态"
    echo "  pm3-monit           - 打开监控界面"
    echo ""
    echo "应用管理 (支持参数):"
    echo "  pm3s <file>         - 启动应用"
    echo "  pm3r <name>         - 重启应用"
    echo "  pm3st <name>        - 停止应用"
    echo "  pm3d <name>         - 删除应用"
    echo "  pm3i <name>         - 查看应用信息"
    echo ""
    echo "日志管理:"
    echo "  pm3l [name]         - 查看日志（简写）"
    echo "  pm3log <name>       - 查看日志（详细，支持更多选项）"
    echo "  pm3-flush           - 清空日志"
    echo "  pm3rl [name]        - 重载日志"
    echo ""
    echo "pm3log 使用示例:"
    echo "  pm3log myapp                    - 查看 myapp 的所有日志"
    echo "  pm3log myapp --lines 100        - 查看最后 100 行日志"
    echo "  pm3log myapp --follow           - 实时跟踪日志"
    echo "  pm3log myapp --err              - 只查看错误日志"
    echo "  pm3log myapp --out              - 只查看输出日志"
    echo "  pm3log myapp --timestamp        - 显示时间戳"
    echo "  pm3log myapp --follow --lines 50 - 实时跟踪最后50行"
    echo ""
    echo "便捷命令:"
    echo "  pm3ra               - 重启所有应用"
    echo "  pm3sa               - 停止所有应用"
    echo "  pm3da               - 删除所有应用"
    echo "  pm3eco [file]       - 使用 ecosystem 文件启动"
    echo "  pm3backup           - 备份当前状态"
    echo "  pm3restore [file]   - 恢复状态"
    echo ""
    echo "更多帮助: bunx --bun pm3 help"
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

echo "PM3 + Bun 别名已加载完成! 输入 'pm3help' 查看帮助"