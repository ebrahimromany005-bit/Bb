/**
 * Cloudflare Pages Function — handles all /api/* routes.
 * Uses @neondatabase/serverless (HTTP mode, CF-compatible).
 * Falls back to static mock data when DB is unavailable.
 */
import { neon } from "@neondatabase/serverless";

type Env = {
  DATABASE_URL?: string;
};

type Row = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlFn = ReturnType<typeof neon>;

async function query(sql: SqlFn, text: string, params: unknown[] = []): Promise<Row[]> {
  try {
    // neon().query() returns { rows, fields }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (sql as any).query(text, params);
    if (result && typeof result === "object" && Array.isArray(result.rows)) {
      return result.rows as Row[];
    }
    if (Array.isArray(result)) return result as Row[];
    return [];
  } catch (err) {
    console.error("[neon query error]", text.slice(0, 120), "|params:", JSON.stringify(params).slice(0, 200), "|error:", err instanceof Error ? err.message : String(err));
    throw err;
  }
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
    createdAt: o.created_at ? String(o.created_at) : "",
  };
}

const DEVELOPED_COUNTRY_CODES = [
  "DE","FR","GB","IT","ES","PT","NL","BE","CH","AT","SE","NO",
  "DK","FI","IS","IE","LU","GR","CZ","PL","HU","SK","SI","HR",
  "EE","LV","LT","MT","CY","RO","BG",
  "US","CA","AU","NZ","JP","KR","SG",
];

function placeholders(arr: unknown[], startIdx = 1): string {
  return arr.map((_, i) => `$${startIdx + i}`).join(",");
}

// ---------- MOCK DATA (fallback when DB unavailable) ----------

const MOCK_OPPORTUNITIES: Row[] = [
  { id:1, title:"DAAD Scholarship Germany", title_ar:"منحة داد الألمانية", type:"scholarship", country_code:"DE", country_name:"Germany", country_name_ar:"ألمانيا", organization:"DAAD", degree_level:"masters", field:"Engineering", funding:"full", amount:"€1,200/month", duration:"2 years", deadline:"2025-11-30", description:"Full scholarship for international students in Germany.", eligibility:"Bachelor degree required", benefits:["Tuition","Stipend","Insurance"], requirements:["GPA 3.0+","Language certificate"], application_url:"https://daad.de", tags:["engineering","germany","masters"], difficulty:"medium", acceptance_rate:15, featured:true, affiliate_url:null, created_at:"2025-01-01" },
  { id:2, title:"Chevening Scholarship UK", title_ar:"منحة شيفنينغ البريطانية", type:"scholarship", country_code:"GB", country_name:"United Kingdom", country_name_ar:"المملكة المتحدة", organization:"UK Government", degree_level:"masters", field:"Any", funding:"full", amount:"Full tuition + living", duration:"1 year", deadline:"2025-11-05", description:"UK Government's global scholarship programme.", eligibility:"2 years work experience", benefits:["Tuition","Flight","Stipend"], requirements:["Work experience","Leadership"], application_url:"https://chevening.org", tags:["uk","leadership","masters"], difficulty:"high", acceptance_rate:5, featured:true, affiliate_url:null, created_at:"2025-01-02" },
  { id:3, title:"Fulbright Program USA", title_ar:"برنامج فولبرايت الأمريكي", type:"scholarship", country_code:"US", country_name:"United States", country_name_ar:"الولايات المتحدة", organization:"US Department of State", degree_level:"masters", field:"Any", funding:"full", amount:"Full funding", duration:"1-2 years", deadline:"2025-10-15", description:"Prestigious US government exchange program.", eligibility:"Bachelor degree, strong English", benefits:["Tuition","Stipend","Health"], requirements:["GPA 3.5+","TOEFL 100+"], application_url:"https://fulbrightprogram.org", tags:["usa","research","exchange"], difficulty:"high", acceptance_rate:8, featured:true, affiliate_url:null, created_at:"2025-01-03" },
  { id:4, title:"Erasmus+ Program Europe", title_ar:"برنامج إيراسموس+ الأوروبي", type:"scholarship", country_code:"FR", country_name:"France", country_name_ar:"فرنسا", organization:"European Commission", degree_level:"bachelors", field:"Any", funding:"partial", amount:"€800/month", duration:"6-12 months", deadline:"2026-01-31", description:"European exchange programme for students.", eligibility:"Enrolled in EU university", benefits:["Grant","Recognition"], requirements:["EU enrollment"], application_url:"https://erasmus-plus.ec.europa.eu", tags:["europe","exchange","bachelors"], difficulty:"low", acceptance_rate:40, featured:true, affiliate_url:null, created_at:"2025-01-04" },
  { id:5, title:"Australia Awards Scholarships", title_ar:"منح أستراليا الدراسية", type:"scholarship", country_code:"AU", country_name:"Australia", country_name_ar:"أستراليا", organization:"Australian Government", degree_level:"masters", field:"Any", funding:"full", amount:"Full funding", duration:"2-4 years", deadline:"2025-09-30", description:"Australian Government scholarships for long-term development.", eligibility:"Bachelor degree", benefits:["Tuition","Living allowance","Travel"], requirements:["IELTS 6.5+"], application_url:"https://australiaawards.gov.au", tags:["australia","development","full-funding"], difficulty:"medium", acceptance_rate:20, featured:true, affiliate_url:null, created_at:"2025-01-05" },
  { id:6, title:"Canada Immigration Express Entry", title_ar:"الهجرة الكندية إكسبرس إنتري", type:"migration", country_code:"CA", country_name:"Canada", country_name_ar:"كندا", organization:"IRCC Canada", degree_level:null, field:"Skilled Workers", funding:null, amount:null, duration:"Permanent", deadline:"2026-12-31", description:"Points-based immigration system for skilled workers.", eligibility:"CLB 7+, skilled occupation", benefits:["PR","Work permit","Family"], requirements:["Language test","Work experience"], application_url:"https://canada.ca/en/immigration-refugees-citizenship", tags:["canada","immigration","pr"], difficulty:"medium", acceptance_rate:35, featured:true, affiliate_url:null, created_at:"2025-01-06" },
  { id:7, title:"Sweden Institute Scholarships", title_ar:"منح معهد السويد", type:"scholarship", country_code:"SE", country_name:"Sweden", country_name_ar:"السويد", organization:"Swedish Institute", degree_level:"masters", field:"Any", funding:"full", amount:"SEK 11,000/month", duration:"1-2 years", deadline:"2026-02-10", description:"Full scholarships for master's studies in Sweden.", eligibility:"Bachelor degree, work experience", benefits:["Tuition","Living","Insurance"], requirements:["English B2+"], application_url:"https://si.se/en/apply/scholarships", tags:["sweden","masters","sustainability"], difficulty:"medium", acceptance_rate:12, featured:true, affiliate_url:null, created_at:"2025-01-07" },
  { id:8, title:"Netherlands Orange Tulip Scholarship", title_ar:"منحة أورانج تيوليب هولندا", type:"scholarship", country_code:"NL", country_name:"Netherlands", country_name_ar:"هولندا", organization:"Nuffic", degree_level:"masters", field:"Any", funding:"partial", amount:"Varies", duration:"1-2 years", deadline:"2026-01-15", description:"Scholarship for talented students to study in the Netherlands.", eligibility:"Excellent academic record", benefits:["Tuition reduction","Stipend"], requirements:["GPA 3.5+","IELTS 6.0+"], application_url:"https://orangetulipscholarship.nl", tags:["netherlands","masters","technology"], difficulty:"medium", acceptance_rate:18, featured:true, affiliate_url:null, created_at:"2025-01-08" },
  { id:9, title:"Japan MEXT Government Scholarship", title_ar:"منحة الحكومة اليابانية MEXT", type:"scholarship", country_code:"JP", country_name:"Japan", country_name_ar:"اليابان", organization:"Japanese Government", degree_level:"masters", field:"Any", funding:"full", amount:"¥143,000/month", duration:"2 years", deadline:"2025-12-01", description:"Japanese government scholarship for international students.", eligibility:"Under 35 years old", benefits:["Tuition","Stipend","Flight"], requirements:["Academic excellence"], application_url:"https://mext.go.jp", tags:["japan","mext","government"], difficulty:"high", acceptance_rate:10, featured:true, affiliate_url:null, created_at:"2025-01-09" },
  { id:10, title:"South Korea GKS Scholarship", title_ar:"منحة كوريا الجنوبية GKS", type:"scholarship", country_code:"KR", country_name:"South Korea", country_name_ar:"كوريا الجنوبية", organization:"Korean Government", degree_level:"masters", field:"Any", funding:"full", amount:"KRW 900,000/month", duration:"3 years", deadline:"2025-09-20", description:"Korean government scholarship for graduate studies.", eligibility:"Under 40 years, GPA 2.64+", benefits:["Tuition","Stipend","Korean course"], requirements:["Health certificate","Recommendation letters"], application_url:"https://studyinkorea.go.kr", tags:["korea","gks","technology"], difficulty:"medium", acceptance_rate:22, featured:true, affiliate_url:null, created_at:"2025-01-10" },
  { id:11, title:"Singapore MOE Scholarship", title_ar:"منحة وزارة التعليم سنغافورة", type:"scholarship", country_code:"SG", country_name:"Singapore", country_name_ar:"سنغافورة", organization:"MOE Singapore", degree_level:"bachelors", field:"Any", funding:"full", amount:"SGD 5,800/year", duration:"4 years", deadline:"2026-03-31", description:"Singapore government scholarship for undergraduate studies.", eligibility:"Excellent results, Under 20", benefits:["Tuition","Living allowance","Hostel"], requirements:["Top academic performance"], application_url:"https://moe.gov.sg", tags:["singapore","undergraduate","asia"], difficulty:"high", acceptance_rate:7, featured:true, affiliate_url:null, created_at:"2025-01-11" },
  { id:12, title:"Germany Skilled Worker Immigration", title_ar:"هجرة العمالة الماهرة لألمانيا", type:"migration", country_code:"DE", country_name:"Germany", country_name_ar:"ألمانيا", organization:"German Federal Government", degree_level:null, field:"Skilled Trades & IT", funding:null, amount:null, duration:"Permanent", deadline:"2027-12-31", description:"Germany's new skilled worker immigration law for non-EU citizens.", eligibility:"Recognized qualification or 2yr experience", benefits:["Work visa","Family reunification","PR path"], requirements:["German B1 or job offer"], application_url:"https://make-it-in-germany.com", tags:["germany","work","skilled"], difficulty:"medium", acceptance_rate:45, featured:true, affiliate_url:null, created_at:"2025-01-12" },
];

const MOCK_COUNTRIES: Row[] = [
  { code:"DE", name:"Germany", name_ar:"ألمانيا", flag:"🇩🇪", region:"Europe", latitude:51.165691, longitude:10.451526, opportunity_count:3, scholarship_count:2, migration_count:1 },
  { code:"GB", name:"United Kingdom", name_ar:"المملكة المتحدة", flag:"🇬🇧", region:"Europe", latitude:55.378051, longitude:-3.435973, opportunity_count:2, scholarship_count:2, migration_count:0 },
  { code:"US", name:"United States", name_ar:"الولايات المتحدة", flag:"🇺🇸", region:"Americas", latitude:37.09024, longitude:-95.712891, opportunity_count:2, scholarship_count:2, migration_count:0 },
  { code:"CA", name:"Canada", name_ar:"كندا", flag:"🇨🇦", region:"Americas", latitude:56.130366, longitude:-106.346771, opportunity_count:2, scholarship_count:0, migration_count:2 },
  { code:"AU", name:"Australia", name_ar:"أستراليا", flag:"🇦🇺", region:"Oceania", latitude:-25.274398, longitude:133.775136, opportunity_count:2, scholarship_count:2, migration_count:0 },
  { code:"FR", name:"France", name_ar:"فرنسا", flag:"🇫🇷", region:"Europe", latitude:46.227638, longitude:2.213749, opportunity_count:2, scholarship_count:2, migration_count:0 },
  { code:"SE", name:"Sweden", name_ar:"السويد", flag:"🇸🇪", region:"Europe", latitude:60.128161, longitude:18.643501, opportunity_count:1, scholarship_count:1, migration_count:0 },
  { code:"NL", name:"Netherlands", name_ar:"هولندا", flag:"🇳🇱", region:"Europe", latitude:52.132633, longitude:5.291266, opportunity_count:1, scholarship_count:1, migration_count:0 },
  { code:"JP", name:"Japan", name_ar:"اليابان", flag:"🇯🇵", region:"Asia", latitude:36.204824, longitude:138.252924, opportunity_count:1, scholarship_count:1, migration_count:0 },
  { code:"KR", name:"South Korea", name_ar:"كوريا الجنوبية", flag:"🇰🇷", region:"Asia", latitude:35.907757, longitude:127.766922, opportunity_count:1, scholarship_count:1, migration_count:0 },
  { code:"SG", name:"Singapore", name_ar:"سنغافورة", flag:"🇸🇬", region:"Asia", latitude:1.352083, longitude:103.819836, opportunity_count:1, scholarship_count:1, migration_count:0 },
  { code:"CH", name:"Switzerland", name_ar:"سويسرا", flag:"🇨🇭", region:"Europe", latitude:46.818188, longitude:8.227512, opportunity_count:1, scholarship_count:1, migration_count:0 },
];

// ---------- route handlers ----------

async function handleOpportunities(sql: SqlFn | null, url: URL): Promise<Response> {
  const page = Number(url.searchParams.get("page") || "1");
  const pageSize = Math.min(Number(url.searchParams.get("pageSize") || "20"), 100);
  const offset = (page - 1) * pageSize;

  if (!sql) {
    const items = MOCK_OPPORTUNITIES.slice(offset, offset + pageSize);
    return json({ items: items.map(serializeOpp), total: MOCK_OPPORTUNITIES.length, page, pageSize });
  }

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const q = url.searchParams.get("q");
  if (q) {
    const qLike = `%${q}%`;
    const qNorm = `%${normalizeArabic(q)}%`;
    conditions.push(`(title ILIKE $${idx} OR title_ar ILIKE $${idx} OR organization ILIKE $${idx} OR field ILIKE $${idx} OR country_name ILIKE $${idx} OR country_name_ar ILIKE $${idx} OR regexp_replace(regexp_replace(title_ar,'[إأآ]','ا','g'),'ى','ي','g') ILIKE $${idx+1} OR regexp_replace(regexp_replace(country_name_ar,'[إأآ]','ا','g'),'ى','ي','g') ILIKE $${idx+1})`);
    values.push(qLike, qNorm); idx += 2;
  }
  const type = url.searchParams.get("type");
  if (type && type !== "all") { conditions.push(`type = $${idx++}`); values.push(type); }
  const countryCode = url.searchParams.get("countryCode");
  if (countryCode) { conditions.push(`country_code = $${idx++}`); values.push(countryCode); }
  const field = url.searchParams.get("field");
  if (field) { conditions.push(`field ILIKE $${idx++}`); values.push(`%${field}%`); }
  const degreeLevel = url.searchParams.get("degreeLevel");
  if (degreeLevel) { conditions.push(`degree_level = $${idx++}`); values.push(degreeLevel); }
  const funding = url.searchParams.get("funding");
  if (funding) { conditions.push(`funding = $${idx++}`); values.push(funding); }
  const featured = url.searchParams.get("featured");
  if (featured !== null) { conditions.push(`featured = $${idx++}`); values.push(featured === "true"); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sort = url.searchParams.get("sort");
  let orderBy = "ORDER BY featured DESC";
  if (sort === "deadline") orderBy = "ORDER BY deadline ASC";
  else if (sort === "newest") orderBy = "ORDER BY created_at DESC";
  else if (sort === "popular") orderBy = "ORDER BY acceptance_rate DESC NULLS LAST";

  try {
    const [items, countRows] = await Promise.all([
      query(sql, `SELECT * FROM opportunities ${where} ${orderBy} LIMIT $${idx} OFFSET $${idx+1}`, [...values, pageSize, offset]),
      query(sql, `SELECT count(*)::int AS total FROM opportunities ${where}`, values),
    ]);
    return json({ items: items.map(serializeOpp), total: Number(countRows[0]?.total ?? 0), page, pageSize });
  } catch {
    const items = MOCK_OPPORTUNITIES.slice(offset, offset + pageSize);
    return json({ items: items.map(serializeOpp), total: MOCK_OPPORTUNITIES.length, page, pageSize });
  }
}

async function handleFeatured(sql: SqlFn | null): Promise<Response> {
  if (!sql) return json(MOCK_OPPORTUNITIES.filter(o => o.featured).map(serializeOpp));
  try {
    const ph = placeholders(DEVELOPED_COUNTRY_CODES);
    const rows = await query(sql,
      `SELECT * FROM opportunities WHERE country_code IN (${ph}) ORDER BY featured DESC, deadline ASC LIMIT 12`,
      DEVELOPED_COUNTRY_CODES);
    return json((rows.length ? rows : MOCK_OPPORTUNITIES.filter(o => o.featured)).map(serializeOpp));
  } catch {
    return json(MOCK_OPPORTUNITIES.filter(o => o.featured).map(serializeOpp));
  }
}

async function handleRecommended(sql: SqlFn | null, url: URL): Promise<Response> {
  if (!sql) return json(MOCK_OPPORTUNITIES.slice(0, 8).map(serializeOpp));
  const interestsRaw = url.searchParams.get("interests");
  const interests = interestsRaw ? interestsRaw.split(",").map(s => s.trim()).filter(Boolean) : [];
  const countryPh = placeholders(DEVELOPED_COUNTRY_CODES);
  try {
    if (interests.length > 0) {
      const base = DEVELOPED_COUNTRY_CODES.length + 1;
      const conds = interests.map((_, i) => `(field ILIKE $${base+i} OR tags::text ILIKE $${base+i})`).join(" OR ");
      const rows = await query(sql,
        `SELECT * FROM opportunities WHERE country_code IN (${countryPh}) AND (${conds}) ORDER BY featured DESC, deadline ASC LIMIT 12`,
        [...DEVELOPED_COUNTRY_CODES, ...interests.map(i => `%${i}%`)]);
      return json((rows.length ? rows : MOCK_OPPORTUNITIES.slice(0, 8)).map(serializeOpp));
    }
    const rows = await query(sql,
      `SELECT * FROM opportunities WHERE country_code IN (${countryPh}) ORDER BY featured DESC, acceptance_rate DESC NULLS LAST LIMIT 12`,
      DEVELOPED_COUNTRY_CODES);
    return json((rows.length ? rows : MOCK_OPPORTUNITIES.slice(0, 8)).map(serializeOpp));
  } catch {
    return json(MOCK_OPPORTUNITIES.slice(0, 8).map(serializeOpp));
  }
}

async function handleDeadlines(sql: SqlFn | null): Promise<Response> {
  if (!sql) return json(MOCK_OPPORTUNITIES.slice(0, 5).map(serializeOpp));
  const today = new Date().toISOString().slice(0, 10);
  try {
    const rows = await query(sql, `SELECT * FROM opportunities WHERE deadline > $1 ORDER BY deadline ASC LIMIT 20`, [today]);
    return json((rows.length ? rows : MOCK_OPPORTUNITIES.slice(0, 5)).map(serializeOpp));
  } catch {
    return json(MOCK_OPPORTUNITIES.slice(0, 5).map(serializeOpp));
  }
}

async function handleOpportunityById(sql: SqlFn | null, id: number): Promise<Response> {
  if (isNaN(id)) return json({ error: "Invalid id" }, 400);
  if (!sql) {
    const mock = MOCK_OPPORTUNITIES.find(o => o.id === id);
    return mock ? json(serializeOpp(mock)) : json({ error: "Not found" }, 404);
  }
  try {
    const rows = await query(sql, `SELECT * FROM opportunities WHERE id = $1`, [id]);
    if (!rows[0]) return json({ error: "Not found" }, 404);
    return json(serializeOpp(rows[0]));
  } catch {
    const mock = MOCK_OPPORTUNITIES.find(o => o.id === id);
    return mock ? json(serializeOpp(mock)) : json({ error: "Not found" }, 404);
  }
}

async function handleCountries(sql: SqlFn | null): Promise<Response> {
  const toCountryShape = (r: Row) => ({
    code: r.code, name: r.name, nameAr: r.name_ar, flag: r.flag, region: r.region,
    latitude: r.latitude ?? undefined, longitude: r.longitude ?? undefined,
    opportunityCount: Number(r.opportunity_count ?? 0),
    scholarshipCount: Number(r.scholarship_count ?? 0),
    migrationCount: Number(r.migration_count ?? 0),
  });
  if (!sql) return json(MOCK_COUNTRIES.map(toCountryShape));
  try {
    const rows = await query(sql,
      `SELECT c.code, c.name, c.name_ar, c.flag, c.region, c.latitude, c.longitude,
        count(o.id)::int AS opportunity_count,
        count(o.id) FILTER (WHERE o.type = 'scholarship')::int AS scholarship_count,
        count(o.id) FILTER (WHERE o.type = 'migration')::int AS migration_count
      FROM countries c LEFT JOIN opportunities o ON o.country_code = c.code
      GROUP BY c.code ORDER BY count(o.id) DESC`);
    return json((rows.length ? rows : MOCK_COUNTRIES).map(toCountryShape));
  } catch {
    return json(MOCK_COUNTRIES.map(toCountryShape));
  }
}

async function handleCountryByCode(sql: SqlFn | null, code: string): Promise<Response> {
  const upper = code.toUpperCase();
  if (!sql) {
    const mock = MOCK_COUNTRIES.find(c => c.code === upper);
    if (!mock) return json({ error: "Not found" }, 404);
    const opps = MOCK_OPPORTUNITIES.filter(o => o.country_code === upper);
    return json({ code: mock.code, name: mock.name, nameAr: mock.name_ar, flag: mock.flag, region: mock.region, description: "", opportunityCount: opps.length, scholarshipCount: opps.filter(o => o.type === "scholarship").length, migrationCount: opps.filter(o => o.type === "migration").length, opportunities: opps.map(serializeOpp) });
  }
  try {
    const [cRows, oRows] = await Promise.all([
      query(sql, `SELECT * FROM countries WHERE code = $1`, [upper]),
      query(sql, `SELECT * FROM opportunities WHERE country_code = $1`, [upper]),
    ]);
    if (!cRows[0]) return json({ error: "Not found" }, 404);
    const c = cRows[0];
    return json({ code: c.code, name: c.name, nameAr: c.name_ar, flag: c.flag, region: c.region, description: (c.description as string) ?? "", opportunityCount: oRows.length, scholarshipCount: oRows.filter(o => o.type === "scholarship").length, migrationCount: oRows.filter(o => o.type === "migration").length, opportunities: oRows.map(serializeOpp) });
  } catch {
    const mock = MOCK_COUNTRIES.find(c => c.code === upper);
    if (!mock) return json({ error: "Not found" }, 404);
    const opps = MOCK_OPPORTUNITIES.filter(o => o.country_code === upper);
    return json({ code: mock.code, name: mock.name, nameAr: mock.name_ar, flag: mock.flag, region: mock.region, description: "", opportunityCount: opps.length, scholarshipCount: opps.filter(o => o.type === "scholarship").length, migrationCount: opps.filter(o => o.type === "migration").length, opportunities: opps.map(serializeOpp) });
  }
}

async function handleStatsOverview(sql: SqlFn | null): Promise<Response> {
  const mockStats = {
    totalOpportunities: MOCK_OPPORTUNITIES.length,
    totalScholarships: MOCK_OPPORTUNITIES.filter(o => o.type === "scholarship").length,
    totalMigration: MOCK_OPPORTUNITIES.filter(o => o.type === "migration").length,
    totalCountries: MOCK_COUNTRIES.length,
    upcomingDeadlines: 8,
    featuredCount: MOCK_OPPORTUNITIES.filter(o => o.featured).length,
  };
  if (!sql) return json(mockStats);
  const today = new Date().toISOString().slice(0, 10);
  try {
    const [counts, countryCount, deadlines] = await Promise.all([
      query(sql, `SELECT count(*)::int AS total_opportunities, count(*) FILTER (WHERE type='scholarship')::int AS total_scholarships, count(*) FILTER (WHERE type='migration')::int AS total_migration, count(*) FILTER (WHERE featured=true)::int AS featured_count FROM opportunities`),
      query(sql, `SELECT count(*)::int AS country_count FROM countries`),
      query(sql, `SELECT count(*)::int AS deadlines FROM opportunities WHERE deadline > $1`, [today]),
    ]);
    const c = counts[0] ?? {};
    return json({ totalOpportunities: Number(c.total_opportunities ?? 0), totalScholarships: Number(c.total_scholarships ?? 0), totalMigration: Number(c.total_migration ?? 0), totalCountries: Number(countryCount[0]?.country_count ?? 0), upcomingDeadlines: Number(deadlines[0]?.deadlines ?? 0), featuredCount: Number(c.featured_count ?? 0) });
  } catch {
    return json(mockStats);
  }
}

async function handleStatsByType(sql: SqlFn | null): Promise<Response> {
  if (!sql) return json([{ type:"scholarship", count:10 }, { type:"migration", count:2 }]);
  try {
    const rows = await query(sql, `SELECT type, count(*)::int AS count FROM opportunities GROUP BY type`);
    return json(rows.map(r => ({ type: r.type, count: Number(r.count) })));
  } catch {
    return json([{ type:"scholarship", count:10 }, { type:"migration", count:2 }]);
  }
}

async function handleStatsTopCountries(sql: SqlFn | null): Promise<Response> {
  const mockTop = MOCK_COUNTRIES.slice(0, 10).map(r => ({ countryCode: r.code, countryName: r.name, countryNameAr: r.name_ar, flag: r.flag, count: Number(r.opportunity_count ?? 0) }));
  if (!sql) return json(mockTop);
  try {
    const rows = await query(sql,
      `SELECT c.code, c.name, c.name_ar, c.flag, count(o.id)::int AS count FROM countries c LEFT JOIN opportunities o ON o.country_code = c.code GROUP BY c.code ORDER BY count(o.id) DESC LIMIT 20`);
    return json((rows.length ? rows : MOCK_COUNTRIES).map(r => ({ countryCode: r.code, countryName: r.name, countryNameAr: r.name_ar, flag: r.flag, count: Number(r.count ?? 0) })));
  } catch {
    return json(mockTop);
  }
}

async function handleGetApplications(sql: SqlFn | null, url: URL): Promise<Response> {
  const userId = url.searchParams.get("userId") ?? "";
  if (!userId) return json({ error: "userId required" }, 400);
  if (!sql) return json([]);
  try {
    const rows = await query(sql,
      `SELECT a.id, a.user_id, a.opportunity_id, a.status, a.notes, a.created_at, a.updated_at,
        o.title AS opportunity_title, o.title_ar AS opportunity_title_ar,
        o.country_code, o.country_name, o.country_name_ar, o.type, o.deadline
      FROM applications a INNER JOIN opportunities o ON a.opportunity_id = o.id
      WHERE a.user_id = $1 ORDER BY a.created_at DESC`, [userId]);
    return json(rows.map(r => ({ id:r.id, userId:r.user_id, opportunityId:r.opportunity_id, opportunityTitle:r.opportunity_title, opportunityTitleAr:r.opportunity_title_ar, countryCode:r.country_code, countryName:r.country_name, countryNameAr:r.country_name_ar, type:r.type, status:r.status, notes:r.notes ?? undefined, deadline:r.deadline, createdAt:r.created_at ? String(r.created_at):"", updatedAt:r.updated_at ? String(r.updated_at):"" })));
  } catch { return json([]); }
}

async function handleCreateApplication(sql: SqlFn | null, body: Record<string, unknown>): Promise<Response> {
  const { userId, opportunityId, status = "planning", notes } = body;
  if (!userId || !opportunityId) return json({ error:"userId and opportunityId required" }, 400);
  if (!sql) return json({ error:"Database not configured" }, 503);
  try {
    const rows = await query(sql, `INSERT INTO applications (user_id,opportunity_id,status,notes) VALUES ($1,$2,$3,$4) RETURNING *`, [userId, opportunityId, status, notes ?? null]);
    const created = rows[0];
    if (!created) return json({ error:"Failed to create" }, 500);
    const opps = await query(sql, `SELECT * FROM opportunities WHERE id = $1`, [created.opportunity_id]);
    const opp = opps[0] ?? {};
    return json({ id:created.id, userId:created.user_id, opportunityId:created.opportunity_id, opportunityTitle:(opp.title as string)??"", opportunityTitleAr:(opp.title_ar as string)??"", countryCode:(opp.country_code as string)??"", countryName:(opp.country_name as string)??"", countryNameAr:(opp.country_name_ar as string)??"", type:(opp.type as string)??"scholarship", status:created.status, notes:created.notes ?? undefined, deadline:opp.deadline, createdAt:created.created_at ? String(created.created_at):"", updatedAt:created.updated_at ? String(created.updated_at):"" }, 201);
  } catch { return json({ error:"Database error" }, 500); }
}

async function handlePatchApplication(sql: SqlFn | null, id: number, body: Record<string, unknown>): Promise<Response> {
  if (isNaN(id)) return json({ error:"Invalid id" }, 400);
  if (!sql) return json({ error:"Database not configured" }, 503);
  const { status, notes } = body;
  const sets: string[] = ["updated_at = NOW()"];
  const vals: unknown[] = [];
  let idx = 1;
  if (status !== undefined) { sets.push(`status = $${idx++}`); vals.push(status); }
  if (notes !== undefined) { sets.push(`notes = $${idx++}`); vals.push(notes); }
  vals.push(id);
  try {
    const rows = await query(sql, `UPDATE applications SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`, vals);
    if (!rows[0]) return json({ error:"Not found" }, 404);
    const updated = rows[0];
    const opps = await query(sql, `SELECT * FROM opportunities WHERE id = $1`, [updated.opportunity_id]);
    const opp = opps[0] ?? {};
    return json({ id:updated.id, userId:updated.user_id, opportunityId:updated.opportunity_id, opportunityTitle:(opp.title as string)??"", opportunityTitleAr:(opp.title_ar as string)??"", countryCode:(opp.country_code as string)??"", countryName:(opp.country_name as string)??"", countryNameAr:(opp.country_name_ar as string)??"", type:(opp.type as string)??"scholarship", status:updated.status, notes:updated.notes ?? undefined, deadline:opp.deadline, createdAt:updated.created_at ? String(updated.created_at):"", updatedAt:updated.updated_at ? String(updated.updated_at):"" });
  } catch { return json({ error:"Database error" }, 500); }
}

async function handleDeleteApplication(sql: SqlFn | null, id: number): Promise<Response> {
  if (isNaN(id)) return json({ error:"Invalid id" }, 400);
  if (!sql) return json({ error:"Database not configured" }, 503);
  try {
    await query(sql, `DELETE FROM applications WHERE id = $1`, [id]);
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  } catch { return json({ error:"Database error" }, 500); }
}

async function handleAdTrack(sql: SqlFn | null, body: Record<string, unknown>): Promise<Response> {
  const { slot, event } = body;
  if (!slot || !event) return json({ error:"slot and event required" }, 400);
  if (!sql) return json({ ok: true });
  try {
    await query(sql, `INSERT INTO ad_events (slot,event) VALUES ($1,$2)`, [slot, event]);
    return json({ ok: true });
  } catch { return json({ ok: true }); }
}

async function handleAdStats(sql: SqlFn | null): Promise<Response> {
  if (!sql) return json([]);
  try {
    const rows = await query(sql, `SELECT slot, count(*) FILTER (WHERE event='impression')::int AS impressions, count(*) FILTER (WHERE event='click')::int AS clicks FROM ad_events GROUP BY slot`);
    return json(rows.map(r => ({ slot:r.slot, impressions:Number(r.impressions??0), clicks:Number(r.clicks??0) })));
  } catch { return json([]); }
}

// ---------- main handler ----------

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Build neon client if DATABASE_URL is present, else null → mock data
  let sql: SqlFn | null = null;
  if (env.DATABASE_URL) {
    try {
      sql = neon(env.DATABASE_URL);
    } catch (err) {
      console.error("[neon init error]", err instanceof Error ? err.message : String(err));
    }
  } else {
    console.warn("[CF Pages Function] DATABASE_URL not set — serving mock data");
  }

  const url = new URL(request.url);
  const rawPath = url.pathname.replace(/^\/api/, "") || "/";
  const method = request.method.toUpperCase();

  try {
    if (rawPath === "/healthz" && method === "GET") {
      return json({ status: "ok", db: sql ? "configured" : "missing" });
    }

    if (rawPath === "/opportunities/featured" && method === "GET") return handleFeatured(sql);
    if (rawPath === "/opportunities/recommended" && method === "GET") return handleRecommended(sql, url);
    if (rawPath === "/opportunities/deadlines" && method === "GET") return handleDeadlines(sql);

    const oppByIdMatch = rawPath.match(/^\/opportunities\/(\d+)$/);
    if (oppByIdMatch && method === "GET") return handleOpportunityById(sql, Number(oppByIdMatch[1]));

    if (rawPath === "/opportunities" && method === "GET") return handleOpportunities(sql, url);
    if (rawPath === "/countries" && method === "GET") return handleCountries(sql);

    const countryByCodeMatch = rawPath.match(/^\/countries\/([A-Za-z]{2,3})$/);
    if (countryByCodeMatch && method === "GET") return handleCountryByCode(sql, countryByCodeMatch[1]);

    if (rawPath === "/stats/overview" && method === "GET") return handleStatsOverview(sql);
    if (rawPath === "/stats/by-type" && method === "GET") return handleStatsByType(sql);
    if (rawPath === "/stats/top-countries" && method === "GET") return handleStatsTopCountries(sql);

    if (rawPath === "/applications" && method === "GET") return handleGetApplications(sql, url);
    if (rawPath === "/applications" && method === "POST") {
      const body = (await request.json()) as Record<string, unknown>;
      return handleCreateApplication(sql, body);
    }

    const patchAppMatch = rawPath.match(/^\/applications\/(\d+)$/);
    if (patchAppMatch && method === "PATCH") {
      const body = (await request.json()) as Record<string, unknown>;
      return handlePatchApplication(sql, Number(patchAppMatch[1]), body);
    }

    const deleteAppMatch = rawPath.match(/^\/applications\/(\d+)$/);
    if (deleteAppMatch && method === "DELETE") return handleDeleteApplication(sql, Number(deleteAppMatch[1]));

    if (rawPath === "/ads/track" && method === "POST") {
      const body = (await request.json()) as Record<string, unknown>;
      return handleAdTrack(sql, body);
    }
    if (rawPath === "/ads/stats" && method === "GET") return handleAdStats(sql);

    if (rawPath.startsWith("/openai")) {
      return json({ error: "AI features are not available on this deployment" }, 501);
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("[API error]", rawPath, err instanceof Error ? err.message : String(err));
    return json({ error: "Internal server error" }, 500);
  }
};
