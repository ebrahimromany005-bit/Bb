/**
 * Cloudflare Pages Function — handles all /api/* routes.
 * Uses @neondatabase/serverless (HTTP/WebSocket) instead of pg (TCP),
 * which is the only PostgreSQL driver compatible with Cloudflare Workers.
 */
import { neon } from "@neondatabase/serverless";

type Env = {
  DATABASE_URL: string;
};

type Row = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlFn = any;

// Helper: always returns rows array regardless of neon's union return type
async function query(
  sql: SqlFn,
  text: string,
  params?: unknown[]
): Promise<Row[]> {
  const result = await sql.query(text, params ?? []);
  if (result && typeof result === "object" && Array.isArray(result.rows)) {
    return result.rows as Row[];
  }
  if (Array.isArray(result)) {
    return result as Row[];
  }
  return [];
}

// ---------- helpers ----------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function normalizeArabic(s: string): string {
  return s
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .trim();
}

function serializeOpp(o: Row) {
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
    description: (o.description as string) ?? "",
    eligibility: o.eligibility ?? undefined,
    benefits: Array.isArray(o.benefits) ? o.benefits : [],
    requirements: Array.isArray(o.requirements) ? o.requirements : [],
    applicationUrl: o.application_url ?? undefined,
    tags: Array.isArray(o.tags) ? o.tags : [],
    difficulty: o.difficulty ?? undefined,
    acceptanceRate: o.acceptance_rate ?? undefined,
    featured: o.featured,
    affiliateUrl: o.affiliate_url ?? undefined,
    createdAt:
      o.created_at instanceof Date
        ? o.created_at.toISOString()
        : String(o.created_at),
  };
}

const DEVELOPED_COUNTRY_CODES = [
  "DE", "FR", "GB", "IT", "ES", "PT", "NL", "BE", "CH", "AT", "SE", "NO",
  "DK", "FI", "IS", "IE", "LU", "GR", "CZ", "PL", "HU", "SK", "SI", "HR",
  "EE", "LV", "LT", "MT", "CY", "RO", "BG",
  "US", "CA", "AU", "NZ", "JP", "KR", "SG",
];

// ---------- route handlers ----------

async function handleOpportunities(
  sql: SqlFn,
  url: URL
): Promise<Response> {
  const page = Number(url.searchParams.get("page") || "1");
  const pageSize = Math.min(
    Number(url.searchParams.get("pageSize") || "20"),
    100
  );
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const q = url.searchParams.get("q");
  if (q) {
    const qLike = `%${q}%`;
    const qNorm = `%${normalizeArabic(q)}%`;
    conditions.push(`(
      title ILIKE $${idx} OR title_ar ILIKE $${idx} OR organization ILIKE $${idx}
      OR field ILIKE $${idx} OR country_name ILIKE $${idx} OR country_name_ar ILIKE $${idx}
      OR regexp_replace(regexp_replace(title_ar, '[إأآ]', 'ا', 'g'), 'ى', 'ي', 'g') ILIKE $${idx + 1}
      OR regexp_replace(regexp_replace(country_name_ar, '[إأآ]', 'ا', 'g'), 'ى', 'ي', 'g') ILIKE $${idx + 1}
    )`);
    values.push(qLike, qNorm);
    idx += 2;
  }

  const type = url.searchParams.get("type");
  if (type && type !== "all") {
    conditions.push(`type = $${idx++}`);
    values.push(type);
  }

  const countryCode = url.searchParams.get("countryCode");
  if (countryCode) {
    conditions.push(`country_code = $${idx++}`);
    values.push(countryCode);
  }

  const field = url.searchParams.get("field");
  if (field) {
    conditions.push(`field ILIKE $${idx++}`);
    values.push(`%${field}%`);
  }

  const degreeLevel = url.searchParams.get("degreeLevel");
  if (degreeLevel) {
    conditions.push(`degree_level = $${idx++}`);
    values.push(degreeLevel);
  }

  const funding = url.searchParams.get("funding");
  if (funding) {
    conditions.push(`funding = $${idx++}`);
    values.push(funding);
  }

  const featured = url.searchParams.get("featured");
  if (featured !== null) {
    conditions.push(`featured = $${idx++}`);
    values.push(featured === "true");
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sort = url.searchParams.get("sort");
  let orderBy = "ORDER BY featured DESC";
  if (sort === "deadline") orderBy = "ORDER BY deadline ASC";
  else if (sort === "newest") orderBy = "ORDER BY created_at DESC";
  else if (sort === "popular")
    orderBy = "ORDER BY acceptance_rate DESC NULLS LAST";

  const [items, countRows] = await Promise.all([
    query(
      sql,
      `SELECT * FROM opportunities ${where} ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, pageSize, offset]
    ),
    query(
      sql,
      `SELECT count(*)::int AS total FROM opportunities ${where}`,
      values
    ),
  ]);

  return json({
    items: items.map(serializeOpp),
    total: Number(countRows[0]?.total ?? 0),
    page,
    pageSize,
  });
}

async function handleFeatured(sql: SqlFn): Promise<Response> {
  const rows = await query(
    sql,
    `SELECT * FROM opportunities
     WHERE country_code = ANY($1::text[])
     ORDER BY featured DESC, deadline ASC LIMIT 12`,
    [DEVELOPED_COUNTRY_CODES]
  );
  return json(rows.map(serializeOpp));
}

async function handleRecommended(
  sql: SqlFn,
  url: URL
): Promise<Response> {
  const interestsRaw = url.searchParams.get("interests");
  const interests = interestsRaw
    ? interestsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (interests.length > 0) {
    const paramOffset = DEVELOPED_COUNTRY_CODES.length + 1;
    const conds = interests
      .map(
        (_, i) =>
          `(field ILIKE $${paramOffset + i} OR tags::text ILIKE $${paramOffset + i})`
      )
      .join(" OR ");
    const rows = await query(
      sql,
      `SELECT * FROM opportunities
       WHERE country_code = ANY($1::text[]) AND (${conds})
       ORDER BY featured DESC, deadline ASC LIMIT 12`,
      [DEVELOPED_COUNTRY_CODES, ...interests.map((i) => `%${i}%`)]
    );
    return json(rows.map(serializeOpp));
  }

  const rows = await query(
    sql,
    `SELECT * FROM opportunities
     WHERE country_code = ANY($1::text[])
     ORDER BY featured DESC, acceptance_rate DESC NULLS LAST LIMIT 12`,
    [DEVELOPED_COUNTRY_CODES]
  );
  return json(rows.map(serializeOpp));
}

async function handleDeadlines(
  sql: SqlFn
): Promise<Response> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await query(
    sql,
    `SELECT * FROM opportunities WHERE deadline > $1 ORDER BY deadline ASC LIMIT 20`,
    [today]
  );
  return json(rows.map(serializeOpp));
}

async function handleOpportunityById(
  sql: SqlFn,
  id: number
): Promise<Response> {
  if (isNaN(id)) return json({ error: "Invalid id" }, 400);
  const rows = await query(sql, `SELECT * FROM opportunities WHERE id = $1`, [
    id,
  ]);
  if (!rows[0]) return json({ error: "Not found" }, 404);
  return json(serializeOpp(rows[0]));
}

async function handleCountries(
  sql: SqlFn
): Promise<Response> {
  const rows = await query(
    sql,
    `SELECT c.code, c.name, c.name_ar, c.flag, c.region, c.latitude, c.longitude,
      count(o.id)::int AS opportunity_count,
      count(o.id) FILTER (WHERE o.type = 'scholarship')::int AS scholarship_count,
      count(o.id) FILTER (WHERE o.type = 'migration')::int AS migration_count
    FROM countries c
    LEFT JOIN opportunities o ON o.country_code = c.code
    GROUP BY c.code
    ORDER BY count(o.id) DESC`
  );
  return json(
    rows.map((r) => ({
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
    }))
  );
}

async function handleCountryByCode(
  sql: SqlFn,
  code: string
): Promise<Response> {
  const [cRows, oRows] = await Promise.all([
    query(sql, `SELECT * FROM countries WHERE code = $1`, [
      code.toUpperCase(),
    ]),
    query(sql, `SELECT * FROM opportunities WHERE country_code = $1`, [
      code.toUpperCase(),
    ]),
  ]);
  if (!cRows[0]) return json({ error: "Not found" }, 404);
  const c = cRows[0];
  return json({
    code: c.code,
    name: c.name,
    nameAr: c.name_ar,
    flag: c.flag,
    region: c.region,
    description: (c.description as string) ?? "",
    opportunityCount: oRows.length,
    scholarshipCount: oRows.filter((o) => o.type === "scholarship").length,
    migrationCount: oRows.filter((o) => o.type === "migration").length,
    opportunities: oRows.map(serializeOpp),
  });
}

async function handleStatsOverview(
  sql: SqlFn
): Promise<Response> {
  const today = new Date().toISOString().slice(0, 10);
  const [counts, countryCount, deadlines] = await Promise.all([
    query(
      sql,
      `SELECT
        count(*)::int AS total_opportunities,
        count(*) FILTER (WHERE type = 'scholarship')::int AS total_scholarships,
        count(*) FILTER (WHERE type = 'migration')::int AS total_migration,
        count(*) FILTER (WHERE featured = true)::int AS featured_count
      FROM opportunities`
    ),
    query(sql, `SELECT count(*)::int AS country_count FROM countries`),
    query(
      sql,
      `SELECT count(*)::int AS deadlines FROM opportunities WHERE deadline > $1`,
      [today]
    ),
  ]);
  const c = counts[0] ?? {};
  return json({
    totalOpportunities: Number(c.total_opportunities ?? 0),
    totalScholarships: Number(c.total_scholarships ?? 0),
    totalMigration: Number(c.total_migration ?? 0),
    totalCountries: Number(countryCount[0]?.country_count ?? 0),
    upcomingDeadlines: Number(deadlines[0]?.deadlines ?? 0),
    featuredCount: Number(c.featured_count ?? 0),
  });
}

async function handleStatsByType(
  sql: SqlFn
): Promise<Response> {
  const rows = await query(
    sql,
    `SELECT type, count(*)::int AS count FROM opportunities GROUP BY type`
  );
  return json(rows.map((r) => ({ type: r.type, count: Number(r.count) })));
}

async function handleStatsTopCountries(
  sql: SqlFn
): Promise<Response> {
  const rows = await query(
    sql,
    `SELECT c.code, c.name, c.name_ar, c.flag, count(o.id)::int AS count
    FROM countries c
    LEFT JOIN opportunities o ON o.country_code = c.code
    GROUP BY c.code
    ORDER BY count(o.id) DESC
    LIMIT 20`
  );
  return json(
    rows.map((r) => ({
      countryCode: r.code,
      countryName: r.name,
      countryNameAr: r.name_ar,
      flag: r.flag,
      count: Number(r.count ?? 0),
    }))
  );
}

async function handleGetApplications(
  sql: SqlFn,
  url: URL
): Promise<Response> {
  const userId = url.searchParams.get("userId") ?? "";
  if (!userId) return json({ error: "userId required" }, 400);
  const rows = await query(
    sql,
    `SELECT a.id, a.user_id, a.opportunity_id, a.status, a.notes, a.created_at, a.updated_at,
      o.title AS opportunity_title, o.title_ar AS opportunity_title_ar,
      o.country_code, o.country_name, o.country_name_ar, o.type, o.deadline
    FROM applications a
    INNER JOIN opportunities o ON a.opportunity_id = o.id
    WHERE a.user_id = $1
    ORDER BY a.created_at DESC`,
    [userId]
  );
  return json(
    rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      opportunityId: r.opportunity_id,
      opportunityTitle: r.opportunity_title,
      opportunityTitleAr: r.opportunity_title_ar,
      countryCode: r.country_code,
      countryName: r.country_name,
      countryNameAr: r.country_name_ar,
      type: r.type,
      status: r.status,
      notes: r.notes ?? undefined,
      deadline: r.deadline,
      createdAt:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at),
      updatedAt:
        r.updated_at instanceof Date
          ? r.updated_at.toISOString()
          : String(r.updated_at),
    }))
  );
}

async function handleCreateApplication(
  sql: SqlFn,
  body: Record<string, unknown>
): Promise<Response> {
  const { userId, opportunityId, status = "planning", notes } = body;
  if (!userId || !opportunityId)
    return json({ error: "userId and opportunityId required" }, 400);
  const rows = await query(
    sql,
    `INSERT INTO applications (user_id, opportunity_id, status, notes) VALUES ($1,$2,$3,$4) RETURNING *`,
    [userId, opportunityId, status, notes ?? null]
  );
  const created = rows[0];
  if (!created) return json({ error: "Failed to create" }, 500);
  const opps = await query(
    sql,
    `SELECT * FROM opportunities WHERE id = $1`,
    [created.opportunity_id]
  );
  const opp = opps[0] ?? {};
  return json(
    {
      id: created.id,
      userId: created.user_id,
      opportunityId: created.opportunity_id,
      opportunityTitle: (opp.title as string) ?? "",
      opportunityTitleAr: (opp.title_ar as string) ?? "",
      countryCode: (opp.country_code as string) ?? "",
      countryName: (opp.country_name as string) ?? "",
      countryNameAr: (opp.country_name_ar as string) ?? "",
      type: (opp.type as string) ?? "scholarship",
      status: created.status,
      notes: created.notes ?? undefined,
      deadline: opp.deadline,
      createdAt:
        created.created_at instanceof Date
          ? created.created_at.toISOString()
          : String(created.created_at),
      updatedAt:
        created.updated_at instanceof Date
          ? created.updated_at.toISOString()
          : String(created.updated_at),
    },
    201
  );
}

async function handlePatchApplication(
  sql: SqlFn,
  id: number,
  body: Record<string, unknown>
): Promise<Response> {
  if (isNaN(id)) return json({ error: "Invalid id" }, 400);
  const { status, notes } = body;
  const sets: string[] = ["updated_at = NOW()"];
  const vals: unknown[] = [];
  let idx = 1;
  if (status !== undefined) {
    sets.push(`status = $${idx++}`);
    vals.push(status);
  }
  if (notes !== undefined) {
    sets.push(`notes = $${idx++}`);
    vals.push(notes);
  }
  vals.push(id);
  const rows = await query(
    sql,
    `UPDATE applications SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
    vals
  );
  if (!rows[0]) return json({ error: "Not found" }, 404);
  const updated = rows[0];
  const opps = await query(
    sql,
    `SELECT * FROM opportunities WHERE id = $1`,
    [updated.opportunity_id]
  );
  const opp = opps[0] ?? {};
  return json({
    id: updated.id,
    userId: updated.user_id,
    opportunityId: updated.opportunity_id,
    opportunityTitle: (opp.title as string) ?? "",
    opportunityTitleAr: (opp.title_ar as string) ?? "",
    countryCode: (opp.country_code as string) ?? "",
    countryName: (opp.country_name as string) ?? "",
    countryNameAr: (opp.country_name_ar as string) ?? "",
    type: (opp.type as string) ?? "scholarship",
    status: updated.status,
    notes: updated.notes ?? undefined,
    deadline: opp.deadline,
    createdAt:
      updated.created_at instanceof Date
        ? updated.created_at.toISOString()
        : String(updated.created_at),
    updatedAt:
      updated.updated_at instanceof Date
        ? updated.updated_at.toISOString()
        : String(updated.updated_at),
  });
}

async function handleDeleteApplication(
  sql: SqlFn,
  id: number
): Promise<Response> {
  if (isNaN(id)) return json({ error: "Invalid id" }, 400);
  await query(sql, `DELETE FROM applications WHERE id = $1`, [id]);
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function handleAdTrack(
  sql: SqlFn,
  body: Record<string, unknown>
): Promise<Response> {
  const { slot, event } = body;
  if (!slot || !event) return json({ error: "slot and event required" }, 400);
  await query(sql, `INSERT INTO ad_events (slot, event) VALUES ($1, $2)`, [
    slot,
    event,
  ]);
  return json({ ok: true });
}

async function handleAdStats(sql: SqlFn): Promise<Response> {
  const rows = await query(
    sql,
    `SELECT slot,
      count(*) FILTER (WHERE event = 'impression')::int AS impressions,
      count(*) FILTER (WHERE event = 'click')::int AS clicks
    FROM ad_events GROUP BY slot`
  );
  return json(
    rows.map((r) => ({
      slot: r.slot,
      impressions: Number(r.impressions ?? 0),
      clicks: Number(r.clicks ?? 0),
    }))
  );
}

// ---------- main handler ----------

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (!env.DATABASE_URL) {
    return json({ error: "DATABASE_URL is not configured" }, 500);
  }

  const sql = neon(env.DATABASE_URL);
  const url = new URL(request.url);

  // Strip /api prefix to get the path segment
  const rawPath = url.pathname.replace(/^\/api/, "") || "/";
  const method = request.method.toUpperCase();

  try {
    // GET /api/healthz
    if (rawPath === "/healthz" && method === "GET") {
      return json({ status: "ok" });
    }

    // GET /api/opportunities/featured
    if (rawPath === "/opportunities/featured" && method === "GET") {
      return handleFeatured(sql);
    }

    // GET /api/opportunities/recommended
    if (rawPath === "/opportunities/recommended" && method === "GET") {
      return handleRecommended(sql, url);
    }

    // GET /api/opportunities/deadlines
    if (rawPath === "/opportunities/deadlines" && method === "GET") {
      return handleDeadlines(sql);
    }

    // GET /api/opportunities/:id
    const oppByIdMatch = rawPath.match(/^\/opportunities\/(\d+)$/);
    if (oppByIdMatch && method === "GET") {
      return handleOpportunityById(sql, Number(oppByIdMatch[1]));
    }

    // GET /api/opportunities
    if (rawPath === "/opportunities" && method === "GET") {
      return handleOpportunities(sql, url);
    }

    // GET /api/countries
    if (rawPath === "/countries" && method === "GET") {
      return handleCountries(sql);
    }

    // GET /api/countries/:code
    const countryByCodeMatch = rawPath.match(/^\/countries\/([A-Za-z]{2,3})$/);
    if (countryByCodeMatch && method === "GET") {
      return handleCountryByCode(sql, countryByCodeMatch[1]);
    }

    // GET /api/stats/overview
    if (rawPath === "/stats/overview" && method === "GET") {
      return handleStatsOverview(sql);
    }

    // GET /api/stats/by-type
    if (rawPath === "/stats/by-type" && method === "GET") {
      return handleStatsByType(sql);
    }

    // GET /api/stats/top-countries
    if (rawPath === "/stats/top-countries" && method === "GET") {
      return handleStatsTopCountries(sql);
    }

    // GET /api/applications
    if (rawPath === "/applications" && method === "GET") {
      return handleGetApplications(sql, url);
    }

    // POST /api/applications
    if (rawPath === "/applications" && method === "POST") {
      const body = (await request.json()) as Record<string, unknown>;
      return handleCreateApplication(sql, body);
    }

    // PATCH /api/applications/:id
    const patchAppMatch = rawPath.match(/^\/applications\/(\d+)$/);
    if (patchAppMatch && method === "PATCH") {
      const body = (await request.json()) as Record<string, unknown>;
      return handlePatchApplication(sql, Number(patchAppMatch[1]), body);
    }

    // DELETE /api/applications/:id
    const deleteAppMatch = rawPath.match(/^\/applications\/(\d+)$/);
    if (deleteAppMatch && method === "DELETE") {
      return handleDeleteApplication(sql, Number(deleteAppMatch[1]));
    }

    // POST /api/ads/track
    if (rawPath === "/ads/track" && method === "POST") {
      const body = (await request.json()) as Record<string, unknown>;
      return handleAdTrack(sql, body);
    }

    // GET /api/ads/stats
    if (rawPath === "/ads/stats" && method === "GET") {
      return handleAdStats(sql);
    }

    // OpenAI routes — not supported on CF Pages
    if (rawPath.startsWith("/openai")) {
      return json(
        { error: "AI features are not available on this deployment" },
        501
      );
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("API error:", err);
    return json(
      { error: "Internal server error" },
      500
    );
  }
};
