/**
 * Cloudflare Pages Function — handles all /api/* requests.
 *
 * Required bindings (Cloudflare Pages dashboard → Settings → Functions):
 *   DB             →  D1 database binding, name exactly: DB
 *
 * Optional env secret (for email notifications via Resend):
 *   RESEND_API_KEY →  Settings → Environment variables → Add secret
 *
 * Routes:
 *   GET  /api/health            — verify D1 is connected
 *   POST /api/feedback_events   — analytics + feedback + bug reports
 *   POST /api/supporters        — supporter submissions
 *   GET  /api/supporters        — public approved leaderboard
 *   GET  /api/session_count     — total session count
 *   POST /api/reviews           — review submission
 *   GET  /api/reviews           — approved reviews
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

async function notify(env, subject, body) {
  if (!env.RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
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

export async function onRequest(context) {
  const { request, env, params } = context;
  const method = request.method;

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > 32768) return err("Payload too large", 413);

  const routeParam = params.route;
  const route = Array.isArray(routeParam) ? routeParam.join("/") : (routeParam || "");

  // ── GET /api/health ─────────────────────────────────────────────────
  if (route === "health" && method === "GET") {
    if (!env.DB) return json({ ok: false, db: "binding not configured", route });
    try {
      await env.DB.prepare("SELECT 1").first();
      return json({ ok: true, db: "connected" });
    } catch (e) {
      return json({ ok: false, db: "error", message: e.message });
    }
  }

  if (!env.DB) {
    return err("D1 binding 'DB' not configured — add it in Cloudflare Pages → Settings → Functions → D1 database bindings", 500);
  }

  // ── POST /api/feedback_events ───────────────────────────────────────
  if (route === "feedback_events" && method === "POST") {
    let body;
    try { body = await request.json(); } catch { return err("Invalid JSON"); }

    const { anon_id, session_id, event_name, properties } = body;
    if (!event_name) return err("event_name required");
    if (typeof event_name === "string" && event_name.length > 64) return err("event_name too long");
    if (anon_id && String(anon_id).length > 64) return err("anon_id too long");
    if (session_id && String(session_id).length > 64) return err("session_id too long");
    if (properties && JSON.stringify(properties).length > 8192) return err("properties too large");

    await env.DB.prepare(
      `INSERT INTO feedback_events (anon_id, session_id, event_name, properties) VALUES (?, ?, ?, ?)`
    ).bind(
      anon_id || null,
      session_id || null,
      event_name,
      properties ? JSON.stringify(properties) : null,
    ).run();

    if (event_name === "bug_reported") {
      const p = properties || {};
      await notify(env, `[LawSignal] Bug report`, `Description: ${p.description || "(none)"}\nSession: ${session_id || "—"}`);
    }

    if (event_name === "feedback_submitted") {
      const p = properties || {};
      const subject = p.type === "positive" ? `[LawSignal] Positive feedback` : `[LawSignal] Negative feedback`;
      await notify(env, subject, `Type: ${p.type || "—"}\nNote: ${p.note || "(none)"}\nSession: ${session_id || "—"}`);
    }

    return json({ ok: true }, 201);
  }

  // ── POST /api/supporters ────────────────────────────────────────────
  if (route === "supporters" && method === "POST") {
    let body;
    try { body = await request.json(); } catch { return err("Invalid JSON"); }

    const { stripe_payment_id, amount, display_name, message, is_public } = body;
    if (display_name && String(display_name).length > 100) return err("display_name too long");
    if (message && String(message).length > 500) return err("message too long");

    await env.DB.prepare(
      `INSERT INTO supporters (stripe_payment_id, amount, display_name, message, is_public, is_approved) VALUES (?, ?, ?, ?, ?, 0)`
    ).bind(stripe_payment_id || null, amount || null, display_name || null, message || null, is_public ? 1 : 0).run();

    await notify(env, `[LawSignal] New supporter`, `Name: ${display_name || "(anon)"}\nAmount: ${amount || "—"}`);
    return json({ ok: true }, 201);
  }

  // ── GET /api/supporters ─────────────────────────────────────────────
  if (route === "supporters" && method === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT display_name, message, amount, created_at FROM supporters WHERE is_public = 1 AND is_approved = 1 ORDER BY amount DESC LIMIT 20`
    ).all();
    return json(results);
  }

  // ── GET /api/session_count ──────────────────────────────────────────
  if (route === "session_count" && method === "GET") {
    const row = await env.DB.prepare(
      `SELECT COUNT(*) AS total FROM feedback_events WHERE event_name = 'session_started'`
    ).first();
    return json({ total: row?.total ?? 0 });
  }

  // ── POST /api/reviews ───────────────────────────────────────────────
  if (route === "reviews" && method === "POST") {
    let body;
    try { body = await request.json(); } catch { return err("Invalid JSON"); }

    const { body: reviewBody, attribution } = body;
    if (!reviewBody || reviewBody.trim().length < 5) return err("Review body too short");
    if (reviewBody.length > 1000) return err("Review too long");

    await env.DB.prepare(
      `INSERT INTO reviews (body, attribution) VALUES (?, ?)`
    ).bind(reviewBody.trim(), attribution ? attribution.trim().slice(0, 80) : null).run();

    await notify(env, `[LawSignal] New review`, `Review: ${reviewBody.trim()}\nAttribution: ${attribution || "(anon)"}`);
    return json({ ok: true }, 201);
  }

  // ── GET /api/reviews ────────────────────────────────────────────────
  if (route === "reviews" && method === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT body, attribution, created_at FROM reviews WHERE is_approved = 1 ORDER BY created_at DESC LIMIT 20`
    ).all();
    return json(results);
  }

  return err(`Not found: /api/${route}`, 404);
}
