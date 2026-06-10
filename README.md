# hrz

A collection of small, privacy-respecting developer tools on one domain.
Each tool lives on its own subdomain of [hrz.lol](https://hrz.lol).

No ads, no trackers, no accounts. Anonymous rooms live in memory and disappear
when everyone leaves.

## Tools

| Subdomain | What it does                                     |
| --------- | ------------------------------------------------ |
| `paste`   | Code & text paste with optional expiry           |
| `lnk`     | URL shortener with optional click limit          |
| `chat`    | Ephemeral anonymous chat rooms                   |
| `draw`    | Collaborative whiteboard                         |
| `hook`    | Live webhook inspector                           |
| `meta`    | Preview any URL (Open Graph / Twitter Card)      |
| `whois`   | RDAP-based domain lookup                         |
| `req`     | Send HTTP requests from the browser              |
| `conv`    | Convert images between formats                   |
| `qr`      | Generate QR codes                                |
| `hash`    | MD5 / SHA-1 / SHA-256 / SHA-512                  |
| `jwt`     | Decode JWT tokens                                |
| `enc`     | Base64 / URL / HTML / hex encode-decode          |
| `json`    | Format, validate & explore JSON                  |
| `diff`    | Compare two texts                                |
| `md`      | Markdown editor with preview                     |
| `color`   | Color picker & palette generator                 |
| `cron`    | Visual cron expression builder                   |
| `ts`      | Unix timestamp / date converter                  |
| `fake`    | Realistic fake data generator                    |
| `img`     | Placeholder images on demand                     |
| `chars`   | Character / word / line counter                  |
| `url`     | URL parser & decoder                             |

## Running locally

Requires Node.js 20+ and MongoDB.

```bash
git clone https://github.com/NotKiwy/hrz.lol.git
cd hrz
npm install
MONGODB_URI=mongodb://127.0.0.1:27017/hrz npm start
```

The server starts on port `3001`. Set `PORT` to override.

To reach the subdomain-routed tools locally, add to `/etc/hosts`:

```
127.0.0.1  hrz.lol paste.hrz.lol chat.hrz.lol draw.hrz.lol meta.hrz.lol \
           hook.hrz.lol whois.hrz.lol req.hrz.lol conv.hrz.lol qr.hrz.lol \
           hash.hrz.lol jwt.hrz.lol enc.hrz.lol json.hrz.lol diff.hrz.lol \
           md.hrz.lol color.hrz.lol cron.hrz.lol ts.hrz.lol fake.hrz.lol \
           img.hrz.lol chars.hrz.lol url.hrz.lol lnk.hrz.lol
```

…then open `http://hrz.lol:3001`.

## Stack

Node + Express, MongoDB for persistent data (pastes, links), Socket.IO for
realtime tools (chat, draw), Sharp for image work, Helmet + CSP + per-route
rate limits.

## License

[AGPL-3.0-or-later](LICENSE). If you run a modified version as a network
service, you must publish your modifications.
