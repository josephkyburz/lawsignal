// LawSignal Worker — serves the SPA static assets and a JSON API.
//
// Routes:
//   GET  /api/health             — service + D1 status
//   GET  /api/schools            — school list, optional ?region=&type=&min_rank=
//   GET  /api/schools/:slug      — single school with observations
//   GET  /api/variables          — variable catalog
//   GET  /api/variables/:id      — single variable with observations across schools
//   POST /api/feedback_events    — analytics + feedback
//   POST /api/supporters         — supporter submissions
//   GET  /api/supporters         — public approved leaderboard
//   GET  /api/session_count      — total session count
//   POST /api/reviews            — review submission
//   GET  /api/reviews            — approved reviews
//   *                            — falls through to ASSETS (the Vite SPA build)

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...CORS },
  });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

// ── Notification helper ────────────────────────────────────────────────────

async function notify(env, subject, body) {
  if (!env.RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "LawSignal <noreply@mail.firmsignal.co>",
        to: ["admin@firmsignal.co"],
        subject,
        text: body,
      }),
    });
  } catch (e) {
    console.error("notify: fetch failed —", e);
  }
}

// ── Route handlers ─────────────────────────────────────────────────────────

async function handleHealth(env) {
  let d1 = "absent";
  if (env.DB) {
    try {
      const row = await env.DB.prepare("SELECT 1 AS ok").first();
      d1 = row?.ok === 1 ? "ok" : "unknown";
    } catch (e) {
      d1 = `error: ${e.message}`;
    }
  }
  return json({
    ok: true,
    service: env.SERVICE_NAME || "lawsignal",
    environment: env.ENVIRONMENT || "dev",
    d1,
    time: new Date().toISOString(),
  });
}

async function handleListSchools(request, env) {
  if (!env.DB) return json({ schools: [], source: "no-d1" });
  const url = new URL(request.url);
  const region = url.searchParams.get("region");
  const type = url.searchParams.get("type");
  try {
    let sql = `SELECT * FROM schools WHERE is_visible = 1`;
    const binds = [];
    if (region) { sql += ` AND region = ?`; binds.push(region); }
    if (type) { sql += ` AND school_type = ?`; binds.push(type); }
    sql += ` ORDER BY canonical_name`;
    const stmt = binds.length
      ? env.DB.prepare(sql).bind(...binds)
      : env.DB.prepare(sql);
    const { results } = await stmt.all();
    return json({ schools: results || [], source: "d1", count: (results || []).length });
  } catch (e) {
    return json({ schools: [], source: "d1-error", error: e.message });
  }
}

async function handleGetSchool(env, slug) {
  if (!env.DB) return json({ error: "no-d1" }, 503);
  try {
    const school = await env.DB
      .prepare(`SELECT * FROM schools WHERE slug = ?`)
      .bind(slug)
      .first();
    if (!school) return json({ error: "not-found" }, 404);

    // Get latest metrics
    const { results: metrics } = await env.DB
      .prepare(`SELECT * FROM school_metrics WHERE school_id = ? ORDER BY metric_year DESC LIMIT 5`)
      .bind(school.id)
      .all();

    // Get observations
    const { results: observations } = await env.DB
      .prepare(`SELECT o.*, v.display_name, v.category, v.data_type, v.unit FROM observations o JOIN variables v ON v.id = o.variable_id WHERE o.school_id = ? ORDER BY v.category, o.metric_year DESC`)
      .bind(school.id)
      .all();

    return json({ school, metrics: metrics || [], observations: observations || [] });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

async function handleListVariables(env) {
  if (!env.DB) return json({ variables: [], source: "no-d1" });
  try {
    const { results } = await env.DB
      .prepare(`SELECT * FROM variables ORDER BY category, display_name`)
      .all();
    return json({ variables: results || [], count: (results || []).length });
  } catch (e) {
    return json({ variables: [], error: e.message });
  }
}

async function handleGetVariable(env, id) {
  if (!env.DB) return json({ error: "no-d1" }, 503);
  try {
    const variable = await env.DB
      .prepare(`SELECT * FROM variables WHERE id = ?`)
      .bind(id)
      .first();
    if (!variable) return json({ error: "not-found" }, 404);

    const { results: observations } = await env.DB
      .prepare(`SELECT o.*, s.canonical_name, s.slug FROM observations o JOIN schools s ON s.id = o.school_id WHERE o.variable_id = ? ORDER BY o.value_numeric DESC`)
      .bind(id)
      .all();

    return json({ variable, observations: observations || [] });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

async function handleFeedbackEvents(request, env) {
  let body;
  try { body = await request.json(); } catch { return err("Invalid JSON"); }
  const { anon_id, session_id, event_name, properties } = body;
  if (!event_name) return err("event_name required");
  if (typeof event_name === "string" && event_name.length > 64) return err("event_name too long");

  await env.DB.prepare(
    `INSERT INTO feedback_events (anon_id, session_id, event_name, properties) VALUES (?, ?, ?, ?)`
  ).bind(
    anon_id || null, session_id || null, event_name,
    properties ? JSON.stringify(properties) : null,
  ).run();

  if (event_name === "bug_reported") {
    const p = properties || {};
    await notify(env, `[LawSignal] Bug report`, `Description: ${p.description || "(none)"}\nSession: ${session_id || "—"}`);
  }
  return json({ ok: true }, 201);
}

async function handlePostSupporters(request, env) {
  let body;
  try { body = await request.json(); } catch { return err("Invalid JSON"); }
  const { stripe_payment_id, amount, display_name, message, is_public } = body;
  if (display_name && String(display_name).length > 100) return err("display_name too long");
  if (message && String(message).length > 500) return err("message too long");
  await env.DB.prepare(
    `INSERT INTO supporters (stripe_payment_id, amount, display_name, message, is_public, is_approved) VALUES (?, ?, ?, ?, ?, 0)`
  ).bind(stripe_payment_id || null, amount || null, display_name || null, message || null, is_public ? 1 : 0).run();
  return json({ ok: true }, 201);
}

async function handleGetSupporters(env) {
  const { results } = await env.DB.prepare(
    `SELECT display_name, message, amount, created_at FROM supporters WHERE is_public = 1 AND is_approved = 1 ORDER BY amount DESC LIMIT 20`
  ).all();
  return json(results);
}

async function handlePostReviews(request, env) {
  let body;
  try { body = await request.json(); } catch { return err("Invalid JSON"); }
  const { body: reviewBody, attribution } = body;
  if (!reviewBody || reviewBody.trim().length < 5) return err("Review body too short");
  if (reviewBody.length > 1000) return err("Review too long");
  await env.DB.prepare(
    `INSERT INTO reviews (body, attribution) VALUES (?, ?)`
  ).bind(reviewBody.trim(), attribution ? attribution.trim().slice(0, 80) : null).run();
  return json({ ok: true }, 201);
}

async function handleGetReviews(env) {
  const { results } = await env.DB.prepare(
    `SELECT body, attribution, created_at FROM reviews WHERE is_approved = 1 ORDER BY created_at DESC LIMIT 20`
  ).all();
  return json(results);
}

async function handleSessionCount(env) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM feedback_events WHERE event_name = 'session_started'`
  ).first();
  return json({ total: row?.total ?? 0 });
}

// ── Main fetch handler ─────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Payload size guard
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > 32768) return err("Payload too large", 413);

    // ── API routes ─────────────────────────────────────────────────────
    if (pathname === "/api/health" && method === "GET") return handleHealth(env);

    // Schools
    if (pathname === "/api/schools" && method === "GET") return handleListSchools(request, env);
    const schoolMatch = pathname.match(/^\/api\/schools\/([^/]+)$/);
    if (schoolMatch && method === "GET") return handleGetSchool(env, decodeURIComponent(schoolMatch[1]));

    // Variables
    if (pathname === "/api/variables" && method === "GET") return handleListVariables(env);
    const varMatch = pathname.match(/^\/api\/variables\/([^/]+)$/);
    if (varMatch && method === "GET") return handleGetVariable(env, decodeURIComponent(varMatch[1]));

    // Feedback / analytics
    if (pathname === "/api/feedback_events" && method === "POST") {
      if (!env.DB) return err("D1 not configured", 500);
      return handleFeedbackEvents(request, env);
    }

    // Supporters
    if (pathname === "/api/supporters" && method === "POST") {
      if (!env.DB) return err("D1 not configured", 500);
      return handlePostSupporters(request, env);
    }
    if (pathname === "/api/supporters" && method === "GET") {
      if (!env.DB) return err("D1 not configured", 500);
      return handleGetSupporters(env);
    }

    // Session count
    if (pathname === "/api/session_count" && method === "GET") {
      if (!env.DB) return json({ total: 0 });
      return handleSessionCount(env);
    }

    // Reviews
    if (pathname === "/api/reviews" && method === "POST") {
      if (!env.DB) return err("D1 not configured", 500);
      return handlePostReviews(request, env);
    }
    if (pathname === "/api/reviews" && method === "GET") {
      if (!env.DB) return json([]);
      return handleGetReviews(env);
    }

    // Unknown API route
    if (pathname.startsWith("/api/")) return err(`Not found: ${pathname}`, 404);

    // ── Static asset fallthrough (SPA) ─────────────────────────────────
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("LawSignal worker: ASSETS binding not configured", { status: 500 });
  },
};
