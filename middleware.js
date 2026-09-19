import {stagingGateway} from './server/staging-gateway.mjs';
import {next} from '@vercel/functions/middleware';
export const config = {runtime:'nodejs'};
export default function middleware(request) {
  // Keep the public web shell reachable while private staging auth protects API traffic.
  // The mobile WebView must be able to load the app before it has an API session.
  if (!request.nextUrl.pathname.startsWith('/api/')) return next();
  // Until a Render origin is configured, public reads use the Supabase Edge API.
  if (!process.env.LEBSE_RENDER_ORIGIN) return next();
  return stagingGateway(request);
}
