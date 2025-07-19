import { Env } from '../config/env.js';
import { colors } from '../utils/colors.js';
import { Crud } from '../utils/curd.js';

export default {
    after: ['_redis'],
    async onInit(bunpii) {
        try {
            if (Env.MYSQL_ENABLE === 1) {
                // 创建 MySQL 连接池
                const config = {
                    host: Env.MYSQL_HOST || '127.0.0.1',
                    port: Env.MYSQL_PORT || 3306,
                    database: Env.MYSQL_DB || 'test',
                    user: Env.MYSQL_USER || 'root',
                    password: Env.MYSQL_PASSWORD || 'root',
                    connectionLimit: Env.MYSQL_POOL_MAX || 10,
                    charset: 'utf8mb4_general_ci',
                    // timezone: Env.TIMEZONE,
                    debug: Env.MYSQL_DEBUG === 1
                };

                const createPool = await import('mysql2').then((m) => m.createPool);
                const { Kysely, MysqlDialect, sql } = await import('kysely');

                const pool = await createPool(config);

                // 创建 Kysely 实例
                const db = new Kysely({
                    dialect: new MysqlDialect({
                        pool: pool
                    })
                });

                // 测试数据库连接
                const result = await sql`SELECT VERSION() AS version`.execute(db);
                if (result?.rows?.[0]?.version) {
                    // 扩展数据库实例
                    return Crud(db, bunpii.redis);
                } else {
                    return {};
                }
            } else {
                console.log(`${colors.warn} Mysql 未启用，跳过初始化`);
                return {};
            }
        } catch (error) {
            console.error(`${colors.error} 数据库连接失败:`, error.message);
            process.exit();
        }
    }
};
