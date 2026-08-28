// Register 15 dummy companies through the real admin API so every field
// passes the mandatory + format validation. Run from repo root.
const API = 'https://api-next.sypher.local';
const LOGO = 'https://syhpher-next-datastore-gvaf.b-cdn.net/companies/logos/dummy-logo.png';

const CITIES = [
  ['Hyderabad', 'Telangana', 'Rangareddy'],
  ['Bengaluru', 'Karnataka', 'Bengaluru Urban'],
  ['Chennai', 'Tamil Nadu', 'Chennai'],
  ['Mumbai', 'Maharashtra', 'Mumbai Suburban'],
  ['Pune', 'Maharashtra', 'Pune'],
  ['New Delhi', 'Delhi', 'New Delhi'],
  ['Kolkata', 'West Bengal', 'Kolkata'],
  ['Ahmedabad', 'Gujarat', 'Ahmedabad'],
  ['Jaipur', 'Rajasthan', 'Jaipur'],
  ['Coimbatore', 'Tamil Nadu', 'Coimbatore'],
  ['Kochi', 'Kerala', 'Ernakulam'],
  ['Lucknow', 'Uttar Pradesh', 'Lucknow'],
  ['Indore', 'Madhya Pradesh', 'Indore'],
  ['Nagpur', 'Maharashtra', 'Nagpur'],
  ['Surat', 'Gujarat', 'Surat'],
];
const NAMES = [
  'Dummy Alpha Industries', 'Dummy Beta Systems', 'Dummy Gamma Solutions',
  'Dummy Delta Networks', 'Dummy Omega Software', 'Dummy Zenith Traders',
  'Dummy Summit Logistics', 'Dummy Harbor Exports', 'Dummy Crescent Textiles',
  'Dummy Apex Analytics', 'Dummy Vertex Manufacturing', 'Dummy Prism Retail',
  'Dummy Nimbus Cloudworks', 'Dummy Orbit Energy', 'Dummy Pioneer Agro',
];
const SEATS = [25, 40, 50, 75, 100, 120, 150, 200, 250, 300, 350, 400, 500, 600, 750];
const UNTIL = ['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30', '2027-05-31', '2027-06-30',
  '2027-07-31', '2027-08-31', '2027-09-30', '2027-10-31', '2027-11-30', '2027-12-31',
  '2028-01-31', '2028-03-31', '2028-06-30'];

const login = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@sypher.local', password: 'devpassword123' }),
});
const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
if (login.status !== 200 || !cookie) throw new Error(`login failed ${login.status}`);
console.log('0. login ok');

let ok = 0;
for (let i = 0; i < 15; i++) {
  const num = String(i + 1).padStart(2, '0');
  const [city, state, district] = CITIES[i];
  const body = {
    companyId: `DUMMY${num}`,
    name: NAMES[i],
    logoUrl: LOGO,
    primaryEmail: `contact@dummy${num}.example.com`,
    secondaryEmail: `ops@dummy${num}.example.com`,
    adminEmail: `admin@dummy${num}.example.com`,
    address: `${100 + i} Dummy Street, Industrial Area Phase ${(i % 3) + 1}`,
    city,
    stateProvince: state,
    countyDistrict: district,
    country: 'India',
    seats: SEATS[i],
    totalYearlyCost: 150000 + SEATS[i] * 2500,
    accessUntil: UNTIL[i],
  };
  const res = await fetch(`${API}/access/companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(body),
  });
  const detail = res.ok ? '' : ` — ${JSON.stringify(await res.json()).slice(0, 160)}`;
  console.log(`${res.status} DUMMY${num} ${NAMES[i]}${detail}`);
  if (res.ok) ok++;
}
console.log(`created ${ok}/15`);

const list = await fetch(`${API}/access/companies/paged?page=1&pageSize=50`, { headers: { Cookie: cookie } });
const data = await list.json();
console.log(`server truth: total=${data.total}, dummy rows=${data.items.filter((c) => c.name.startsWith('Dummy')).length}`);
