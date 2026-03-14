// Bilibili直播状态监控Telegram机器人
// 部署在Cloudflare Workers

// 环境变量将通过env参数获取

// 从单独的文件中导入要监控的房间ID列表
import ROOM_IDS from './roomIds.js';


// Bilibili API地址
const BILIBILI_API = "https://api.live.bilibili.com/room/v1/Room/get_info";

// Telegram API基础地址
const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

/**
 * 主入口函数
 * @param {Request} request
 * @param {Env} env
 * @param {Context} ctx
 * @returns {Promise<Response>}
 */
export default {
  async scheduled(event, env, ctx) {
    // 执行定时任务
    await checkLiveStatus(env);
  },

  async fetch(request, env, ctx) {
    // 处理HTTP请求（用于测试）
    await checkLiveStatus(env);
    return new Response("检查完成", { status: 200 });
  }
};

/**
 * 检查所有主播的直播状态
 * @param {Env} env
 */
async function checkLiveStatus(env) {
  console.log(`开始检查直播状态，共${ROOM_IDS.length}个房间`);
  for (const roomId of ROOM_IDS) {
    console.log(`正在检查房间ID: ${roomId}`);
    await checkSingleRoom(roomId, env);
  }
  console.log("直播状态检查完成");
}

/**
 * 检查单个房间的直播状态
 * @param {number} roomId
 * @param {Env} env
 */
async function checkSingleRoom(roomId, env) {
  try {
    console.log(`开始检查房间${roomId}的直播状态`);
    
    // 1. 获取直播状态
    console.log(`调用Bilibili API获取房间${roomId}的直播信息`);
    const liveInfo = await fetchBilibiliLiveInfo(roomId);
    const { live_status, title, user_cover, live_time } = liveInfo;
    console.log(`直播信息：roomId=${roomId}, live_status=${live_status}, title=${title}, live_time=${live_time}`);

    // 2. 检查数据库中是否已有开播记录
    const db = env.LIVE_MONITOR_DB;
    console.log(`查询数据库：检查房间${roomId}的开播记录`);
    const existingRecord = await db.prepare(
      "SELECT * FROM live_status WHERE room_id = ?"
    ).bind(roomId).first();
    console.log(`数据库查询结果：${existingRecord ? '存在开播记录' : '不存在开播记录'}`);

    // 3. 处理不同状态
    if (live_status === 1) {
      // 主播正在直播
      console.log(`房间${roomId}当前状态：正在直播`);
      if (!existingRecord) {
        // 首次开播，发送通知
        console.log(`发送Telegram通知：房间${roomId}开播了`);
        const messageId = await sendTelegramNotification(roomId, title, user_cover, live_time, env);
        // 记录到数据库
        console.log(`更新数据库：记录房间${roomId}的开播状态、时间和消息ID`);
        await db.prepare(
          "INSERT INTO live_status (room_id, live_time, message_id) VALUES (?, ?, ?)"
        ).bind(roomId, live_time, messageId).run();
        console.log(`数据库更新成功：已记录房间${roomId}的开播状态，开播时间：${live_time}，消息ID：${messageId}`);
      } else {
        console.log(`跳过通知：房间${roomId}已有开播记录`);
      }
    } else {
      // 主播未在直播
      console.log(`房间${roomId}当前状态：未直播`);
      if (existingRecord) {
        // 主播刚下播，发送下播通知
        console.log(`发送Telegram通知：房间${roomId}直播已结束`);
        await sendStreamEndNotification(roomId, existingRecord.live_time, existingRecord.message_id, env);
        // 从数据库删除记录
        console.log(`更新数据库：清除房间${roomId}的开播记录`);
        await db.prepare(
          "DELETE FROM live_status WHERE room_id = ?"
        ).bind(roomId).run();
        console.log(`数据库更新成功：已清除房间${roomId}的开播记录`);
      }
    }
    console.log(`房间${roomId}的直播状态检查完成`);
  } catch (error) {
    console.error(`检查房间${roomId}时出错:`, error);
  }
}

/**
 * 获取Bilibili直播信息
 * @param {number} roomId
 * @returns {Promise<{live_status: number, title: string, user_cover: string, live_time: string}>}
 */
async function fetchBilibiliLiveInfo(roomId) {
  const response = await fetch(`${BILIBILI_API}?room_id=${roomId}`);
  const data = await response.json();
  
  if (data.code !== 0 || !data.data) {
    throw new Error(`获取直播信息失败: ${data.message || '未知错误'}`);
  }
  
  return {
    live_status: data.data.live_status,
    title: data.data.title,
    user_cover: data.data.user_cover,
    live_time: data.data.live_time || new Date().toISOString().slice(0, 19).replace('T', ' ') // 如果API没有提供live_time，则使用当前时间
  };
}

/**
 * 计算直播持续时间
 * @param {string} startTime 开播时间，格式：YYYY-MM-DD HH:MM:SS（UTC+8时区）
 * @returns {string} 格式化的持续时间，例如：01:23:45
 */
function calculateDuration(startTime) {
  // 解析UTC+8时间，转换为UTC时间
  // Bilibili API返回的是UTC+8时间，而CF Workers运行在UTC+0时区
  const [datePart, timePart] = startTime.split(' ');
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
  return `${totalHours.toString().padStart(2, '0')}:${totalMinutes.toString().padStart(2, '0')}:${totalSeconds.toString().padStart(2, '0')}`;
}

/**
 * 发送下播通知
 * @param {number} roomId
 * @param {string} startTime 开播时间
 * @param {number} replyToMessageId 回复的消息ID
 * @param {Env} env
 */
async function sendStreamEndNotification(roomId, startTime, replyToMessageId, env) {
  const duration = calculateDuration(startTime);
  
  const message = `🎬 直播已结束
直播时长：${duration}`;
  
  const telegramUrl = `${TELEGRAM_API_BASE}${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  await fetch(telegramUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
      reply_to_message_id: replyToMessageId
    })
  });
}

/**
 * 发送Telegram通知
 * @param {number} roomId
 * @param {string} title
 * @param {string} userCover
 * @param {string} live_time
 * @param {Env} env
 * @returns {Promise<number>} Telegram消息ID
 */
async function sendTelegramNotification(roomId, title, userCover, live_time, env) {
  // 构建消息内容
  const message = `主播开播了！正在直播：「${title}」
开播时间：${live_time}
点击前往直播间：https://live.bilibili.com/${roomId}`;
  
  // 发送图片和文字消息
  const photoUrl = userCover;
  const telegramUrl = `${TELEGRAM_API_BASE}${env.TELEGRAM_BOT_TOKEN}/sendPhoto`;
  
  const formData = new FormData();
  formData.append('chat_id', env.TELEGRAM_CHAT_ID);
  formData.append('photo', photoUrl);
  formData.append('caption', message);
  formData.append('parse_mode', 'Markdown');
  
  const response = await fetch(telegramUrl, {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  if (!data.ok || !data.result) {
    throw new Error(`发送Telegram通知失败: ${data.description || '未知错误'}`);
  }
  
  return data.result.message_id;
}
