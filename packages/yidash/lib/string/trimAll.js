/**
 * 去除字符串中所有空白字符
 * @author Jimmy Gatsby
 * @category string
 * @alias yd_string_trimAll
 * @param str 要转换的字符串
 * @returns {string} 返回去除空白后的字符串
 * @time 2024年7月30日 13点55分
 */
export default (str) => {
    let result = '';
    for (let i = 0; i < str.length; i++) {
        if (!/\s/.test(str[i])) {
            result += str[i];
        }
    }
    return result;
};
