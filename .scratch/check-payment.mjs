import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import dotenv from 'dotenv';
dotenv.config({ path: 'D:/jenny/sypher/.env' });

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

const targetEmail = 'fretslide@gmail.com';

let userId = null;
let page = 1;
while (!userId) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) { console.error('LIST_USERS_ERROR', error.message); process.exit(1); }
  const match = data.users.find(u => u.email === targetEmail);
  if (match) { userId = match.id; break; }
  if (data.users.length < 200) break;
  page++;
}

if (!userId) {
  console.log('NO_AUTH_USER_FOUND_FOR', targetEmail);
  process.exit(0);
}
console.log('USER_ID=' + userId);

const { data: profile, error: profileErr } = await admin
  .from('profiles')
  .select('id, email, role, paid_until, company_name, deleted_at')
  .eq('id', userId)
  .single();
console.log('--- profiles row ---');
console.log(JSON.stringify(profile, null, 2));
if (profileErr) console.log('profile error:', profileErr.message);

const { data: payments, error: paymentsErr } = await admin
  .from('payments')
  .select('id, razorpay_order_id, razorpay_payment_id, amount_paise, base_amount_paise, gst_amount_paise, gst_rate, currency, plan, status, created_at, paid_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
console.log('--- payments rows ---');
console.log(JSON.stringify(payments, null, 2));
if (paymentsErr) console.log('payments error:', paymentsErr.message);
