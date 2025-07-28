import { omitFields } from './util.js';

export class Crud {
    constructor(db, redis, sql) {
        this.db = db;
        this.redis = redis;
        this.sql = sql;
        this.initMethods();
    }

    initMethods() {
        // 将所有 CRUD 方法直接挂载到 db 实例上
        this.db.insData = this.insData.bind(this);
        this.db.updData = this.updData.bind(this);
        this.db.delData = this.delData.bind(this);
        this.db.getOne = this.getOne.bind(this);
        this.db.getList = this.getList.bind(this);
        this.db.getAll = this.getAll.bind(this);
        this.db.getCount = this.getCount.bind(this);
    }

    // 事务方法
    async trans(callback) {
        return await this.db.transaction().execute(async (trx) => {
            // 创建一个临时的 Crud 实例，使用事务连接
            const transactionCrud = new Crud(trx, this.redis, this.sql);
            return await callback(transactionCrud);
        });
    }

    // 增强的插入方法 - 自动添加 ID 和时间戳，支持链式调用
    insData(tableName, data) {
        const insertQuery = this.db.insertInto(tableName);
        const redis = this.redis;

        insertQuery.exec = async function () {
            const now = Date.now();
            let processedData = data;

            if (Array.isArray(data)) {
                processedData = await Promise.all(
                    data.map(async (item) => ({
                        ...item,
                        id: await redis.genTimeID(),
                        created_at: now,
                        updated_at: now
                    }))
                );
            } else {
                processedData = {
                    ...data,
                    id: await redis.genTimeID(),
                    created_at: now,
                    updated_at: now
                };
            }

            const result = await this.values(processedData).execute();
            return { data: result }; // 返回统一格式
        };

        return insertQuery;
    }

    // 增强的更新方法 - 自动添加 updated_at，支持链式调用
    updData(tableName, data) {
        // 剔除 undefined 值
        const filteredData = Object.fromEntries(Object.entries(data).filter(([key, value]) => value !== undefined));

        const updateData = {
            ...omitFields(filteredData, ['id', 'created_at', 'deleted_at']),
            updated_at: Date.now()
        };

        const updateQuery = this.db.updateTable(tableName).set(updateData);

        updateQuery.exec = async function () {
            const result = await this.execute();
            return { data: result }; // 返回统一格式
        };

        return updateQuery;
    }

    // 增强的删除方法 - 支持链式调用
    delData(tableName) {
        const deleteQuery = this.db.deleteFrom(tableName);

        deleteQuery.exec = async function () {
            const result = await this.execute();
            return { data: result }; // 返回统一格式
        };

        return deleteQuery;
    }

    // 查询单条记录 - 支持链式调用
    getOne(tableName, fields) {
        let selectQuery;

        if (fields) {
            selectQuery = Array.isArray(fields) ? this.db.selectFrom(tableName).select(fields) : this.db.selectFrom(tableName).select([fields]);
        } else {
            selectQuery = this.db.selectFrom(tableName).selectAll();
        }

        // 默认过滤软删除的数据
        selectQuery = selectQuery.where('state', '<>', 2);

        // 添加 exec 方法，自动返回单条记录
        selectQuery.exec = async function () {
            const result = await this.executeTakeFirst();
            return { data: result }; // 返回统一格式
        };

        return selectQuery;
    }

    // 查询列表 - 支持链式调用和分页
    getList(tableName, fields) {
        let selectQuery;

        if (fields) {
            selectQuery = Array.isArray(fields) ? this.db.selectFrom(tableName).select(fields) : this.db.selectFrom(tableName).select([fields]);
        } else {
            selectQuery = this.db.selectFrom(tableName).selectAll();
        }

        // 默认过滤软删除的数据
        selectQuery = selectQuery.where('state', '<>', 2);

        // 添加 exec 方法 - 返回数据列表
        selectQuery.exec = async function () {
            const result = await this.execute();
            return { data: result };
        };

        return selectQuery;
    }

    // 查询所有记录 - 支持链式调用
    getAll(tableName, fields) {
        let selectQuery;

        if (fields) {
            selectQuery = Array.isArray(fields) ? this.db.selectFrom(tableName).select(fields) : this.db.selectFrom(tableName).select([fields]);
        } else {
            selectQuery = this.db.selectFrom(tableName).selectAll();
        }

        // 默认过滤软删除的数据
        selectQuery = selectQuery.where('state', '<>', 2);

        // 添加 exec 方法，执行查询所有记录
        selectQuery.exec = async function () {
            const result = await this.execute();
            return { data: result }; // 返回统一格式
        };

        return selectQuery;
    }

    // 便捷的计数方法 - 支持链式调用
    getCount(tableName) {
        const sql = this.sql;
        const countQuery = this.db
            .selectFrom(tableName)
            .select(sql`count(*)`.as('total'))
            .where('state', '<>', 2);

        // 添加便捷的 exec 方法
        countQuery.exec = async function () {
            const result = await this.executeTakeFirst();
            const count = Number(result?.total || 0);
            return { data: count }; // 返回统一格式
        };

        return countQuery;
    }

    // 获取原始数据库实例
    getDb() {
        return this.db;
    }
}
