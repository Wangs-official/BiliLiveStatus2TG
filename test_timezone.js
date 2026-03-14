/**
 * 测试时区转换功能
 */

// 模拟Bilibili API返回的UTC+8时间
const bilibiliTime = '2026-03-13 13:30:00'; // UTC+8

// 模拟Cloudflare Workers的UTC时间
console.log('当前时间（UTC）:', new Date().toISOString());
console.log('Bilibili API返回的时间（UTC+8）:', bilibiliTime);

// 测试时区转换和持续时间计算
function testCalculateDuration() {
  // 解析UTC+8时间，转换为UTC时间
  const [datePart, timePart] = bilibiliTime.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds] = timePart.split(':').map(Number);
  
  // 创建Date对象，Bilibili API返回的是UTC+8时间，需要转换为UTC时间
  // Date.UTC()创建UTC时间，所以需要将UTC+8时间减去8小时
  const start = new Date(Date.UTC(year, month - 1, day, hours - 8, minutes, seconds));
  const end = new Date();
  
  // 计算毫秒差
  const diffMs = end - start;
  
  // 转换为小时、分钟、秒
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const totalMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const totalSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  // 格式化输出
  const duration = `${totalHours.toString().padStart(2, '0')}:${totalMinutes.toString().padStart(2, '0')}:${totalSeconds.toString().padStart(2, '0')}`;
  
  console.log('转换后的UTC时间:', start.toISOString());
  console.log('持续时间:', duration);
  
  return duration;
}

// 运行测试
testCalculateDuration();
