import { Env } from '../config/env.js';
import { Logger } from '../utils/logger.js';

export default {
    after: [],
    async onInit(bunpii) {
        try {
            return Logger;
        } catch (error) {
            process.exit();
        }
    }
};
