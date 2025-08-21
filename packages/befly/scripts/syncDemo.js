#!/usr/bin/env node

/**
 * 数据库同步演示脚本
 * 展示如何使用 dbSync.js 进行数据库表结构同步
 */

import { syncDatabase } from '../scripts/dbSync.js';
import { Logger } from '../utils/logger.js';

console.log('='.repeat(60));
console.log('数据库表结构同步演示');
console.log('='.repeat(60));

console.log(`
这个演示将展示如何使用 dbSync.js 同步数据库表结构。

功能特性：
✓ 根据 tables/*.json 文件自动创建数据库表
✓ 支持 number、string、text、array 四种数据类型
✓ 自动添加系统字段 (id, created_at, updated_at, deleted_at, state)
✓ 支持字段验证规则和注释
✓ 安全的保留字段检查
✓ 表结构增量同步

数据类型映射：
- number  → BIGINT
- string  → VARCHAR(length)
- text    → MEDIUMTEXT
- array   → VARCHAR(1000) [JSON格式]

使用方法：
1. 创建表定义文件到 tables/ 目录
2. 运行同步命令
3. 检查数据库表结构

示例表定义文件 (tables/users.json)：
{
    "name": "用户名,string,2,50,null",
    "email": "邮箱,string,5,100,^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\\\.[a-zA-Z]{2,}$",
    "age": "年龄,number,1,150,null",
    "bio": "个人简介,text,0,5000,null",
    "tags": "标签,array,0,10,null"
}

注意事项：
- 环境变量需要正确配置 MySQL 连接信息
- 不能使用保留字段名 (id, created_at, updated_at, deleted_at, state)
- 字段规则格式：显示名称,数据类型,最小值,最大值,特殊规则
`);

// 检查环境配置
console.log('检查环境配置...');

const requiredEnvVars = ['MYSQL_ENABLE', 'MYSQL_HOST', 'MYSQL_PORT', 'MYSQL_DB', 'MYSQL_USER', 'MYSQL_PASSWORD'];

let hasValidConfig = true;

requiredEnvVars.forEach((envVar) => {
    const value = process.env[envVar];
    if (!value) {
        console.log(`❌ 环境变量 ${envVar} 未设置`);
        hasValidConfig = false;
    } else {
        console.log(`✓ 环境变量 ${envVar} 已设置`);
    }
});

if (!hasValidConfig) {
    console.log(`
❌ 环境配置不完整，请设置以下环境变量：

export MYSQL_ENABLE=1
export MYSQL_HOST=127.0.0.1
export MYSQL_PORT=3306
export MYSQL_DB=your_database
export MYSQL_USER=your_username
export MYSQL_PASSWORD=your_password

或者创建 .env 文件包含这些配置。
    `);
    process.exit(1);
}

// 检查 MYSQL_ENABLE
if (process.env.MYSQL_ENABLE !== '1') {
    console.log(`
❌ MySQL 未启用，请设置 MYSQL_ENABLE=1
    `);
    process.exit(1);
}

console.log(`
✓ 环境配置检查通过

开始同步数据库表结构...
='.repeat(60)
`);

// 运行同步
try {
    await syncDatabase();
    console.log(`
='.repeat(60)
✓ 数据库同步完成！

您可以检查数据库以确认表结构已正确创建或更新。

下一步：
1. 检查生成的表结构
2. 验证字段类型和索引
3. 测试数据插入和查询

更多信息请参考 docs/table.md 文档。
='.repeat(60)
    `);
} catch (error) {
    console.log(`
='.repeat(60)
❌ 数据库同步失败！

错误信息：${error.message}

可能的解决方案：
1. 检查数据库连接配置
2. 确认数据库服务正在运行
3. 验证用户权限
4. 检查表定义文件格式

更多帮助请参考 docs/table.md 文档。
='.repeat(60)
    `);
    process.exit(1);
}
