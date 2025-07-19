/**
 * 字符串缩短展示
 * @author 陈随易 <https://chensuiyi.me>
 * @category string
 * @alias yd_string_short
 * @param {String} str 需要处理的字符串
 * @param {Number} startLength 前面保留的字符数
 * @param {Number} endLength 后面保留的字符数
 * @param {String} placeholder 中间的占位符
 * @returns {String} 返回截断后的字符串
 */
export default (str, startLength = 4, endLength = 4, placeholder = '***') => {
    if (!str) return '';

    str = String(str);
    const length = str.length;

    // 如果字符串长度小于等于前后保留的总长度，则直接返回原字符串
    if (length <= startLength + endLength) return str;

    // 直接使用字符串的 substring 方法，避免 split 和 join 操作
    return str.substring(0, startLength) + placeholder + str.substring(length - endLength);
};
