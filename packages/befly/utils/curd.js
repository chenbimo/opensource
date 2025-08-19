/**
 * SQL 构造器 - 生产级稳定版本
 */
export class SqlBuilder {
    constructor() {
        this.reset();
    }

    reset() {
        this._select = [];
        this._from = '';
        this._where = [];
        this._joins = [];
        this._orderBy = [];
        this._groupBy = [];
        this._having = [];
        this._limit = null;
        this._offset = null;
        this._params = [];
        return this;
    }

    select(fields = '*') {
        if (Array.isArray(fields)) {
            this._select = [...this._select, ...fields];
        } else if (typeof fields === 'string') {
            this._select.push(fields);
        } else {
            throw new Error('SELECT fields must be string or array');
        }
        return this;
    }

    from(table) {
        if (typeof table !== 'string' || !table.trim()) {
            throw new Error('FROM table must be a non-empty string');
        }
        this._from = table.trim();
        return this;
    }

    // 安全的参数验证
    _validateParam(value) {
        if (value === undefined) {
            throw new Error('Parameter value cannot be undefined');
        }
        return value;
    }

    // 处理复杂的 where 条件对象
    _processWhereConditions(whereObj) {
        if (!whereObj || typeof whereObj !== 'object') {
            return;
        }

        Object.entries(whereObj).forEach(([key, value]) => {
            // 跳过undefined值
            if (value === undefined) {
                return;
            }

            if (key === '$and') {
                if (Array.isArray(value)) {
                    value.forEach((condition) => this._processWhereConditions(condition));
                }
            } else if (key === '$or') {
                if (Array.isArray(value)) {
                    const orConditions = [];
                    const tempParams = [];

                    value.forEach((condition) => {
                        const tempBuilder = new SqlBuilder();
                        tempBuilder._processWhereConditions(condition);
                        if (tempBuilder._where.length > 0) {
                            orConditions.push(`(${tempBuilder._where.join(' AND ')})`);
                            tempParams.push(...tempBuilder._params);
                        }
                    });

                    if (orConditions.length > 0) {
                        this._where.push(`(${orConditions.join(' OR ')})`);
                        this._params.push(...tempParams);
                    }
                }
            } else if (key.includes('$')) {
                // 一级属性格式：age$gt, role$in 等
                const lastDollarIndex = key.lastIndexOf('$');
                const fieldName = key.substring(0, lastDollarIndex);
                const operator = '$' + key.substring(lastDollarIndex + 1);

                this._validateParam(value);

                switch (operator) {
                    case '$ne':
                    case '$not':
                        this._where.push(`${fieldName} != ?`);
                        this._params.push(value);
                        break;
                    case '$in':
                        if (Array.isArray(value) && value.length > 0) {
                            const placeholders = value.map(() => '?').join(',');
                            this._where.push(`${fieldName} IN (${placeholders})`);
                            this._params.push(...value);
                        }
                        break;
                    case '$nin':
                    case '$notIn':
                        if (Array.isArray(value) && value.length > 0) {
                            const placeholders = value.map(() => '?').join(',');
                            this._where.push(`${fieldName} NOT IN (${placeholders})`);
                            this._params.push(...value);
                        }
                        break;
                    case '$like':
                        this._where.push(`${fieldName} LIKE ?`);
                        this._params.push(value);
                        break;
                    case '$notLike':
                        this._where.push(`${fieldName} NOT LIKE ?`);
                        this._params.push(value);
                        break;
                    case '$gt':
                        this._where.push(`${fieldName} > ?`);
                        this._params.push(value);
                        break;
                    case '$gte':
                        this._where.push(`${fieldName} >= ?`);
                        this._params.push(value);
                        break;
                    case '$lt':
                        this._where.push(`${fieldName} < ?`);
                        this._params.push(value);
                        break;
                    case '$lte':
                        this._where.push(`${fieldName} <= ?`);
                        this._params.push(value);
                        break;
                    case '$between':
                        if (Array.isArray(value) && value.length === 2) {
                            this._where.push(`${fieldName} BETWEEN ? AND ?`);
                            this._params.push(value[0], value[1]);
                        }
                        break;
                    case '$notBetween':
                        if (Array.isArray(value) && value.length === 2) {
                            this._where.push(`${fieldName} NOT BETWEEN ? AND ?`);
                            this._params.push(value[0], value[1]);
                        }
                        break;
                    case '$null':
                        if (value === true) {
                            this._where.push(`${fieldName} IS NULL`);
                        }
                        break;
                    case '$notNull':
                        if (value === true) {
                            this._where.push(`${fieldName} IS NOT NULL`);
                        }
                        break;
                    default:
                        this._where.push(`${fieldName} = ?`);
                        this._params.push(value);
                }
            } else {
                // 简单的等于条件
                this._validateParam(value);
                this._where.push(`${key} = ?`);
                this._params.push(value);
            }
        });
    }

    where(condition, value = null) {
        if (typeof condition === 'object' && condition !== null) {
            // 处理对象形式的where条件，会自动过滤undefined
            this._processWhereConditions(condition);
        } else if (value !== null) {
            this._validateParam(value);
            this._where.push(`${condition} = ?`);
            this._params.push(value);
        } else if (typeof condition === 'string') {
            this._where.push(condition);
        }
        return this;
    }

    leftJoin(table, on) {
        if (typeof table !== 'string' || typeof on !== 'string') {
            throw new Error('JOIN table and condition must be strings');
        }
        this._joins.push(`LEFT JOIN ${table} ON ${on}`);
        return this;
    }

    orderBy(fields) {
        if (!Array.isArray(fields)) {
            throw new Error('orderBy must be an array of strings in "field#direction" format');
        }

        fields.forEach((item) => {
            if (typeof item !== 'string' || !item.includes('#')) {
                throw new Error('orderBy field must be a string in "field#direction" format (e.g., "name#ASC", "id#DESC")');
            }

            const [fieldName, direction] = item.split('#');
            const cleanField = fieldName.trim();
            const cleanDir = direction.trim().toUpperCase();

            if (!cleanField) {
                throw new Error('Field name cannot be empty in orderBy');
            }

            if (!['ASC', 'DESC'].includes(cleanDir)) {
                throw new Error('ORDER BY direction must be ASC or DESC');
            }

            this._orderBy.push(`${cleanField} ${cleanDir}`);
        });

        return this;
    }

    groupBy(field) {
        if (Array.isArray(field)) {
            this._groupBy = [...this._groupBy, ...field.filter((f) => typeof f === 'string')];
        } else if (typeof field === 'string') {
            this._groupBy.push(field);
        }
        return this;
    }

    having(condition) {
        if (typeof condition === 'string') {
            this._having.push(condition);
        }
        return this;
    }

    limit(count, offset = null) {
        if (typeof count !== 'number' || count < 0) {
            throw new Error('LIMIT count must be a non-negative number');
        }
        this._limit = Math.floor(count);
        if (offset !== null) {
            if (typeof offset !== 'number' || offset < 0) {
                throw new Error('OFFSET must be a non-negative number');
            }
            this._offset = Math.floor(offset);
        }
        return this;
    }

    offset(count) {
        if (typeof count !== 'number' || count < 0) {
            throw new Error('OFFSET must be a non-negative number');
        }
        this._offset = Math.floor(count);
        return this;
    }

    // 构建 SELECT 查询
    toSelectSql() {
        let sql = 'SELECT ';

        sql += this._select.length > 0 ? this._select.join(', ') : '*';

        if (!this._from) {
            throw new Error('FROM table is required');
        }
        sql += ` FROM ${this._from}`;

        if (this._joins.length > 0) {
            sql += ' ' + this._joins.join(' ');
        }

        if (this._where.length > 0) {
            sql += ' WHERE ' + this._where.join(' AND ');
        }

        if (this._groupBy.length > 0) {
            sql += ' GROUP BY ' + this._groupBy.join(', ');
        }

        if (this._having.length > 0) {
            sql += ' HAVING ' + this._having.join(' AND ');
        }

        if (this._orderBy.length > 0) {
            sql += ' ORDER BY ' + this._orderBy.join(', ');
        }

        if (this._limit !== null) {
            sql += ` LIMIT ${this._limit}`;
            if (this._offset !== null) {
                sql += ` OFFSET ${this._offset}`;
            }
        }

        return { sql, params: [...this._params] };
    }

    // 构建 INSERT 查询
    toInsertSql(table, data) {
        if (!table || typeof table !== 'string') {
            throw new Error('Table name is required for INSERT');
        }

        if (!data || typeof data !== 'object') {
            throw new Error('Data is required for INSERT');
        }

        if (Array.isArray(data)) {
            if (data.length === 0) {
                throw new Error('Insert data cannot be empty');
            }

            const fields = Object.keys(data[0]);
            if (fields.length === 0) {
                throw new Error('Insert data must have at least one field');
            }

            const placeholders = fields.map(() => '?').join(', ');
            const values = data.map(() => `(${placeholders})`).join(', ');

            const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES ${values}`;
            const params = data.flatMap((row) => fields.map((field) => row[field]));

            return { sql, params };
        } else {
            const fields = Object.keys(data);
            if (fields.length === 0) {
                throw new Error('Insert data must have at least one field');
            }

            const placeholders = fields.map(() => '?').join(', ');
            const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
            const params = fields.map((field) => data[field]);

            return { sql, params };
        }
    }

    // 构建 UPDATE 查询
    toUpdateSql(table, data) {
        if (!table || typeof table !== 'string') {
            throw new Error('Table name is required for UPDATE');
        }

        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new Error('Data object is required for UPDATE');
        }

        const fields = Object.keys(data);
        if (fields.length === 0) {
            throw new Error('Update data must have at least one field');
        }

        const setFields = fields.map((field) => `${field} = ?`);
        const params = [...Object.values(data), ...this._params];

        let sql = `UPDATE ${table} SET ${setFields.join(', ')}`;

        if (this._where.length > 0) {
            sql += ' WHERE ' + this._where.join(' AND ');
        } else {
            throw new Error('UPDATE requires WHERE condition for safety');
        }

        return { sql, params };
    }

    // 构建 DELETE 查询
    toDeleteSql(table) {
        if (!table || typeof table !== 'string') {
            throw new Error('Table name is required for DELETE');
        }

        let sql = `DELETE FROM ${table}`;

        if (this._where.length > 0) {
            sql += ' WHERE ' + this._where.join(' AND ');
        } else {
            throw new Error('DELETE requires WHERE condition for safety');
        }

        return { sql, params: [...this._params] };
    }

    // 构建 COUNT 查询
    toCountSql() {
        let sql = 'SELECT COUNT(*) as total';

        if (!this._from) {
            throw new Error('FROM table is required for COUNT');
        }
        sql += ` FROM ${this._from}`;

        if (this._joins.length > 0) {
            sql += ' ' + this._joins.join(' ');
        }

        if (this._where.length > 0) {
            sql += ' WHERE ' + this._where.join(' AND ');
        }

        return { sql, params: [...this._params] };
    }
}

/**
 * 创建新的 SQL 构造器实例
 */
export function createQueryBuilder() {
    return new SqlBuilder();
}
