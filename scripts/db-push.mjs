import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

const args = process.argv.slice(2);
const envArg = args.find((a) => a.startsWith("--env="))?.split("=")[1] || "dev";

const envFileMap = {
  dev: ".env.local",
  prod: ".env.production",
};

const envFilename = envFileMap[envArg];
if (!envFilename) {
  console.error(`Unknown --env=${envArg}. Use --env=dev or --env=prod.`);
  process.exit(1);
}

const envPath = path.resolve(process.cwd(), envFilename);
if (!fs.existsSync(envPath)) {
  console.error(
    `File ${envFilename} tidak ditemukan di ${process.cwd()}.\nSalin dari ${envFilename}.example atau .env.example lalu isi kredensial Turso ${envArg.toUpperCase()}.`
  );
  process.exit(1);
}

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let val = line.slice(eqIndex + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

const env = parseEnvFile(envPath);
const url = env.TURSO_DATABASE_URL;
const authToken = env.TURSO_AUTH_TOKEN || undefined;

if (!url) {
  console.error(`TURSO_DATABASE_URL kosong di ${envFilename}.`);
  process.exit(1);
}

if (url.startsWith("libsql://") && !authToken) {
  console.error(`TURSO_AUTH_TOKEN wajib diisi untuk koneksi libsql:// di ${envFilename}.`);
  process.exit(1);
}

console.log(`[${envArg.toUpperCase()}] Connecting to ${url} (via ${envFilename})...`);

const db = createClient({ url, authToken });

const schemaPath = path.resolve(process.cwd(), "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");

await db.executeMultiple(schemaSql);
console.log(`[${envArg.toUpperCase()}] Schema & indexes applied.`);

const existing = await db.execute("SELECT COUNT(*) as cnt FROM users");
const count = Number(existing.rows[0]?.cnt ?? 0);

if (count === 0) {
  const seedCode = (env.SEED_CUSTODIAN_CODE || "CUST-001").trim().toUpperCase();
  const seedName = (env.SEED_CUSTODIAN_NAME || "System Custodian").trim();
  const digits = seedCode.replace(/\D/g, "");
  const suffix =
    digits.length > 0
      ? digits.slice(-4)
      : seedCode.replace(/[^a-zA-Z0-9]/g, "").slice(-4).padStart(4, "0");
  const defaultPass = `Presensi#${suffix}`;
  const hash = await bcrypt.hash(defaultPass, 10);

  await db.execute({
    sql: `INSERT INTO users (id, employee_code, full_name, password_hash, role_code, is_first_login, is_active, created_by)
          VALUES (?, ?, ?, ?, 'sys_custodian', 1, 1, 'SYSTEM')`,
    args: [crypto.randomUUID(), seedCode, seedName, hash],
  });

  console.log(
    `[${envArg.toUpperCase()}] Seeded initial System Custodian: ${seedCode} (password bawaan: ${defaultPass})`
  );
} else {
  console.log(`[${envArg.toUpperCase()}] Users table already has ${count} user(s); skipping seed.`);
}

console.log(`[${envArg.toUpperCase()}] Done.`);
process.exit(0);
