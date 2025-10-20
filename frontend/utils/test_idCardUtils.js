/**
 * 测试身份证工具函数
 * 在浏览器控制台中运行此文件来测试
 */

// 从身份证号提取出生日期
function extractBirthDateFromIdCard(idCard) {
  if (!idCard) return '';
  
  // 移除空格
  idCard = idCard.trim().replace(/\s/g, '');
  
  // 18位身份证
  if (idCard.length === 18) {
    const year = idCard.substring(6, 10);
    const month = idCard.substring(10, 12);
    const day = idCard.substring(12, 14);
    
    console.log('提取结果:', { year, month, day });
    
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
    
    console.log('提取结果:', { year, month, day });
    
    // 验证日期有效性
    const date = new Date(`${year}-${month}-${day}`);
    if (isNaN(date.getTime())) return '';
    
    return `${year}-${month}-${day}`;
  }
  
  return '';
}

// 测试用例
console.log('=== 测试身份证提取功能 ===');

const testCases = [
  '110102200001012323',  // 2000-01-01
  '110102198503159527',  // 1985-03-15
  '320102199012251234',  // 1990-12-25
];

testCases.forEach(idCard => {
  console.log(`\n身份证号: ${idCard}`);
  const birthDate = extractBirthDateFromIdCard(idCard);
  console.log(`出生日期: ${birthDate}`);
  
  // 测试日期解析
  const parts = birthDate.split('-');
  console.log('解析后:', {
    year: parts[0],
    month: parts[1],
    day: parts[2],
    monthInt: parseInt(parts[1], 10),
    dayInt: parseInt(parts[2], 10),
  });
});

console.log('\n=== 测试完成 ===');

