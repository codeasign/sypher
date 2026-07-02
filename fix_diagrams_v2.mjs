import fs from 'fs';
import path from 'path';

// ============================================================
// Process how-the-internet-works/01-concepts.mdx
// ============================================================

const FILE = 'docs/system-design-fundamentals/how-the-internet-works/01-concepts.mdx';
let content = fs.readFileSync(FILE, 'utf8');

// Strategy: Find each AsciiDiagram block and rebuild its content
// We locate by: id="xxx" attribute, then find content={` ... `}/> boundary

function buildDiagram(id, title, alt, caption, diagramContent) {
  let result = `<AsciiDiagram\n  id="${id}"\n  title="${title}"\n`;
  if (alt) result += `  alt="${alt}"\n`;
  if (caption) result += `  caption="${caption}"\n`;
  result += `  content={\`\n${diagramContent}\n  \`}/>`;
  return result;
}

// ============================================================
// Diagram 1: Big Picture - End-to-End Internet Request Flow
// ============================================================
const diag1 = buildDiagram(
  'how-the-internet-works/big-picture',
  'End-to-End Internet Request Flow',
  'Flowchart showing the complete path from a user browser through DNS resolution ISP routing BGP transit across the public internet and into a target data center with CDN load balancer web server cache and database',
  'End-to-end request flow from browser to database server',
  `                    Internet Request Flow

 Your Browser            DNS Resolver          ISP / BGP Transit
 +----------------+     +--------------+       +------------------+
 | Type URL       |     | Find IP for  |       |  Route packets   |
 | Press Enter    |---->| example.com  |-----> |  across ISPs     |
 +----------------+     +--------------+       +------------------+
      |                                               |
      v                                               |
 HTTPS request                                  routed packets
      |                                               |
      +-------------------+---------------------------+
                          |
                    +-----v-------------------------+
                    |    The Public Internet          |
                    | (BGP routing across ISPs)       |
                    | AS 1234 -> AS 5678 -> AS 9012   |
                    +-----+-------------------------+
                          |
          +---------------+---------------+
          |               |               |
          v               v               v
   +----------+     +----------+     +----------+
   |  CDN     |     |   Load   |     |  Web     |
   |  Edge    |---->| Balancer |---->| Server   |
   | (cache)  |     |          |     |          |
   +----------+     +----------+     +----+-----+
                                          |
                                          v
                                    +----------+    +----------+
                                    |  Cache   |    | Database |
                                    | (Redis)  |<-->|(Postgres)|
                                    +----------+    +----------+`
);

// ============================================================
// Diagram 2: DNS Recursive Resolution Walk
// ============================================================
const diag2 = buildDiagram(
  'how-the-internet-works/dns-lookup',
  'DNS Recursive Resolution Walk',
  'Sequence diagram showing DNS recursive resolution browser asks DNS resolver which queries root server com TLD server and authoritative nameserver before returning the IP address',
  'DNS recursive resolution: 8 steps from browser to answer',
  ` DNS Resolution Steps

 +----------+  1. \"www.example.com?\"  +--------------+
 | Browser  |------------------------>| DNS Resolver |
 |          |<------------------------| 8.8.8.8      |
 +----------+  8. IP: 93.184.216.34  +------+-------+
                                            |
               2. \"Where is .com?\"        |
               +---------------------------+
               |
               v
       +--------------+  3. \"com NS: a.gtld-servers.net\"
       | Root Server  |-----------------------+
       | 198.41.0.4   |<----------------------+
       +--------------+
               |
               | 4. \"Query .com TLD\"
               v
       +----------------+  5. \"example.com NS: dns.example.com\"
       | .com TLD Server|-----------------------+
       | a.gtld-servers |<----------------------+
       +----------------+
               |
               | 6. \"Query authoritative\"
               v
       +----------------+  7. \"A record: 93.184.216.34\"
       | Authoritative  |-----------------------+
       | dns.example.com|<----------------------+
       +----------------+`
);

// ============================================================
// Diagram 3: TCP Three-Way Handshake and TLS Setup
// ============================================================
const diag3 = buildDiagram(
  'how-the-internet-works/tcp-handshake',
  'TCP Three-Way Handshake and TLS Setup',
  'Sequence diagram showing TCP three-way handshake SYN SYN-ACK ACK followed by the TLS 1.3 handshake ClientHello ServerHello Certificate ClientKeyExchange Finished and finally the HTTP GET request',
  'TCP+TLS handshake sequence: 3 RTT before first HTTP request',
  ` TCP and TLS Handshake Sequence

 +----------+                              +----------+
 | Browser  |                              |  Server  |
 |          |                              |          |
 |          |--- SYN (seq=1000) ---------->|          |
 |          |<-- SYN-ACK (seq=2000, -------|          |
 |          |       ack=1001)              |          |
 |          |--- ACK (seq=1001, ---------->| TCP OK   |
 |          |       ack=2001)              |          |
 |          |                              |          |
 |          |--- ClientHello ------------->|          |
 |          |<-- ServerHello + ------------|          |
 |          |     Certificate + KeyExch    |          |
 |          |--- ClientKeyExchange + ----->|          |
 |          |     Finished                 |          |
 |          |<-- Finished (encrypted) -----| TLS OK   |
 |          |                              |          |
 |          |--- HTTP GET /index.html ---->|          |
 |          |<-- HTTP 200 OK + body -------|          |
 +----------+                              +----------+`
);

// ============================================================
// Diagram 4: Full Page Load Sub-Resource Waterfall
// ============================================================
const diag4 = buildDiagram(
  'how-the-internet-works/browser-rendering',
  'Full Page Load Sub-Resource Waterfall',
  'Waterfall chart showing sequence and timing of DNS lookup TCP handshake TLS handshake and HTTP requests for HTML CSS JavaScript images and fonts along with HTML parsing JavaScript execution and page rendering phases',
  'Page load waterfall: DNS, TCP, TLS, and HTTP request timing',
  ` Page Load Waterfall Timeline

 DNS (50ms)     [##########--------] ...........................
 TCP (70ms)     [------##########--] ...........................
 TLS (140ms)    [------------######] ...........................
 GET /          [--------------####] ...........................
 GET style.css  [----------------##] ...........................
 GET script.js  [----------------##] ...........................
 GET img1.png   [-----------------#] ...........................
 GET img2.png   [-----------------#] ...........................
 GET font.woff  [-----------------#] ...........................
 Parse HTML     [##################] ...........................
 Execute JS     [----------########] ...........................
 Paint          [----------------##] ...........................`
);

// Now replace each diagram block
// Strategy: find id="xxx" then look for content={` ... `}/>
// We'll use line-based parsing for reliability

const diagrams = [
  { id: 'how-the-internet-works/big-picture', replacement: diag1 },
  { id: 'how-the-internet-works/dns-lookup', replacement: diag2 },
  { id: 'how-the-internet-works/tcp-handshake', replacement: diag3 },
  { id: 'how-the-internet-works/browser-rendering', replacement: diag4 },
];

for (const diag of diagrams) {
  const idx = content.indexOf(diag.id);
  if (idx === -1) {
    console.log('Could not find diagram: ' + diag.id);
    continue;
  }

  // Find the AsciiDiagram opening - go back to find `<AsciiDiagram`
  const openIdx = content.lastIndexOf('<AsciiDiagram', idx);
  if (openIdx === -1) {
    console.log('Could not find AsciiDiagram open for: ' + diag.id);
    continue;
  }

  // Find the closing `}/>
  const closeMarker = '`}/>';
  const closeIdx = content.indexOf(closeMarker, idx + diag.id.length);
  if (closeIdx === -1) {
    console.log('Could not find closing for: ' + diag.id);
    continue;
  }

  const blockStart = openIdx;
  const blockEnd = closeIdx + closeMarker.length;

  const oldBlock = content.substring(blockStart, blockEnd);
  const newBlock = diag.replacement;

  content = content.substring(0, blockStart) + newBlock + content.substring(blockEnd);
  console.log('Replaced diagram: ' + diag.id + ' (' + oldBlock.length + ' -> ' + newBlock.length + ' bytes)');
}

fs.writeFileSync(FILE, content, 'utf8');
console.log('\nDone. File updated.');