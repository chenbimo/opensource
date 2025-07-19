const dicingChar = (series) => {
    return series[~~(Math.random() * series.length)];
};

/**
 * 生成一个车牌号
 * @alias yd_faker_carNumber
 * @category faker
 * @param {number} total 生成车牌号的位数 (新能源车牌号为6位，普通车牌号为5位)  默认5位
 * @returns {string} 返回一个随机的车牌号
 * @author xiaoxiaohuayu <https://github.com/xiaoxiaohuayu>
 * @summary 应用场景：用于生成测试数据
 * @example
 * console.log(generateLicensePlateNumber()); // 输出: 闽ASXRG4
 */
export default (total = 5) => {
    const stateList = '京津冀晋辽吉沪苏浙皖闽琼赣鲁豫鄂湘粤渝川贵云陕甘蒙黑桂藏青宁新';
    const charList = 'ABCDEFGHJKLMNQPRSTUVWXYZ';
    const numList = '1234567890';
    const halfList = [charList, numList];
    const state = dicingChar(stateList);
    const city = dicingChar(charList);
    let sequence = '';
    while (total--) {
        sequence += dicingChar(halfList[Math.round(Math.random())]);
    }
    // console.log(`${state}${city}${sequence}`)
    return `${state}${city}${sequence}`;
};
