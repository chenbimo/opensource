# CURD 数据库操作文档

基于 MariaDB 的自定义数据库操作库，提供链式 SQL 构造器和便捷的 CRUD 操作方法。

## 特性

- ✅ 基于 MariaDB 原生 Promise API
- ✅ 支持链式 SQL 构造器
- ✅ 防 SQL 注入（参数化查询）
- ✅ 支持事务操作
- ✅ 支持连接池管理
- ✅ 支持 leftJoin 关联查询
- ✅ 支持高级 where 条件（$in, $like, $gt 等）
- ✅ 支持分页查询
- ✅ 完善的错误处理

## 环境配置

在 `.env` 文件中配置数据库连接信息：

```bash
# 启用 MySQL
MYSQL_ENABLE=1

# 数据库连接配置
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DB=test
MYSQL_USER=root
MYSQL_PASSWORD=root
MYSQL_POOL_MAX=10
MYSQL_DEBUG=0

# 时区配置
TIMEZONE=local
```

## 基本用法

### 1. 获取数据库实例

```javascript
export default async function userApi(befly) {
    const { db } = befly;

    // 数据库实例现在可用
}
```

### 2. 简单查询

#### getDetail - 获取单条记录

```javascript
// 基础用法
const user = await db.getDetail('users', { id: 1 });

// 指定字段
const user = await db.getDetail('users', {
    where: { id: 1 },
    fields: ['id', 'name', 'email']
});

// 支持表别名
const user = await db.getDetail('users u', {
    where: { 'u.id': 1, 'u.status': 1 }
});
```

#### getList - 获取列表（支持分页）

```javascript
// 基础分页查询
const result = await db.getList('users', {
    where: { status: 1 },
    orderBy: ['created_at#DESC'],
    page: 1,
    pageSize: 10
});

// 返回结果结构
{
    list: [...],      // 数据列表
    total: 100,       // 总记录数
    page: 1,          // 当前页
    pageSize: 10      // 每页大小
}

// 复杂查询
const result = await db.getList('users', {
    where: {
        status: 1,
        role: 'admin'
    },
    fields: ['id', 'name', 'email', 'created_at'],
    orderBy: ['created_at#DESC', 'name#ASC'],
    page: 1,
    pageSize: 20
});
```

#### getAll - 获取所有记录

```javascript
// 获取所有符合条件的记录
const users = await db.getAll('users', {
    where: { status: 1 },
    orderBy: ['name#ASC']
});

// 限制字段
const users = await db.getAll('users', {
    where: { status: 1 },
    fields: ['id', 'name'],
    orderBy: ['created_at#DESC']
});
```

#### getCount - 获取记录总数

```javascript
// 基础计数
const count = await db.getCount('users', {
    where: { status: 1 }
});

// 支持 leftJoin 的计数
const count = await db.getCount('users u', {
    where: { 'u.status': 1, 'p.status': 1 },
    leftJoins: ['posts p ON u.id = p.user_id']
});

// 使用高级 where 条件
const count = await db.getCount('users', {
    where: {
        status: 1,
        created_at: { $gte: '2024-01-01' },
        role: { $in: ['admin', 'user'] }
    }
});
```

### 3. 增删改操作

#### insData - 插入数据

```javascript
// 插入单条记录
const result = await db.insData('users', {
    name: 'John Doe',
    email: 'john@example.com',
    status: 1,
    created_at: new Date()
});

// 获取插入的 ID
console.log(result.insertId);
```

#### upData - 更新数据

```javascript
// 更新数据
const result = await db.upData(
    'users',
    {
        name: 'Updated Name',
        updated_at: new Date()
    },
    { id: 1 } // where 条件
);

// 获取影响的行数
console.log(result.affectedRows);
```

#### delData - 删除数据

```javascript
// 删除数据（软删除）
const result = await db.delData('users', {
    id: 1,
    status: 0
});

// 批量删除
const result = await db.delData('users', {
    status: 0,
    created_at: { $lt: '2023-01-01' }
});
```

#### batchInsert - 批量插入

```javascript
// 批量插入
const users = [
    { name: 'User1', email: 'user1@example.com' },
    { name: 'User2', email: 'user2@example.com' },
    { name: 'User3', email: 'user3@example.com' }
];

const result = await db.batchInsert('users', users);
```

## 高级查询条件

### 支持的操作符

```javascript
// 比较操作符
const users = await db.getList('users', {
    where: {
        age: { $gt: 18 }, // age > 18
        score: { $gte: 60 }, // score >= 60
        level: { $lt: 10 }, // level < 10
        points: { $lte: 1000 }, // points <= 1000
        status: { $ne: 0 } // status != 0
    }
});

// 包含操作符
const users = await db.getList('users', {
    where: {
        role: { $in: ['admin', 'moderator'] }, // role IN (...)
        status: { $notIn: [0, -1] }, // status NOT IN (...)
        name: { $like: '%john%' }, // name LIKE '%john%'
        email: { $notLike: '%@temp.com' } // email NOT LIKE '%@temp.com'
    }
});

// 范围和空值操作符
const users = await db.getList('users', {
    where: {
        created_at: { $between: ['2024-01-01', '2024-12-31'] }, // BETWEEN
        deleted_at: { $null: true }, // IS NULL
        email: { $notNull: true } // IS NOT NULL
    }
});
```

### 逻辑操作符

```javascript
// AND 条件（默认）
const users = await db.getList('users', {
    where: {
        status: 1,
        role: 'admin',
        age: { $gte: 18 }
    }
});

// OR 条件
const users = await db.getList('users', {
    where: {
        status: 1,
        $or: [{ role: 'admin' }, { permissions: { $like: '%manage%' } }]
    }
});

// 复杂组合条件
const users = await db.getList('users', {
    where: {
        $and: [
            { status: 1 },
            {
                $or: [{ role: 'admin' }, { level: { $gte: 5 } }]
            }
        ]
    }
});
```

## leftJoin 关联查询

### 基础用法

```javascript
// 字符串格式（推荐）
const users = await db.getList('users u', {
    where: { 'u.status': 1 },
    fields: ['u.*', 'p.title', 'p.content'],
    leftJoins: ['posts p ON u.id = p.user_id']
});

// 对象格式
const users = await db.getList('users u', {
    where: { 'u.status': 1 },
    fields: ['u.*', 'up.avatar', 'up.bio'],
    leftJoins: [{ table: 'user_profiles up', on: 'u.id = up.user_id' }]
});
```

### 多表关联

```javascript
// 多个 leftJoin
const articles = await db.getList('articles a', {
    where: { 'a.status': 1 },
    fields: ['a.id', 'a.title', 'a.summary', 'a.created_at', 'u.name as author_name', 'c.name as category_name', 'COUNT(cm.id) as comment_count'],
    leftJoins: ['users u ON a.user_id = u.id', 'categories c ON a.category_id = c.id', 'comments cm ON a.id = cm.article_id'],
    groupBy: ['a.id'],
    orderBy: ['a.created_at#DESC'],
    page: 1,
    pageSize: 10
});
```

### 复杂关联查询

```javascript
// 带条件的关联
const usersWithLatestPost = await db.getAll('users u', {
    where: { 'u.status': 1 },
    fields: ['u.*', 'p.title as latest_post', 'p.created_at as post_date'],
    leftJoins: ['posts p ON u.id = p.user_id AND p.id = (SELECT MAX(id) FROM posts WHERE user_id = u.id AND status = 1)'],
    orderBy: ['u.created_at#DESC']
});
```

## SQL 构造器直接使用

### 基础链式调用

```javascript
// 获取查询构造器
const builder = db.query();

// 链式构建查询
const { sql, params } = builder.select(['u.id', 'u.name', 'u.email']).from('users u').where('u.status', 1).where('u.age', { $gte: 18 }).leftJoin('user_profiles up', 'u.id = up.user_id').orderBy(['u.created_at#DESC']).limit(10).toSelectSql();

// 执行查询
const result = await db.execute(sql, params);
```

### 复杂查询构建

```javascript
const builder = db.query().select(['u.id', 'u.name', 'u.email', 'up.avatar', 'COUNT(p.id) as post_count', 'MAX(p.created_at) as last_post_date']).from('users u').leftJoin('user_profiles up', 'u.id = up.user_id').leftJoin('posts p', 'u.id = p.user_id AND p.status = 1').where({ 'u.status': 1 }).where('u.created_at', { $gte: '2024-01-01' }).groupBy(['u.id']).having('post_count > 0').orderBy(['last_post_date#DESC', 'u.name#ASC']).limit(50);

const { sql, params } = builder.toSelectSql();
const users = await db.execute(sql, params);
```

## 事务操作

### 基础事务

```javascript
// 简单事务
const result = await db.transaction(async (tx) => {
    // 在事务中执行多个操作
    await tx.execute('INSERT INTO users (name, email) VALUES (?, ?)', ['John', 'john@example.com']);
    await tx.execute('UPDATE users SET status = 1 WHERE name = ?', ['John']);

    return { success: true };
});
```

### 复杂事务

```javascript
// 复杂事务操作
const transferMoney = async (fromUserId, toUserId, amount) => {
    return await db.transaction(async (tx) => {
        // 检查余额
        const fromUser = await tx.execute('SELECT balance FROM users WHERE id = ? FOR UPDATE', [fromUserId]);

        if (fromUser[0].balance < amount) {
            throw new Error('余额不足');
        }

        // 扣款
        await tx.execute('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, fromUserId]);

        // 加款
        await tx.execute('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, toUserId]);

        // 记录转账日志
        await tx.execute('INSERT INTO transfer_logs (from_user_id, to_user_id, amount, created_at) VALUES (?, ?, ?, ?)', [fromUserId, toUserId, amount, new Date()]);

        return { success: true, transferId: result.insertId };
    });
};
```

## orderBy 排序

### 支持的格式

```javascript
// 1. 数组格式 - 字段#方向
const users = await db.getList('users', {
    orderBy: ['created_at#DESC', 'name#ASC', 'id'] // id 默认 ASC
});

// 2. 数组格式 - [字段, 方向] 子数组
const users = await db.getList('users', {
    orderBy: [
        ['created_at', 'DESC'],
        ['name', 'ASC'],
        ['id'] // 只有字段名，默认 ASC
    ]
});

// 3. 混合格式
const users = await db.getList('users', {
    orderBy: [
        'created_at#DESC', // 字段#方向
        ['name', 'ASC'], // [字段, 方向]
        'id' // 只有字段名
    ]
});

// 4. 在查询构造器中使用
const builder = db
    .query()
    .from('users')
    .orderBy(['created_at#DESC', 'name#ASC']) // 一次性设置多个排序
    .limit(10);
```

## 错误处理

### 基础错误处理

```javascript
try {
    const users = await db.getList('users', {
        where: { status: 1 },
        page: 1,
        pageSize: 10
    });

    return users;
} catch (error) {
    console.error('查询用户失败:', error.message);
    throw error;
}
```

### 事务错误处理

```javascript
try {
    const result = await db.transaction(async (tx) => {
        // 事务操作
        await tx.execute('INSERT INTO users (name) VALUES (?)', ['Test']);

        // 模拟错误
        if (someCondition) {
            throw new Error('业务逻辑错误');
        }

        await tx.execute('UPDATE users SET status = 1 WHERE name = ?', ['Test']);

        return { success: true };
    });
} catch (error) {
    // 事务会自动回滚
    console.error('事务执行失败:', error.message);
}
```

## 连接池监控

```javascript
// 获取连接池状态
const status = db.getPoolStatus();
console.log('连接池状态:', {
    activeConnections: status.activeConnections, // 活跃连接数
    totalConnections: status.totalConnections, // 总连接数
    idleConnections: status.idleConnections, // 空闲连接数
    taskQueueSize: status.taskQueueSize // 等待队列大小
});
```

## 最佳实践

### 1. 字段选择

```javascript
// ❌ 避免使用 SELECT *
const users = await db.getList('users');

// ✅ 明确指定需要的字段
const users = await db.getList('users', {
    fields: ['id', 'name', 'email', 'created_at']
});
```

### 2. 索引利用

```javascript
// ✅ 在 WHERE 条件中使用索引字段
const users = await db.getList('users', {
    where: {
        email: 'john@example.com', // email 字段有索引
        status: 1 // status 字段有索引
    }
});
```

### 3. 分页查询

```javascript
// ✅ 使用合理的分页大小
const users = await db.getList('users', {
    where: { status: 1 },
    page: 1,
    pageSize: 20 // 避免过大的 pageSize
});
```

### 4. 事务使用

```javascript
// ✅ 保持事务简短
const result = await db.transaction(async (tx) => {
    // 只包含必要的数据库操作
    await tx.execute('INSERT INTO orders (user_id, amount) VALUES (?, ?)', [userId, amount]);
    await tx.execute('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId]);

    // ❌ 不要在事务中进行耗时操作
    // await sendEmail(); // 这应该在事务外进行

    return { success: true };
});

// ✅ 在事务外进行其他操作
await sendEmail();
```

## 性能优化

### 1. 使用适当的查询方法

```javascript
// 获取单条记录时使用 getDetail
const user = await db.getDetail('users', { id: 1 });

// 获取列表时使用 getList（自动分页）
const users = await db.getList('users', {
    where: { status: 1 },
    page: 1,
    pageSize: 20
});

// 只有在确实需要所有记录时才使用 getAll
const allActiveUsers = await db.getAll('users', {
    where: { status: 1 }
});
```

### 2. 优化 JOIN 查询

```javascript
// ✅ 在 ON 条件中使用索引字段
const users = await db.getList('users u', {
    leftJoins: [
        'posts p ON u.id = p.user_id' // user_id 应该有索引
    ]
});

// ✅ 避免不必要的 JOIN
const users = await db.getList('users u', {
    where: { 'u.status': 1 },
    fields: ['u.id', 'u.name'], // 只选择需要的字段
    leftJoins: ['user_profiles up ON u.id = up.user_id']
});
```

这个数据库操作库提供了完整的 CRUD 功能，支持复杂查询和事务操作，是 Kysely 的优秀替代方案。
