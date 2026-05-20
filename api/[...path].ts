import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";
import express, { type Router } from "express";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const app = express();
app.use(express.json());
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  next();
});

const router = express.Router() as Router;

function normalizeArabic(s: string): string {
  return s
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .trim();
}

function serializeOpp(o: Record<string, unknown>) {
  return {
    id: o.id,
    title: o.title,
    titleAr: o.title_ar,
    type: o.type,
    countryCode: o.country_code,
    countryName: o.country_name,
    countryNameAr: o.country_name_ar,
    organization: o.organization,
    degreeLevel: o.degree_level ?? undefined,
    field: o.field ?? undefined,
    funding: o.funding ?? undefined,
    amount: o.amount ?? undefined,
    duration: o.duration ?? undefined,
    deadline: o.deadline,
    description: o.description ?? "",
    eligibility: o.eligibility ?? undefined,
    benefits: Array.isArray(o.benefits) ? o.benefits : [],
    requirements: Array.isArray(o.requirements) ? o.requirements : [],
    applicationUrl: o.application_url ?? undefined,
    tags: Array.isArray(o.tags) ? o.tags : [],
    difficulty: o.difficulty ?? undefined,
    acceptanceRate: o.acceptance_rate ?? undefined,
    featured: o.featured,
    affiliateUrl: o.affiliate_url ?? undefined,
    createdAt: o.created_at instanceof Date ? o.created_at.toISOString() : String(o.created_at),
  };
}

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/opportunities", async (req, res) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Math.min(Number(req.query.pageSize) || 20, 100);
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (req.query.q) {
    const q = `%${req.query.q}%`;
    const qNorm = `%${normalizeArabic(String(req.query.q))}%`;
    conditions.push(`(
      title ILIKE $${idx} OR title_ar ILIKE $${idx} OR organization ILIKE $${idx}
      OR field ILIKE $${idx} OR country_name ILIKE $${idx} OR country_name_ar ILIKE $${idx}
      OR regexp_replace(regexp_replace(title_ar, '[إأآ]', 'ا', 'g'), 'ى', 'ي', 'g') ILIKE $${idx + 1}
      OR regexp_replace(regexp_replace(country_name_ar, '[إأآ]', 'ا', 'g'), 'ى', 'ي', 'g') ILIKE $${idx + 1}
    )`);
    values.push(q, qNorm);
    idx += 2;
  }

  if (req.query.type && req.query.type !== "all") {
    conditions.push(`type = $${idx++}`);
    values.push(req.query.type);
  }

  if (req.query.countryCode) {
    conditions.push(`country_code = $${idx++}`);
    values.push(req.query.countryCode);
  }

  if (req.query.field) {
    conditions.push(`field ILIKE $${idx++}`);
    values.push(`%${req.query.field}%`);
  }

  if (req.query.degreeLevel) {
    conditions.push(`degree_level = $${idx++}`);
    values.push(req.query.degreeLevel);
  }

  if (req.query.funding) {
    conditions.push(`funding = $${idx++}`);
    values.push(req.query.funding);
  }

  if (req.query.featured !== undefined) {
    conditions.push(`featured = $${idx++}`);
    values.push(req.query.featured === "true");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  let orderBy = "ORDER BY featured DESC";
  if (req.query.sort === "deadline") orderBy = "ORDER BY deadline ASC";
  else if (req.query.sort === "newest") orderBy = "ORDER BY created_at DESC";
  else if (req.query.sort === "popular") orderBy = "ORDER BY acceptance_rate DESC NULLS LAST";

  const [itemsRes, countRes] = await Promise.all([
    pool.query(`SELECT * FROM opportunities ${where} ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]),
    pool.query(`SELECT count(*)::int AS total FROM opportunities ${where}`, values),
  ]);

  res.json({
    items: itemsRes.rows.map(serializeOpp),
    total: Number(countRes.rows[0]?.total ?? 0),
    page,
    pageSize,
  });
});

router.get("/opportunities/featured", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM opportunities WHERE featured = true ORDER BY deadline ASC LIMIT 12`
  );
  res.json(rows.map(serializeOpp));
});

router.get("/opportunities/recommended", async (req, res) => {
  const interests = req.query.interests
    ? String(req.query.interests).split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  if (interests.length > 0) {
    const conds = interests.map((_, i) => `(field ILIKE $${i + 1} OR tags::text ILIKE $${i + 1})`).join(" OR ");
    const { rows } = await pool.query(
      `SELECT * FROM opportunities WHERE ${conds} ORDER BY featured DESC, deadline ASC LIMIT 12`,
      interests.map((i) => `%${i}%`)
    );
    res.json(rows.map(serializeOpp));
    return;
  }

  const { rows } = await pool.query(
    `SELECT * FROM opportunities ORDER BY featured DESC, acceptance_rate DESC NULLS LAST LIMIT 12`
  );
  res.json(rows.map(serializeOpp));
});

router.get("/opportunities/deadlines", async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const { rows } = await pool.query(
    `SELECT * FROM opportunities WHERE deadline > $1 ORDER BY deadline ASC LIMIT 20`,
    [today]
  );
  res.json(rows.map(serializeOpp));
});

router.get("/opportunities/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { rows } = await pool.query(`SELECT * FROM opportunities WHERE id = $1`, [id]);
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeOpp(rows[0]));
});

router.get("/countries", async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT c.code, c.name, c.name_ar, c.flag, c.region, c.latitude, c.longitude,
      count(o.id)::int AS opportunity_count,
      count(o.id) FILTER (WHERE o.type = 'scholarship')::int AS scholarship_count,
      count(o.id) FILTER (WHERE o.type = 'migration')::int AS migration_count
    FROM countries c
    LEFT JOIN opportunities o ON o.country_code = c.code
    GROUP BY c.code
    ORDER BY count(o.id) DESC
  `);
  res.json(rows.map((r) => ({
    code: r.code,
    name: r.name,
    nameAr: r.name_ar,
    flag: r.flag,
    region: r.region,
    latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined,
    opportunityCount: Number(r.opportunity_count ?? 0),
    scholarshipCount: Number(r.scholarship_count ?? 0),
    migrationCount: Number(r.migration_count ?? 0),
  })));
});

router.get("/countries/:code", async (req, res) => {
  const code = req.params.code?.toUpperCase();
  const [cRes, oRes] = await Promise.all([
    pool.query(`SELECT * FROM countries WHERE code = $1`, [code]),
    pool.query(`SELECT * FROM opportunities WHERE country_code = $1`, [code]),
  ]);
  if (!cRes.rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  const c = cRes.rows[0];
  const opps = oRes.rows;
  res.json({
    code: c.code,
    name: c.name,
    nameAr: c.name_ar,
    flag: c.flag,
    region: c.region,
    description: c.description ?? "",
    opportunityCount: opps.length,
    scholarshipCount: opps.filter((o) => o.type === "scholarship").length,
    migrationCount: opps.filter((o) => o.type === "migration").length,
    opportunities: opps.map(serializeOpp),
  });
});

router.get("/stats/overview", async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const [counts, countryCount, deadlines] = await Promise.all([
    pool.query(`
      SELECT
        count(*)::int AS total_opportunities,
        count(*) FILTER (WHERE type = 'scholarship')::int AS total_scholarships,
        count(*) FILTER (WHERE type = 'migration')::int AS total_migration,
        count(*) FILTER (WHERE featured = true)::int AS featured_count
      FROM opportunities
    `),
    pool.query(`SELECT count(*)::int AS country_count FROM countries`),
    pool.query(`SELECT count(*)::int AS deadlines FROM opportunities WHERE deadline > $1`, [today]),
  ]);
  const c = counts.rows[0];
  res.json({
    totalOpportunities: Number(c.total_opportunities ?? 0),
    totalScholarships: Number(c.total_scholarships ?? 0),
    totalMigration: Number(c.total_migration ?? 0),
    totalCountries: Number(countryCount.rows[0]?.country_count ?? 0),
    upcomingDeadlines: Number(deadlines.rows[0]?.deadlines ?? 0),
    featuredCount: Number(c.featured_count ?? 0),
  });
});

router.get("/stats/by-type", async (_req, res) => {
  const { rows } = await pool.query(`SELECT type, count(*)::int AS count FROM opportunities GROUP BY type`);
  res.json(rows.map((r) => ({ type: r.type, count: Number(r.count) })));
});

router.get("/stats/top-countries", async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT c.code, c.name, c.name_ar, c.flag, count(o.id)::int AS count
    FROM countries c
    LEFT JOIN opportunities o ON o.country_code = c.code
    GROUP BY c.code
    ORDER BY count(o.id) DESC
    LIMIT 20
  `);
  res.json(rows.map((r) => ({
    countryCode: r.code,
    countryName: r.name,
    countryNameAr: r.name_ar,
    flag: r.flag,
    count: Number(r.count ?? 0),
  })));
});

router.get("/applications", async (req, res) => {
  const userId = String(req.query.userId ?? "");
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  const { rows } = await pool.query(`
    SELECT a.id, a.user_id, a.opportunity_id, a.status, a.notes, a.created_at, a.updated_at,
      o.title AS opportunity_title, o.title_ar AS opportunity_title_ar,
      o.country_code, o.country_name, o.country_name_ar, o.type, o.deadline
    FROM applications a
    INNER JOIN opportunities o ON a.opportunity_id = o.id
    WHERE a.user_id = $1
    ORDER BY a.created_at DESC
  `, [userId]);
  res.json(rows.map((r) => ({
    id: r.id, userId: r.user_id, opportunityId: r.opportunity_id,
    opportunityTitle: r.opportunity_title, opportunityTitleAr: r.opportunity_title_ar,
    countryCode: r.country_code, countryName: r.country_name, countryNameAr: r.country_name_ar,
    type: r.type, status: r.status, notes: r.notes ?? undefined, deadline: r.deadline,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  })));
});

router.post("/applications", async (req, res) => {
  const { userId, opportunityId, status = "planning", notes } = req.body;
  if (!userId || !opportunityId) { res.status(400).json({ error: "userId and opportunityId required" }); return; }
  const { rows } = await pool.query(
    `INSERT INTO applications (user_id, opportunity_id, status, notes) VALUES ($1,$2,$3,$4) RETURNING *`,
    [userId, opportunityId, status, notes ?? null]
  );
  const created = rows[0];
  const { rows: opps } = await pool.query(`SELECT * FROM opportunities WHERE id = $1`, [created.opportunity_id]);
  const opp = opps[0] ?? {};
  res.status(201).json({
    id: created.id, userId: created.user_id, opportunityId: created.opportunity_id,
    opportunityTitle: opp.title ?? "", opportunityTitleAr: opp.title_ar ?? "",
    countryCode: opp.country_code ?? "", countryName: opp.country_name ?? "", countryNameAr: opp.country_name_ar ?? "",
    type: opp.type ?? "scholarship", status: created.status, notes: created.notes ?? undefined,
    deadline: opp.deadline,
    createdAt: created.created_at instanceof Date ? created.created_at.toISOString() : String(created.created_at),
    updatedAt: created.updated_at instanceof Date ? created.updated_at.toISOString() : String(created.updated_at),
  });
});

router.patch("/applications/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status, notes } = req.body;
  const sets: string[] = ["updated_at = NOW()"];
  const vals: unknown[] = [];
  let idx = 1;
  if (status !== undefined) { sets.push(`status = $${idx++}`); vals.push(status); }
  if (notes !== undefined) { sets.push(`notes = $${idx++}`); vals.push(notes); }
  vals.push(id);
  const { rows } = await pool.query(
    `UPDATE applications SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
    vals
  );
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  const updated = rows[0];
  const { rows: opps } = await pool.query(`SELECT * FROM opportunities WHERE id = $1`, [updated.opportunity_id]);
  const opp = opps[0] ?? {};
  res.json({
    id: updated.id, userId: updated.user_id, opportunityId: updated.opportunity_id,
    opportunityTitle: opp.title ?? "", opportunityTitleAr: opp.title_ar ?? "",
    countryCode: opp.country_code ?? "", countryName: opp.country_name ?? "", countryNameAr: opp.country_name_ar ?? "",
    type: opp.type ?? "scholarship", status: updated.status, notes: updated.notes ?? undefined,
    deadline: opp.deadline,
    createdAt: updated.created_at instanceof Date ? updated.created_at.toISOString() : String(updated.created_at),
    updatedAt: updated.updated_at instanceof Date ? updated.updated_at.toISOString() : String(updated.updated_at),
  });
});

router.delete("/applications/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await pool.query(`DELETE FROM applications WHERE id = $1`, [id]);
  res.status(204).send();
});

router.post("/ads/track", async (req, res) => {
  const { slot, event } = req.body;
  if (!slot || !event) { res.status(400).json({ error: "slot and event required" }); return; }
  await pool.query(`INSERT INTO ad_events (slot, event) VALUES ($1, $2)`, [slot, event]);
  res.json({ ok: true });
});

router.get("/ads/stats", async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT slot,
      count(*) FILTER (WHERE event = 'impression')::int AS impressions,
      count(*) FILTER (WHERE event = 'click')::int AS clicks
    FROM ad_events GROUP BY slot
  `);
  res.json(rows.map((r) => ({ slot: r.slot, impressions: Number(r.impressions ?? 0), clicks: Number(r.clicks ?? 0) })));
});

router.all("/openai/*", (_req, res) => {
  res.status(501).json({ error: "AI features are not available on this deployment" });
});

app.use("/api", router);

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
