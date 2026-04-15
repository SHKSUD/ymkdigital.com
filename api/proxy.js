// Vercel Serverless Function — Proxy for Anthropic API
// Place this file in /api/proxy.js in your repo

export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── CORS headers ──
  const ALLOWED_ORIGIN = "https://ymk.digital";
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { system, user } = req.body;

    if (!system || !user) {
      return res.status(400).json({ error: "Missing system or user prompt" });
    }

    if (system.length > 8000 || user.length > 4000) {
      return res.status(413).json({ error: "Prompt too long" });
    }

    // ── Call Anthropic API ──
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_KEY,   // stored in Vercel env vars
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2500,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}));
      return res.status(anthropicRes.status).json({
        error: err.error?.message || "API error",
      });
    }

    const data = await anthropicRes.json();
    return res.status(200).json({ content: data.content });

  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
