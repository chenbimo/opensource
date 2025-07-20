import { omitFields } from './util.js';

export class Crud {
    constructor(db, redis, sql) {
        this.db = db;
        this.redis = redis;
        this.sql = sql;
        this.initMethods();
    }

    initMethods() {
        // 简单的便捷方法，不修改原有的 Kysely 方法

        // 插入数据
        this.db.insData = this.insData.bind(this);

        // 更新数据
        this.db.updData = this.updData.bind(this);

        // 删除数据
        this.db.delData = this.delData.bind(this);

        // 查询单条记录
        this.db.getDetail = this.getDetail.bind(this);

        // 查询所有记录
        this.db.getAll = this.getAll.bind(this);

        // 查询总数
        this.db.getCount = this.getCount.bind(this);

        // 分页查询
        this.db.getList = this.getList.bind(this);
    }

    async insData(insertQuery, data) {
        const now = Date.now();

        if (Array.isArray(data)) {
            for (let item of data) {
                item.id = await this.redis.genTimeID();
                item.created_at = now;
                item.updated_at = now;
            }
        } else {
            data.id = await this.redis.genTimeID();
            data.created_at = now;
            data.updated_at = now;
        }

        await insertQuery.values(data).executeTakeFirst();
        return Array.isArray(data) ? { ids: data.map((item) => item.id) } : { ids: [data.id] };
    }

    async updData(updateQuery, data) {
        data.updated_at = Date.now();
        const updateData = omitFields(data, ['id', 'created_at', 'deleted_at']);
        await updateQuery.set(updateData).execute();
        return {};
    }

    async delData(deleteQuery) {
        return await deleteQuery.executeTakeFirst();
    }

    async getDetail(selectQuery, fields) {
        if (fields) {
            return await selectQuery.select(fields).executeTakeFirst();
        }
        return await selectQuery.selectAll().executeTakeFirst();
    }

    async getAll(selectQuery, fields) {
        if (fields) {
            return await selectQuery.select(fields).execute();
        }
        return await selectQuery.selectAll().execute();
    }

    async getCount(selectQuery, countField = 'id') {
        const countQuery = selectQuery.select(this.sql`count(${this.sql.raw(countField)})`.as('total'));
        const result = await countQuery.executeTakeFirst();
        return Number(result?.total || 0);
    }

    async getList(table, options = {}) {
        const { where = null, page = 1, pageSize = 10, fields = null, orderBy = null } = options;

        const offset = (page - 1) * pageSize;

        // 数据查询
        let dataQuery = this.db.selectFrom(table);
        if (fields) {
            dataQuery = dataQuery.select(fields);
        } else {
            dataQuery = dataQuery.selectAll();
        }

        // 计数查询
        let countQuery = this.db.selectFrom(table).select(this.sql`count(*)`.as('total'));

        // 添加 where 条件
        if (where) {
            if (Array.isArray(where)) {
                where.forEach((condition) => {
                    dataQuery = dataQuery.where(condition[0], condition[1], condition[2]);
                    countQuery = countQuery.where(condition[0], condition[1], condition[2]);
                });
            } else if (typeof where === 'object') {
                Object.entries(where).forEach(([key, value]) => {
                    dataQuery = dataQuery.where(key, '=', value);
                    countQuery = countQuery.where(key, '=', value);
                });
            }
        }

        // 排序和分页
        if (orderBy) {
            dataQuery = dataQuery.orderBy(orderBy[0], orderBy[1] || 'asc');
        }
        dataQuery = dataQuery.limit(pageSize).offset(offset);

        const [data, countResult] = await Promise.all([dataQuery.execute(), countQuery.executeTakeFirst()]);

        const total = Number(countResult?.total || 0);

        return {
            data,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        };
    }

    getDatabase() {
        return this.db;
    }
}
