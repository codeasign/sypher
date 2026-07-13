import 'dotenv/config';
import ws from 'ws';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  realtime: { transport: ws },
});

const tables = ['domains', 'technology_categories', 'base_roles', 'technologies', 'skills', 'domain_roles', 'domain_skills', 'domain_technologies', 'taxonomy_meta', 'taxonomy_slugs', 'user_skills', 'user_technologies'];

for (const t of tables) {
  const { error, count } = await admin.from(t).select('*', { count: 'exact', head: true });
  console.log(t + ': ' + (error ? 'MISSING (' + error.message + ')' : 'exists, ' + count + ' rows'));
}

const { error: colErr } = await admin.from('profiles').select('designation_id, designation_seniority').limit(1);
console.log('profiles.designation_id/designation_seniority: ' + (colErr ? 'MISSING (' + colErr.message + ')' : 'exists'));
