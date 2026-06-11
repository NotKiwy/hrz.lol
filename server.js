const express    = require('express');
const http       = require('http');
const path       = require('path');
const { Server } = require('socket.io');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const { connect, db } = require('./db');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);
const PORT   = process.env.PORT || 3001;

app.set('io', io);
app.set('trust proxy', 1);

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc:     ["'self'"],
            scriptSrc:      ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net'],
            styleSrc:       ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
            fontSrc:        ["'self'", 'data:', 'https://fonts.gstatic.com'],
            imgSrc:         ["'self'", 'data:', 'blob:', 'https:'],
            connectSrc:     ["'self'", 'https://cdn.jsdelivr.net', 'https://status.hrz.lol'],
            objectSrc:      ["'none'"],
            scriptSrcAttr:  ["'unsafe-inline'"],
            baseUri:        ["'self'"],
            formAction:     ["'self'"],
            frameAncestors: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

let pending = 0;
const MAX_PENDING = 120;
app.use((req, res, next) => {
    if (pending >= MAX_PENDING) {
        return res.status(503)
            .set('Retry-After', '10')
            .sendFile(path.join(__dirname, 'public/home/busy.html'));
    }
    pending++;
    const dec = () => { pending = Math.max(0, pending - 1); };
    res.on('finish', dec);
    res.on('close', dec);
    next();
});

const limiter = (max, windowMs = 60_000) => rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'too many requests, slow down' },
});

app.use('/api/convert', limiter(6));
app.use('/api/meta',    limiter(15));
app.use('/api/whois',   limiter(15));
app.use('/api/req',     limiter(20));
app.use('/api/hash',    limiter(60));
app.use('/api/qr',      limiter(30));
app.use('/api/paste',   limiter(20));
app.use('/api/short',   limiter(30));
app.use('/api',         limiter(100));
app.use(             limiter(300, 60_000));

app.use(express.json({ limit: '1mb' }));

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#111111"/>
  <rect x="6" y="6" width="88" height="88" rx="16" fill="#f0c040"/>
  <text x="50" y="73" text-anchor="middle"
        font-family="Arial,sans-serif" font-size="64" font-weight="900" fill="#111111">h</text>
</svg>`;

const serveFavicon = (_req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(FAVICON_SVG);
};
app.get('/favicon.svg', serveFavicon);
app.get('/favicon.ico', serveFavicon);

const FOOTER_JS = `(function(){
var css="html,body{height:auto !important;min-height:100%}"
+"body.hrz-shell{display:flex !important;flex-direction:column !important;align-items:stretch !important;justify-content:flex-start !important;padding:0 !important;min-height:100vh}"
+".hrz-main{flex:1 0 auto;display:flex;flex-direction:column;width:100%;box-sizing:border-box}"
+".hrz-footer{flex:0 0 auto;padding:40px 20px 24px;text-align:center;font-family:'Nunito',sans-serif;font-size:12px;font-weight:700;color:#777770;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:14px;row-gap:8px;animation:hrzFadeUp .5s .2s ease both;width:100%}"
+".hrz-footer .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#c4c2ba;vertical-align:1px;margin-right:6px}"
+".hrz-footer .dot.up{background:#2bbf6a;animation:hrzPulse 2.2s infinite}"
+".hrz-footer .dot.down{background:#d24747}"
+".hrz-footer a{color:#111;text-decoration:none;border-bottom:1.5px dotted #c4c2ba;padding-bottom:1px;transition:border-color .15s}"
+".hrz-footer a:hover{border-bottom-color:#111}"
+".hrz-footer .sep{color:#c4c2ba}"
+"@keyframes hrzPulse{0%{box-shadow:0 0 0 0 rgba(43,191,106,.55)}70%{box-shadow:0 0 0 8px rgba(43,191,106,0)}100%{box-shadow:0 0 0 0 rgba(43,191,106,0)}}"
+"@keyframes hrzFadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}";
var s=document.createElement('style');s.textContent=css;document.head.appendChild(s);

var cs=getComputedStyle(document.body);
var origAlign=cs.alignItems;
var origJustify=cs.justifyContent;
var origPadding=cs.padding;

var wrap=document.createElement('div');
wrap.className='hrz-main';
wrap.style.cssText='align-items:'+origAlign+';justify-content:'+origJustify+';padding:'+origPadding;
var kids=[];
for(var i=0;i<document.body.childNodes.length;i++)kids.push(document.body.childNodes[i]);
for(var j=0;j<kids.length;j++){
  var n=kids[j];
  if(n.nodeType===1 && getComputedStyle(n).position==='fixed')continue;
  wrap.appendChild(n);
}
document.body.appendChild(wrap);
document.body.classList.add('hrz-shell');

var f=document.createElement('footer');f.className='hrz-footer';
f.innerHTML='<span>hrz.lol &middot; simple tools that just work</span>'
+'<span class="sep">&middot;</span>'
+'<a href="https://status.hrz.lol" target="_blank" rel="noopener"><span class="dot" id="hrzStatusDot"></span>status</a>'
+'<span class="sep">&middot;</span>'
+'<a href="https://github.com/NotKiwy/hrz.lol" target="_blank" rel="noopener">source</a>'
+'<span class="sep">&middot;</span>'
+'<a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener">agpl-3.0</a>';
document.body.appendChild(f);
fetch('https://status.hrz.lol/api/status-page/heartbeat/main').then(function(r){return r.json()}).then(function(d){
  var beats=d&&d.heartbeatList?Object.values(d.heartbeatList).flat():[];
  if(!beats.length)return;
  var allUp=beats.every(function(h){return h.status===1});
  var dot=document.getElementById('hrzStatusDot');
  if(dot)dot.classList.add(allUp?'up':'down');
}).catch(function(){});
})();`;

app.get('/footer.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(FOOTER_JS);
});

app.get('/health', async (_req, res) => {
    const result = { status: 'ok', uptime: Math.floor(process.uptime()), checks: {} };
    let mongoOk = false;
    try {
        await db().command({ ping: 1 });
        mongoOk = true;
    } catch (_) {}
    result.checks.mongo = mongoOk;
    const mem = process.memoryUsage();
    result.checks.memory_mb = Math.round(mem.rss / 1048576);
    if (!mongoOk) result.status = 'degraded';
    res.status(mongoOk ? 200 : 503).json(result);
});

const DIRS = {
    paste:  path.join(__dirname, 'public/paste'),
    qr:     path.join(__dirname, 'public/qr'),
    url:    path.join(__dirname, 'public/url'),
    whois:  path.join(__dirname, 'public/whois'),
    chars:  path.join(__dirname, 'public/chars'),
    req:    path.join(__dirname, 'public/req'),
    hash:   path.join(__dirname, 'public/hash'),
    jwt:    path.join(__dirname, 'public/jwt'),
    enc:    path.join(__dirname, 'public/enc'),
    lnk:    path.join(__dirname, 'public/short'),
    conv:   path.join(__dirname, 'public/convert'),
    chat:   path.join(__dirname, 'public/chat'),
    hook:   path.join(__dirname, 'public/hook'),
    draw:   path.join(__dirname, 'public/draw'),
    img:    path.join(__dirname, 'public/img'),
    fake:   path.join(__dirname, 'public/fake'),
    json:   path.join(__dirname, 'public/json'),
    cron:   path.join(__dirname, 'public/cron'),
    diff:   path.join(__dirname, 'public/diff'),
    meta:   path.join(__dirname, 'public/meta'),
    ts:     path.join(__dirname, 'public/ts'),
    md:     path.join(__dirname, 'public/md'),
    color:  path.join(__dirname, 'public/color'),
    uuid:   path.join(__dirname, 'public/uuid'),
    subnet: path.join(__dirname, 'public/subnet'),
    bcrypt: path.join(__dirname, 'public/bcrypt'),
    exif:   path.join(__dirname, 'public/exif'),
    ip:     path.join(__dirname, 'public/ip'),
    emoji:  path.join(__dirname, 'public/emoji'),
    home:   path.join(__dirname, 'public/home'),
    support: path.join(__dirname, 'public/support'),
};

function getService(hostname = '') {
    const sub = hostname.split('.')[0].toLowerCase();
    if (sub === 'paste') return 'paste';
    if (sub === 'lnk')   return 'lnk';
    if (sub === 'conv')  return 'conv';
    if (sub === 'chat')  return 'chat';
    if (sub === 'hook')  return 'hook';
    if (sub === 'draw')  return 'draw';
    if (sub === 'img')   return 'img';
    if (sub === 'fake')  return 'fake';
    if (sub === 'json')  return 'json';
    if (sub === 'cron')  return 'cron';
    if (sub === 'diff')  return 'diff';
    if (sub === 'meta')  return 'meta';
    if (sub === 'ts')    return 'ts';
    if (sub === 'md')    return 'md';
    if (sub === 'color') return 'color';
    if (sub === 'qr')    return 'qr';
    if (sub === 'url')   return 'url';
    if (sub === 'whois') return 'whois';
    if (sub === 'chars') return 'chars';
    if (sub === 'req')   return 'req';
    if (sub === 'hash')  return 'hash';
    if (sub === 'jwt')   return 'jwt';
    if (sub === 'enc')   return 'enc';
    if (sub === 'uuid')  return 'uuid';
    if (sub === 'subnet')return 'subnet';
    if (sub === 'bcrypt')return 'bcrypt';
    if (sub === 'exif')  return 'exif';
    if (sub === 'ip')    return 'ip';
    if (sub === 'emoji') return 'emoji';
    return 'home';
}

app.use((req, res, next) => {
    const service = getService(req.hostname);
    express.static(DIRS[service])(req, res, next);
});

app.use('/', require('./routes/og'));
app.use('/', require('./routes/paste'));
app.use('/', require('./routes/short'));
app.use('/', require('./routes/convert'));
app.use('/', require('./routes/chat'));
app.use('/', require('./routes/hook'));
app.use('/', require('./routes/draw'));
app.use('/', require('./routes/img'));
app.use('/', require('./routes/fake'));
app.use('/', require('./routes/json'));
app.use('/', require('./routes/cron'));
app.use('/', require('./routes/diff'));
app.use('/', require('./routes/meta'));
app.use('/', require('./routes/ts'));
app.use('/', require('./routes/md'));
app.use('/', require('./routes/color'));
app.use('/', require('./routes/ip'));
app.use('/', require('./routes/whois'));
app.use('/', require('./routes/req'));
app.use('/', require('./routes/hash'));
app.use('/', require('./routes/qr'));
app.use('/', require('./routes/support'));

require('./socket/chat')(io);
require('./socket/draw')(io);

connect()
    .then(() => server.listen(PORT, () => console.log(`hrz on :${PORT}`)))
    .catch(err => { console.error('MongoDB connect failed:', err); process.exit(1); });
