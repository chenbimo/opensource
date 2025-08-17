import { Env } from '../config/env.js';
import { Logger } from '../utils/logger.js';
import { createQueryBuilder } from '../utils/curd.js';

export default {
    after: ['_redis'],
    async onInit(befly) {
        let pool = null;

        try {
            if (Env.MYSQL_ENABLE === 1) {
                // 动态导入 MariaDB 连接器
                const mariadb = await import('mariadb');

                // 创建 MariaDB 连接池配置
                const config = {
                    host: Env.MYSQL_HOST || '127.0.0.1',
                    port: parseInt(Env.MYSQL_PORT) || 3306,
                    database: Env.MYSQL_DB || 'test',
                    user: Env.MYSQL_USER || 'root',
                    password: Env.MYSQL_PASSWORD || 'root',
                    connectionLimit: parseInt(Env.MYSQL_POOL_MAX) || 10,
                    charset: 'utf8mb4',
                    timezone: Env.TIMEZONE || 'local',
                    debug: Env.MYSQL_DEBUG === 1,
                    acquireTimeout: 60000,
                    timeout: 60000,
                    // 连接保活设置
                    idleTimeout: 1800000, // 30分钟
                    minimumIdle: 2,
                    // 重连设置
                    reconnect: true,
                    // 避免连接超时
                    keepAliveDelay: 30000
                };

                // 创建连接池
                pool = mariadb.createPool(config);

                // 测试数据库连接
                let conn;
                try {
                    conn = await pool.getConnection();
                    const result = await conn.query('SELECT VERSION() AS version');
                    Logger.info(`数据库连接成功，MariaDB 版本: ${result[0].version}`);
                } catch (error) {
                    Logger.error('数据库连接测试失败:', error);
                    throw error;
                } finally {
                    if (conn) {
                        try {
                            conn.release();
                        } catch (releaseError) {
                            Logger.warn('连接释放警告:', releaseError.message);
                        }
                    }
                }

                // 数据库操作方法
                const dbMethods = {
                    // 原始连接池访问
                    pool: pool,

                    // 创建查询构造器
                    query: () => createQueryBuilder(),

                    // 执行原始 SQL - 核心方法
                    async execute(sql, params = []) {
                        if (!sql || typeof sql !== 'string') {
                            throw new Error('SQL 语句是必需的');
                        }

                        let conn;
                        try {
                            conn = await pool.getConnection();

                            if (Env.MYSQL_DEBUG === 1) {
                                Logger.debug('执行SQL:', { sql, params });
                            }

                            const result = await conn.query(sql, params);
                            return result;
                        } catch (error) {
                            Logger.error('SQL 执行失败:', { sql, params, error: error.message });
                            throw error;
                        } finally {
                            if (conn) {
                                try {
                                    conn.release();
                                } catch (releaseError) {
                                    Logger.warn('连接释放警告:', releaseError.message);
                                }
                            }
                        }
                    },

                    // 事务处理
                    async transaction(callback) {
                        if (typeof callback !== 'function') {
                            throw new Error('事务回调函数是必需的');
                        }

                        let conn;
                        try {
                            conn = await pool.getConnection();
                            await conn.beginTransaction();

                            // 为回调函数提供连接对象
                            const txMethods = {
                                query: async (sql, params = []) => {
                                    return await conn.query(sql, params);
                                },
                                execute: async (sql, params = []) => {
                                    return await conn.query(sql, params);
                                }
                            };

                            const result = await callback(txMethods);

                            await conn.commit();
                            return result;
                        } catch (error) {
                            if (conn) {
                                try {
                                    await conn.rollback();
                                    Logger.info('事务已回滚');
                                } catch (rollbackError) {
                                    Logger.error('事务回滚失败:', rollbackError);
                                }
                            }
                            throw error;
                        } finally {
                            if (conn) {
                                try {
                                    conn.release();
                                } catch (releaseError) {
                                    Logger.warn('连接释放警告:', releaseError.message);
                                }
                            }
                        }
                    },

                    // 获取单条记录详情
                    async getDetail(table, options = {}) {
                        if (!table || typeof table !== 'string') {
                            throw new Error('表名是必需的');
                        }

                        const { where = {}, fields = '*', leftJoins = [] } = typeof options === 'object' && !Array.isArray(options) ? options : { where: options };

                        try {
                            const builder = createQueryBuilder().select(fields).from(table).where(where).limit(1);

                            // 添加 LEFT JOIN
                            leftJoins.forEach((join) => {
                                if (typeof join === 'string') {
                                    const parts = join.split(' ON ');
                                    if (parts.length === 2) {
                                        builder.leftJoin(parts[0].trim(), parts[1].trim());
                                    }
                                } else if (join && typeof join === 'object' && join.table && join.on) {
                                    builder.leftJoin(join.table, join.on);
                                }
                            });

                            const { sql, params } = builder.toSelectSql();
                            const result = await this.execute(sql, params);
                            return result[0] || null;
                        } catch (error) {
                            Logger.error('getDetail 执行失败:', error);
                            throw error;
                        }
                    },

                    // 获取列表（支持分页）
                    async getList(table, options = {}) {
                        if (!table || typeof table !== 'string') {
                            throw new Error('表名是必需的');
                        }

                        const { where = {}, fields = '*', leftJoins = [], orderBy = [], groupBy = [], having = [], page = 1, pageSize = 10 } = options;

                        try {
                            const builder = createQueryBuilder().select(fields).from(table).where(where);

                            // 添加 LEFT JOIN
                            leftJoins.forEach((join) => {
                                if (typeof join === 'string') {
                                    const parts = join.split(' ON ');
                                    if (parts.length === 2) {
                                        builder.leftJoin(parts[0].trim(), parts[1].trim());
                                    }
                                } else if (join && typeof join === 'object' && join.table && join.on) {
                                    builder.leftJoin(join.table, join.on);
                                }
                            });

                            // 添加其他子句
                            if (Array.isArray(groupBy) && groupBy.length > 0) {
                                builder.groupBy(groupBy);
                            }

                            if (Array.isArray(having) && having.length > 0) {
                                having.forEach((h) => builder.having(h));
                            }

                            if (Array.isArray(orderBy) && orderBy.length > 0) {
                                builder.orderBy(orderBy);
                            }

                            // 分页处理
                            const numPage = parseInt(page) || 1;
                            const numPageSize = parseInt(pageSize) || 10;

                            if (numPage > 0 && numPageSize > 0) {
                                const offset = (numPage - 1) * numPageSize;
                                builder.limit(numPageSize, offset);
                            }

                            const { sql, params } = builder.toSelectSql();
                            const list = await this.execute(sql, params);

                            // 获取总数（如果需要分页）
                            let total = 0;
                            if (numPage > 0 && numPageSize > 0) {
                                const countBuilder = createQueryBuilder().from(table).where(where);

                                // 计算总数时也要包含 JOIN
                                leftJoins.forEach((join) => {
                                    if (typeof join === 'string') {
                                        const parts = join.split(' ON ');
                                        if (parts.length === 2) {
                                            countBuilder.leftJoin(parts[0].trim(), parts[1].trim());
                                        }
                                    } else if (join && typeof join === 'object' && join.table && join.on) {
                                        countBuilder.leftJoin(join.table, join.on);
                                    }
                                });

                                const { sql: countSql, params: countParams } = countBuilder.toCountSql();
                                const countResult = await this.execute(countSql, countParams);
                                total = countResult[0]?.total || 0;
                            }

                            return {
                                list: Array.isArray(list) ? list : [],
                                total,
                                page: numPage,
                                pageSize: numPageSize
                            };
                        } catch (error) {
                            Logger.error('getList 执行失败:', error);
                            throw error;
                        }
                    },

                    // 获取所有记录
                    async getAll(table, options = {}) {
                        if (!table || typeof table !== 'string') {
                            throw new Error('表名是必需的');
                        }

                        const { where = {}, fields = '*', leftJoins = [], orderBy = [] } = typeof options === 'object' && !Array.isArray(options) ? options : { where: options };

                        try {
                            const builder = createQueryBuilder().select(fields).from(table).where(where);

                            // 添加 LEFT JOIN
                            leftJoins.forEach((join) => {
                                if (typeof join === 'string') {
                                    const parts = join.split(' ON ');
                                    if (parts.length === 2) {
                                        builder.leftJoin(parts[0].trim(), parts[1].trim());
                                    }
                                } else if (join && typeof join === 'object' && join.table && join.on) {
                                    builder.leftJoin(join.table, join.on);
                                }
                            });

                            if (Array.isArray(orderBy) && orderBy.length > 0) {
                                builder.orderBy(orderBy);
                            }

                            const { sql, params } = builder.toSelectSql();
                            const result = await this.execute(sql, params);
                            return Array.isArray(result) ? result : [];
                        } catch (error) {
                            Logger.error('getAll 执行失败:', error);
                            throw error;
                        }
                    },

                    // 插入数据
                    async insData(table, data) {
                        if (!table || typeof table !== 'string') {
                            throw new Error('表名是必需的');
                        }

                        if (!data) {
                            throw new Error('插入数据是必需的');
                        }

                        try {
                            const builder = createQueryBuilder();
                            const { sql, params } = builder.toInsertSql(table, data);
                            return await this.execute(sql, params);
                        } catch (error) {
                            Logger.error('insData 执行失败:', error);
                            throw error;
                        }
                    },

                    // 更新数据
                    async upData(table, data, where) {
                        if (!table || typeof table !== 'string') {
                            throw new Error('表名是必需的');
                        }

                        if (!data || typeof data !== 'object') {
                            throw new Error('更新数据是必需的');
                        }

                        if (!where) {
                            throw new Error('更新操作需要 WHERE 条件');
                        }

                        try {
                            const builder = createQueryBuilder().where(where);
                            const { sql, params } = builder.toUpdateSql(table, data);
                            return await this.execute(sql, params);
                        } catch (error) {
                            Logger.error('upData 执行失败:', error);
                            throw error;
                        }
                    },

                    // 删除数据
                    async delData(table, where) {
                        if (!table || typeof table !== 'string') {
                            throw new Error('表名是必需的');
                        }

                        if (!where) {
                            throw new Error('删除操作需要 WHERE 条件');
                        }

                        try {
                            const builder = createQueryBuilder().where(where);
                            const { sql, params } = builder.toDeleteSql(table);
                            return await this.execute(sql, params);
                        } catch (error) {
                            Logger.error('delData 执行失败:', error);
                            throw error;
                        }
                    },

                    // 批量插入
                    async insBatch(table, dataArray) {
                        if (!table || typeof table !== 'string') {
                            throw new Error('表名是必需的');
                        }

                        if (!Array.isArray(dataArray) || dataArray.length === 0) {
                            throw new Error('批量插入数据不能为空');
                        }

                        try {
                            const builder = createQueryBuilder();
                            const { sql, params } = builder.toInsertSql(table, dataArray);
                            return await this.execute(sql, params);
                        } catch (error) {
                            Logger.error('insBatch 执行失败:', error);
                            throw error;
                        }
                    },

                    // 获取记录总数
                    async getCount(table, options = {}) {
                        if (!table || typeof table !== 'string') {
                            throw new Error('表名是必需的');
                        }

                        const { where = {}, leftJoins = [] } = typeof options === 'object' && !Array.isArray(options) ? options : { where: options };

                        try {
                            const builder = createQueryBuilder().from(table).where(where);

                            // 添加 LEFT JOIN
                            leftJoins.forEach((join) => {
                                if (typeof join === 'string') {
                                    const parts = join.split(' ON ');
                                    if (parts.length === 2) {
                                        builder.leftJoin(parts[0].trim(), parts[1].trim());
                                    }
                                } else if (join && typeof join === 'object' && join.table && join.on) {
                                    builder.leftJoin(join.table, join.on);
                                }
                            });

                            const { sql, params } = builder.toCountSql();
                            const result = await this.execute(sql, params);
                            return result[0]?.total || 0;
                        } catch (error) {
                            Logger.error('getCount 执行失败:', error);
                            throw error;
                        }
                    },

                    // 获取连接池状态
                    getPoolStatus() {
                        return {
                            activeConnections: pool.activeConnections(),
                            totalConnections: pool.totalConnections(),
                            idleConnections: pool.idleConnections(),
                            taskQueueSize: pool.taskQueueSize()
                        };
                    },

                    // 关闭连接池
                    async close() {
                        if (pool) {
                            try {
                                await pool.end();
                                Logger.info('数据库连接池已关闭');
                            } catch (error) {
                                Logger.error('关闭数据库连接池失败:', error);
                                throw error;
                            }
                        }
                    }
                };

                // 监听进程退出事件，确保连接池正确关闭
                const gracefulShutdown = async (signal) => {
                    Logger.info(`收到 ${signal} 信号，正在关闭数据库连接池...`);
                    try {
                        await dbMethods.close();
                    } catch (error) {
                        Logger.error('优雅关闭数据库失败:', error);
                    }
                    process.exit(0);
                };

                process.on('SIGINT', gracefulShutdown);
                process.on('SIGTERM', gracefulShutdown);
                process.on('SIGUSR2', gracefulShutdown); // nodemon 重启

                return dbMethods;
            } else {
                Logger.warn(`MySQL 未启用，跳过初始化`);
                return {};
            }
        } catch (error) {
            Logger.error({
                msg: '数据库初始化失败',
                message: error.message,
                stack: error.stack
            });

            // 清理资源
            if (pool) {
                try {
                    await pool.end();
                } catch (cleanupError) {
                    Logger.error('清理连接池失败:', cleanupError);
                }
            }

            process.exit(1);
        }
    }
};
