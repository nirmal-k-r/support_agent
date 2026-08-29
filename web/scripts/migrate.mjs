import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import "dotenv/config";
import { Pool } from "pg";

function sslFor(url) {
  if (url.includes("render.com") || url.includes("sslmode=require") || url.includes("amazonaws.com")) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = readFileSync(join(root, "db", "schema.sql"), "utf8");

const pool = new Pool({ connectionString, ssl: sslFor(connectionString) });
try {
  await pool.query(sql);
  console.log("Migration complete: schema applied.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
} finally {
  await pool.end();
}
