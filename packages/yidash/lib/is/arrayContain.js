/**
 * 判断数组是否有一个相同值
 * @alias yd_is_arrayContain
 * @category is
 * @param {Array} arr1 数组1
 * @param {Array} arr2 数组2
 * @returns {Array} 返回两个数组是否至少有一个相同值
 * @author 陈随易 <https://chensuiyi.me>
 * @example yd_is_arrayContain()
 */
export default (arr1, arr2) => {
    return arr1.some((element) => arr2.includes(element));
};
