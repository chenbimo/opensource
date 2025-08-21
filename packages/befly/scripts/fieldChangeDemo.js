#!/usr/bin/env node

/**
 * 字段变更检测演示
 * 展示如何检测和应用数据库字段变更
 */

import { ruleSplit } from '../utils/util.js';

console.log('='.repeat(60));
console.log('字段变更检测演示');
console.log('='.repeat(60));

// 模拟现有数据库字段信息
const mockExistingFields = {
    username: {
        type: 'varchar',
        columnType: 'varchar(50)',
        length: 50,
        comment: '用户名'
    },
    email: {
        type: 'varchar',
        columnType: 'varchar(100)',
        length: 100,
        comment: '邮箱地址'
    },
    description: {
        type: 'varchar',
        columnType: 'varchar(500)',
        length: 500,
        comment: '描述'
    }
};

// 新的字段定义
const newFieldDefinitions = {
    username: '用户名,string,2,100,null', // 长度从50改为100
    email: '用户邮箱,string,5,100,^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$', // 注释变更
    description: '详细描述,text,0,5000,null', // 类型从string改为text
    newField: '新字段,string,1,200,null' // 全新字段
};

// 字段变更检测函数
const detectFieldChanges = (existingColumn, newRule) => {
    const ruleParts = ruleSplit(newRule);
    if (ruleParts.length !== 5) {
        return { hasChanges: false, reason: '规则格式错误' };
    }

    const [displayName, type, minStr, maxStr, spec] = ruleParts;
    const changes = [];

    // 检查长度变化（仅string类型）
    if (type === 'string') {
        const newMaxLength = maxStr === 'null' ? 255 : parseInt(maxStr);
        const currentLength = existingColumn.length;

        if (currentLength !== newMaxLength) {
            changes.push({
                type: 'length',
                current: currentLength,
                new: newMaxLength
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
                new: displayName
            });
        }
    }

    // 检查数据类型变化
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
            new: expectedDbType
        });
    }

    return {
        hasChanges: changes.length > 0,
        changes: changes
    };
};

// 生成ALTER语句
const generateAlterSQL = (tableName, fieldName, rule) => {
    const ruleParts = ruleSplit(rule);
    const [displayName, type, minStr, maxStr, spec] = ruleParts;

    let sqlType = '';
    switch (type) {
        case 'number':
            sqlType = 'BIGINT';
            break;
        case 'string':
            const maxLength = maxStr === 'null' ? 255 : parseInt(maxStr);
            sqlType = `VARCHAR(${Math.min(maxLength, 65535)})`;
            break;
        case 'text':
            sqlType = 'MEDIUMTEXT';
            break;
        case 'array':
            sqlType = 'VARCHAR(1000)';
            break;
    }

    let columnDef = `\`${fieldName}\` ${sqlType}`;
    if (displayName && displayName !== 'null') {
        columnDef += ` COMMENT "${displayName}"`;
    }

    return `ALTER TABLE \`${tableName}\` MODIFY COLUMN ${columnDef}`;
};

console.log('\n📋 字段变更检测结果：\n');

// 检测每个字段的变化
for (const [fieldName, newRule] of Object.entries(newFieldDefinitions)) {
    console.log(`🔍 检查字段: ${fieldName}`);
    console.log(`   新定义: ${newRule}`);

    if (mockExistingFields[fieldName]) {
        // 现有字段，检测变化
        const existing = mockExistingFields[fieldName];
        console.log(`   现有类型: ${existing.columnType} COMMENT "${existing.comment}"`);

        const result = detectFieldChanges(existing, newRule);

        if (result.hasChanges) {
            console.log(`   ✨ 检测到变化:`);
            result.changes.forEach((change) => {
                console.log(`      - ${change.type}: ${change.current} → ${change.new}`);
            });

            const alterSQL = generateAlterSQL('example_table', fieldName, newRule);
            console.log(`   📝 生成SQL: ${alterSQL}`);
        } else {
            console.log(`   ✅ 无变化`);
        }
    } else {
        // 新字段
        console.log(`   🆕 新字段，需要添加`);
        const addSQL = generateAlterSQL('example_table', fieldName, newRule).replace('MODIFY COLUMN', 'ADD COLUMN');
        console.log(`   📝 生成SQL: ${addSQL}`);
    }

    console.log('');
}

console.log('='.repeat(60));
console.log('变更检测总结：');
console.log('='.repeat(60));

let totalChanges = 0;
let newFields = 0;
let modifiedFields = 0;

for (const [fieldName, newRule] of Object.entries(newFieldDefinitions)) {
    if (mockExistingFields[fieldName]) {
        const result = detectFieldChanges(mockExistingFields[fieldName], newRule);
        if (result.hasChanges) {
            modifiedFields++;
            totalChanges += result.changes.length;
        }
    } else {
        newFields++;
    }
}

console.log(`📊 统计信息:`);
console.log(`   - 新增字段: ${newFields} 个`);
console.log(`   - 修改字段: ${modifiedFields} 个`);
console.log(`   - 总变更数: ${totalChanges} 个`);

console.log(`\n🎯 优势:`);
console.log(`   ✅ 自动检测字段变更`);
console.log(`   ✅ 智能生成ALTER语句`);
console.log(`   ✅ 支持多种变更类型`);
console.log(`   ✅ 安全的增量更新`);
console.log(`   ✅ 详细的变更日志`);

console.log(`\n📖 支持的变更类型:`);
console.log(`   - 字段长度调整 (string → varchar)`);
console.log(`   - 注释内容更新 (comment)`);
console.log(`   - 数据类型转换 (string → text)`);
console.log(`   - 新字段添加 (add column)`);

console.log(`\n⚠️  注意事项:`);
console.log(`   - 数据类型变更需要确保数据兼容性`);
console.log(`   - 建议在生产环境前进行备份`);
console.log(`   - 某些类型变更可能需要手动处理`);

console.log('='.repeat(60));
