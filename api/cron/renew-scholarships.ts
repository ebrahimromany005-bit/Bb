import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  if (secret && authHeader !== `Bearer ${secret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  const { rowCount } = await pool.query(`
    UPDATE opportunities
    SET deadline = (deadline::date + INTERVAL '1 year')::text
    WHERE deadline < $1
      AND deadline != '2099-12-31'
  `, [today]);

  const renewed = rowCount ?? 0;

  res.json({
    success: true,
    renewed,
    message: `Renewed ${renewed} expired scholarship deadlines by 1 year`,
    ranAt: new Date().toISOString(),
  });
}
