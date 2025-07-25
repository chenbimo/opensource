import { Api } from 'befly';

export default Api.POST('测试接口', true, {}, [], async ({ db, logger }, { body, user, headers }) => {
    try {
        // 返回成功信息
        return {
            code: 0,
            msg: '测试成功'
        };
    } catch (error) {
        logger?.error(`文件处理错误: ${error.message}`);
    }
});
