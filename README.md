# BiliLiveStatus2TG

大 Vibe 时代拉出来的超级AI代码，因为B站天天不给我推送直播状态导致我天天错过直播所以拿ai写了个这个玩意，文档也是ai写的，具体看README.ai.md

部署在Cloudflare Workers上，使用TelegramBot推送消息，推荐每5分钟检查一次直播间状态，请在Cloudflare Workers处配置cron

![image.png](https://s3.bmp.ovh/2026/03/14/1hqZGbxf.png)