import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const allowedOrigin = Deno.env.get("LEBSE_WEB_ORIGIN") ?? "https://lebse-staging-web7.vercel.app";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
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

async function publicListing(id: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return null;
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
  const response = await fetch(`${supabaseUrl}/rest/v1/listings?select=id,seller_id,name,price_minor,brand,size,category,condition,description,images,status,created_at&id=eq.${encodeURIComponent(id)}&limit=1`, { headers });
  if (!response.ok) return null;
  const rows = await response.json();
  const item = rows[0];
  if (!item) return null;
  return { ...item, price: Number(item.price_minor ?? 0) / 100, image: Array.isArray(item.images) ? item.images[0] : null };
}
async function publicBootstrap() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return null;
  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
  const [usersResponse, listingsResponse] = await Promise.all([
    fetch(`${supabaseUrl}/rest/v1/users?select=id,name,username,bio,closet_description,city&order=name`, { headers }),
    fetch(`${supabaseUrl}/rest/v1/listings?select=id,seller_id,name,price_minor,brand,size,category,condition,description,images,status,created_at&status=in.(active,reserved,sold)&order=created_at.desc`, { headers }),
  ]);
  if (!usersResponse.ok || !listingsResponse.ok) return null;
  const users = await usersResponse.json();
  const listings = await listingsResponse.json();
  return {
    csrf: null,
    legal_version: "2026-01",
    terms_accepted: false,
    user: null,
    users,
    listings: listings.map((item: Record<string, unknown>) => ({ ...item, price: Number(item.price_minor ?? 0) / 100, image: Array.isArray(item.images) ? item.images[0] : null })),
    saved: [], following: [], conversations: [], orders: [], notifications: [],
  };
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
  if (url.pathname.endsWith("/health")) return json({ status: "ok", mode: "supabase-edge-staging", payments: "simulated", delivery: "mock" });
  if (req.method === "GET" && url.pathname.endsWith("/bootstrap")) {
    const result = await publicBootstrap();
    if (result) return json(result);
  }

  const listingMatch = url.pathname.match(/\/listings\/([^/]+)$/);
  if (req.method === "GET" && listingMatch) {
    const result = await publicListing(listingMatch[1]);
    if (result) return json(result);
    return json({ error: "This piece could not be found." }, 404);
  }

  // Migration bridge: keep the existing API contract while routes move one at a time.
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






