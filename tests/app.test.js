import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';

async function setup(t) {
  const app = createApp({ databasePath: ':memory:' });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => app.server.close(resolve)));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const client = { cookie: '', csrf: '', base };
  async function req(method, path, body, who = client, sendCsrf = true) {
    const headers = { origin: base };
    if (who.cookie) headers.cookie = who.cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (sendCsrf && who.csrf) headers['x-csrf-token'] = who.csrf;
    const res = await fetch(`${base}${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual'
    });
    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
    const existing = Object.fromEntries((who.cookie || '').split('; ').filter(Boolean).map(s => s.split(/=(.*)/s).slice(0,2)));
    for (const c of setCookies) {
      const pair = c.split(';')[0];
      const [key, val] = pair.split(/=(.*)/s);
      if (val) existing[key] = val; else delete existing[key];
    }
    who.cookie = Object.entries(existing).map(([k,v]) => `${k}=${v}`).join('; ');
    who.csrf = decodeURIComponent(existing.pt_csrf || '');
    return { status: res.status, body: await res.json() };
  }
  await req('GET', '/api/bootstrap');
  return { app, client, req };
}

const user = { name: 'Anggota Contoh', email: 'anggota@example.com', password: 'SandiPramuka123!' };

test('hanya kegiatan terverifikasi yang tampil, tanpa acara mendatang palsu', async t => {
  const { req } = await setup(t);
  const { status, body } = await req('GET', '/api/events');
  assert.equal(status, 200);
  assert.ok(body.events.length >= 1);
  assert.ok(body.events.every(e => e.published && e.related_toba && e.source_url.startsWith('https://')));
  assert.ok(body.events.every(e => e.date < '2026-11-18'));
});

test('buku materi dilindungi login dan registrasi akun aktif', async t => {
  const { req } = await setup(t);
  assert.equal((await req('GET','/api/materials')).status, 401);
  const registered = await req('POST','/api/auth/register',user);
  assert.equal(registered.status, 201);
  assert.equal(registered.body.user.role, 'user');
  const materials = await req('GET','/api/materials');
  assert.equal(materials.status, 200);
  assert.ok(materials.body.materials.length >= 20);
  assert.ok(materials.body.materials.some(x=>x.category==='Garuda'));
  assert.equal((await req('GET','/api/admin/overview')).status,403);
});

test('CSRF wajib untuk operasi tulis dan tidak boleh daftar kegiatan lampau', async t => {
  const { req, client } = await setup(t);
  assert.equal((await req('POST','/api/auth/register',user,client,false)).status, 403);
  assert.equal((await req('POST','/api/auth/register',user)).status, 201);
  const events = (await req('GET','/api/events')).body.events;
  assert.equal((await req('POST',`/api/events/${events[0].id}/register`,{})).status, 409);
});

test('admin membuat kegiatan nyata dan pengguna dapat mendaftar tepat sekali', async t => {
  const { req, app, client, } = await setup(t);
  await req('POST','/api/auth/register',user);
  app.db.prepare("UPDATE users SET role='admin' WHERE email=?").run(user.email);
  const activity = {
    title:'Perkemahan Uji Integrasi', scope:'Toba', date:'2099-08-14', time:'08:00',
    location:'Balige, Kabupaten Toba', organizer:'Panitia Uji', description:'Contoh data uji otomatis',
    source_url:'https://example.org/agenda', related_toba:true, published:true,
    registration_open:true, capacity:1
  };
  const created = await req('POST','/api/admin/events',activity);
  assert.equal(created.status,201);
  const eventId = created.body.event.id;
  assert.equal((await req('GET',`/api/events/${eventId}`)).status,200);
  // A new normal user registers in the published event.
  await req('POST','/api/auth/logout',{});
  await req('POST','/api/auth/register',{name:'Peserta Dua',email:'dua@example.com',password:'Sandi12345!'});
  assert.equal((await req('POST',`/api/events/${eventId}/register`,{})).status,201);
  assert.equal((await req('POST',`/api/events/${eventId}/register`,{})).status,409);
  const registrations = (await req('GET','/api/me')).body.registrations;
  assert.equal(registrations.length,1);
  assert.equal(registrations[0].status,'menunggu');
  // Further users cannot exceed event capacity.
  await req('POST','/api/auth/logout',{});
  await req('POST','/api/auth/register',{name:'Peserta Tiga',email:'tiga@example.com',password:'Sandi12345!'});
  assert.equal((await req('POST',`/api/events/${eventId}/register`,{})).status,409);
});

test('admin tidak dapat menerbitkan acara tanpa sumber publik valid', async t => {
  const { req, app } = await setup(t);
  await req('POST','/api/auth/register',user);
  app.db.prepare("UPDATE users SET role='admin' WHERE email=?").run(user.email);
  const result=await req('POST','/api/admin/events',{
    title:'Tanpa Bukti',scope:'Nasional',date:'2099-02-01',location:'Toba',organizer:'Panitia',
    description:'Agenda tanpa referensi',source_url:'',related_toba:true,published:true,
    registration_open:true
  });
  assert.equal(result.status,400);
});

test('kontak DKC awal kosong, tidak pernah mengarang nomor atau akun sosial', async t => {
  const { req } = await setup(t);
  const { body } = await req('GET','/api/bootstrap');
  assert.equal(body.settings.whatsapp, '');
  assert.equal(body.settings.instagram, '');
});

test('halaman utama dan aset frontend tersedia dari server', async t => {
  const { client } = await setup(t);
  for (const [path,expected] of [['/','text/html'],['/style.css','text/css'],['/app.js','text/javascript'],['/assets/tunas-kelapa.svg','image/svg+xml'],['/assets/hero-toba.svg','image/svg+xml']]) {
    const response = await fetch(client.base+path);
    assert.equal(response.status,200,path);
    assert.ok((response.headers.get('content-type')||'').includes(expected),path);
    assert.ok((await response.text()).length>100,path);
  }
});

test('logout benar-benar mematikan sesi dan akses materi',async t=>{
  const { req }=await setup(t);
  assert.equal((await req('POST','/api/auth/register',user)).status,201);
  assert.equal((await req('GET','/api/materials')).status,200);
  assert.equal((await req('POST','/api/auth/logout',{})).status,200);
  assert.equal((await req('GET','/api/materials')).status,401);
  assert.equal((await req('POST','/api/auth/login',{email:user.email,password:user.password})).status,200);
  assert.equal((await req('GET','/api/materials')).status,200);
});

test('admin dapat menyimpan nomor WA, dan materi baru tidak dipublikasikan ketika draft',async t=>{
  const { req,app }=await setup(t);
  await req('POST','/api/auth/register',user);
  app.db.prepare("UPDATE users SET role='admin' WHERE email=?").run(user.email);
  const dkc=await req('PUT','/api/admin/settings',{instagram:'https://instagram.com/dkc_toba_cont0h',facebook:'',tiktok:'',youtube:'',email:'',whatsapp:'081234567890'});
  assert.equal(dkc.status,200);
  assert.equal((await req('GET','/api/bootstrap')).body.settings.whatsapp,'6281234567890');
  const material=await req('POST','/api/admin/materials',{
    category:'Penegak',title:'Materi Baru',summary:'Ringkasan latihan contoh',content:'Isi uji yang tidak terbit',source_url:'https://pramuka.or.id/peraturan/',published:false
  });
  assert.equal(material.status,201);
  assert.ok(!(await req('GET','/api/materials')).body.materials.some(m=>m.title==='Materi Baru'));
});
