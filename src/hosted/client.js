import {createMarketplace} from '../../shared/marketplace-client.mjs';
import staging from '../../shared/staging-config.json';
const production=import.meta.env.VITE_LEBSE_ENV==='production';
export const marketplace=createMarketplace({url:import.meta.env.VITE_SUPABASE_URL||(production?'':staging.url),key:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||(production?'':staging.publishableKey),redirectTo:location.origin+'/?auth_callback=1',detectSessionInUrl:true});
