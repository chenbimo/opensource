export default {
    after: ['_redis', '_db'],
    async onGet(bunpii, ctx, req) {
        // 设置 CORS 头部
        req.headers.set('Access-Control-Allow-Origin', req.headers.get('origin'));
        req.headers.set('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
        req.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        req.headers.set('Access-Control-Allow-Credentials', 'true');

        // 处理预检请求
        if (req.method === 'OPTIONS') {
            req.status = 204;
        }
    }
};
