import fs from 'fs';

const FILE = 'docs/system-design-fundamentals/how-the-internet-works/01-concepts.mdx';

// Read the current (corrupted) file to extract clean text
const corrupted = fs.readFileSync(FILE, 'utf8');

// Get the frontmatter from the file - the first --- block
const frontmatterMatch = corrupted.match(/---\n[\s\S]*?\n---/);
const frontmatter = frontmatterMatch ? frontmatterMatch[0] : `---
id: how-the-internet-works-concepts
title: Understanding How the Internet Works
sidebar_label: Mental Model
sidebar_position: 1
---`;

// Extract clean text lines (not diagram content)
const cleanLines = [];
const lines = corrupted.split('\n');
for (const l of lines) {
  const trimmed = l.trim();
  // Skip diagram content lines
  if (trimmed.startsWith('id="')) continue;
  if (trimmed.startsWith('title="')) continue;
  if (trimmed.startsWith('alt="')) continue;
  if (trimmed.startsWith('caption="')) continue;
  if (trimmed.startsWith('content={`') || trimmed.startsWith('content={')) continue;
  if (trimmed.endsWith('`}/>') || trimmed === '`}/>') continue;
  if (trimmed.match(/^[─░#\"\?\*\-]{3,}/)) continue; // diagram artifact lines
  if (trimmed.includes('~??') || trimmed.match(/^[\?\"\-]{4,}/)) continue;

  // Check if it's clean English text (at least 60% printable ASCII)
  const printable = l.replace(/[ -~]/g, '').replace(/\t/g, '').replace(/\r/g, '').replace(/\n/g, '').trim();
  if (printable.length > l.length * 0.3) continue; // too many non-ASCII chars

  cleanLines.push(l);
}

const cleanText = cleanLines.join('\n');

// ============================================================
// Reconstructed diagrams
// ============================================================

const diag1 = `<AsciiDiagram
  id="how-the-internet-works/big-picture"
  title="End-to-End Internet Request Flow"
  alt="Flowchart showing the complete path from a user browser through DNS resolution ISP routing BGP transit across the public internet and into a target data center with CDN load balancer web server cache and database"
  caption="End-to-end request flow from browser to database server"
  content={\`
                    Internet Request Flow

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
                                    +----------+    +----------+
  \`}/>`;

const diag2 = `<AsciiDiagram
  id="how-the-internet-works/dns-lookup"
  title="DNS Recursive Resolution Walk"
  alt="Sequence diagram showing DNS recursive resolution browser asks DNS resolver which queries root server com TLD server and authoritative nameserver before returning the IP address"
  caption="DNS recursive resolution: 8 steps from browser to answer"
  content={\`
 DNS Resolution Steps

 +----------+  1. "www.example.com?"  +--------------+
 | Browser  |------------------------>| DNS Resolver |
 |          |<------------------------| 8.8.8.8      |
 +----------+  8. IP: 93.184.216.34  +------+-------+
                                            |
               2. "Where is .com?"        |
               +---------------------------+
               |
               v
       +--------------+  3. "com NS: a.gtld-servers.net"
       | Root Server  |-----------------------+
       | 198.41.0.4   |<----------------------+
       +--------------+
               |
               | 4. "Query .com TLD"
               v
       +----------------+  5. "example.com NS: dns.example.com"
       | .com TLD Server|-----------------------+
       | a.gtld-servers |<----------------------+
       +----------------+
               |
               | 6. "Query authoritative"
               v
       +----------------+  7. "A record: 93.184.216.34"
       | Authoritative  |-----------------------+
       | dns.example.com|<----------------------+
       +----------------+
  \`}/>`;

const diag3 = `<AsciiDiagram
  id="how-the-internet-works/tcp-handshake"
  title="TCP Three-Way Handshake and TLS Setup"
  alt="Sequence diagram showing TCP three-way handshake SYN SYN-ACK ACK followed by the TLS 1.3 handshake ClientHello ServerHello Certificate ClientKeyExchange Finished and finally the HTTP GET request"
  caption="TCP+TLS handshake sequence: 3 RTT before first HTTP request"
  content={\`
 TCP and TLS Handshake Sequence

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
 +----------+                              +----------+
  \`}/>`;

const diag4 = `<AsciiDiagram
  id="how-the-internet-works/browser-rendering"
  title="Full Page Load Sub-Resource Waterfall"
  alt="Waterfall chart showing sequence and timing of DNS lookup TCP handshake TLS handshake and HTTP requests for HTML CSS JavaScript images and fonts along with HTML parsing JavaScript execution and page rendering phases"
  caption="Page load waterfall: DNS, TCP, TLS, and HTTP request timing"
  content={\`
 Page Load Waterfall Timeline

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
 Paint          [----------------##] ...........................
  \`}/>`;

// ============================================================
// Build the final file
// ============================================================

// Insert the diagrams into the clean text at the right locations
// We find "Big Picture Diagram", "Step 1: URL Entry", "Step 2: TCP", "### Step 4: Browser Rendering"
let text = cleanText;

// Insert diag1 after "The diagram traces the path from browser to server and back..."
// Actually, let's find "## The Big Picture Diagram" or similar
const bigPicSection = text.indexOf('The diagram traces the path');
if (bigPicSection === -1) {
  // Try alternate positioning
  const coreVocabEnd = text.lastIndexOf('spanning 200-plus locations worldwide');
  if (coreVocabEnd > 0) {
    const insertPoint = text.indexOf('\n', coreVocabEnd) + 1;
    const afterInsert = text.substring(insertPoint);
    text = text.substring(0, insertPoint) + '\n' + diag1 + '\n\n' + afterInsert;
    console.log('Inserted big-picture diagram after vocab section');
  }
} else {
  const insertPoint = text.indexOf('\n', bigPicSection) + 1;
  text = text.substring(0, insertPoint) + '\n' + diag1 + '\n\n' + text.substring(insertPoint);
  console.log('Inserted big-picture diagram');
}

// Insert diag2 after "DNS Resolver" section text
const dnsSection = text.indexOf('dns lookups, video streaming');
if (dnsSection > 0) {
  const insertPoint = text.indexOf('\n', dnsSection) + 1;
  text = text.substring(0, insertPoint) + '\n' + diag2 + '\n\n' + text.substring(insertPoint);
  console.log('Inserted dns-lookup diagram');
} else {
  const httpSection = text.indexOf('HTTP/HTTPS');
  if (httpSection > 0) {
    const insertPoint = text.indexOf('\n', text.indexOf('\n', httpSection) + 1) + 1;
    text = text.substring(0, insertPoint) + '\n' + diag2 + '\n\n' + text.substring(insertPoint);
    console.log('Inserted dns-lookup diagram (fallback)');
  }
}

// Insert diag3 after "TCP Three-Way Handshake" section
const tcpSection = text.indexOf('three-way handshake establishes');
if (tcpSection > 0) {
  const insertPoint = text.indexOf('\n', tcpSection) + 1;
  text = text.substring(0, insertPoint) + '\n' + diag3 + '\n\n' + text.substring(insertPoint);
  console.log('Inserted tcp-handshake diagram');
}

// Insert diag4 at the end before "Variants" section
const variantsSection = text.indexOf('## Variants and Flavors');
if (variantsSection > 0) {
  text = text.substring(0, variantsSection) + '\n' + diag4 + '\n\n' + text.substring(variantsSection);
  console.log('Inserted browser-rendering diagram before variants');
}

// Write the file
fs.writeFileSync(FILE, text, 'utf8');
console.log('\nFile written. Lines:', text.split('\n').length);