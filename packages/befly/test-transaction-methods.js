/**
 * 事务高级方法测试脚本
 */

import { createQueryBuilder } from './utils/curd.js';

// 模拟事务方法测试
function testTransactionMethods() {
    console.log('🧪 测试事务中的高级方法\n');

    // 模拟连接对象
    const mockConn = {
        query: async (sql, params) => {
            console.log('执行SQL:', sql);
            console.log('参数:', params);

            // 模拟不同类型的返回结果
            if (sql.includes('SELECT') && sql.includes('COUNT(*)')) {
                return [{ total: 100 }];
            } else if (sql.includes('SELECT')) {
                return [{ id: 1, name: 'John', email: 'john@example.com' }];
            } else if (sql.includes('INSERT')) {
                return { insertId: 123, affectedRows: 1 };
            } else if (sql.includes('UPDATE') || sql.includes('DELETE')) {
                return { affectedRows: 1 };
            }
            return [];
        }
    };

    // 模拟befly.redis
    const mockRedis = {
        genTimeID: async () => Date.now() + Math.random().toString(36).substr(2, 9)
    };

    // 创建事务方法
    const createTxMethods = (conn, befly) => ({
        // 原始SQL执行方法
        query: async (sql, params = []) => {
            return await conn.query(sql, params);
        },
        execute: async (sql, params = []) => {
            return await conn.query(sql, params);
        },

        // 高级数据操作方法
        getDetail: async (table, options = {}) => {
            const { where = {}, fields = '*', leftJoins = [] } = typeof options === 'object' && !Array.isArray(options) ? options : { where: options };

            const builder = createQueryBuilder().select(fields).from(table).where(where).limit(1);

            // 添加 LEFT JOIN
            leftJoins.forEach((join) => {
                if (typeof join === 'string') {
                    const parts = join.split(' ON ');
                    if (parts.length === 2) {
                        builder.leftJoin(parts[0].trim(), parts[1].trim());
                    }
                } else if (typeof join === 'object' && join.table && join.on) {
                    builder.leftJoin(join.table, join.on);
                }
            });

            const { sql, params } = builder.toSelectSql();
            const result = await conn.query(sql, params);
            return result[0] || null;
        },

        getList: async (table, options = {}) => {
            const { where = {}, fields = '*', leftJoins = [], orderBy = [], page = 1, pageSize = 10 } = options;

            const builder = createQueryBuilder().select(fields).from(table).where(where);

            // 添加 LEFT JOIN
            leftJoins.forEach((join) => {
                if (typeof join === 'string') {
                    const parts = join.split(' ON ');
                    if (parts.length === 2) {
                        builder.leftJoin(parts[0].trim(), parts[1].trim());
                    }
                }
            });

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
            const list = await conn.query(sql, params);

            // 获取总数
            let total = 0;
            if (numPage > 0 && numPageSize > 0) {
                const countBuilder = createQueryBuilder().from(table).where(where);
                const { sql: countSql, params: countParams } = countBuilder.toCountSql();
                const countResult = await conn.query(countSql, countParams);
                total = countResult[0]?.total || 0;
            }

            return {
                list: Array.isArray(list) ? list : [],
                total,
                page: numPage,
                pageSize: numPageSize
            };
        },

        insData: async (table, data) => {
            if (!table || typeof table !== 'string') {
                throw new Error('表名是必需的');
            }

            if (!data) {
                throw new Error('插入数据是必需的');
            }

            // 手动处理数据
            const now = Date.now();
            let processedData;

            if (Array.isArray(data)) {
                processedData = await Promise.all(
                    data.map(async (item) => ({
                        ...item,
                        id: await befly.redis.genTimeID(),
                        created_at: now,
                        updated_at: now
                    }))
                );
            } else {
                processedData = {
                    ...data,
                    id: await befly.redis.genTimeID(),
                    created_at: now,
                    updated_at: now
                };
            }

            const builder = createQueryBuilder();
            const { sql, params } = builder.toInsertSql(table, processedData);
            return await conn.query(sql, params);
        },

        upData: async (table, data, where) => {
            if (!table || typeof table !== 'string') {
                throw new Error('表名是必需的');
            }

            if (!data || typeof data !== 'object') {
                throw new Error('更新数据是必需的');
            }

            if (!where) {
                throw new Error('更新操作需要 WHERE 条件');
            }

            // 剔除 undefined 值和敏感字段
            const filteredData = Object.fromEntries(Object.entries(data).filter(([key, value]) => value !== undefined && !['id', 'created_at', 'deleted_at'].includes(key)));

            // 自动添加 updated_at
            const updateData = {
                ...filteredData,
                updated_at: Date.now()
            };

            const builder = createQueryBuilder().where(where);
            const { sql, params } = builder.toUpdateSql(table, updateData);
            return await conn.query(sql, params);
        },

        delData: async (table, where) => {
            if (!table || typeof table !== 'string') {
                throw new Error('表名是必需的');
            }

            if (!where) {
                throw new Error('删除操作需要 WHERE 条件');
            }

            const builder = createQueryBuilder().where(where);
            const { sql, params } = builder.toDeleteSql(table);
            return await conn.query(sql, params);
        }
    });

    const tx = createTxMethods(mockConn, { redis: mockRedis });

    // 测试各种方法
    async function runTests() {
        console.log('✅ 测试 getDetail:');
        await tx.getDetail('users', { id: 1 });
        console.log('');

        console.log('✅ 测试 getList:');
        await tx.getList('users', {
            where: { status$ne: 0 },
            page: 1,
            pageSize: 10
        });
        console.log('');

        console.log('✅ 测试 insData:');
        await tx.insData('users', {
            name: 'John',
            email: 'john@example.com',
            status: 1
        });
        console.log('');

        console.log('✅ 测试 upData:');
        await tx.upData('users', { status: 1, last_login: new Date() }, { id: 1 });
        console.log('');

        console.log('✅ 测试 delData:');
        await tx.delData('users', { id: 1 });
        console.log('');

        console.log('🎉 所有事务方法测试完成！');
    }

    return runTests();
}

// 运行测试
testTransactionMethods().catch(console.error);
