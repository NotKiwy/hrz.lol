<div align="center">

# hrz.lol

**29 small developer tools. One domain. No accounts, no ads, no trackers.**

[hrz.lol](https://hrz.lol) &middot; [status](https://status.hrz.lol) &middot; [support](https://hrz.lol/support)

[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-20%2B-green.svg)](https://nodejs.org)
[![Stars](https://img.shields.io/github/stars/NotKiwy/hrz.lol?style=flat)](https://github.com/NotKiwy/hrz.lol/stargazers)
[![Last commit](https://img.shields.io/github/last-commit/NotKiwy/hrz.lol)](https://github.com/NotKiwy/hrz.lol/commits)
[![Issues](https://img.shields.io/github/issues/NotKiwy/hrz.lol)](https://github.com/NotKiwy/hrz.lol/issues)
[![Uptime](https://img.shields.io/website?url=https%3A%2F%2Fhrz.lol&label=hrz.lol)](https://status.hrz.lol)

</div>

---

Each tool lives on its own subdomain of `hrz.lol`. No login. No accounts. Anonymous
rooms exist only in memory and vanish when everyone leaves. Pastes and short
links live as long as you ask them to. The whole site runs on a single
small VPS &mdash; if it stays simple, it stays fast.

## Tools

### Text &amp; data

| Subdomain | Description |
| --------- | ----------- |
| [`paste`](https://paste.hrz.lol)   | Code &amp; text paste with optional expiry, syntax highlight, password lock |
| [`diff`](https://diff.hrz.lol)     | Compare two texts side-by-side, line-level diff |
| [`md`](https://md.hrz.lol)         | Markdown editor with live HTML preview &amp; export |
| [`chars`](https://chars.hrz.lol)   | Character, word, sentence, line counter with frequency &amp; read time |
| [`json`](https://json.hrz.lol)     | Format, minify, validate, query JSON |
| [`url`](https://url.hrz.lol)       | URL parser &amp; query-string explorer |

### Network &amp; web

| Subdomain | Description |
| --------- | ----------- |
| [`req`](https://req.hrz.lol)       | HTTP client in the browser. Any method, headers, body |
| [`hook`](https://hook.hrz.lol)     | Live webhook inspector. Temporary URL, real-time stream |
| [`meta`](https://meta.hrz.lol)     | Preview any URL (Open Graph / Twitter Card) |
| [`whois`](https://whois.hrz.lol)   | Domain registration via RDAP |
| [`ip`](https://ip.hrz.lol)         | Your public IP, country, reverse DNS, user-agent |
| [`subnet`](https://subnet.hrz.lol) | IPv4 CIDR calculator. Network, broadcast, mask, hosts |
| [`lnk`](https://lnk.hrz.lol)       | URL shortener with optional click limit |

### Encoding &amp; crypto

| Subdomain | Description |
| --------- | ----------- |
| [`hash`](https://hash.hrz.lol)     | MD5, SHA-1, SHA-256, SHA-512 |
| [`jwt`](https://jwt.hrz.lol)       | JWT decoder. Header, payload, signature |
| [`enc`](https://enc.hrz.lol)       | Base64, URL, HTML entities, hex encode &amp; decode |
| [`bcrypt`](https://bcrypt.hrz.lol) | bcrypt hash &amp; verify. Adjustable cost |

### Generators

| Subdomain | Description |
| --------- | ----------- |
| [`uuid`](https://uuid.hrz.lol)     | UUID v4, UUID v7, nanoid, ULID. Bulk and configurable |
| [`qr`](https://qr.hrz.lol)         | QR code generator with custom colors and sizes |
| [`fake`](https://fake.hrz.lol)     | Realistic fake data (names, emails, addresses) as table, JSON, CSV, SQL |
| [`img`](https://img.hrz.lol)       | Placeholder images on demand |
| [`emoji`](https://emoji.hrz.lol)   | Emoji search &amp; copy. All Unicode categories |

### Convert &amp; transform

| Subdomain | Description |
| --------- | ----------- |
| [`conv`](https://conv.hrz.lol)     | Image converter (jpg, png, webp, avif, tiff) |
| [`ts`](https://ts.hrz.lol)         | Unix timestamp / date converter across timezones |
| [`exif`](https://exif.hrz.lol)     | EXIF metadata viewer &amp; stripper. GPS detection |

### Visual

| Subdomain | Description |
| --------- | ----------- |
| [`color`](https://color.hrz.lol)   | Color picker &amp; palette generator |
| [`cron`](https://cron.hrz.lol)     | Visual cron expression builder |

### Real-time

| Subdomain | Description |
| --------- | ----------- |
| [`chat`](https://chat.hrz.lol)     | Anonymous, ephemeral chat rooms |
| [`draw`](https://draw.hrz.lol)     | Collaborative whiteboard |

## Stack

Node.js + Express, MongoDB for persistent data (pastes, links), Socket.IO for
realtime tools (chat, draw), Sharp for image work, Helmet + Content Security
Policy + per-route rate limits. Server-side SSRF protection on URL-following
endpoints. Uptime Kuma for monitoring.

## Running locally

Requires Node.js `20+` and MongoDB.

```bash
git clone https://github.com/NotKiwy/hrz.lol.git
cd hrz.lol
npm install
MONGODB_URI=mongodb://127.0.0.1:27017/hrz npm start
```

Server starts on port `3001`. Set `PORT` to override.

To reach the subdomain-routed tools locally, add to `/etc/hosts`:

```
127.0.0.1  hrz.lol paste.hrz.lol chat.hrz.lol draw.hrz.lol meta.hrz.lol
127.0.0.1  hook.hrz.lol whois.hrz.lol req.hrz.lol conv.hrz.lol qr.hrz.lol
127.0.0.1  hash.hrz.lol jwt.hrz.lol enc.hrz.lol json.hrz.lol diff.hrz.lol
127.0.0.1  md.hrz.lol color.hrz.lol cron.hrz.lol ts.hrz.lol fake.hrz.lol
127.0.0.1  img.hrz.lol chars.hrz.lol url.hrz.lol lnk.hrz.lol uuid.hrz.lol
127.0.0.1  subnet.hrz.lol bcrypt.hrz.lol exif.hrz.lol ip.hrz.lol emoji.hrz.lol
127.0.0.1  status.hrz.lol
```

Then open `http://hrz.lol:3001`.

## Privacy

No login, no accounts, no third-party analytics, no ads. The only data
persisted is the content you explicitly create &mdash; pastes and short links.
Anonymous rooms (chat, draw, webhook inspectors) live in memory and are gone
the moment the last user leaves. Nothing is sold, nothing is shared.

## Contributing

Pull requests welcome. Each tool is a self-contained HTML file in `public/`
with an optional Express route in `routes/`. If you build a new one, drop
the directory into `public/`, add a subdomain mapping to `server.js`, and
include a tile on the home page.

## Support

If any tool here saved you a click, you can throw a few rubles into the jar
at [hrz.lol/support](https://hrz.lol/support) &mdash; fiat or crypto, no account
needed. It keeps the lights on.

## License

[AGPL-3.0-or-later](LICENSE). If you run a modified version as a network
service, you must publish your modifications.
