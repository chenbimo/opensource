import { Env } from '../config/env.js';

/**
 * JWT 工具类
 */
export class Jwt {
    static signer = null;
    static verifier = null;
    static initialized = false;

    /**
     * 初始化 JWT 工具
     */
    static async init() {
        if (this.initialized) return;

        const { createSigner, createVerifier } = await import('fast-jwt');

        this.signer = createSigner({
            key: Env.JWT_SECRET,
            expiresIn: Env.JWT_EXPIRES_IN || '7d',
            algorithm: Env.JWT_ALGORITHM || 'HS256'
        });

        this.verifier = createVerifier({
            key: Env.JWT_SECRET,
            algorithms: [Env.JWT_ALGORITHM || 'HS256']
        });

        this.initialized = true;
    }

    /**
     * 签名 JWT token
     * @param {object} payload - JWT 载荷
     * @returns {Promise<string>} JWT token
     */
    static async sign(payload) {
        await this.init();
        return this.signer(payload);
    }

    /**
     * 验证 JWT token
     * @param {string} token - JWT token
     * @returns {Promise<object>} 解码后的载荷
     */
    static async verify(token) {
        await this.init();
        return this.verifier(token);
    }

    /**
     * 解码 JWT token (不验证签名)
     * @param {string} token - JWT token
     * @returns {object} 解码后的内容
     */
    static decode(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT format');
            }

            const header = JSON.parse(atob(parts[0]));
            const payload = JSON.parse(atob(parts[1]));

            return { header, payload };
        } catch (error) {
            throw new Error('Failed to decode JWT: ' + error.message);
        }
    }

    /**
     * 获取 token 剩余有效时间 (秒)
     * @param {string} token - JWT token
     * @returns {number} 剩余秒数，-1 表示已过期或无过期时间
     */
    static getTimeToExpiry(token) {
        try {
            const { payload } = this.decode(token);
            if (!payload.exp) return -1;
            const remaining = payload.exp - Math.floor(Date.now() / 1000);
            return remaining > 0 ? remaining : -1;
        } catch {
            return -1;
        }
    }
}
