import { createClient, type Client } from "@libsql/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

let clientInstance: Client | null = null;
let initPromise: Promise<void> | null = null;

export function getDb(): Client {
  if (!clientInstance) {
    const url = process.env.TURSO_DATABASE_URL || "file:local.db";
    const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
    clientInstance = createClient({
      url,
      authToken,
    });
  }
  return clientInstance;
}

export function getDefaultPassword(employeeCode: string): string {
  const digits = employeeCode.replace(/\D/g, "");
  if (digits.length > 0) {
    return `Presensi#${digits.slice(-4)}`;
  }
  const cleaned = employeeCode.replace(/[^a-zA-Z0-9]/g, "");
  return `Presensi#${cleaned.slice(-4).padStart(4, "0")}`;
}

export async function ensureDb(): Promise<Client> {
  const db = getDb();
  if (!initPromise) {
    initPromise = (async () => {
      await db.executeMultiple(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          employee_code TEXT NOT NULL UNIQUE,
          full_name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          role_code TEXT NOT NULL CHECK (role_code IN ('sys_custodian', 'fld_coord', 'fld_member')),
          is_first_login INTEGER NOT NULL DEFAULT 1,
          is_active INTEGER NOT NULL DEFAULT 1,
          deleted_at TEXT,
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
      `);

      // Safe migration for existing databases adding deleted_at to users
      try {
        await db.execute("ALTER TABLE users ADD COLUMN deleted_at TEXT");
      } catch {
        // Column already exists
      }

      const existing = await db.execute("SELECT COUNT(*) as cnt FROM users");
      const count = Number(existing.rows[0]?.cnt ?? 0);

      if (count === 0) {
        const seedCode = (process.env.SEED_CUSTODIAN_CODE || "CUST-001").trim().toUpperCase();
        const seedName = (process.env.SEED_CUSTODIAN_NAME || "System Custodian").trim();
        const defaultPass = getDefaultPassword(seedCode);
        const hash = await bcrypt.hash(defaultPass, 10);

        await db.execute({
          sql: `INSERT INTO users (id, employee_code, full_name, password_hash, role_code, is_first_login, is_active, created_by)
                VALUES (?, ?, ?, ?, 'sys_custodian', 1, 1, 'SYSTEM')`,
          args: [crypto.randomUUID(), seedCode, seedName, hash],
        });
      }
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
  return db;
}
