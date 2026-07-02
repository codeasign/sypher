import fs from 'fs';

const FILE = 'docs/system-design-fundamentals/how-the-internet-works/01-concepts.mdx';
let content = fs.readFileSync(FILE, 'utf8');

// ============================================================
// Diagram 1: End-to-End Internet Request Flow
// ============================================================
const diagram1Old = content.substring(
  content.indexOf('id="how-the-internet-works/big-picture"'),
  content.indexOf('`', content.indexOf('id="how-the-internet-works/big-picture"'))
);

const diagram1New = `id="how-the-internet-works/big-picture"
  title="End-to-End Internet Request Flow"
  alt="Flowchart showing the complete path from a user's browser through DNS resolution, ISP routing, BGP transit across the public internet, and into a target data center with CDN, load balancer, web server, cache, and database"
  caption="End-to-end request flow from browser to database server"
  content={\`
                      Internet Request Flow

  Your Browser              DNS Resolver            ISP / BGP Transit
  ┌────────────┐           ┌──────────────┐         ┌────────────────┐
  │ Type URL   │           │ Find IP for  │         │ Route packets  │
  │ Press Enter│──────────▶│ example.com  │────────▶│ across ISPs    │
  └────────────┘           └──────────────┘         └────────────────┘
       │                                                  │
       ▼                                                  ▼
  HTTPS request                                      Routed packets
       │                                                  │
       └──────────────────┬───────────────────────────────┘
                          │
                    ┌─────▼─────────────────────────┐
                    │     The Public Internet        │
                    │  (BGP routing across ISPs)     │
                    │  AS 1234 → AS 5678 → AS 9012   │
                    └─────┬─────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │  CDN     │    │   Load   │    │  Web     │
   │  Edge    │───▶│ Balancer │───▶│ Server   │
   │ (cache)  │    │          │    │          │
   └──────────┘    └──────────┘    └────┬─────┘
                                        │
                                        ▼
                                  ┌──────────┐      ┌──────────┐
                                  │  Cache   │      │ Database │
                                  │ (Redis)  │◀────▶│(Postgres)│
                                  └──────────┘      └──────────┘
  \`}/>`;

content = content.replace(diagram1Old, diagram1New);

// ============================================================
// Diagram 2: DNS Recursive Resolution Walk
// ============================================================
const diagram2Old = content.substring(
  content.indexOf('id="how-the-internet-works/dns-lookup"'),
  content.indexOf('`}/>', content.indexOf('id="how-the-internet-works/dns-lookup"')) + 4
);

const diagram2New = `id="how-the-internet-works/dns-lookup"
  title="DNS Recursive Resolution Walk"
  alt="Sequence diagram showing the DNS recursive resolution process: browser asks DNS resolver, which queries root server, .com TLD server, and authoritative nameserver before returning the IP address"
  caption="DNS recursive resolution: 8 steps from browser to answer"
  content={\`
  DNS Resolution Steps

  ┌──────────┐  1. "www.example.com?"   ┌──────────────┐
  │ Browser  │─────────────────────────▶│ DNS Resolver  │
  │          │◀─────────────────────────│ 8.8.8.8       │
  └──────────┘   8. IP: 93.184.216.34   └──────┬───────┘
                                                │
                  2. "Where is .com?"          │
                  ┌─────────────────────────────┘
                  │
                  ▼
          ┌──────────────┐  3. "com NS: a.gtld-servers.net"
          │ Root Server  │─────────────────────────┐
          │ 198.41.0.4   │◀────────────────────────┘
          └──────────────┘
                  │
                  │ 4. "Query .com TLD"
                  ▼
          ┌──────────────────┐  5. "example.com NS: dns.example.com"
          │ .com TLD Server  │─────────────────────────┐
          │ a.gtld-servers   │◀────────────────────────┘
          └──────────────────┘
                  │
                  │ 6. "Query authoritative"
                  ▼
          ┌──────────────────┐  7. "A record: 93.184.216.34"
          │ Authoritative NS │─────────────────────────┐
          │ dns.example.com  │◀────────────────────────┘
          └──────────────────┘
  \`}/>`;

content = content.replace(diagram2Old, diagram2New);

// ============================================================
// Diagram 3: TCP Three-Way Handshake and TLS Setup
// ============================================================
const diagram3Old = content.substring(
  content.indexOf('id="how-the-internet-works/tcp-handshake"'),
  content.indexOf('`}/>', content.indexOf('id="how-the-internet-works/tcp-handshake"') + 50) + 4
);

const diagram3New = `id="how-the-internet-works/tcp-handshake"
  title="TCP Three-Way Handshake and TLS Setup"
  alt="Sequence diagram showing the TCP three-way handshake (SYN, SYN-ACK, ACK) followed by the TLS 1.3 handshake (ClientHello, ServerHello + Certificate, ClientKeyExchange + Finished, Finished) and finally the HTTP GET request"
  caption="TCP+TLS handshake sequence: 3 RTT before first HTTP request"
  content={\`
  TCP and TLS Handshake Sequence

  ┌──────────┐                             ┌──────────┐
  │ Browser  │                             │  Server  │
  │          │                             │          │
  │          │─── SYN (seq=1000) ─────────▶│          │
  │          │◀── SYN-ACK (seq=2000, ──────│          │
  │          │       ack=1001)             │          │
  │          │─── ACK (seq=1001, ─────────▶│ TCP OK   │
  │          │       ack=2001)             │          │
  │          │                             │          │
  │          │─── ClientHello ────────────▶│          │
  │          │◀── ServerHello + ───────────│          │
  │          │     Certificate + KeyExch   │          │
  │          │─── ClientKeyExchange + ────▶│          │
  │          │     Finished                │          │
  │          │◀── Finished (encrypted) ────│ TLS OK   │
  │          │                             │          │
  │          │─── HTTP GET /index.html ───▶│          │
  │          │◀── HTTP 200 OK + body ──────│          │
  └──────────┘                             └──────────┘
  \`}/>`;

content = content.replace(diagram3Old, diagram3New);

// ============================================================
// Diagram 4: Full Page Load Sub-Resource Waterfall
// ============================================================
const diagram4Old = content.substring(
  content.indexOf('id="how-the-internet-works/browser-rendering"'),
  content.indexOf('`}/>', content.indexOf('id="how-the-internet-works/browser-rendering"') + 50) + 4
);

const diagram4New = `id="how-the-internet-works/browser-rendering"
  title="Full Page Load Sub-Resource Waterfall"
  alt="Waterfall chart showing the sequence and timing of DNS lookup (50ms), TCP handshake (70ms), TLS handshake (140ms), and HTTP requests for HTML, CSS, JavaScript, images, and fonts, along with HTML parsing, JavaScript execution, and page rendering phases"
  caption="Page load waterfall: DNS, TCP, TLS, and HTTP request timing"
  content={\`
  Page Load Waterfall Timeline

  DNS (50ms)     ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  TCP (70ms)     ░░░░░░░░░░░░░░█████████████████████░░░░░░░░░░░░░░░░░
  TLS (140ms)    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████████████████████
  GET /          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████████████
  GET style.css  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████
  GET script.js  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████
  GET img1.png   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█████
  GET img2.png   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█████
  GET font.woff  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█████
  Parse HTML     ██████████████████████████████████████████████████░░░
  Execute JS     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████████████████
  Paint          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████
  \`}/>`;

content = content.replace(diagram4Old, diagram4New);

// Write back
fs.writeFileSync(FILE, content, 'utf8');
console.log('Fixed diagrams in how-the-internet-works/01-concepts.mdx');