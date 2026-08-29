import "dotenv/config";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

function sslFor(url) {
  if (url.includes("render.com") || url.includes("sslmode=require") || url.includes("amazonaws.com")) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: sslFor(connectionString) });

const seeds = [
  {
    email: (process.env.ADMIN_EMAIL || "admin@mysupport.app").toLowerCase(),
    password: process.env.ADMIN_PASSWORD || "admin12345",
    name: "Admin",
    role: "admin",
  },
  {
    email: (process.env.OFFICER_EMAIL || "officer@mysupport.app").toLowerCase(),
    password: process.env.OFFICER_PASSWORD || "officer12345",
    name: "Officer",
    role: "officer",
  },
];

try {
  for (const s of seeds) {
    const hash = await bcrypt.hash(s.password, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role,
             name = EXCLUDED.name`,
      [s.email, hash, s.name, s.role]
    );
    console.log(`Seeded ${s.role}: ${s.email}`);
  }
  console.log("Seed complete.");
} catch (err) {
  console.error("Seed failed:", err);
  process.exit(1);
} finally {
  await pool.end();
}
