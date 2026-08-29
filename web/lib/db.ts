import { Pool } from "pg";

let pool: Pool | null = null;

function sslFor(url: string) {
  if (url.includes("render.com") || url.includes("sslmode=require") || url.includes("amazonaws.com")) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool({ connectionString, ssl: sslFor(connectionString) });
  }
  return pool;
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return { rows: result.rows, rowCount: result.rowCount };
  } finally {
    client.release();
  }
}
