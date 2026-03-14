CREATE TABLE IF NOT EXISTS live_status (
  room_id INTEGER PRIMARY KEY,  -- 房间ID
  live_time TEXT NOT NULL,  -- 开播时间，格式：YYYY-MM-DD HH:MM:SS
  message_id INTEGER NOT NULL  -- Telegram开播通知消息ID
);

CREATE INDEX IF NOT EXISTS idx_live_status_room_id ON live_status(room_id);
