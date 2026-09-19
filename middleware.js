import {next} from '@vercel/functions/middleware';
export const config = {runtime:'nodejs'};
export default function middleware(request) {
  // The app shell must always be reachable from the mobile WebView.
  // API authentication and rate limits are enforced by the Supabase/Render handlers.
  return next();
}
