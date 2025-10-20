/**
 * 身份证工具函数
 */

/**
 * 从身份证号提取出生日期
 * @param idCard 身份证号
 * @returns 出生日期 YYYY-MM-DD 格式，如果无效返回空字符串
 */
export function extractBirthDateFromIdCard(idCard: string): string {
  if (!idCard) return '';
  
  // 移除空格
  idCard = idCard.trim().replace(/\s/g, '');
  
  // 18位身份证
  if (idCard.length === 18) {
    const year = idCard.substring(6, 10);
    const month = idCard.substring(10, 12);
    const day = idCard.substring(12, 14);
    
    // 验证日期有效性
    const date = new Date(`${year}-${month}-${day}`);
    if (isNaN(date.getTime())) return '';
    
    return `${year}-${month}-${day}`;
  }
  
  // 15位身份证（旧版）
  if (idCard.length === 15) {
    const year = '19' + idCard.substring(6, 8);
    const month = idCard.substring(8, 10);
    const day = idCard.substring(10, 12);
    
    // 验证日期有效性
    const date = new Date(`${year}-${month}-${day}`);
    if (isNaN(date.getTime())) return '';
    
    return `${year}-${month}-${day}`;
  }
  
  return '';
}

/**
 * 从身份证号提取性别
 * @param idCard 身份证号
 * @returns 性别：'男' 或 '女'，如果无效返回空字符串
 */
export function extractGenderFromIdCard(idCard: string): string {
  if (!idCard) return '';
  
  // 移除空格
  idCard = idCard.trim().replace(/\s/g, '');
  
  // 18位身份证：第17位是性别码
  if (idCard.length === 18) {
    const genderCode = parseInt(idCard.charAt(16));
    return genderCode % 2 === 0 ? '女' : '男';
  }
  
  // 15位身份证：第15位是性别码
  if (idCard.length === 15) {
    const genderCode = parseInt(idCard.charAt(14));
    return genderCode % 2 === 0 ? '女' : '男';
  }
  
  return '';
}

/**
 * 验证身份证号格式
 * @param idCard 身份证号
 * @returns 是否有效
 */
export function validateIdCard(idCard: string): boolean {
  if (!idCard) return false;
  
  // 移除空格
  idCard = idCard.trim().replace(/\s/g, '');
  
  // 15位或18位
  if (idCard.length !== 15 && idCard.length !== 18) {
    return false;
  }
  
  // 18位身份证校验
  if (idCard.length === 18) {
    // 前17位必须是数字
    if (!/^\d{17}[\dXx]$/.test(idCard)) {
      return false;
    }
    
    // 校验码验证
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += parseInt(idCard.charAt(i)) * weights[i];
    }
    
    const checkCode = checkCodes[sum % 11];
    return idCard.charAt(17).toUpperCase() === checkCode;
  }
  
  // 15位身份证：全部是数字
  if (idCard.length === 15) {
    return /^\d{15}$/.test(idCard);
  }
  
  return false;
}

/**
 * 格式化身份证号（添加空格便于阅读）
 * @param idCard 身份证号
 * @returns 格式化后的身份证号
 */
export function formatIdCard(idCard: string): string {
  if (!idCard) return '';
  
  // 移除空格
  idCard = idCard.trim().replace(/\s/g, '');
  
  // 18位：6-8-4 格式
  if (idCard.length === 18) {
    return `${idCard.substring(0, 6)} ${idCard.substring(6, 14)} ${idCard.substring(14, 18)}`;
  }
  
  // 15位：6-6-3 格式
  if (idCard.length === 15) {
    return `${idCard.substring(0, 6)} ${idCard.substring(6, 12)} ${idCard.substring(12, 15)}`;
  }
  
  return idCard;
}

