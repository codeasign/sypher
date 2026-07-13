import 'dotenv/config';
import ws from 'ws';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  realtime: { transport: ws },
});

const { data: metaRows, error: metaErr } = await admin.from('taxonomy_meta').select('*');
console.log('taxonomy_meta rows:', JSON.stringify(metaRows), metaErr?.message ?? '');

const { data: catRows, error: catErr } = await admin.from('technology_categories').select('*');
console.log('technology_categories rows:', JSON.stringify(catRows), catErr?.message ?? '');
