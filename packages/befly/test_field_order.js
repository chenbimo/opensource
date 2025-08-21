/**
 * 测试新的7字段顺序：名称，类型，最小值，最大值，默认值，是否索引，正则约束
 */

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

    // 如果超过7个部分，把第7个部分之后的内容合并为第7个部分（正则表达式可能包含管道符）
    const mergedRule = allParts.slice(6).join('|'); // 合并最后的正则部分
    return [
        allParts[0], // 显示名
        allParts[1], // 类型
        allParts[2], // 最小值
        allParts[3], // 最大值
        allParts[4], // 默认值
        allParts[5], // 是否索引
        mergedRule // 正则约束（可能包含管道符）
    ];
};

console.log('🧪 测试新的7字段顺序解析...\n');

// 测试用例
const testCases = [
    {
        name: '基本字符串字段',
        rule: '用户名|string|2|50|null|1|null',
        expected: ['用户名', 'string', '2', '50', 'null', '1', 'null']
    },
    {
        name: '带默认值的数字字段',
        rule: '年龄|number|1|150|18|0|null',
        expected: ['年龄', 'number', '1', '150', '18', '0', 'null']
    },
    {
        name: '带正则约束的邮箱字段',
        rule: '邮箱|string|5|100|null|1|^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        expected: ['邮箱', 'string', '5', '100', 'null', '1', '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$']
    },
    {
        name: '复杂正则（包含管道符）',
        rule: '状态|string|1|20|active|1|^(active|inactive|pending)$',
        expected: ['状态', 'string', '1', '20', 'active', '1', '^(active|inactive|pending)$']
    },
    {
        name: '索引启用的字段',
        rule: '分类|string|1|50|default|1|null',
        expected: ['分类', 'string', '1', '50', 'default', '1', 'null']
    }
];

let allPassed = true;

testCases.forEach((testCase, index) => {
    console.log(`📋 测试 ${index + 1}: ${testCase.name}`);
    console.log(`   规则: ${testCase.rule}`);

    const result = parseFieldRule(testCase.rule);
    console.log(`   解析: [${result.join(', ')}]`);

    const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);
    console.log(`   结果: ${passed ? '✅ 通过' : '❌ 失败'}`);

    if (!passed) {
        console.log(`   期望: [${testCase.expected.join(', ')}]`);
        allPassed = false;
    }
    console.log('');
});

console.log(`🎯 测试总结: ${allPassed ? '✅ 所有测试通过！' : '❌ 部分测试失败'}`);
console.log('\n📋 新的字段顺序说明:');
console.log('   1. 显示名称 - 字段的中文名称');
console.log('   2. 数据类型 - string/number/text/array');
console.log('   3. 最小值 - 最小长度/值限制');
console.log('   4. 最大值 - 最大长度/值限制');
console.log('   5. 默认值 - 字段的默认值');
console.log('   6. 是否索引 - 1=是，0=否');
console.log('   7. 正则约束 - 正则表达式或计算表达式');
