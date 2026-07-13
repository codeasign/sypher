import 'dotenv/config';
import ws from 'ws';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  realtime: { transport: ws },
});

const tables = ['domains', 'technology_categories', 'base_roles', 'technologies', 'skills', 'domain_roles', 'domain_skills', 'domain_technologies', 'taxonomy_meta', 'taxonomy_slugs', 'user_skills', 'user_technologies'];

for (const t of tables) {
  const { data, error } = await admin.from(t).select('*').limit(1);
  console.log(t + ': ' + (error ? 'MISSING (' + error.message + ')' : 'exists, sample=' + JSON.stringify(data)));
}
