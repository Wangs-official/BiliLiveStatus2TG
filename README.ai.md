# Bilibili直播状态监控Telegram机器人

这是一个部署在Cloudflare Workers上的Bilibili直播状态监控机器人，能够定时检查主播是否开播，并通过Telegram发送通知。

## 功能特点

- 🕒 **定时检查**：每30分钟自动检查一次直播状态（10:00、10:30、11:00等）
- 🎬 **开播提醒**：当主播开播时，自动发送Telegram通知
- 📊 **去重机制**：使用D1数据库避免重复发送通知
- 📱 **Telegram通知**：包含直播封面、标题和直播间链接
- ☁️ **Cloudflare Workers**：无需服务器，低成本部署

## 配置和部署步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 配置Telegram机器人

1. 在Telegram中搜索`@BotFather`并启动对话
2. 使用`/newbot`命令创建新机器人
3. 记录BotFather提供的**机器人Token**
4. 与机器人对话（发送任意消息）
5. 访问以下URL获取Chat ID：
   ```
   https://api.telegram.org/bot{YOUR_BOT_TOKEN}/getUpdates
   ```
   从响应中找到`message.chat.id`字段的值

### 3. 配置Cloudflare Workers

1. 登录[Cloudflare控制台](https://dash.cloudflare.com/)
2. 导航到"Workers & Pages"
3. 点击"创建应用程序" -> "创建Worker"
4. 为Worker命名并点击"部署"

### 4. 配置D1数据库

1. 在Cloudflare控制台中，导航到"D1"
2. 点击"创建数据库"
3. 为数据库命名并点击"创建"
4. 运行数据库初始化脚本：
   ```bash
   wrangler d1 execute bilibili-live-monitor-db --file=db/schema.sql
   ```
5. 将生成的数据库ID复制到`wrangler.toml`文件中

### 5. 配置环境变量

在`wrangler.toml`文件中设置以下环境变量：

```toml
[vars]
TELEGRAM_BOT_TOKEN = "你的Telegram机器人Token"
TELEGRAM_CHAT_ID = "你的Telegram Chat ID"

[[d1_databases]]
binding = "LIVE_MONITOR_DB"
database_name = "bilibili-live-monitor-db"
database_id = "你的D1数据库ID"
```

### 6. 添加要监控的主播

编辑`src/roomIds.js`文件，添加要监控的Bilibili房间ID：

```javascript
export default [
  123456,  // 主播1的房间ID
  789012   // 主播2的房间ID
];
```

### 7. 部署到Cloudflare Workers

```bash
npm run deploy
```

## 项目结构说明

```
BiliLiveStatus2TG/
├── src/
│   ├── index.js          # 主程序入口
│   └── roomIds.js        # 要监控的房间ID列表
├── db/
│   └── schema.sql        # D1数据库初始化脚本
├── wrangler.toml         # Cloudflare Workers配置文件
├── package.json          # 项目依赖配置
└── README.md             # 项目说明文档
```

## 环境变量说明

| 变量名 | 说明 |
|--------|------|
| TELEGRAM_BOT_TOKEN | Telegram机器人Token |
| TELEGRAM_CHAT_ID | Telegram聊天ID |
| LIVE_MONITOR_DB | D1数据库绑定（自动配置） |

## 定时触发器配置

机器人默认每30分钟执行一次检查，配置在`wrangler.toml`文件中：

```toml
[[triggers.crons]]
crons = ["0,30 * * * *"]
```

可以根据需要修改cron表达式来调整执行频率。

## 注意事项

1. 确保Cloudflare Workers和D1数据库在同一个区域
2. 首次部署可能需要等待几分钟让所有服务生效
3. 可以通过访问Worker的URL手动触发检查
4. 建议先测试一个房间ID，确认功能正常后再添加更多

## 故障排除

- **没有收到Telegram通知**：检查Bot Token和Chat ID是否正确
- **重复收到通知**：检查D1数据库是否正确配置
- **部署失败**：检查代码语法和配置文件

## 许可证

MIT License
