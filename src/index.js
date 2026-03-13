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
    const { live_status, title, user_cover } = liveInfo;
    console.log(`直播信息：roomId=${roomId}, live_status=${live_status}, title=${title}`);

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
        await sendTelegramNotification(roomId, title, user_cover, env);
        // 记录到数据库
        console.log(`更新数据库：记录房间${roomId}的开播状态`);
        await db.prepare(
          "INSERT INTO live_status (room_id) VALUES (?)")
        .bind(roomId).run();
        console.log(`数据库更新成功：已记录房间${roomId}的开播状态`);
      } else {
        console.log(`跳过通知：房间${roomId}已有开播记录`);
      }
    } else {
      // 主播未在直播
      console.log(`房间${roomId}当前状态：未直播`);
      if (existingRecord) {
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
 * @returns {Promise<{live_status: number, title: string, user_cover: string}>}
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
    user_cover: data.data.user_cover
  };
}

/**
 * 发送Telegram通知
 * @param {number} roomId
 * @param {string} title
 * @param {string} userCover
 * @param {Env} env
 */
async function sendTelegramNotification(roomId, title, userCover, env) {
  // 构建消息内容
  const message = `主播开播了！正在直播：「${title}」
点击前往直播间：https://live.bilibili.com/${roomId}`;
  
  // 发送图片和文字消息
  const photoUrl = userCover;
  const telegramUrl = `${TELEGRAM_API_BASE}${env.TELEGRAM_BOT_TOKEN}/sendPhoto`;
  
  const formData = new FormData();
  formData.append('chat_id', env.TELEGRAM_CHAT_ID);
  formData.append('photo', photoUrl);
  formData.append('caption', message);
  formData.append('parse_mode', 'Markdown');
  
  await fetch(telegramUrl, {
    method: 'POST',
    body: formData
  });
}
