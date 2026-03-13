CREATE TABLE IF NOT EXISTS live_status (
  room_id INTEGER PRIMARY KEY,  -- 房间ID
  live_time INTEGER DEFAULT CURRENT_TIMESTAMP  -- 记录时间
);

CREATE INDEX IF NOT EXISTS idx_live_status_room_id ON live_status(room_id);
