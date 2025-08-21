import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Env } from '../config/env.js';
import { Logger } from '../utils/logger.js';
import { ruleSplit } from '../utils/util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据类型映射到数据库字段类型
const typeMapping = {
    number: 'BIGINT',
    string: 'VARCHAR',
    text: 'MEDIUMTEXT',
    array: 'VARCHAR(1000)' // JSON格式存储
};

// 获取字段的SQL定义
const getColumnDefinition = (fieldName, rule) => {
    const ruleParts = ruleSplit(rule);
    if (ruleParts.length !== 5) {
        throw new Error(`字段 ${fieldName} 规则格式错误`);
    }

    const [displayName, type, minStr, maxStr, spec] = ruleParts;

    let sqlType = typeMapping[type];
    if (!sqlType) {
        throw new Error(`不支持的数据类型: ${type}`);
    }

    // 处理字符串类型的长度
    if (type === 'string') {
        const maxLength = maxStr === 'null' ? 255 : parseInt(maxStr);
        sqlType = `VARCHAR(${Math.min(maxLength, 65535)})`;
    }

    // 构建完整的列定义
    let columnDef = `\`${fieldName}\` ${sqlType}`;

    // 添加注释
    if (displayName && displayName !== 'null') {
        columnDef += ` COMMENT "${displayName.replace(/"/g, '\\"')}"`;
    }

    return columnDef;
};

// 创建数据库连接
const createConnection = async () => {
    if (Env.MYSQL_ENABLE !== 1) {
        throw new Error('MySQL 未启用，请在环境变量中设置 MYSQL_ENABLE=1');
    }

    const mariadb = await import('mariadb');

    const config = {
        host: Env.MYSQL_HOST || '127.0.0.1',
        port: Env.MYSQL_PORT || 3306,
        database: Env.MYSQL_DB || 'test',
        user: Env.MYSQL_USER || 'root',
        password: Env.MYSQL_PASSWORD || 'root',
        charset: 'utf8mb4',
        timezone: Env.TIMEZONE || 'local'
    };

    return await mariadb.createConnection(config);
};

// 检查表是否存在
const tableExists = async (conn, tableName) => {
    const result = await conn.query('SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [Env.MYSQL_DB || 'test', tableName]);
    return result[0].count > 0;
};

// 获取表的现有列信息
const getTableColumns = async (conn, tableName) => {
    const result = await conn.query(
        `SELECT
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH,
            NUMERIC_PRECISION,
            NUMERIC_SCALE,
            IS_NULLABLE,
            COLUMN_DEFAULT,
            COLUMN_COMMENT,
            COLUMN_TYPE
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION`,
        [Env.MYSQL_DB || 'test', tableName]
    );

    const columns = {};
    result.forEach((row) => {
        columns[row.COLUMN_NAME] = {
            type: row.DATA_TYPE,
            columnType: row.COLUMN_TYPE, // 完整的类型定义，如 varchar(255)
            length: row.CHARACTER_MAXIMUM_LENGTH,
            precision: row.NUMERIC_PRECISION,
            scale: row.NUMERIC_SCALE,
            nullable: row.IS_NULLABLE === 'YES',
            defaultValue: row.COLUMN_DEFAULT,
            comment: row.COLUMN_COMMENT
        };
    });
    return columns;
};

// 创建表
const createTable = async (conn, tableName, fields) => {
    const columns = [];

    // 添加系统默认字段
    columns.push('`id` BIGINT PRIMARY KEY COMMENT "主键ID"');
    columns.push('`created_at` BIGINT NOT NULL COMMENT "创建时间"');
    columns.push('`updated_at` BIGINT NOT NULL COMMENT "更新时间"');
    columns.push('`deleted_at` BIGINT DEFAULT NULL COMMENT "删除时间"');
    columns.push('`state` INT DEFAULT 0 COMMENT "状态字段"');

    // 添加自定义字段
    for (const [fieldName, rule] of Object.entries(fields)) {
        try {
            const columnDef = getColumnDefinition(fieldName, rule);
            columns.push(columnDef);
        } catch (error) {
            Logger.error(`处理字段 ${fieldName} 时出错:`, error.message);
            throw error;
        }
    }

    const createTableSQL = `
        CREATE TABLE \`${tableName}\` (
            ${columns.join(',\n            ')},
            INDEX \`idx_created_at\` (\`created_at\`),
            INDEX \`idx_updated_at\` (\`updated_at\`),
            INDEX \`idx_state\` (\`state\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT="${tableName} 表"
    `;

    await conn.query(createTableSQL);
    Logger.info(`表 ${tableName} 创建成功`);
};

// 比较字段定义是否有变化
const compareFieldDefinition = (existingColumn, newRule) => {
    const ruleParts = ruleSplit(newRule);
    if (ruleParts.length !== 5) {
        return { hasChanges: false, reason: '规则格式错误' };
    }

    const [displayName, type, minStr, maxStr, spec] = ruleParts;
    const changes = [];

    // 检查数据类型变化
    const expectedType = typeMapping[type];
    if (!expectedType) {
        return { hasChanges: false, reason: `不支持的数据类型: ${type}` };
    }

    // 对于 string 类型，检查长度变化
    if (type === 'string') {
        const newMaxLength = maxStr === 'null' ? 255 : parseInt(maxStr);
        const currentLength = existingColumn.length;

        if (currentLength !== newMaxLength) {
            changes.push({
                type: 'length',
                current: currentLength,
                new: newMaxLength,
                field: 'CHARACTER_MAXIMUM_LENGTH'
            });
        }
    }

    // 检查注释变化
    if (displayName && displayName !== 'null') {
        const currentComment = existingColumn.comment || '';
        if (currentComment !== displayName) {
            changes.push({
                type: 'comment',
                current: currentComment,
                new: displayName,
                field: 'COLUMN_COMMENT'
            });
        }
    }

    // 检查基础数据类型变化（这个比较复杂，暂时只检查明显的不匹配）
    const currentType = existingColumn.type.toLowerCase();
    let expectedDbType = '';

    switch (type) {
        case 'number':
            expectedDbType = 'bigint';
            break;
        case 'string':
            expectedDbType = 'varchar';
            break;
        case 'text':
            expectedDbType = 'mediumtext';
            break;
        case 'array':
            expectedDbType = 'varchar';
            break;
    }

    if (currentType !== expectedDbType) {
        changes.push({
            type: 'datatype',
            current: currentType,
            new: expectedDbType,
            field: 'DATA_TYPE'
        });
    }

    return {
        hasChanges: changes.length > 0,
        changes: changes,
        reason: changes.length > 0 ? `发现 ${changes.length} 个变化` : '无变化'
    };
};

// 生成ALTER语句来修改字段
const generateAlterStatement = (tableName, fieldName, rule, changes) => {
    const columnDef = getColumnDefinition(fieldName, rule);

    // 对于大多数变化，使用 MODIFY COLUMN
    return `ALTER TABLE \`${tableName}\` MODIFY COLUMN ${columnDef}`;
};

// 同步表字段
const syncTableFields = async (conn, tableName, fields) => {
    const existingColumns = await getTableColumns(conn, tableName);
    const systemFields = ['id', 'created_at', 'updated_at', 'deleted_at', 'state'];

    for (const [fieldName, rule] of Object.entries(fields)) {
        try {
            if (existingColumns[fieldName]) {
                // 字段已存在，检查是否需要修改
                const comparison = compareFieldDefinition(existingColumns[fieldName], rule);

                if (comparison.hasChanges) {
                    Logger.info(`字段 ${tableName}.${fieldName} 需要更新:`);
                    comparison.changes.forEach((change) => {
                        Logger.info(`  - ${change.type}: ${change.current} → ${change.new}`);
                    });

                    // 生成并执行ALTER语句
                    const alterSQL = generateAlterStatement(tableName, fieldName, rule, comparison.changes);
                    Logger.info(`执行SQL: ${alterSQL}`);

                    await conn.query(alterSQL);
                    Logger.info(`表 ${tableName} 字段 ${fieldName} 更新成功`);
                } else {
                    Logger.info(`字段 ${tableName}.${fieldName} 无变化，跳过`);
                }
            } else {
                // 添加新字段
                const columnDef = getColumnDefinition(fieldName, rule);
                const alterSQL = `ALTER TABLE \`${tableName}\` ADD COLUMN ${columnDef}`;
                await conn.query(alterSQL);
                Logger.info(`表 ${tableName} 添加字段 ${fieldName} 成功`);
            }
        } catch (error) {
            Logger.error(`同步字段 ${fieldName} 时出错:`, error.message);
            throw error;
        }
    }
};

// 处理单个表文件
const processTableFile = async (conn, filePath) => {
    try {
        const fileName = path.basename(filePath, '.json');
        const tableName = fileName;

        Logger.info(`处理表定义文件: ${fileName}`);

        // 读取表定义
        const tableDefinition = await Bun.file(filePath).json();

        // 验证字段定义
        const reservedFields = ['id', 'created_at', 'updated_at', 'deleted_at', 'state'];
        for (const fieldName of Object.keys(tableDefinition)) {
            if (reservedFields.includes(fieldName)) {
                throw new Error(`字段 ${fieldName} 是保留字段，不能在表定义中使用`);
            }
        }

        // 检查表是否存在
        if (await tableExists(conn, tableName)) {
            Logger.info(`表 ${tableName} 已存在，同步字段...`);
            await syncTableFields(conn, tableName, tableDefinition);
        } else {
            Logger.info(`表 ${tableName} 不存在，创建表...`);
            await createTable(conn, tableName, tableDefinition);
        }

        Logger.info(`表 ${tableName} 同步完成`);
    } catch (error) {
        Logger.error(`处理表文件 ${filePath} 时出错:`, error);
        throw error;
    }
};

// 主同步函数
const syncDatabase = async () => {
    let conn = null;

    try {
        Logger.info('开始数据库表结构同步...');

        // 创建数据库连接
        conn = await createConnection();
        Logger.info('数据库连接成功');

        // 扫描tables目录
        const tablesGlob = new Bun.Glob('*.json');
        const coreTablesDir = path.join(__dirname, '..', 'tables');
        const userTablesDir = path.join(process.cwd(), 'tables');

        let processedCount = 0;

        // 处理核心表定义
        try {
            for await (const file of tablesGlob.scan({
                cwd: coreTablesDir,
                absolute: true,
                onlyFiles: true
            })) {
                await processTableFile(conn, file);
                processedCount++;
            }
        } catch (error) {
            Logger.warn('核心表目录扫描出错:', error.message);
        }

        // 处理用户表定义
        try {
            for await (const file of tablesGlob.scan({
                cwd: userTablesDir,
                absolute: true,
                onlyFiles: true
            })) {
                await processTableFile(conn, file);
                processedCount++;
            }
        } catch (error) {
            Logger.warn('用户表目录扫描出错:', error.message);
        }

        Logger.info(`数据库同步完成，共处理 ${processedCount} 个表`);
    } catch (error) {
        Logger.error('数据库同步失败:', error);
        process.exit(1);
    } finally {
        if (conn) {
            try {
                await conn.end();
                Logger.info('数据库连接已关闭');
            } catch (error) {
                Logger.warn('关闭数据库连接时出错:', error.message);
            }
        }
    }
};

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
    syncDatabase();
}

export { syncDatabase };
