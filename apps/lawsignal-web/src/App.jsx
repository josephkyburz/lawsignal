import { useState } from "react";

// ── Analytics helpers ──────────────────────────────────────────────────────

function getAnonId() {
  let id = localStorage.getItem("ls_anon_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("ls_anon_id", id);
  }
  return id;
}

const SESSION_ID = crypto.randomUUID();

async function trackEvent(event_name, properties = {}) {
  try {
    await fetch("/api/feedback_events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anon_id: getAnonId(),
        session_id: SESSION_ID,
        event_name,
        properties,
      }),
    });
  } catch {
    // silent — analytics should never break the UI
  }
}

// ── App ────────────────────────────────────────────────────────────────────

export function App() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        textAlign: "center",
      }}>
        {/* Ornament */}
        <div className="ornament" style={{ width: "100%", maxWidth: "420px", marginBottom: "32px" }}>
          L A W S I G N A L
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: "var(--ff-d)",
          fontSize: "clamp(24px, 5vw, 36px)",
          fontWeight: 400,
          lineHeight: 1.15,
          color: "var(--ink)",
          maxWidth: "560px",
          marginBottom: "20px",
        }}>
          Choose a law school the way a mentor would teach you to.
        </h1>

        {/* Trust layer */}
        <p style={{
          fontFamily: "var(--ff-b)",
          fontSize: "15px",
          lineHeight: 1.55,
          color: "var(--ink-3)",
          maxWidth: "480px",
          marginBottom: "8px",
        }}>
          Free. Independent. No school paid to be ranked or to soften copy.
        </p>
        <p style={{
          fontFamily: "var(--ff-m)",
          fontSize: "10px",
          letterSpacing: "0.10em",
          color: "var(--ink-4)",
          maxWidth: "480px",
          marginBottom: "32px",
        }}>
          ABA 509 disclosures · US News · Law School Transparency · NALP · LSAC
        </p>

        {/* Divider */}
        <div style={{
          width: "120px",
          height: "1px",
          background: "var(--rule)",
          marginBottom: "32px",
        }} />

        {/* CTAs */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            className="next-btn gold"
            onClick={() => {
              trackEvent("session_started", { mode: "explore" });
              setStarted(true);
            }}
          >
            I'm exploring schools
          </button>
          <button
            className="next-btn dark"
            onClick={() => {
              trackEvent("session_started", { mode: "decide" });
              setStarted(true);
            }}
          >
            I'm choosing between schools
          </button>
        </div>

        {/* Byline */}
        <p style={{
          fontFamily: "var(--ff-m)",
          fontSize: "9px",
          letterSpacing: "0.13em",
          color: "var(--ink-4)",
          marginTop: "48px",
        }}>
          BUILT BY A BERKELEY LAW STUDENT
        </p>
      </div>
    );
  }

  // ── Main app (placeholder — will become sidebar + main layout) ──────────
  return (
    <div style={{ padding: "40px 24px", maxWidth: "980px", margin: "0 auto" }}>
      <div className="ornament" style={{ marginBottom: "24px" }}>
        PRIORITIES
      </div>
      <p style={{
        fontFamily: "var(--ff-b)",
        fontSize: "15px",
        lineHeight: 1.55,
        color: "var(--ink-2)",
        maxWidth: "640px",
      }}>
        Before you look at schools, name what matters. The list will rank itself
        against your priorities, not the other way around. Take your time.
      </p>
      <p style={{
        fontFamily: "var(--ff-m)",
        fontSize: "10px",
        color: "var(--ink-4)",
        marginTop: "24px",
        letterSpacing: "0.10em",
      }}>
        PRIORITIES · FILTERS · RESULTS — COMING SOON
      </p>
    </div>
  );
}
