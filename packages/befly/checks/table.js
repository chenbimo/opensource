import path from 'node:path';
import { ruleSplit } from '../utils/util.js';
import { Logger } from '../utils/Logger.js';

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
                    const ruleParts = ruleSplit(rule);

                    if (ruleParts.length !== 5) {
                        Logger.warn(`${fileName} 文件 ${fieldName} 验证规则错误，应包含 5 个部分，但包含 ${ruleParts.length} 个部分`);
                        fileValid = false;
                        continue;
                    }

                    const [name, type, minStr, maxStr, spec] = ruleParts;

                    // 验证类型（必须严格使用小写类型名称）
                    const validTypes = ['number', 'string', 'text', 'array'];
                    if (!validTypes.includes(type)) {
                        Logger.warn(`${fileName} 文件 ${fieldName} 类型 ${type} 不支持，应为小写的 number、string、text 或 array`);
                        fileValid = false;
                        continue;
                    }

                    // 验证最小值/最大值
                    if (minStr !== 'null' && isNaN(parseInt(minStr))) {
                        Logger.warn(`${fileName} 文件 ${fieldName} 最小值 ${minStr} 应为数字或 "null"`);
                        fileValid = false;
                        continue;
                    }

                    if (maxStr !== 'null' && isNaN(parseInt(maxStr))) {
                        Logger.warn(`${fileName} 文件 ${fieldName} 最大值 ${maxStr} 应为数字或 "null"`);
                        fileValid = false;
                        continue;
                    }

                    // 验证特殊规则
                    if (spec !== 'null') {
                        if (type === 'number' && spec.includes('=')) {
                            // 数字计算表达式应包含安全字符
                            const safePattern = /^[x\d\+\-\*\/\(\)\.\s\%]+$/;
                            const expressionPart = spec.split('=')[0].trim();

                            if (!safePattern.test(expressionPart)) {
                                Logger.warn(`${fileName} 文件 ${fieldName} 表达式 ${expressionPart} 包含不安全的字符`);
                                fileValid = false;
                                continue;
                            }

                            // 验证等号右侧是否为数字
                            const rightPart = spec.split('=')[1].trim();
                            if (isNaN(parseFloat(rightPart))) {
                                Logger.error(`${fileName} 文件 ${fieldName} 计算规则右边必须是数字，而不是 ${rightPart}`);
                                fileValid = false;
                                continue;
                            }
                        } else if (type === 'string' || type === 'array' || type === 'text') {
                            // 尝试编译正则表达式以检查是否有效
                            try {
                                new RegExp(spec);
                            } catch (e) {
                                Logger.error(`${fileName} 文件 ${fieldName} 正则表达式 ${spec} 无效: ${e.message}`);
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
