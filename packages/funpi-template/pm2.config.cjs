module.exports : {
    apps: [
        {
            name: 'funpi',
            instances: 1,
            script: './funpi.js',
            exec_mode: 'cluster',
            watch: false,
            autorestart: true,
            interpreter: 'bun',
            ignore_watch: ['node_modules', 'logs', 'data'],
            env: {
                NODE_ENV:"production",
                // 项目名称
                APP_NAME:"易接口",
                APP_PORT:3000,
                // MD5加密盐
                MD5_SALT:"funpi123456",
                // 监听端口
                LISTEN_HOST:"127.0.0.1",
                // 开发管理员密码
                DEV_PASSWORD:"funpi123456",
                // 请求体大小
                BODY_LIMIT:10,
                // 参数检查
                PARAMS_CHECK:0,
                // 日志等级
                LOG_LEVEL:"warn",
                // 时区
                TIMEZONE:"Asia/Shanghai",
                // mysql 配置
                MYSQL_HOST:"127.0.0.1",
                MYSQL_PORT:3306,
                MYSQL_DB:"funpi_demo",
                MYSQL_USERNAME:"root",
                MYSQL_PASSWORD:"root",
                TABLE_PRIMARY_KEY:"default",
                // redis 配置
                REDIS_HOST:"127.0.0.1",
                REDIS_PORT:6379,
                REDIS_USERNAME:"",
                REDIS_PASSWORD:"",
                REDIS_DB:0,
                REDIS_KEY_PREFIX:"funpi_demo",
                // JWT 配置
                JWT_SECRET:"funpi123456",
                JWT_EXPIRES_IN:"30d",
                JWT_ALGORITHM:"HS256",
                // 邮箱配置
                MAIL_HOST:'demo.com',
                MAIL_PORT:465,
                MAIL_POOL:1,
                MAIL_SECURE:1,
                MAIL_USER:'demo@qq.com',
                MAIL_PASS:'',
                MAIL_SENDER:'易接口',
                MAIL_ADDRESS:'demo@qq.com',
            },
            log_file: './logs/funpi.log',
            error_file: './logs/funpi-error.log',
            out_file: './logs/funpi-out.log',
            max_memory_restart: '200M'
        }
    ]
};
