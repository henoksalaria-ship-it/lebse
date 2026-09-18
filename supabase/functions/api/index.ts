import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("LEBSE_WEB_ORIGIN") ?? "http://127.0.0.1:5173",
  "Access-Control-Allow-Headers": "authorization, content-type, x-csrf-token, x-lebse-gateway",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
  "Vary": "Origin",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function upstreamFor(req: Request) {
  const base = Deno.env.get("LEBSE_LEGACY_API_ORIGIN");
  if (!base) return null;
  const incoming = new URL(req.url);
  const path = incoming.pathname.replace(/^\/functions\/v1\/api/, "") || "/health";
  return new URL(`${path}${incoming.search}`, base.replace(/\/$/, ""));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  if (url.pathname.endsWith("/health")) {
    return json({ status: "ok", mode: "supabase-edge-staging", payments: "simulated", delivery: "mock" });
  }

  // Migration bridge: keep the existing API contract while routes move one at a time.
  // The legacy origin is a server-side secret and is never returned to clients.
  const upstream = upstreamFor(req);
  if (!upstream) return json({ error: "API migration in progress", code: "legacy_origin_missing" }, 503);
  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.set("x-lebse-edge", "supabase");
  const response = await fetch(upstream, { method: req.method, headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body, redirect: "manual" });
  const out = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => out.set(key, value));
  return new Response(response.body, { status: response.status, headers: out });
});
