import path from 'node:path';
import { Env } from './config/env.js';

// 工具函数
import { Api } from './utils/api.js';
import { Logger } from './utils/logger.js';
import { Jwt } from './utils/jwt.js';
import { validator } from './utils/validate.js';
import { Crypto2 } from './utils/crypto.js';
import { XMLParser } from './libs/xml/XMLParser.js';
import { isEmptyObject, isType, pickFields, sortPlugins, RYes, RNo, filename2, dirname2 } from './utils/util.js';

class Befly {
    constructor(options = {}) {
        this.apiRoutes = new Map();
        this.pluginLists = [];
        this.appContext = {};
        this.appOptions = options;
    }

    async initCheck() {
        try {
            const checkStartTime = Bun.nanoseconds();
            Logger.info('开始执行系统检查...');

            const checksDir = path.join(dirname2(import.meta.url), 'checks');
            const glob = new Bun.Glob('*.js');

            // 统计信息
            let totalChecks = 0;
            let passedChecks = 0;
            let failedChecks = 0;

            // 扫描并执行检查函数
            for await (const file of glob.scan({
                cwd: checksDir,
                onlyFiles: true,
                absolute: true
            })) {
                const fileName = path.basename(file);
                if (fileName.startsWith('_')) continue; // 跳过以下划线开头的文件

                try {
                    totalChecks++;
                    const singleCheckStart = Bun.nanoseconds();

                    // 导入检查模块
                    const check = await import(file);

                    // 执行默认导出的函数
                    if (typeof check.default === 'function') {
                        const checkResult = await check.default(this.appContext);
                        const singleCheckTime = (Bun.nanoseconds() - singleCheckStart) / 1_000_000;

                        if (checkResult === true) {
                            passedChecks++;
                            Logger.info(`检查 ${fileName} 通过，耗时: ${singleCheckTime.toFixed(2)}ms`);
                        } else {
                            Logger.error(`检查未通过: ${fileName}，耗时: ${singleCheckTime.toFixed(2)}ms`);
                            failedChecks++;
                        }
                    } else {
                        const singleCheckTime = (Bun.nanoseconds() - singleCheckStart) / 1_000_000;
                        Logger.warn(`文件 ${fileName} 未导出默认函数，耗时: ${singleCheckTime.toFixed(2)}ms`);
                        failedChecks++;
                    }
                } catch (error) {
                    const singleCheckTime = (Bun.nanoseconds() - singleCheckStart) / 1_000_000;
                    Logger.error({
                        msg: `检查失败 ${fileName}，耗时: ${singleCheckTime.toFixed(2)}ms`,
                        error: error.message,
                        stack: error.stack
                    });
                    failedChecks++;
                }
            }

            const totalCheckTime = (Bun.nanoseconds() - checkStartTime) / 1_000_000;

            // 输出检查结果统计
            Logger.info(`系统检查完成! 总耗时: ${totalCheckTime.toFixed(2)}ms，总检查数: ${totalChecks}, 通过: ${passedChecks}, 失败: ${failedChecks}`);

            if (failedChecks > 0) {
                process.exit();
            } else if (totalChecks > 0) {
                Logger.info(`所有系统检查通过!`);
            } else {
                Logger.info(`未执行任何检查`);
            }
        } catch (error) {
            Logger.error({
                msg: '执行系统检查时发生错误',
                error: error.message,
                stack: error.stack
            });
            process.exit();
        }
    }

    async loadPlugins() {
        try {
            const loadStartTime = Bun.nanoseconds();

            const glob = new Bun.Glob('*.js');
            const corePlugins = [];
            const userPlugins = [];
            const loadedPluginNames = new Set(); // 用于跟踪已加载的插件名称

            // 扫描核心插件目录
            const corePluginsScanStart = Bun.nanoseconds();
            for await (const file of glob.scan({
                cwd: path.join(dirname2(import.meta.url), 'plugins'),
                onlyFiles: true,
                absolute: true
            })) {
                const fileName = path.basename(file, '.js');
                if (fileName.startsWith('_')) continue;

                const importStart = Bun.nanoseconds();
                const plugin = await import(file);
                const importTime = (Bun.nanoseconds() - importStart) / 1_000_000; // 转换为毫秒

                const pluginInstance = plugin.default;
                pluginInstance.pluginName = fileName;
                corePlugins.push(pluginInstance);
                loadedPluginNames.add(fileName); // 记录已加载的核心插件名称

                Logger.info(`核心插件 ${fileName} 导入耗时: ${importTime.toFixed(2)}ms`);
            }
            const corePluginsScanTime = (Bun.nanoseconds() - corePluginsScanStart) / 1_000_000;
            Logger.info(`核心插件扫描完成，耗时: ${corePluginsScanTime.toFixed(2)}ms，共找到 ${corePlugins.length} 个插件`);

            const sortedCorePlugins = sortPlugins(corePlugins);
            if (sortedCorePlugins === false) {
                Logger.error(`插件依赖关系错误，请检查插件的 after 属性`);
                process.exit();
            }

            // 初始化核心插件
            const corePluginsInitStart = Bun.nanoseconds();
            for (const plugin of sortedCorePlugins) {
                try {
                    this.pluginLists.push(plugin);
                    this.appContext[plugin.pluginName] = typeof plugin?.onInit === 'function' ? await plugin?.onInit(this.appContext) : {};
                } catch (error) {
                    Logger.warn(`插件 ${plugin.pluginName} 初始化失败:`, error.message);
                }
            }
            const corePluginsInitTime = (Bun.nanoseconds() - corePluginsInitStart) / 1_000_000;
            Logger.info(`核心插件初始化完成，耗时: ${corePluginsInitTime.toFixed(2)}ms`);

            // 扫描用户插件目录
            const userPluginsScanStart = Bun.nanoseconds();
            for await (const file of glob.scan({
                cwd: path.join(process.cwd(), 'plugins'),
                onlyFiles: true,
                absolute: true
            })) {
                const fileName = path.basename(file, '.js');
                if (fileName.startsWith('_')) continue;

                // 检查是否已经加载了同名的核心插件
                if (loadedPluginNames.has(fileName)) {
                    Logger.info(`跳过用户插件 ${fileName}，因为同名的核心插件已存在`);
                    continue;
                }

                const importStart = Bun.nanoseconds();
                const plugin = await import(file);
                const importTime = (Bun.nanoseconds() - importStart) / 1_000_000; // 转换为毫秒

                const pluginInstance = plugin.default;
                pluginInstance.pluginName = fileName;
                userPlugins.push(pluginInstance);

                Logger.info(`用户插件 ${fileName} 导入耗时: ${importTime.toFixed(2)}ms`);
            }
            const userPluginsScanTime = (Bun.nanoseconds() - userPluginsScanStart) / 1_000_000;
            Logger.info(`用户插件扫描完成，耗时: ${userPluginsScanTime.toFixed(2)}ms，共找到 ${userPlugins.length} 个插件`);

            const sortedUserPlugins = sortPlugins(userPlugins);
            if (sortedUserPlugins === false) {
                Logger.error(`插件依赖关系错误，请检查插件的 after 属性`);
                process.exit();
            }

            // 初始化用户插件
            if (userPlugins.length > 0) {
                const userPluginsInitStart = Bun.nanoseconds();
                for (const plugin of sortedUserPlugins) {
                    try {
                        this.pluginLists.push(plugin);
                        this.appContext[plugin.pluginName] = typeof plugin?.onInit === 'function' ? await plugin?.onInit(this.appContext) : {};
                    } catch (error) {
                        Logger.warn(`插件 ${plugin.pluginName} 初始化失败:`, error.message);
                    }
                }
                const userPluginsInitTime = (Bun.nanoseconds() - userPluginsInitStart) / 1_000_000;
                Logger.info(`用户插件初始化完成，耗时: ${userPluginsInitTime.toFixed(2)}ms`);
            }

            const totalLoadTime = (Bun.nanoseconds() - loadStartTime) / 1_000_000;
            const totalPluginCount = sortedCorePlugins.length + sortedUserPlugins.length;
            Logger.info(`插件加载完成! 总耗时: ${totalLoadTime.toFixed(2)}ms，共加载 ${totalPluginCount} 个插件`);
        } catch (error) {
            Logger.error({
                msg: '加载插件时发生错误',
                error: error.message,
                stack: error.stack
            });
        }
    }
    async loadApis(dirName) {
        try {
            const loadStartTime = Bun.nanoseconds();
            const dirDisplayName = dirName === 'core' ? '核心' : '用户';

            const coreApisDir = path.join(dirname2(import.meta.url), 'apis');
            const userApisDir = path.join(process.cwd(), 'apis');
            const glob = new Bun.Glob('**/*.js');
            const apiDir = dirName === 'core' ? coreApisDir : userApisDir;

            let totalApis = 0;
            let loadedApis = 0;
            let failedApis = 0;

            // 扫描指定目录
            for await (const file of glob.scan({
                cwd: apiDir,
                onlyFiles: true,
                absolute: true
            })) {
                const fileName = path.basename(file, '.js');
                const apiPath = path.relative(apiDir, file).replace(/\.js$/, '').replace(/\\/g, '/');
                if (apiPath.indexOf('_') !== -1) continue;

                totalApis++;
                const singleApiStart = Bun.nanoseconds();

                try {
                    const api = (await import(file)).default;
                    if (isType(api.name, 'string') === false || api.name.trim() === '') {
                        throw new Error(`接口 ${apiPath} 的 name 属性必须是非空字符串`);
                    }
                    if (api.auth !== false && api.auth !== true && Array.isArray(api.auth) === false) {
                        throw new Error(`接口 ${apiPath} 的 auth 属性必须是布尔值或字符串数组`);
                    }
                    if (isType(api.fields, 'object') === false) {
                        throw new Error(`接口 ${apiPath} 的 fields 属性必须是对象`);
                    }
                    if (isType(api.required, 'array') === false) {
                        throw new Error(`接口 ${apiPath} 的 required 属性必须是数组`);
                    }
                    // 数组的每一项都必须是字符串
                    if (api.required.some((item) => isType(item, 'string') === false)) {
                        throw new Error(`接口 ${apiPath} 的 required 属性必须是字符串数组`);
                    }
                    if (isType(api.handler, 'function') === false) {
                        throw new Error(`接口 ${apiPath} 的 handler 属性必须是函数`);
                    }
                    api.route = `${api.method.toUpperCase()}/api/${dirName}/${apiPath}`;
                    this.apiRoutes.set(api.route, api);

                    const singleApiTime = (Bun.nanoseconds() - singleApiStart) / 1_000_000;
                    loadedApis++;
                    // Logger.info(`${dirDisplayName}接口 ${apiPath} 加载成功，耗时: ${singleApiTime.toFixed(2)}ms`);
                } catch (error) {
                    const singleApiTime = (Bun.nanoseconds() - singleApiStart) / 1_000_000;
                    failedApis++;
                    Logger.error({
                        msg: `${dirDisplayName}接口 ${apiPath} 加载失败，耗时: ${singleApiTime.toFixed(2)}ms`,
                        error: error.message,
                        stack: error.stack
                    });
                }
            }

            const totalLoadTime = (Bun.nanoseconds() - loadStartTime) / 1_000_000;
            Logger.info(`${dirDisplayName}接口加载完成! 总耗时: ${totalLoadTime.toFixed(2)}ms，总数: ${totalApis}, 成功: ${loadedApis}, 失败: ${failedApis}`);
        } catch (error) {
            Logger.error({
                msg: '加载接口时发生错误',
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * 启动服务器
     */
    async listen(callback) {
        const serverStartTime = Bun.nanoseconds();
        Logger.info('开始启动 Befly 服务器...');

        await this.initCheck();
        await this.loadPlugins();
        await this.loadApis('core');
        await this.loadApis('app');

        const totalStartupTime = (Bun.nanoseconds() - serverStartTime) / 1_000_000;
        Logger.info(`服务器启动准备完成，总耗时: ${totalStartupTime.toFixed(2)}ms`);

        const server = Bun.serve({
            port: Env.APP_PORT,
            hostname: Env.APP_HOST,
            routes: {
                '/': async (req) => {
                    return Response.json({
                        code: 0,
                        msg: 'Befly 接口服务已启动',
                        data: {
                            mode: Env.NODE_ENV
                        }
                    });
                },
                '/api/*': async (req) => {
                    try {
                        // 直接返回options请求
                        if (req.method === 'OPTIONS') {
                            return new Response();
                        }
                        // 初始化请求数据存储
                        const ctx = {
                            headers: Object.fromEntries(req.headers.entries()),
                            body: {},
                            user: {}
                        };

                        // 接口处理
                        const url = new URL(req.url);
                        const apiPath = `${req.method}${url.pathname}`;

                        const api = this.apiRoutes.get(apiPath);

                        // 接口不存在
                        if (!api) return Response.json(RNo('接口不存在'));

                        const authHeader = req.headers.get('authorization');
                        if (authHeader && authHeader.startsWith('Bearer ')) {
                            const token = authHeader.substring(7);

                            try {
                                const payload = await Jwt.verify(token);
                                ctx.user = payload;
                            } catch (error) {
                                ctx.user = {};
                            }
                        } else {
                            ctx.user = {};
                        }
                        // 配置参数
                        if (req.method === 'GET') {
                            if (isEmptyObject(api.fields) === false) {
                                ctx.body = pickFields(Object.fromEntries(url.searchParams), Object.keys(api.fields));
                            } else {
                                ctx.body = Object.fromEntries(url.searchParams);
                            }
                        }
                        if (req.method === 'POST') {
                            try {
                                const contentType = req.headers.get('content-type') || '';

                                if (contentType.indexOf('json') !== -1) {
                                    ctx.body = await req.json();
                                } else if (contentType.indexOf('xml') !== -1) {
                                    const textData = await req.text();
                                    const xmlData = new XMLParser().parse(textData);
                                    ctx.body = xmlData?.xml ? xmlData.xml : xmlData;
                                } else if (contentType.indexOf('form-data') !== -1) {
                                    ctx.body = await req.formData();
                                } else if (contentType.indexOf('x-www-form-urlencoded') !== -1) {
                                    const text = await clonedReq.text();
                                    const formData = new URLSearchParams(text);
                                    ctx.body = Object.fromEntries(formData);
                                } else {
                                    ctx.body = {};
                                }
                                if (isEmptyObject(api.fields) === false) {
                                    ctx.body = pickFields(ctx.body, Object.keys(api.fields));
                                }
                            } catch (err) {
                                Logger.error({
                                    msg: '处理请求参数时发生错误',
                                    error: err.message,
                                    stack: err.stack
                                });

                                return Response.json(RNo('无效的请求参数格式'));
                            }
                        }

                        // 插件钩子
                        for await (const plugin of this.pluginLists) {
                            try {
                                if (typeof plugin?.onGet === 'function') {
                                    await plugin?.onGet(this.appContext, ctx, req);
                                }
                            } catch (error) {
                                Logger.error({
                                    msg: '插件处理请求时发生错误',
                                    error: error.message,
                                    stack: error.stack
                                });
                            }
                        }

                        // 请求记录
                        Logger.info({
                            msg: '通用接口日志',
                            请求路径: apiPath,
                            请求方法: req.method,
                            用户信息: ctx.user,
                            请求体: ctx.body
                        });

                        // 登录验证 auth 有3种值 分别为 true、false、['admin', 'user']
                        if (api.auth === true && !ctx.user.id) {
                            return Response.json(RNo('未登录'));
                        }

                        if (api.auth && api.auth !== true && ctx.user.role !== api.auth) {
                            return Response.json(RNo('没有权限'));
                        }

                        // 参数验证
                        const validate = validator.validate(ctx.body, api.fields, api.required);
                        if (validate.code !== 0) {
                            return Response.json(RNo('无效的请求参数格式', validate.fields));
                        }

                        // 执行函数
                        const result = await api.handler(this.appContext, ctx, req);

                        // 返回数据
                        if (result && typeof result === 'object' && 'code' in result) {
                            return Response.json(result);
                        } else {
                            return new Response(result);
                        }
                    } catch (error) {
                        Logger.error({
                            msg: '处理接口请求时发生错误',
                            error: error.message,
                            stack: error.stack,
                            url: req.url
                        });
                        return Response.json(RNo('内部服务器错误'));
                    }
                },
                '/*': async (req) => {
                    const url = new URL(req.url);
                    const filePath = path.join(process.cwd(), 'public', url.pathname);

                    try {
                        const file = await Bun.file(filePath);
                        if (await file.exists()) {
                            return new Response(file, {
                                headers: {
                                    'Content-Type': file.type || 'application/octet-stream'
                                }
                            });
                        } else {
                            return Response.json(RNo('文件未找到'));
                        }
                    } catch (error) {
                        return Response.json(RNo('文件读取失败'));
                    }
                },
                ...(this.appOptions.routes || {})
            },
            error(error) {
                Logger.error({
                    msg: '服务启动时发生错误',
                    error: error.message,
                    stack: error.stack
                });
                return Response.json(RNo('内部服务器错误'));
            }
        });

        const finalStartupTime = (Bun.nanoseconds() - serverStartTime) / 1_000_000;
        Logger.info(`🚀 Befly 服务器启动成功! 完整启动耗时: ${finalStartupTime.toFixed(2)}ms`);
        Logger.info(`📡 服务器监听地址: http://${Env.APP_HOST}:${Env.APP_PORT}`);

        if (callback && typeof callback === 'function') {
            callback(server);
        }
    }
}

export { Befly, Env, Api, Jwt, Crypto2, Logger, RYes, RNo };
