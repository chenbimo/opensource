import path from 'node:path';
import { Logger } from '../utils/Logger.js';

// 专门用于处理管道符分隔的字段规则
const parseFieldRule = (rule) => {
    const allParts = rule.split('|');

    // 现在支持7个部分：显示名|类型|最小值|最大值|默认值|是否索引|正则约束
    if (allParts.length <= 7) {
        // 如果少于7个部分，补齐缺失的部分为 null
        while (allParts.length < 7) {
            allParts.push('null');
        }
        return allParts;
    }

    // 如果超过7个部分，保留前6个，剩余的合并为最后的正则约束部分
    return [
        allParts[0], // 显示名
        allParts[1], // 类型
        allParts[2], // 最小值
        allParts[3], // 最大值
        allParts[4], // 默认值
        allParts[5], // 是否索引
        allParts.slice(6).join('|') // 正则约束（可能包含管道符）
    ];
};

export default async () => {
    try {
        const tablesGlob = new Bun.Glob('*.json');
        const coreTablesDir = path.join(__dirname, '..', 'tables');
        const userTablesDir = path.join(process.cwd(), 'tables');

        // 统计信息
        let totalFiles = 0;
        let totalRules = 0;
        let validFiles = 0;
        let invalidFiles = 0;

        const validateFile = async (file) => {
            totalFiles++;
            const fileName = path.basename(file);
            try {
                // 读取并解析 JSON 文件
                const table = await Bun.file(file).json();
                let fileValid = true;
                let fileRules = 0;

                // 保留字段列表
                const reservedFields = ['id', 'created_at', 'updated_at', 'deleted_at', 'state'];

                // 检查 table 中的每个验证规则
                for (const [fieldName, rule] of Object.entries(table)) {
                    fileRules++;
                    totalRules++;

                    // 检查是否使用了保留字段
                    if (reservedFields.includes(fieldName)) {
                        Logger.error(`${fileName} 文件包含保留字段 ${fieldName}，不能在表定义中使用以下字段: ${reservedFields.join(', ')}`);
                        fileValid = false;
                        continue;
                    }

                    // 验证规则格式
                    const ruleParts = parseFieldRule(rule);

                    if (ruleParts.length !== 7) {
                        Logger.warn(`${fileName} 文件 ${fieldName} 验证规则错误，应包含 7 个部分，但包含 ${ruleParts.length} 个部分`);
                        fileValid = false;
                        continue;
                    }

                    const [name, type, minStr, maxStr, defaultValue, isIndexStr, regexConstraint] = ruleParts;

                    // 验证类型（必须严格使用小写类型名称）
                    const validTypes = ['number', 'string', 'text', 'array'];
                    if (!validTypes.includes(type)) {
                        Logger.warn(`${fileName} 文件 ${fieldName} 类型 ${type} 不支持，应为小写的 number、string、text 或 array`);
                        fileValid = false;
                        continue;
                    }

                    // 验证最小值/最大值
                    if (minStr !== '' && minStr !== 'null' && isNaN(parseInt(minStr))) {
                        Logger.warn(`${fileName} 文件 ${fieldName} 最小值 ${minStr} 应为数字或空字符串`);
                        fileValid = false;
                        continue;
                    }

                    if (maxStr !== '' && maxStr !== 'null' && isNaN(parseInt(maxStr))) {
                        Logger.warn(`${fileName} 文件 ${fieldName} 最大值 ${maxStr} 应为数字或空字符串`);
                        fileValid = false;
                        continue;
                    }

                    // 验证索引字段
                    if (isIndexStr !== '' && isIndexStr !== 'null' && !['0', '1'].includes(isIndexStr)) {
                        Logger.warn(`${fileName} 文件 ${fieldName} 索引标识 ${isIndexStr} 应为 0 或 1`);
                        fileValid = false;
                        continue;
                    }

                    // 验证正则约束
                    if (regexConstraint !== '' && regexConstraint !== 'null') {
                        if (type === 'number' && regexConstraint.includes('=')) {
                            // 数字计算表达式应包含安全字符
                            const safePattern = /^[x\d\+\-\*\/\(\)\.\s\%]+$/;
                            const expressionPart = regexConstraint.split('=')[0].trim();

                            if (!safePattern.test(expressionPart)) {
                                Logger.warn(`${fileName} 文件 ${fieldName} 表达式 ${expressionPart} 包含不安全的字符`);
                                fileValid = false;
                                continue;
                            }

                            // 验证等号右侧是否为数字
                            const rightPart = regexConstraint.split('=')[1].trim();
                            if (isNaN(parseFloat(rightPart))) {
                                Logger.error(`${fileName} 文件 ${fieldName} 计算规则右边必须是数字，而不是 ${rightPart}`);
                                fileValid = false;
                                continue;
                            }
                        } else if (type === 'string' || type === 'array' || type === 'text') {
                            // 尝试编译正则表达式以检查是否有效
                            try {
                                new RegExp(regexConstraint);
                            } catch (e) {
                                Logger.error(`${fileName} 文件 ${fieldName} 正则表达式 ${regexConstraint} 无效: ${e.message}`);
                                fileValid = false;
                                continue;
                            }
                        }
                    }
                }

                if (fileValid) {
                    validFiles++;
                } else {
                    invalidFiles++;
                }
            } catch (error) {
                Logger.error(`Table ${fileName} 解析失败: ${error.message}`);
                invalidFiles++;
            }
        };

        for await (const file of tablesGlob.scan({
            cwd: coreTablesDir,
            absolute: true,
            onlyFiles: true
        })) {
            await validateFile(file);
        }

        for await (const file of tablesGlob.scan({
            cwd: userTablesDir,
            absolute: true,
            onlyFiles: true
        })) {
            await validateFile(file);
        }

        if (invalidFiles > 0) {
            return false;
        } else {
            return true;
        }
    } catch (error) {
        Logger.error(`Tables 检查过程中出错:`, error);
        return false;
    }
};
