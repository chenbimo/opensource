import { Env } from '../../config/env.js';
import { Api } from '../../utils/api.js';
import { RYes, RNo } from '../../utils/util.js';
import { Jwt } from '../../utils/jwt.js';

export default Api.POST('令牌检测', false, {}, [], async (befly, ctx) => {
    try {
        const jwtData = await Jwt.verify(ctx.headers?.authorization?.split(' ')[1] || '');
        return RYes(
            '令牌有效',
            {
                state: 'yes'
            },
            {
                detail: jwtData
            }
        );
    } catch (error) {
        befly.logger.error({
            msg: '令牌检测失败',
            error: error.message,
            stack: error.stack
        });
        return RNo('令牌检测失败', { state: 'no' });
    }
});
