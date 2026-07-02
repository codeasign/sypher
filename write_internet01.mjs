import fs from 'fs';
const FILE = 'docs/system-design-fundamentals/how-the-internet-works/01-concepts.mdx';

const content = `---
id: how-the-internet-works-concepts
title: Understanding How the Internet Works
sidebar_label: Mental Model
sidebar_position: 1
---

import AsciiDiagram from '@site/src/components/AsciiDiagram';

## The Problem Story

At 9:47 AM on a Tuesday, a regional bank in the Midwest went dark. Customers trying to log in saw a blank white page. ATMs in the lobby displayed "Out of Service." The call center lit up with 12,000 calls in the first hour. The root cause, traced back three hours later, was a single DNS record that expired. The bank's domain name - the one humans typed into browsers - stopped resolving to an IP address. No routing problem, no server crash, no database corruption. The domain was still registered, but the glue record that told the world which nameservers to ask had been deleted during a routine maintenance window. Six million customers could not access their money, and the outage cost $2.4 million in lost transactions and penalties.

This was not a rare event. In 2023, a major cloud provider's DNS service suffered a 90-minute outage that took down half the internet - Slack, Spotify, Epic Games, and dozens of other services all went offline simultaneously. Not because their servers failed, but because the lookup system that translates every typed URL into a machine-routable address stopped working. When the phone book breaks, nobody gets a call.

Think about what happens when you type a URL and press Enter. The browser reaches across the planet, through dozens of independently owned networks, through devices you have never seen, and retrieves data from a server that might be 10,000 kilometers away - all in under a second. This works so reliably that a single failure lasting five minutes makes national news. Understanding how this system is built is the foundation of every system design interview you will ever face.

## The Insight

The internet is a network of networks - a global system where independently owned and operated networks agree on a common set of protocols to exchange data. Each network (an ISP, a cloud provider, a corporate campus) decides its own internal rules, but at the border they all speak the same language: IP packets carried over TCP or UDP, routed by BGP, and named through DNS.

The best analogy is the global postal system. You write an address on an envelope following a standard format (name, street, city, ZIP code, country). You drop it in a mailbox. From there, local postal workers route it to a regional sorting facility, which forwards it to a national hub, which ships it to the destination country's hub, which routes it down to the local post office, which delivers it to the recipient's mailbox. The internet works the same way, except the envelope is an IP packet, the address is an IP address, the sorting facilities are routers, and the delivery time is measured in milliseconds instead of days.

## Core Vocabulary

**Packet** - The fundamental unit of data sent over the internet. Each packet contains a header (source IP, destination IP, protocol, checksum) and a payload (the data being sent). A single web page typically breaks into 10 to 100 packets. If any packet is lost, the receiver notices the gap and asks for a retransmission. Packets are why the internet tolerates failure: damaged packets are detected and discarded, while the sender resends only what is missing.

**IP Address** - A 32-bit (IPv4) or 128-bit (IPv6) identifier assigned to every device connected to the internet. IPv4 addresses are written as four decimal numbers like 172.217.10.46; IPv6 addresses as eight hex groups like 2607:f8b0:4005:080a:0000:0000:0000:200e. IPv4 has 4.3 billion addresses, which ran out in 2011 - IPv6 exists because we have more devices than that. An IP address is roughly analogous to a street address for a building.

**DNS (Domain Name System)** - The phone book of the internet. DNS maps human-readable domain names (google.com) to machine-routable IP addresses (142.250.80.46). It is a distributed, hierarchical database with 13 root nameservers, hundreds of TLD servers (.com, .org, .io), and millions of authoritative nameservers. DNS is why you remember google.com instead of 142.250.80.46.

**TCP (Transmission Control Protocol)** - A connection-oriented protocol that guarantees delivery. TCP establishes a three-way handshake (SYN, SYN-ACK, ACK), sequences packets, retransmits lost packets, and reassembles them in order. It is like a registered letter with delivery confirmation. Used by HTTP, HTTPS, SMTP, SSH, and FTP. Adds 20-60 bytes of overhead per packet.

**UDP (User Datagram Protocol)** - A connectionless protocol with no delivery guarantees. UDP sends packets with no handshake, no sequencing, no retransmission. It is like a postcard - you send it and hope it arrives. Used by DNS lookups, video streaming, VoIP, and online gaming. Lower latency than TCP because there is no acknowledgment overhead.

**HTTP/HTTPS** - The application-layer protocol that powers the web. HTTP is a request-response protocol where a client sends a method (GET, POST, PUT, DELETE), a path, and headers, and a server returns a status code (200 OK, 404 Not Found, 500 Internal Server Error) with a body. HTTPS wraps HTTP in TLS encryption so intermediaries cannot read or modify the data.

**BGP (Border Gateway Protocol)** - The routing protocol that connects autonomous networks. BGP exchanges reachability information between ISPs and large organizations. Each AS (autonomous system) announces the IP prefixes it can reach. BGP routers propagate these announcements, building a global routing table of roughly one million routes. BGP is the internet's GPS - it decides which path packets take across the planet.

**NAT (Network Address Translation)** - A technique that maps multiple private IP addresses (from 192.168.x.x or 10.x.x.x) to a single public IP address. NAT is why your home router can serve 15 devices with one public IP. It is also a headache for peer-to-peer applications. NAT was originally a stopgap for IPv4 exhaustion; it is now a permanent fixture.

**Load Balancer** - A device or service that distributes incoming connections across multiple backend servers. Load balancers operate at layer 4 (TCP/UDP) or layer 7 (HTTP/HTTPS) and perform health checks, SSL termination, and session persistence. They are the reception desk of the server world.

**CDN (Content Delivery Network)** - A geographically distributed network of caching servers that serves static content from edge locations close to users. CDNs reduce latency from hundreds of milliseconds to single digits. Cloudflare, Akamai, and Fastly each operate CDNs spanning 200-plus locations worldwide.

## The Big Picture Diagram

<AsciiDiagram
  id="how-the-internet-works/big-picture"
  title="End-to-End Internet Request Flow"
  alt="Flowchart showing the complete path from a user browser through DNS resolution ISP routing BGP transit across the public internet and into a target data center with CDN load balancer web server cache and database"
  caption="End-to-end request flow from browser to database server"
  content={\`
                    Internet Request Flow

 +----------------+     +--------------+       +------------------+
 |    Browser     |     | DNS Resolver |       |  ISP / BGP       |
 |  (Your PC)     |---->|  finds IP    |-----> |  Route packets   |
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
  \`}/>

The diagram traces the path from browser to server and back. A request passes through DNS resolution, ISP routing, transcontinental BGP routing, CDN caching, load balancing, and finally to application logic backed by cache and database.

## How It Actually Works - Step by Step

### Step 1: URL Entry and DNS Resolution

You type \`www.example.com\` and press Enter. The browser first checks its local DNS cache. If nothing is found, it asks the operating system's DNS resolver. If the OS has nothing cached, the request goes to a DNS resolver configured on your network - typically your ISP's resolver or a public resolver like Google DNS (8.8.8.8) or Cloudflare DNS (1.1.1.1).

The resolver performs a recursive lookup. It starts at a root nameserver (one of 13 logical root zones), which returns the address of the .com TLD nameserver. The TLD nameserver returns the address of the authoritative nameserver for example.com. The authoritative nameserver returns the A record (IPv4 address) or AAAA record (IPv6 address). The resolver caches this result for the record's TTL (often 60 to 300 seconds) and returns it to your browser.

This entire chain typically completes in 20-50 milliseconds. If any step fails - a root server is unreachable, the TLD server is overloaded, the authoritative server returns NXDOMAIN - the browser displays a DNS error.

<AsciiDiagram
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
  \`}/>

### Step 2: TCP Three-Way Handshake

With the IP address known, the browser initiates a TCP connection. The three-way handshake establishes a reliable channel:

1. **SYN**: Browser sends a TCP segment with the SYN flag set, a randomly chosen initial sequence number (ISN), and a maximum segment size (MSS) typically 1,460 bytes for Ethernet.
2. **SYN-ACK**: The server responds with SYN and ACK flags set, its own sequence number, acknowledgment of the browser's ISN plus one, and its MSS.
3. **ACK**: The browser sends an ACK confirming the server's sequence number. Connection is established.

This handshake adds one round-trip time (RTT) before any data can be sent. For a user in New York accessing a server in London, that RTT is roughly 70 milliseconds. TLS encryption (used in HTTPS) adds two more round trips, making the initial connection 3 RTT before any HTTP request data flows.

<AsciiDiagram
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
  \`}/>

### Step 3: HTTP Request Transmission

Once the TLS tunnel is established, the browser sends an HTTP request. For HTTP/1.1, the request looks like:

\`\`\`http
GET /index.html HTTP/1.1
Host: www.example.com
User-Agent: Mozilla/5.0
Accept: text/html,application/xhtml+xml
Accept-Encoding: gzip, deflate
Connection: keep-alive
\`\`\`

The server processes the request, queries its database or cache, constructs an HTTP response with headers (status code, content-type, content-length, cache-control headers), and sends the response body. The browser receives the HTML, parses it, discovers sub-resources (CSS files, JavaScript bundles, images, fonts), and issues additional HTTP requests for each one. Modern browsers open 6 parallel TCP connections per domain in HTTP/1.1, or a single multiplexed connection in HTTP/2.

### Step 4: Browser Rendering

The browser constructs a Document Object Model (DOM) tree from the HTML, a CSS Object Model (CSSOM) from stylesheets, combines them into a render tree, computes layout (box positions and sizes), and paints pixels to the screen. This process is called the critical rendering path. JavaScript execution blocks DOM construction unless the script tag has the async or defer attribute. Deferred scripts execute after the HTML is parsed; async scripts execute as soon as they download.

The full sequence from URL entry to painted page typically takes 400-900 milliseconds on a fast connection and 2-4 seconds on a typical mobile connection.

<AsciiDiagram
  id="how-the-internet-works/browser-rendering"
  title="Full Page Load Sub-Resource Waterfall"
  alt="Waterfall chart showing sequence and timing of DNS lookup TCP handshake TLS handshake and HTTP requests for HTML CSS JavaScript images and fonts along with HTML parsing JavaScript execution and page rendering phases"
  caption="Page load waterfall: DNS, TCP, TLS, and HTTP request timing"
  content={\`
 Page Load Waterfall Timeline

 DNS (50ms)     [##########--------] ...................................
 TCP (70ms)     [------##########--] ...................................
 TLS (140ms)    [------------######] ...................................
 GET /index     [--------------####] ...................................
 GET style.css  [----------------##] ...................................
 GET script.js  [----------------##] ...................................
 GET img1.png   [-----------------#] ...................................
 GET img2.png   [-----------------#] ...................................
 GET font.woff  [-----------------#] ...................................
 Parse HTML     [##################] ...................................
 Execute JS     [----------########] ...................................
 Paint          [----------------##] ...................................
  \`}/>

## Variants and Flavors

### Variant 1: HTTP/3 and QUIC

HTTP/3 replaces TCP with QUIC, which runs on top of UDP. QUIC reduces connection establishment from 3 round trips (TCP + TLS) to 1 round trip, and 0 round trips on resumption. QUIC also handles packet loss better - if one packet is lost, only that packet's stream is blocked, not all streams (TCP head-of-line blocking). Google reported a 35% reduction in YouTube rebuffer rates after switching to QUIC.

**When to use**: latency-sensitive applications, mobile networks with frequent connection migration (users switching between Wi-Fi and cellular), and any service where sub-second page loads matter.

**When not to use**: environments where UDP is blocked or throttled (some corporate firewalls), or when you need deep packet inspection for security (many intrusion detection systems work better with TCP).

### Variant 2: WebSockets

WebSockets upgrade an HTTP connection to a persistent, bidirectional channel. The client sends an HTTP Upgrade header, and the server responds with 101 Switching Protocols. After that, both sides can send frames at any time - no request-response pattern. This drops latency from one HTTP round trip per message to milliseconds per frame.

**When to use**: real-time applications: chat, live notifications, collaborative editing, financial tickers, multiplayer games.

**When not to use**: request-response APIs that REST or GraphQL handles well, serverless environments where long-lived connections are not supported.

### Variant 3: HTTP/2 Multiplexing

HTTP/2 introduces streams within a single TCP connection. Multiple requests and responses interleave without waiting for each other. The browser's six-connection-per-domain limit is replaced by one connection with hundreds of concurrent streams. Server push allows the server to send resources before the client asks for them (though this is rarely used in practice due to caching complexity).

**When to use**: high-latency connections (mobile, long-distance), pages with many sub-resources.

**When not to use**: simple APIs with few endpoints, or when your load balancer does not support HTTP/2 (most do by 2025).

## Mental Model Check

**1. What happens when your DNS lookup returns an expired record?**

The browser caches DNS results for the time-to-live (TTL) set by the domain owner (commonly 60 to 300 seconds). If a record expires while cached, the browser uses the cached value but treats it as stale. The next lookup re-fetches from the resolver. If the authoritative server changed the IP during that window, users see a mix of old and new IPs - some requests go to the old server, some to the new one. This is why TTLs are set low (30-60 seconds) before planned IP migrations, then raised back to 300+ seconds after the cutover.

**2. Why does loading a single web page require dozens of separate network requests?**

An HTML page references external CSS files, JavaScript bundles, fonts, images, video thumbnails, analytics beacons, and third-party widgets. Each unique URL initiates a DNS lookup, a TCP connection (or reuse of an existing one), and a full HTTP request-response cycle. A typical news article triggers 80 to 150 requests. HTTP/2 multiplexing reduces this overhead by allowing all requests to share one connection, but each resource still requires a separate HTTP request frame.

**3. What happens when a router along the path drops your packet?**

TCP on the sending side detects the gap because the receiver's ACK sequence numbers do not advance past the missing packet. After a retransmission timeout (RTO, initially 200-300 ms, doubling with each failure), the sender retransmits the packet. If the router has enough buffer space, it queues the packet instead of dropping it - but bufferbloat can add hundreds of milliseconds of latency. Modern TCP congestion control algorithms (BBR, CUBIC) detect actual bandwidth and RTT rather than just packet loss, reducing unnecessary retransmissions.

**4. Why can your video stream tolerate packet loss but your bank transfer cannot?**

Video streaming uses UDP, which has no retransmission mechanism. A dropped video packet causes a brief pixelation or a frame skip - barely noticeable at 60 fps. A dropped bank transfer packet could result in a missing transaction. Banking and all data-integrity-sensitive applications use TCP, which guarantees every byte arrives exactly once and in order. The 20-byte TCP header overhead is the cost of that guarantee.

**5. How does your home router let five family members browse simultaneously with one public IP?**

NAT (Network Address Translation). The router maintains a table mapping each internal connection (private IP:port) to an external port on the router's public IP. When a packet comes back from the internet, the router looks up the destination port in its NAT table, rewrites the destination IP:port to the internal client, and forwards it. The limit is roughly 65,535 ports per protocol (TCP and UDP each have 16-bit port fields), so a home router can sustain about 2,000 active connections before exhausting its NAT table - plenty for a household, but a problem for BitTorrent users or large offices.

This is the foundational model of how the internet works. The deep dive explores each layer in detail - packet structure, routing algorithms, TCP flow control, and the exact bytes on the wire.`;

fs.writeFileSync(FILE, content, 'utf8');
console.log('Written: ' + FILE);
console.log('Lines: ' + content.split('\n').length);