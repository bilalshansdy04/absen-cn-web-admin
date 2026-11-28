CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  employee_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role_code TEXT NOT NULL CHECK (role_code IN ('sys_custodian', 'fld_coord', 'fld_member')),
  is_first_login INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  attendance_date TEXT NOT NULL,
  check_in_at TEXT,
  check_in_lat REAL,
  check_in_lng REAL,
  check_in_address TEXT,
  check_in_tg_file_id TEXT,
  check_out_at TEXT,
  check_out_lat REAL,
  check_out_lng REAL,
  check_out_address TEXT,
  check_out_tg_file_id TEXT,
  UNIQUE(user_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_logs(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_logs(user_id, attendance_date);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
