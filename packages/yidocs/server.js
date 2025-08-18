// 使用 Bun 创建简单的 Web 服务器
const server = Bun.serve({
    port: 3001,

    // 处理请求
    fetch(request) {
        const url = new URL(request.url);
        const path = url.pathname;

        // 路由处理
        if (path === '/') {
            return new Response('欢迎访问 Bun Web 服务器！', {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
        }

        if (path === '/html') {
            const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Bun 服务器</title>
            <meta charset="utf-8">
          </head>
          <body>
            <h1>Hello from Bun! 🐰</h1>
            <p>这是一个 HTML 响应示例</p>
          </body>
        </html>
      `;
            return new Response(html, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        if (path === '/json') {
            const data = {
                message: '这是 JSON 响应',
                timestamp: new Date().toISOString(),
                server: 'Bun'
            };
            return Response.json(data);
        }

        if (path === '/api/users') {
            // 模拟用户数据
            const users = [
                { id: 1, name: '张三', email: 'zhangsan@example.com' },
                { id: 2, name: '李四', email: 'lisi@example.com' }
            ];
            return Response.json({ users });
        }

        // 404 处理
        return new Response('404 - 页面未找到', {
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    },

    // 错误处理
    error(error) {
        return new Response(`服务器错误: ${error.message}`, {
            status: 500,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }
});

console.log(`🚀 服务器正在运行: http://localhost:${server.port}`);
console.log('可用路由:');
console.log('  - / (文本响应)');
console.log('  - /html (HTML响应)');
console.log('  - /json (JSON响应)');
console.log('  - /api/users (用户列表API)');
