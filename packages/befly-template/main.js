import { BunPii, Logger } from 'befly';

// 配置服务器
const app = new BunPii({
    routes: {}
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n👋 正在优雅关闭...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 正在优雅关闭...');
    process.exit(0);
});

// 启动服务器
app.listen((server) => {
    console.log(`🚀 服务器已启动: http://${server.hostname}:${server.port}`);
});
