import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db.js';
import { token, tokenHash, hashPassword, verifyPassword, validUrl, isOpenForRegistration } from './security.js';

const ROOT = fileURLToPath(new URL('.',import.meta.url));
const STATIC_ROOT = resolve(ROOT,'public');
const SESSION_MS = 7*24*60*60*1000;
const COOKIE_SESSION = 'pt_session';
const COOKIE_CSRF = 'pt_csrf';
const TYPES = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon' };
const scopes = ['Toba','Sumut','Nasional'];
const categories = ['Umum','Siaga','Penggalang','Penegak','Pandega','Garuda'];
class AppError extends Error { constructor(status, message){super(message);this.status=status;} }

function fail(status,message){throw new AppError(status,message);}
function parseCookies(req){
  const cookies={};
  for (const p of (req.headers.cookie||'').split(';')) {
    const idx=p.indexOf('=');
    if(idx>0)cookies[p.slice(0,idx).trim()]=p.slice(idx+1).trim();
  }
  return cookies;
}
function cookie(name,value,{maxAge=SESSION_MS/1000,httpOnly=false,secure=false}={}){
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${Math.floor(maxAge)}; SameSite=Strict${httpOnly?'; HttpOnly':''}${secure?'; Secure':''}`;
}
function safeEqual(a,b){
  const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));
  return aa.length===bb.length && timingSafeEqual(aa,bb);
}
function json(res,status,obj){
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
  res.end(JSON.stringify(obj));
}
async function readJson(req){
  if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')) fail(415,'Gunakan Content-Type application/json.');
  let size=0; const parts=[];
  for await (const chunk of req) {
    size+=chunk.length;
    if(size>32000) fail(413,'Data terlalu besar.');
    parts.push(chunk);
  }
  try {
    const data=JSON.parse(Buffer.concat(parts).toString('utf8'));
    if(!data || typeof data!=='object' || Array.isArray(data)) fail(400,'Format data tidak valid.');
    return data;
  } catch (e) {
    if(e instanceof AppError) throw e;
    fail(400,'JSON tidak valid.');
  }
}
function requiredText(obj,key,max=400){
  if(typeof obj[key]!=='string') fail(400,`Kolom ${key} wajib diisi.`);
  const val=obj[key].trim();
  if(!val || val.length>max) fail(400,`Kolom ${key} wajib diisi, maksimal ${max} karakter.`);
  return val;
}
function optionalText(obj,key,max=300){
  const val= typeof obj[key]==='string'?obj[key].trim():'';
  if(val.length>max) fail(400,`Kolom ${key} maksimal ${max} karakter.`);
  return val;
}
function publicUser(row){return row?{id:row.id,name:row.name,email:row.email,role:row.role}:null;}
function publicEvents(db){return db.prepare('SELECT * FROM events WHERE published=1 AND related_toba=1 ORDER BY date DESC').all().map(normalizeEvent);}
function normalizeEvent(e){return {...e,related_toba:Boolean(e.related_toba),published:Boolean(e.published),registration_open:Boolean(e.registration_open)};}
function settings(db){return Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map(x=>[x.key,x.value]));}
function registrations(db,userId){
  return db.prepare(`SELECT r.id,r.status,r.created_at,e.id as event_id,e.title,e.date,e.scope,e.location
    FROM registrations r JOIN events e ON e.id=r.event_id WHERE r.user_id=? ORDER BY r.created_at DESC`).all(userId);
}
function checkEventBody(body){
  const e={
    title:requiredText(body,'title',140),
    scope:requiredText(body,'scope',20),
    date:requiredText(body,'date',10),
    time:optionalText(body,'time',5),
    location:requiredText(body,'location',140),
    organizer:requiredText(body,'organizer',120),
    description:requiredText(body,'description',4000),
    source_url:optionalText(body,'source_url',700),
    related_toba:Boolean(body.related_toba),
    published:Boolean(body.published),
    registration_open:Boolean(body.registration_open),
    capacity:body.capacity==null || body.capacity===''?null:Number(body.capacity)
  };
  if(!scopes.includes(e.scope)) fail(400,'Cakupan kegiatan tidak valid.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || Number.isNaN(Date.parse(e.date+'T00:00:00Z')) || new Date(e.date+'T00:00:00Z').toISOString().slice(0,10)!==e.date) fail(400,'Tanggal harus valid.');
  if(e.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)) fail(400,'Format waktu HH:MM tidak valid.');
  if(e.source_url && !validUrl(e.source_url)) fail(400,'Tautan sumber harus HTTPS yang valid.');
  if(e.capacity!==null && (!Number.isSafeInteger(e.capacity)||e.capacity<1||e.capacity>100000)) fail(400,'Kapasitas harus bilangan bulat positif.');
  if(e.published && (!e.related_toba || !validUrl(e.source_url))) fail(400,'Agar terbit, kegiatan harus terkait Toba dan memiliki tautan sumber HTTPS yang bisa diverifikasi.');
  return e;
}
function checkMaterialBody(body){
  const m={
    category:requiredText(body,'category',30),
    title:requiredText(body,'title',140),
    summary:requiredText(body,'summary',360),
    content:requiredText(body,'content',12000),
    source_url:optionalText(body,'source_url',700),
    published:Boolean(body.published)
  };
  if(!categories.includes(m.category)) fail(400,'Kategori materi tidak valid.');
  if(m.source_url && !validUrl(m.source_url)) fail(400,'Sumber materi harus URL HTTPS.');
  return m;
}
function assertAllowedOrigin(req){
  // Browser mutating fetch sends Origin; never use CORS for this same-origin application.
  const o = req.headers.origin;
  if(!o) fail(403,'Permintaan ditolak: Origin tidak ditemukan.');
  try {
    const url=new URL(o);
    if(url.host!==req.headers.host || !['https:','http:'].includes(url.protocol)) fail(403,'Permintaan berasal dari situs berbeda.');
    if(url.protocol==='http:' && !['127.0.0.1','localhost','[::1]'].includes(url.hostname) && process.env.NODE_ENV==='production') fail(403,'Gunakan HTTPS.');
  }catch(e){if(e instanceof AppError) throw e;fail(403,'Origin tidak valid.');}
}

export function createApp({ databasePath = process.env.DATABASE_PATH || resolve(ROOT,'data/pramuka-toba.sqlite') }={}){
  const db=openDatabase(databasePath);
  const secure=process.env.NODE_ENV==='production';
  const limit=new Map();
  function currentUser(req){
    const session=parseCookies(req)[COOKIE_SESSION];
    if(!session) return null;
    const record=db.prepare(`SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=? AND s.expires_at>?`).get(tokenHash(session),Date.now());
    return record||null;
  }
  function requireUser(req){const u=currentUser(req);if(!u)fail(401,'Silakan masuk terlebih dahulu.');return u;}
  function requireAdmin(req){const u=requireUser(req);if(u.role!=='admin')fail(403,'Hanya admin yang berwenang.');return u;}
  function createSession(res,userId){
    const secret=token();
    db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)').run(tokenHash(secret),userId,Date.now()+SESSION_MS);
    res.setHeader('set-cookie',[cookie(COOKIE_SESSION,secret,{secure,httpOnly:true})]);
  }
  function limitAuth(req){
    const ip=req.socket.remoteAddress||'unknown';
    const now=Date.now();
    const existing=limit.get(ip)||[];
    const recent=existing.filter(ts=>now-ts<15*60*1000);
    if(recent.length>=20) fail(429,'Terlalu banyak percobaan. Coba lagi nanti.');
    recent.push(now);limit.set(ip,recent);
    if(limit.size>2000){for(const [key,v] of limit)if(v.every(ts=>now-ts>15*60*1000))limit.delete(key);}
  }
  const server=http.createServer(async(req,res)=>{
    res.setHeader('x-content-type-options','nosniff');
    res.setHeader('x-frame-options','DENY');
    res.setHeader('referrer-policy','strict-origin-when-cross-origin');
    res.setHeader('permissions-policy','camera=(), microphone=(), geolocation=()');
    res.setHeader('content-security-policy',"default-src 'self'; connect-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
    if(secure)res.setHeader('strict-transport-security','max-age=31536000; includeSubDomains');
    try{
      const url=new URL(req.url||'/', 'http://localhost');
      const path=url.pathname;
      if(path.startsWith('/api/')){
        if(!['GET','POST','PUT'].includes(req.method)) fail(405,'Metode tidak diizinkan.');
        if(req.method!=='GET'){
          assertAllowedOrigin(req);
          const cookies=parseCookies(req);
          const expected=decodeURIComponent(cookies[COOKIE_CSRF]||'');
          if(!expected || !req.headers['x-csrf-token'] || !safeEqual(expected,req.headers['x-csrf-token'])) fail(403,'Token keamanan tidak valid. Muat ulang halaman.');
        }
        if(req.method==='GET' && path==='/api/health') return json(res,200,{ok:true});
        if(req.method==='GET' && path==='/api/bootstrap'){
          if(!parseCookies(req)[COOKIE_CSRF]) res.setHeader('set-cookie',[cookie(COOKIE_CSRF,token(),{secure})]);
          const materialsCount=db.prepare('SELECT COUNT(*) AS n FROM materials WHERE published=1').get().n;
          return json(res,200,{user:publicUser(currentUser(req)),events:publicEvents(db),settings:settings(db),materialsCount});
        }
        if(req.method==='GET' && path==='/api/events')return json(res,200,{events:publicEvents(db)});
        const eventMatch=path.match(/^\/api\/events\/([a-f0-9-]{36})$/);
        if(req.method==='GET' && eventMatch){
          const e=db.prepare('SELECT * FROM events WHERE id=? AND published=1 AND related_toba=1').get(eventMatch[1]);
          if(!e)fail(404,'Kegiatan tidak ditemukan.');return json(res,200,{event:normalizeEvent(e)});
        }
        if(req.method==='POST' && path==='/api/auth/register'){
          limitAuth(req);
          const b=await readJson(req);
          const name=requiredText(b,'name',90);
          const email=requiredText(b,'email',160).toLowerCase();
          const password=typeof b.password==='string'?b.password:'';
          if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Alamat email tidak valid.');
          if(password.length<10 || password.length>128)fail(400,'Password harus 10–128 karakter.');
          if(db.prepare('SELECT id FROM users WHERE email=?').get(email))fail(409,'Email ini sudah digunakan.');
          const id=randomUUID();
          const digest=await hashPassword(password);
          try{db.prepare('INSERT INTO users(id,name,email,password_hash) VALUES (?,?,?,?)').run(id,name,email,digest);}
          catch(e){if(String(e).includes('UNIQUE'))fail(409,'Email ini sudah digunakan.');throw e;}
          createSession(res,id);
          return json(res,201,{message:'Akun berhasil dibuat.',user:publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(id))});
        }
        if(req.method==='POST' && path==='/api/auth/login'){
          limitAuth(req);
          const b=await readJson(req);
          const email=requiredText(b,'email',160).toLowerCase();
          const password=typeof b.password==='string'?b.password:'';
          const user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
          const ok=await verifyPassword(password,user?.password_hash || '');
          if(!ok)fail(401,'Email atau password salah.');
          // Prevent session fixation by terminating an existing session before issuance.
          const old=parseCookies(req)[COOKIE_SESSION];
          if(old)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(old));
          createSession(res,user.id);
          return json(res,200,{message:'Berhasil masuk.',user:publicUser(user)});
        }
        if(req.method==='POST' && path==='/api/auth/logout'){
          const old=parseCookies(req)[COOKIE_SESSION];
          if(old)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(old));
          res.setHeader('set-cookie',[cookie(COOKIE_SESSION,'',{maxAge:0,httpOnly:true,secure})]);
          return json(res,200,{message:'Berhasil keluar.'});
        }
        if(req.method==='GET' && path==='/api/me'){
          const u=requireUser(req);
          return json(res,200,{user:publicUser(u),registrations:registrations(db,u.id)});
        }
        if(req.method==='GET' && path==='/api/materials'){
          requireUser(req);
          return json(res,200,{materials:db.prepare('SELECT id,category,title,summary,source_url FROM materials WHERE published=1 ORDER BY category,title').all()});
        }
        const materialMatch=path.match(/^\/api\/materials\/([a-f0-9-]{36})$/);
        if(req.method==='GET' && materialMatch){
          requireUser(req);
          const m=db.prepare('SELECT id,category,title,summary,content,source_url FROM materials WHERE id=? AND published=1').get(materialMatch[1]);
          if(!m)fail(404,'Materi tidak ditemukan.');return json(res,200,{material:m});
        }
        const registerMatch=path.match(/^\/api\/events\/([a-f0-9-]{36})\/register$/);
        if(req.method==='POST' && registerMatch){
          const user=requireUser(req);
          await readJson(req);
          let done=false;
          db.exec('BEGIN IMMEDIATE');
          try {
            const e=db.prepare('SELECT * FROM events WHERE id=?').get(registerMatch[1]);
            if(!e)fail(404,'Kegiatan tidak ditemukan.');
            if(!isOpenForRegistration(e))fail(409,'Pendaftaran kegiatan ini belum atau tidak dibuka.');
            if(db.prepare('SELECT id FROM registrations WHERE event_id=? AND user_id=?').get(e.id,user.id))fail(409,'Kamu sudah mendaftar kegiatan ini.');
            const count=db.prepare("SELECT COUNT(*) AS n FROM registrations WHERE event_id=? AND status IN ('menunggu','diterima')").get(e.id).n;
            if(e.capacity!==null && count>=e.capacity)fail(409,'Kuota pendaftaran sudah penuh.');
            db.prepare('INSERT INTO registrations(id,event_id,user_id) VALUES (?,?,?)').run(randomUUID(),e.id,user.id);
            db.exec('COMMIT');done=true;
            return json(res,201,{message:'Pendaftaran terkirim dan menunggu verifikasi admin.'});
          }finally{if(!done)db.exec('ROLLBACK');}
        }
        if(path.startsWith('/api/admin/')){
          requireAdmin(req);
          if(req.method==='GET' && path==='/api/admin/overview'){
            const allEvents=db.prepare('SELECT * FROM events ORDER BY date DESC').all().map(normalizeEvent);
            const allMaterials=db.prepare('SELECT * FROM materials ORDER BY category,title').all().map(m=>({...m,published:Boolean(m.published)}));
            const allRegistrations=db.prepare(`SELECT r.id,r.event_id,r.user_id,r.status,r.created_at,u.name,u.email,e.title as event_title,e.date
              FROM registrations r JOIN users u ON u.id=r.user_id JOIN events e ON e.id=r.event_id ORDER BY r.created_at DESC`).all();
            return json(res,200,{events:allEvents,materials:allMaterials,registrations:allRegistrations,settings:settings(db)});
          }
          const adminEventMatch=path.match(/^\/api\/admin\/events(?:\/([a-f0-9-]{36}))?$/);
          if(adminEventMatch && (req.method==='POST' && !adminEventMatch[1] || req.method==='PUT' && adminEventMatch[1])){
            const e=checkEventBody(await readJson(req));
            const id=adminEventMatch[1] || randomUUID();
            const params=[e.title,e.scope,e.date,e.time,e.location,e.organizer,e.description,e.source_url,
              Number(e.related_toba),Number(e.published),Number(e.registration_open),e.capacity];
            if(req.method==='POST'){
              db.prepare(`INSERT INTO events(id,title,scope,date,time,location,organizer,description,source_url,related_toba,published,registration_open,capacity)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,...params);
            }else{
              const old=db.prepare('SELECT id FROM events WHERE id=?').get(id);
              if(!old)fail(404,'Kegiatan tidak ditemukan.');
              db.prepare(`UPDATE events SET title=?,scope=?,date=?,time=?,location=?,organizer=?,description=?,source_url=?,related_toba=?,published=?,registration_open=?,capacity=? WHERE id=?`).run(...params,id);
            }
            return json(res,req.method==='POST'?201:200,{message:'Kegiatan tersimpan.',event:normalizeEvent(db.prepare('SELECT * FROM events WHERE id=?').get(id))});
          }
          const adminMaterialMatch=path.match(/^\/api\/admin\/materials(?:\/([a-f0-9-]{36}))?$/);
          if(adminMaterialMatch && (req.method==='POST' && !adminMaterialMatch[1] || req.method==='PUT' && adminMaterialMatch[1])){
            const m=checkMaterialBody(await readJson(req));
            const id=adminMaterialMatch[1] || randomUUID();
            const params=[m.category,m.title,m.summary,m.content,m.source_url,Number(m.published)];
            if(req.method==='POST')db.prepare(`INSERT INTO materials(id,category,title,summary,content,source_url,published) VALUES (?,?,?,?,?,?,?)`).run(id,...params);
            else {
              if(!db.prepare('SELECT id FROM materials WHERE id=?').get(id))fail(404,'Materi tidak ditemukan.');
              db.prepare('UPDATE materials SET category=?,title=?,summary=?,content=?,source_url=?,published=? WHERE id=?').run(...params,id);
            }
            return json(res,req.method==='POST'?201:200,{message:'Materi tersimpan.',material:{id,...m}});
          }
          if(req.method==='PUT' && path==='/api/admin/settings'){
            const b=await readJson(req);
            const vals={};
            for (const k of ['instagram','facebook','tiktok','youtube','whatsapp','email']) vals[k]=optionalText(b,k,250);
            for(const k of ['instagram','facebook','tiktok','youtube']) if(vals[k] && !validUrl(vals[k]))fail(400,`Tautan ${k} wajib HTTPS.`);
            if(vals.whatsapp){
              const s=vals.whatsapp.replace(/[\s+\-()]/g,'');
              if(!/^(62|0)8\d{7,12}$/.test(s))fail(400,'WhatsApp harus nomor Indonesia yang valid (08... atau 628...).');
              vals.whatsapp=s.startsWith('0')?'62'+s.slice(1):s;
            }
            if(vals.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vals.email))fail(400,'Format email DKC tidak valid.');
            for(const [k,v] of Object.entries(vals))db.prepare('UPDATE settings SET value=? WHERE key=?').run(v,k);
            return json(res,200,{message:'Kontak DKC diperbarui.',settings:settings(db)});
          }
          const statusMatch=path.match(/^\/api\/admin\/registrations\/([a-f0-9-]{36})$/);
          if(req.method==='PUT' && statusMatch){
            const b=await readJson(req);
            if(!['menunggu','diterima','ditolak'].includes(b.status))fail(400,'Status tidak valid.');
            const result=db.prepare('UPDATE registrations SET status=? WHERE id=?').run(b.status,statusMatch[1]);
            if(!result.changes)fail(404,'Pendaftaran tidak ditemukan.');
            return json(res,200,{message:'Status pendaftaran diperbarui.'});
          }
        }
        fail(404,'Endpoint API tidak ditemukan.');
      }
      if(req.method!=='GET' && req.method!=='HEAD')fail(405,'Metode tidak diizinkan.');
      const pathname=path==='/'?'/index.html':path;
      const allowed=pathname==='/index.html'||pathname==='/style.css'||pathname==='/app.js'||/^\/assets\/[a-zA-Z0-9._-]+$/.test(pathname);
      if(!allowed)fail(404,'Halaman tidak ditemukan.');
      const file=resolve(STATIC_ROOT,'.'+pathname);
      if(!file.startsWith(STATIC_ROOT+sep) || !existsSync(file))fail(404,'File tidak ditemukan.');
      const bytes=readFileSync(file);
      const type=TYPES[extname(file)]||'application/octet-stream';
      res.writeHead(200,{'content-type':type,'cache-control':secure?'public, max-age=3600':'no-cache'});
      if(req.method==='HEAD')return res.end();
      return res.end(bytes);
    }catch(e){
      const status=e instanceof AppError?e.status:500;
      if(status===500)console.error('Server error:',e);
      if(res.headersSent){res.end();return;}
      json(res,status,{error:status===500?'Terjadi gangguan server.':e.message});
    }
  });
  return {server,db};
}

if(process.argv[1] && resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
  const port=Number(process.env.PORT||3000);
  const host=process.env.HOST||'127.0.0.1';
  const {server}=createApp();
  server.listen(port,host,()=>console.log(`\nPramuka Toba berjalan di http://${host}:${port}\nTekan Ctrl+C untuk berhenti.\n`));
}
