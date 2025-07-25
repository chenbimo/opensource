import { Logger } from './logger.js';
import { RYes, RNo } from './util.js';
export class Api {
    // GET 方法
    static GET(name, auth = false, fields = {}, required = [], handler) {
        return {
            method: 'GET',
            name: name,
            auth: auth,
            fields: fields,
            required: required,
            handler: this.wrapHandler(handler)
        };
    }

    // POST 方法
    static POST(name, auth = false, fields = {}, required = [], handler) {
        return {
            method: 'POST',
            name: name,
            auth: auth,
            fields: fields,
            required: required,
            handler: this.wrapHandler(handler)
        };
    }

    // 包装处理器，自动处理异常和响应格式
    static wrapHandler(handler) {
        return async (bp, ctx, req) => {
            try {
                const result = await handler(bp, ctx, req);

                return result;
            } catch (error) {
                Logger.error({
                    msg: '内部服务器错误',
                    error: error.message,
                    stack: error.stack,
                    url: req?.url || '',
                    user: ctx?.user || {}
                });

                // 返回错误响应
                return RNo('内部服务器错误');
            }
        };
    }
}
