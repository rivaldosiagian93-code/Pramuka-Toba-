const app = document.querySelector('#app');
const state = {
  user:null,events:[],settings:{},materialsCount:0,materials:[],registrations:[],
  filter:'semua',scope:'Semua',query:'',bookCategory:'Semua',bookQuery:'',
  adminTab:'kegiatan',adminData:null
};
const CATEGORY=['Semua','Umum','Siaga','Penggalang','Penegak','Pandega','Garuda'];
const ICONS={Umum:'✦',Siaga:'◎',Penggalang:'⌁',Penegak:'⚑',Pandega:'✧',Garuda:'★'};
let toastTimeout;
const h=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function href(url){try{const u=new URL(url);return u.protocol==='https:'?h(u.href):'#';}catch{return '#';}}
const safeText=(text)=>h(text).replace(/\n/g,'<br>');
function csrf(){const p=document.cookie.split('; ').find(x=>x.startsWith('pt_csrf='));return p?decodeURIComponent(p.slice('pt_csrf='.length)):'';}
async function api(path,{method='GET',body}={}){
  const opts={method,credentials:'same-origin',headers:{accept:'application/json'}};
  if(method!=='GET'){opts.headers['content-type']='application/json';opts.headers['x-csrf-token']=csrf();opts.body=JSON.stringify(body??{});}
  let res;
  try{res=await fetch(path,opts);}catch{throw new Error('Tidak bisa menghubungi server. Periksa koneksi dan jalankan npm start.');}
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||`Permintaan gagal (${res.status}).`);
  return data;
}
function toast(msg,isError=false){
  const el=document.querySelector('#toast');if(!el)return;
  el.textContent=msg;el.className='toast show'+(isError?' error':'');
  clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.className='toast',4100);
}
function go(page){const hash='#'+page;if(location.hash===hash)render();else location.hash=hash;}
function todayJakarta(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;}
const upcoming=e=>e.date>=todayJakarta();
const openReg=e=>upcoming(e)&&Boolean(e.registration_open);
function dateId(date){if(!date)return '-';return new Date(`${date}T12:00:00`).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});}
function shortDate(date){return new Date(`${date}T12:00:00`).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});}
function bannerHead(title,description,crumb){
  return `<div class="page-hero"><div class="container"><div class="crumbs"><a href="#beranda">Beranda</a><span>›</span><span>${h(crumb||title)}</span></div><span class="eyebrow">PRAMUKA TOBA</span><h1>${title}</h1><p>${description}</p></div></div>`;
}
function loaderHide(){const el=document.querySelector('#loading-screen');window.setTimeout(()=>el?.classList.add('done'),500);}
function updateNav(){
  const el=document.querySelector('#nav-auth');
  if(!el)return;
  el.innerHTML=state.user?`<a href="#akun" class="nav-user">${h(state.user.name.split(' ')[0])}</a>${state.user.role==='admin'?'<a href="#admin" class="nav-user">Admin</a>':''}<button type="button" class="logout" data-action="logout">Keluar</button>`:
    '<a class="nav-login" href="#login">Masuk / Daftar <span aria-hidden="true">↗</span></a>';
  const key=location.hash.replace(/^#/,'').split(/[/?]/)[0]||'beranda';
  document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===key));
  document.querySelector('#main-nav')?.classList.remove('open');
  document.querySelector('#menu-toggle')?.setAttribute('aria-expanded','false');
}
function eventArt(e){return `<div class="event-art scope-${h(e.scope)}"><span class="pill">${h(e.scope==='Toba'?'KABUPATEN TOBA':e.scope==='Sumut'?'KWARDA SUMUT':'NASIONAL')}</span><span class="event-art-label">${h(e.scope==='Toba'?'Toba.':e.scope==='Sumut'?'Sumatera Utara.':'Indonesia.')}</span></div>`;}
function eventCard(e){
  return `<article class="event-card">${eventArt(e)}<div class="event-body"><div class="event-date">${h(shortDate(e.date))}${e.time?' · '+h(e.time)+' WIB':''}</div><h3>${h(e.title)}</h3><p class="event-desc">${h(e.description)}</p><div class="event-meta"><span aria-hidden="true">⌖</span>${h(e.location)}</div><div class="event-card-bottom"><span class="pill ${upcoming(e)?'pill-gold':'pill-grey'}">${upcoming(e)?'Mendatang':'Sudah berlalu'}</span><a class="link-inline" href="#acara/${h(e.id)}">Detail ↗</a></div></div></article>`;
}
function empty(text,title='Belum ada kegiatan terverifikasi'){return `<div class="empty"><div class="empty-icon">✧</div><h3>${h(title)}</h3><p>${h(text)}</p></div>`;}
function gridOrEmpty(list,text){return list.length?`<div class="cards">${list.map(eventCard).join('')}</div>`:empty(text);}
function home(){
  const upcomingEvents=state.events.filter(upcoming).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
  const past=state.events.filter(e=>!upcoming(e)).slice(0,3);
  return `<div class="container hero-section"><div class="hero">
      <div class="hero-copy"><span class="eyebrow">SATYAKU KUDARMAKAN, DARMAKU KUBAKTIKAN</span>
        <h1>Satu semangat.<br><em>Banyak cerita</em><br>Pramuka Toba.</h1>
        <p>Temukan informasi kegiatan, jalin kebersamaan, dan terus belajar kepramukaan. Dari Kabupaten Toba, untuk generasi yang siap mengabdi.</p>
        <div class="hero-actions"><a href="#kegiatan" class="button gold">Jelajahi Kegiatan <span aria-hidden="true">↗</span></a><a href="#buku" class="button outline">Buku Pramuka <span aria-hidden="true">→</span></a></div>
      </div><div class="hero-illustration"><img src="/assets/hero-toba.svg" alt="Ilustrasi alam pegunungan dan danau di kawasan Toba dengan tenda perkemahan" /><div class="hero-caption">Semangat kepramukaan dari Toba</div></div></div>
    <div class="stat-strip"><div class="stat"><span class="stat-icon">✦</span><div><b>${state.events.length}</b><span>Publikasi kegiatan bersumber</span></div></div>
      <div class="stat"><span class="stat-icon">▤</span><div><b>${state.materialsCount}+</b><span>Topik pembelajaran awal</span></div></div>
      <div class="stat"><span class="stat-icon">◎</span><div><b>3 cakupan</b><span>Toba, Sumut, dan Nasional</span></div></div></div>
    </div>
    <section class="section container"><div class="section-head"><div><span class="eyebrow">AGENDA KE DEPAN</span><h2 class="section-title">Kegiatan yang akan datang</h2><p class="section-subtitle">Pendaftaran dibuka setelah informasi acara diterbitkan dan dikonfirmasi oleh pengelola.</p></div><a class="link-inline" href="#kegiatan">Semua kegiatan ↗</a></div>
       ${gridOrEmpty(upcomingEvents,'Belum ada agenda mendatang yang diumumkan melalui portal ini. Pengelola akan menerbitkan kegiatan setelah informasi dan tautan sumber diperiksa.')}</section>
    <section class="value-section"><div class="container"><div class="section-head"><div><span class="eyebrow">DI SINI KITA BERTUMBUH</span><h2 class="section-title">Belajar. Berkarya. Mengabdi.</h2><p class="section-subtitle">Ruang digital untuk menyatukan informasi kegiatan dan pembelajaran yang bermanfaat.</p></div></div>
      <div class="values"><div class="value-card"><div class="value-number">01</div><h3>Informasi yang dapat ditelusuri</h3><p>Setiap agenda publik perlu mencantumkan sumber yang bisa diperiksa kembali.</p></div><div class="value-card"><div class="value-number">02</div><h3>Belajar sesuai golongan</h3><p>Mulai dari Siaga hingga Pandega, serta materi pengenalan kecakapan Garuda.</p></div><div class="value-card"><div class="value-number">03</div><h3>Koneksi dengan kegiatan</h3><p>Pendaftar bisa mengirimkan keikutsertaan dan memantau statusnya melalui akun.</p></div></div></div></section>
    <section class="section container"><div class="section-head"><div><span class="eyebrow">CERITA KEGIATAN</span><h2 class="section-title">Jejak kegiatan terdahulu</h2><p class="section-subtitle">Dokumentasi informasi kegiatan yang sudah berlangsung dan memiliki rujukan publik.</p></div><a class="link-inline" href="#kegiatan">Lihat arsip ↗</a></div>${gridOrEmpty(past,'Belum ada kegiatan lampau yang tersedia.')}</section>
    <section class="container" style="padding-bottom:40px"><div class="feature-banner"><div><span class="eyebrow">RUANG BELAJAR</span><h2>Bekal kepramukaan, kapan pun kamu ingin belajar.</h2><p>Materi ringkas dari nilai dasar, keterampilan, kepemimpinan, sampai pengabdian.</p></div><a href="#buku" class="button gold">Buka Buku Pramuka ↗</a></div></section>
    <section class="container" style="padding:12px 0 45px"><div class="notice">Portal ini merupakan prototipe komunitas, bukan kanal resmi Kwarcab Toba. Untuk setiap kegiatan, pastikan kembali informasi pada tautan sumber atau panitia yang berwenang.</div></section>`;
}
function eventsPage(){
  const filtered=state.events.filter(e=>
    (state.filter==='semua'||(state.filter==='mendatang'?upcoming(e):!upcoming(e)))&&
    (state.scope==='Semua'||e.scope===state.scope)&&
    (e.title+' '+e.description+' '+e.location).toLowerCase().includes(state.query.toLowerCase()));
  return `${bannerHead('Jelajahi kegiatan Pramuka','Informasi kegiatan Kabupaten Toba, Kwarda Sumatera Utara, dan acara nasional yang memiliki kaitan dengan Toba.','Kegiatan')}
    <section class="section container" style="padding-top:15px"><div class="filters"><div class="segmented" role="group" aria-label="Filter waktu">
       ${[['semua','Semua'],['mendatang','Mendatang'],['selesai','Selesai']].map(([v,t])=>`<button type="button" data-filter="${v}" class="${state.filter===v?'selected':''}">${t}</button>`).join('')}</div>
       <select class="select filter-select" id="scope-filter" aria-label="Filter cakupan">${['Semua','Toba','Sumut','Nasional'].map(x=>`<option value="${h(x)}" ${x===state.scope?'selected':''}>${x==='Semua'?'Semua cakupan':x==='Sumut'?'Kwarda Sumut':x}</option>`).join('')}</select>
       <label class="search"><span>⌕</span><input class="text-input" id="event-search" placeholder="Cari kegiatan..." value="${h(state.query)}" aria-label="Cari kegiatan" /></label></div>
       <div id="event-results">${gridOrEmpty(filtered,'Tidak ada kegiatan yang cocok dengan filter. Coba kata kunci atau cakupan lain.','Kegiatan tidak ditemukan')}</div>
       <div class="notice" style="margin-top:22px">Kegiatan tingkat Kwarda atau nasional hanya layak dimasukkan jika relevansinya untuk Toba dapat dijelaskan. Tautan sumber tersedia di halaman detail.</div>
    </section>`;
}
async function eventDetail(id){
  const e=state.events.find(x=>x.id===id);
  if(!e)return notFound('Kegiatan tidak ditemukan');
  const mine=state.registrations.find(x=>x.event_id===id);
  return `${bannerHead('Detail kegiatan','Informasi acara, penyelenggara, sumber rujukan, dan pendaftaran jika tersedia.','Detail kegiatan')}
    <section class="container" style="padding:0 0 60px"><div class="detail-layout"><article class="paper detail-main">${eventArt(e)}
      <span class="pill ${upcoming(e)?'pill-gold':'pill-grey'}">${upcoming(e)?'Agenda mendatang':'Telah berlangsung'}</span>
      <h1>${h(e.title)}</h1><h2 style="font-size:20px">Tentang kegiatan</h2><p class="detail-paragraph">${safeText(e.description)}</p>
      <h3 style="font-size:16px;margin:27px 0 12px">Sumber informasi</h3><p style="font-size:13px;color:var(--muted)">Informasi ditulis ulang secara ringkas berdasarkan publikasi yang dicantumkan. Untuk ketentuan resmi, hubungi penyelenggara.</p><a class="source-link" href="${href(e.source_url)}" target="_blank" rel="noopener noreferrer">Periksa informasi pada sumber ↗</a>
      </article><aside class="paper detail-side"><h2 style="font-size:21px;margin-bottom:6px">Informasi acara</h2><div class="facts"><div class="fact"><small>Hari / tanggal</small><b>${h(dateId(e.date))}</b></div>
      <div class="fact"><small>Waktu</small><b>${e.time?h(e.time)+' WIB':'Tidak dicantumkan pada sumber'}</b></div><div class="fact"><small>Tempat</small><b>${h(e.location)}</b></div>
      <div class="fact"><small>Pelaksana / organisasi</small><b>${h(e.organizer)}</b></div><div class="fact"><small>Cakupan</small><b>${h(e.scope)}</b></div></div>
      ${mine?`<div class="notice green">Kamu sudah mendaftar. Status: <strong>${h(mine.status)}</strong>.</div><a class="button full" href="#akun" style="margin-top:14px">Lihat Pendaftaran Saya ↗</a>`:
      openReg(e)?`<button type="button" class="button full gold" data-action="register-event" data-id="${h(e.id)}">Daftar Kegiatan ↗</button><p class="hint" style="margin-top:12px">Kamu akan diminta login terlebih dahulu bila belum punya sesi.</p>`:
      `<div class="notice">${upcoming(e)?'Pendaftaran belum dibuka atau tidak menggunakan formulir portal ini.':'Kegiatan sudah berlalu. Pendaftaran tidak tersedia.'}</div>`}
      </aside></div></section>`;
}
function dkcPage(){
  const contacts=[['instagram','Instagram','IG','Lihat akun Instagram'],['facebook','Facebook','f','Lihat halaman Facebook'],['tiktok','TikTok','♪','Lihat akun TikTok'],['youtube','YouTube','▶','Lihat kanal YouTube'],['whatsapp','WhatsApp','WA','Hubungi via WhatsApp'],['email','Email','@','Kirim email']];
  return `${bannerHead('DKC Toba','Ruang untuk menemukan informasi Dewan Kerja Cabang dan kanal komunikasi yang telah dikonfirmasi pengelola.','DKC')}
    <section class="container" style="padding-bottom:68px"><div class="dkc-intro"><div><span class="eyebrow" style="color:#f6d287">MENGENAL DKC</span><h2>Dewan Kerja Cabang Toba</h2><p>Dewan Kerja merupakan wadah pembinaan Pramuka Penegak dan Pandega. Bagian ini disiapkan untuk tautan media sosial serta kontak yang dikonfirmasi oleh pengurus DKC Toba.</p></div><div class="dkc-emblem"><img src="/assets/tunas-kelapa.svg" alt="Lambang tunas kelapa" /><strong>PRAMUKA TOBA</strong><div style="font-size:11px;margin-top:8px">Terhubung • Berkolaborasi • Mengabdi</div></div></div>
      <div class="section-head"><div><span class="eyebrow">TERHUBUNG</span><h2 class="section-title">Media sosial dan kontak</h2><p class="section-subtitle">Tombol kontak hanya aktif jika alamatnya sudah dimasukkan oleh admin.</p></div></div>
      <div class="contact-grid">${contacts.map(([key,title,icon,action])=>{
        const value=state.settings[key]||'';
        const target=key==='whatsapp'?`https://wa.me/${encodeURIComponent(value)}`:key==='email'?`mailto:${encodeURIComponent(value)}`:value;
        return `<div class="contact-card"><div class="contact-icon">${icon}</div><h3>${title}</h3><p>${value?(key==='whatsapp'?('+'+h(value)):key==='email'?h(value):'Kanal komunikasi terdaftar'):'Belum dikonfirmasi oleh pengelola.'}</p>${value?`<a href="${key==='email'?h(target):href(target)}" ${key==='email'?'':'target="_blank" rel="noopener noreferrer"'}>${action} ↗</a>`:'<span class="unavailable">Belum tersedia</span>'}</div>`;
      }).join('')}</div><div class="notice" style="margin-top:25px">Identitas akun dan nomor WhatsApp tidak diisi secara otomatis agar tidak mengarahkan pengunjung ke orang yang salah. Admin dapat mengisinya dari Panel Admin setelah mendapat konfirmasi pengurus.</div></section>`;
}
function authPage(register=false){
  const target=new URLSearchParams((location.hash.split('?')[1]||'')).get('next')||'akun';
  const nextParam='?next='+encodeURIComponent(target);
  return `<div class="auth-section"><section class="auth-card"><div class="auth-icon"><img src="/assets/tunas-kelapa.svg" alt="" /></div>
    <span class="eyebrow">AKUN PRAMUKA TOBA</span><h1>${register?'Buat akun baru':'Selamat datang kembali'}</h1>
    <p>${register?'Daftar untuk membaca materi dan mengirim pendaftaran kegiatan.':'Masuk untuk membuka Buku Pramuka dan mengelola pendaftaran kegiatanmu.'}</p>
    <form id="auth-form" class="form" data-action="${register?'signup':'signin'}" data-next="${h(target)}">
     ${register?'<div class="form-field"><label for="full-name">Nama lengkap</label><input id="full-name" name="name" class="text-input" autocomplete="name" maxlength="90" required placeholder="Nama sesuai identitas" /></div>':''}
     <div class="form-field"><label for="login-email">Alamat email</label><input id="login-email" type="email" name="email" class="text-input" autocomplete="email" maxlength="160" required placeholder="contoh@email.com" /></div>
     <div class="form-field"><label for="login-password">Password</label><input id="login-password" type="password" name="password" class="text-input" autocomplete="${register?'new-password':'current-password'}" minlength="${register?'10':'1'}" maxlength="128" required placeholder="${register?'Minimal 10 karakter':'Masukkan password'}" /></div>
     ${register?'<div class="notice blue">Untuk prototipe, gunakan akun pengelola atau pengguna dewasa. Akun peserta anak memerlukan kebijakan privasi dan mekanisme persetujuan wali sebelum website dibuka ke publik.</div>':''}
     <button class="button full" type="submit">${register?'Daftar & Masuk':'Masuk ke Akun'} <span aria-hidden="true">→</span></button><p class="error-message" id="auth-error" role="alert"></p>
    </form>
    <div class="form-end">${register?'Sudah punya akun?':'Belum punya akun?'} <a href="#${register?'login':'daftar'}${h(nextParam)}">${register?'Masuk di sini':'Daftar sekarang'}</a></div>
    <p class="form-note" style="margin:21px 0 0">Password disimpan dalam bentuk hash di server. Prototipe ini belum menyediakan verifikasi email atau pemulihan password otomatis.</p>
    </section></div>`;
}
async function ensureMaterials(){if(!state.materials.length){const x=await api('/api/materials');state.materials=x.materials;}}
async function bookPage(){
  if(!state.user){go('login?next=buku');return '';}
  await ensureMaterials();
  const list=state.materials.filter(m=>(state.bookCategory==='Semua'||m.category===state.bookCategory)&&
    (m.title+' '+m.summary).toLowerCase().includes(state.bookQuery.toLowerCase()));
  return `${bannerHead('Buku Pramuka Digital','Materi pengantar kepramukaan yang disusun menurut golongan, dengan tautan rujukan resmi untuk pendalaman.','Buku Pramuka')}
    <section class="container" style="padding-bottom:65px"><div class="notice green" style="margin-bottom:23px">Garuda adalah jenjang penghargaan kecakapan yang dapat dicapai di masing-masing golongan, bukan golongan usia tersendiri. Materi di sini berupa ringkasan awal, bukan pengganti buku SKU/SKK resmi.</div>
      <div class="library-tabs">${CATEGORY.map(x=>`<button class="category-btn ${state.bookCategory===x?'active':''}" type="button" data-category="${h(x)}">${h(x)}</button>`).join('')}</div>
      <div class="filters"><label class="search"><span>⌕</span><input class="text-input" id="material-search" value="${h(state.bookQuery)}" placeholder="Cari materi pembelajaran..." aria-label="Cari materi" /></label><span class="small subtle">${list.length} materi ditemukan</span></div>
      <div id="material-results">${materialCards(list)}</div></section>`;
}
function materialCards(list){return list.length?`<div class="cards">${list.map(m=>`<article class="material-card"><div class="material-icon">${ICONS[m.category]||'✦'}</div><span class="pill" style="align-self:start;margin-bottom:13px">${h(m.category)}</span><h3>${h(m.title)}</h3><p>${h(m.summary)}</p><a href="#materi/${h(m.id)}">Baca materi ↗</a></article>`).join('')}</div>`:empty('Materi tidak ditemukan. Ubah kata kunci atau pilih golongan lain.','Tidak ada materi yang cocok');}
async function materialDetail(id){
  if(!state.user){go('login?next=buku');return '';}
  let material;
  try{material=(await api(`/api/materials/${encodeURIComponent(id)}`)).material;}catch{return notFound('Materi tidak ditemukan');}
  return `${bannerHead('Ruang belajar','Pelajari materi ringkas dan lanjutkan pendalaman menggunakan pedoman kepramukaan resmi.','Materi')}
    <article class="container reader"><div class="paper"><a class="link-inline" href="#buku">← Kembali ke Buku Pramuka</a><div style="margin-top:25px"><span class="pill">${h(material.category)}</span></div>
      <h1>${h(material.title)}</h1><p class="section-subtitle">${h(material.summary)}</p><div class="reader-text">${material.content.split(/\n+/).filter(Boolean).map(p=>`<p>${h(p)}</p>`).join('')}</div>
      ${material.source_url?`<div class="source"><span class="data-label">Rujukan utama</span><a class="source-link" href="${href(material.source_url)}" rel="noopener noreferrer" target="_blank">Buka dokumen atau laman referensi resmi ↗</a></div>`:''}
      <div class="notice" style="margin-top:23px">Gunakan pembinaan dan petunjuk resmi yang masih berlaku ketika melaksanakan praktik atau menempuh syarat kecakapan. Materi ini merupakan pengantar, bukan salinan buku resmi.</div></div></article>`;
}
async function accountPage(){
  if(!state.user){go('login?next=akun');return '';}
  const data=await api('/api/me');state.user=data.user;state.registrations=data.registrations;
  return `${bannerHead('Akun Saya','Lihat identitas akun dan pantau status pendaftaran kegiatan yang kamu kirimkan.','Akun Saya')}
    <section class="container" style="padding-bottom:60px"><div class="account-grid"><div class="profile-card"><div class="avatar">${h((state.user.name||'P')[0].toUpperCase())}</div><span class="pill pill-gold">${state.user.role==='admin'?'Administrator':'Anggota Terdaftar'}</span>
      <h2>${h(state.user.name)}</h2><p>${h(state.user.email)}</p>${state.user.role==='admin'?'<a href="#admin" class="button gold sm">Buka Panel Admin ↗</a>':''}</div>
      <div class="paper"><h2 style="font-size:24px">Pendaftaran kegiatan saya</h2><p class="section-subtitle" style="margin-bottom:24px">Status pendaftaran akan diperbarui setelah pengelola memeriksa data.</p>
      ${data.registrations.length?`<div class="reg-list">${data.registrations.map(r=>`<div class="reg-item"><div><a class="link-inline" href="#acara/${h(r.event_id)}">${h(r.title)}</a><p>${h(dateId(r.date))} • ${h(r.location)}</p></div><span class="pill ${r.status==='diterima'?'':r.status==='ditolak'?'pill-red':'pill-gold'}">${h(r.status)}</span></div>`).join('')}</div>`:
        empty('Kamu belum mendaftar kegiatan. Cari kegiatan yang membuka pendaftaran dan kirim formulirnya.','Belum ada pendaftaran')}
      <div style="margin-top:23px"><a href="#kegiatan" class="button outline sm">Cari kegiatan ↗</a></div></div></div></section>`;
}
function adminSidebar(){return [['kegiatan','Kelola Kegiatan'],['pendaftar','Data Pendaftar'],['materi','Materi Buku'],['kontak','Kontak DKC']].map(([key,label])=>`<button type="button" data-admin-tab="${key}" class="${state.adminTab===key?'active':''}">${label}</button>`).join('');}
function adminEventsView(d){
  return `<div class="paper"><span class="eyebrow">PENGELOLAAN AGENDA</span><h2>Tambah atau edit kegiatan</h2><p class="subtitle">Kegiatan hanya tampil publik jika diterbitkan, relevan dengan Toba, dan mempunyai tautan sumber HTTPS.</p>
   <form id="event-form" class="form" data-action="save-event"><input type="hidden" name="id" />
     <div class="form-grid"><div class="form-field wide"><label>Nama kegiatan *</label><input class="text-input" name="title" maxlength="140" required placeholder="Nama kegiatan yang terverifikasi" /></div>
     <div class="form-field"><label>Cakupan *</label><select class="select" name="scope"><option>Toba</option><option>Sumut</option><option>Nasional</option></select></div>
     <div class="form-field"><label>Pelaksana / organisasi *</label><input class="text-input" name="organizer" maxlength="120" required placeholder="Penyelenggara" /></div>
     <div class="form-field"><label>Tanggal *</label><input class="text-input" type="date" name="date" required /></div>
     <div class="form-field"><label>Jam (jika diketahui, WIB)</label><input class="text-input" type="time" name="time" /></div>
     <div class="form-field wide"><label>Tempat kegiatan *</label><input class="text-input" name="location" maxlength="140" required placeholder="Tempat yang benar" /></div>
     <div class="form-field wide"><label>Deskripsi *</label><textarea class="textarea" name="description" maxlength="4000" required placeholder="Rincian yang diperiksa, siapa yang dapat ikut, persyaratan"></textarea></div>
     <div class="form-field wide"><label>URL sumber (HTTPS) *</label><input type="url" class="text-input" name="source_url" maxlength="700" placeholder="https://sumber-pengumuman-resmi..." /></div>
     <div class="form-field"><label>Kapasitas (opsional)</label><input class="text-input" type="number" name="capacity" min="1" max="100000" placeholder="Tanpa batas jika kosong" /></div>
     <div class="form-field"><label>Opsi publikasi</label><div style="display:grid;gap:6px;margin-top:5px"><label class="checkbox-line"><input type="checkbox" name="related_toba" checked /> Relevan untuk Toba</label><label class="checkbox-line"><input type="checkbox" name="published" /> Terbitkan ke publik</label><label class="checkbox-line"><input type="checkbox" name="registration_open" /> Buka pendaftaran</label></div></div>
     <div class="wide"><div class="notice">Periksa tanggal, lokasi, syarat keikutsertaan, dan relevansi Toba secara manual sebelum menerbitkan. Website tidak memverifikasi kebenaran isi tautan secara otomatis.</div></div>
     <div class="wide" style="display:flex;gap:10px;flex-wrap:wrap"><button class="button" type="submit">Simpan kegiatan</button><button class="button outline" type="button" data-action="reset-event">Form baru</button></div></div>
   </form><hr style="border:0;border-top:1px solid var(--line);margin:28px 0 21px"/><h2>Daftar kegiatan</h2><div class="admin-list">${d.events.map(e=>`<div class="admin-list-item"><div><b>${h(e.title)}</b><p>${h(shortDate(e.date))} · ${h(e.scope)} · ${e.published?'Terbit':'Draf'} · ${e.registration_open?'Pendaftaran aktif':'Pendaftaran tutup'}</p></div><button class="button ghost sm" data-edit-event="${h(e.id)}" type="button">Edit</button></div>`).join('')}</div>
  </div>`;
}
function adminRegsView(d){
  return `<div class="paper"><span class="eyebrow">KEIKUTSERTAAN</span><h2>Data pendaftar kegiatan</h2><p class="subtitle">Admin dapat memeriksa dan memperbarui status pendaftaran.</p>
    <div class="admin-summary"><div><b>${d.registrations.length}</b><span>Total pendaftaran</span></div><div><b>${d.registrations.filter(r=>r.status==='menunggu').length}</b><span>Menunggu</span></div><div><b>${d.registrations.filter(r=>r.status==='diterima').length}</b><span>Diterima</span></div></div>
    ${d.registrations.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Nama</th><th>Kegiatan</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
      ${d.registrations.map(r=>`<tr><td><strong>${h(r.name)}</strong><br>${h(r.email)}</td><td>${h(r.event_title)}</td><td>${h(shortDate(r.date))}</td><td><select class="select" id="reg-${h(r.id)}"><option value="menunggu" ${r.status==='menunggu'?'selected':''}>Menunggu</option><option value="diterima" ${r.status==='diterima'?'selected':''}>Diterima</option><option value="ditolak" ${r.status==='ditolak'?'selected':''}>Ditolak</option></select></td><td><button type="button" data-save-reg="${h(r.id)}">Simpan</button></td></tr>`).join('')}
      </tbody></table></div>`:empty('Belum ada peserta yang mendaftar melalui website.','Belum ada pendaftar')}
    </div>`;
}
function adminMaterialsView(d){
  return `<div class="paper"><span class="eyebrow">PERPUSTAKAAN DIGITAL</span><h2>Tambah atau edit materi</h2><p class="subtitle">Materi dapat disimpan sebagai draf atau langsung diterbitkan untuk pengguna yang login.</p>
   <form class="form" id="material-form" data-action="save-material"><input type="hidden" name="id" />
      <div class="form-grid"><div class="form-field"><label>Golongan / kategori *</label><select name="category" class="select">${CATEGORY.slice(1).map(x=>`<option value="${h(x)}">${h(x)}</option>`).join('')}</select></div><div class="form-field"><label>Judul *</label><input class="text-input" name="title" maxlength="140" required /></div>
      <div class="form-field wide"><label>Ringkasan *</label><input class="text-input" name="summary" maxlength="360" required /></div>
      <div class="form-field wide"><label>Isi materi *</label><textarea class="textarea" name="content" maxlength="12000" rows="8" required placeholder="Pisahkan paragraf dengan Enter"></textarea></div>
      <div class="form-field wide"><label>URL rujukan HTTPS</label><input class="text-input" type="url" name="source_url" maxlength="700" placeholder="https://pramuka.or.id/peraturan/" /></div>
      <div class="wide"><label class="checkbox-line"><input type="checkbox" name="published" checked /> Terbitkan materi</label></div>
      <div class="wide" style="display:flex;gap:10px;flex-wrap:wrap"><button type="submit" class="button">Simpan materi</button><button type="button" class="button outline" data-action="reset-material">Form baru</button></div></div></form>
      <hr style="border:0;border-top:1px solid var(--line);margin:28px 0 21px"/><h2>Daftar materi (${d.materials.length})</h2><div class="admin-list">${d.materials.map(m=>`<div class="admin-list-item"><div><b>${h(m.title)}</b><p>${h(m.category)} · ${m.published?'Terbit':'Draf'}</p></div><button type="button" class="button ghost sm" data-edit-material="${h(m.id)}">Edit</button></div>`).join('')}</div>
    </div>`;
}
function adminContactsView(d){
  return `<div class="paper"><span class="eyebrow">KANAL KOMUNIKASI</span><h2>Kontak DKC Toba</h2><p class="subtitle">Isi hanya akun atau nomor yang sudah diverifikasi oleh pengurus. Kolom yang kosong tidak akan menampilkan tautan aktif.</p>
    <form class="form" data-action="save-settings" id="contacts-form"><div class="form-grid">${[
      ['instagram','Instagram (URL)','https://instagram.com/...'],['facebook','Facebook (URL)','https://facebook.com/...'],
      ['tiktok','TikTok (URL)','https://tiktok.com/@...'],['youtube','YouTube (URL)','https://youtube.com/...'],
      ['whatsapp','WhatsApp','628xxxxxxxxxx'],['email','Email DKC','email@contoh.id']].map(([k,title,placeholder])=>`<div class="form-field"><label>${title}</label><input class="text-input" name="${k}" value="${h(d.settings[k]||'')}" placeholder="${h(placeholder)}" /></div>`).join('')}</div>
      <button type="submit" class="button">Simpan kontak</button></form><div class="notice" style="margin-top:20px">Jangan memasukkan nomor pribadi tanpa izin pemilik. Tombol WhatsApp akan membuka chat langsung ke nomor yang kamu atur.</div></div>`;
}
async function adminPage(){
  if(!state.user){go('login?next=admin');return '';}
  if(state.user.role!=='admin')return notFound('Akses hanya untuk administrator');
  state.adminData=await api('/api/admin/overview');
  const d=state.adminData;
  const page=state.adminTab==='kegiatan'?adminEventsView(d):state.adminTab==='pendaftar'?adminRegsView(d):state.adminTab==='materi'?adminMaterialsView(d):adminContactsView(d);
  return `${bannerHead('Panel Admin','Kelola konten kegiatan, pendaftar, buku Pramuka, dan kontak DKC di satu tempat.','Admin')}
    <section class="container" style="padding-bottom:60px"><div class="admin-layout"><aside class="admin-tabs">${adminSidebar()}</aside><div class="admin-content">${page}</div></div></section>`;
}
function notFound(title='Halaman tidak ditemukan'){
  return `${bannerHead(title,'Alamat yang kamu buka tidak tersedia atau belum diizinkan untuk akun ini.','Tidak ditemukan')}<div class="container" style="padding:0 0 120px"><a class="button" href="#beranda">← Kembali ke Beranda</a></div>`;
}
async function render(){
  updateNav();
  const raw=location.hash.replace(/^#/,'')||'beranda';
  const route=raw.split('?')[0];
  const [page,id]=route.split('/');
  try{
    let html='';
    switch(page){
      case 'beranda':html=home();break;
      case 'kegiatan':html=eventsPage();break;
      case 'acara':html=await eventDetail(id);break;
      case 'dkc':html=dkcPage();break;
      case 'buku':html=await bookPage();break;
      case 'materi':html=await materialDetail(id);break;
      case 'login':html=state.user?await accountPage():authPage(false);break;
      case 'daftar':html=state.user?await accountPage():authPage(true);break;
      case 'akun':html=await accountPage();break;
      case 'admin':html=await adminPage();break;
      default:html=notFound();
    }
    if((location.hash.replace(/^#/,'').split('?')[0]||'beranda')!==route)return;
    app.innerHTML=html;
    if(page==='kegiatan'&&state.query){const f=document.querySelector('#event-search');if(f)f.setSelectionRange(f.value.length,f.value.length);}
    updateNav();
  }catch(err){app.innerHTML=`<section class="container section">${empty(err.message,'Halaman tidak dapat dimuat')}</section>`;toast(err.message,true);}
  window.scrollTo({top:0,behavior:'instant'});
}
function formObj(form){return Object.fromEntries(new FormData(form).entries());}
async function refresh(){
  const data=await api('/api/bootstrap');
  state.user=data.user;state.events=data.events;state.settings=data.settings;state.materialsCount=data.materialsCount;
  if(state.user){const d=await api('/api/me');state.registrations=d.registrations;}else{state.registrations=[];state.materials=[];}
}
function setEventForm(e){
  const form=document.querySelector('#event-form');if(!form)return;
  for(const key of ['id','title','scope','date','time','location','organizer','description','source_url','capacity']){
    if(form.elements[key])form.elements[key].value=e?.[key]??'';
  }
  for(const key of ['related_toba','published','registration_open'])form.elements[key].checked=e?Boolean(e[key]):key==='related_toba';
  form.scrollIntoView({behavior:'smooth',block:'start'});
}
function setMaterialForm(m){
  const form=document.querySelector('#material-form');if(!form)return;
  for(const key of ['id','category','title','summary','content','source_url'])if(form.elements[key])form.elements[key].value=m?.[key]??(key==='category'?'Umum':'');
  form.elements.published.checked=m?Boolean(m.published):true;
  form.scrollIntoView({behavior:'smooth',block:'start'});
}

document.querySelector('#menu-toggle')?.addEventListener('click',e=>{
  const nav=document.querySelector('#main-nav');const open=nav.classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',String(open));
});
window.addEventListener('hashchange',render);
document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-action],[data-filter],[data-category],[data-admin-tab],[data-edit-event],[data-edit-material],[data-save-reg]');
  if(!el)return;
  if(el.hasAttribute('data-filter')){state.filter=el.dataset.filter;await render();return;}
  if(el.hasAttribute('data-category')){state.bookCategory=el.dataset.category;await render();return;}
  if(el.hasAttribute('data-admin-tab')){state.adminTab=el.dataset.adminTab;await render();return;}
  if(el.hasAttribute('data-edit-event')){const x=state.adminData?.events.find(v=>v.id===el.dataset.editEvent);setEventForm(x);return;}
  if(el.hasAttribute('data-edit-material')){const x=state.adminData?.materials.find(v=>v.id===el.dataset.editMaterial);setMaterialForm(x);return;}
  if(el.dataset.action==='reset-event'){setEventForm(null);return;}
  if(el.dataset.action==='reset-material'){setMaterialForm(null);return;}
  if(el.dataset.action==='register-event'){
    const id=el.dataset.id;if(!state.user){go(`login?next=${encodeURIComponent('acara/'+id)}`);return;}
    el.disabled=true;
    try{const result=await api(`/api/events/${id}/register`,{method:'POST',body:{}});toast(result.message);await refresh();await render();}
    catch(err){toast(err.message,true);el.disabled=false;}
    return;
  }
  if(el.dataset.action==='logout'){
    try{await api('/api/auth/logout',{method:'POST'});await refresh();toast('Kamu berhasil keluar.');go('beranda');await render();}
    catch(err){toast(err.message,true);}return;
  }
  if(el.hasAttribute('data-save-reg')){
    const id=el.dataset.saveReg;const status=document.querySelector(`#reg-${id}`)?.value;
    el.disabled=true;
    try{const x=await api(`/api/admin/registrations/${id}`,{method:'PUT',body:{status}});toast(x.message);await render();}catch(err){toast(err.message,true);el.disabled=false;}
  }
});
document.addEventListener('input',e=>{
  const field=e.target;
  if(field.id==='event-search'){
    state.query=field.value;
    const filtered=state.events.filter(ev=>(state.filter==='semua'||(state.filter==='mendatang'?upcoming(ev):!upcoming(ev)))&&(state.scope==='Semua'||ev.scope===state.scope)&&(ev.title+' '+ev.description+' '+ev.location).toLowerCase().includes(state.query.toLowerCase()));
    document.querySelector('#event-results').innerHTML=gridOrEmpty(filtered,'Tidak ada kegiatan yang cocok dengan pencarian.');
  }
  if(field.id==='material-search'){
    state.bookQuery=field.value;
    const list=state.materials.filter(m=>(state.bookCategory==='Semua'||m.category===state.bookCategory)&&(m.title+' '+m.summary).toLowerCase().includes(state.bookQuery.toLowerCase()));
    document.querySelector('#material-results').innerHTML=materialCards(list);
  }
});
document.addEventListener('change',async e=>{
  if(e.target.id==='scope-filter'){state.scope=e.target.value;await render();}
});
document.addEventListener('submit',async e=>{
  const form=e.target;if(!form.matches('form[data-action]'))return;
  e.preventDefault();const action=form.dataset.action;
  const button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;
  try{
    if(action==='signup'||action==='signin'){
      const b=formObj(form);
      const data=await api(action==='signup'?'/api/auth/register':'/api/auth/login',{method:'POST',body:b});
      toast(data.message);await refresh();
      let next=form.dataset.next||'akun';
      if(!/^(akun|admin|buku|acara\/[a-f0-9-]{36})$/.test(next))next='akun';
      if(next==='admin' && state.user?.role!=='admin')next='akun';
      go(next);await render();return;
    }
    if(action==='save-event'){
      const b=formObj(form);for(const key of ['related_toba','published','registration_open'])b[key]=form.elements[key].checked;
      const id=b.id;delete b.id;
      const data=await api(id?`/api/admin/events/${id}`:'/api/admin/events',{method:id?'PUT':'POST',body:b});
      toast(data.message);await refresh();await render();return;
    }
    if(action==='save-material'){
      const b=formObj(form);b.published=form.elements.published.checked;
      const id=b.id;delete b.id;
      const data=await api(id?`/api/admin/materials/${id}`:'/api/admin/materials',{method:id?'PUT':'POST',body:b});
      toast(data.message);state.materials=[];await refresh();await render();return;
    }
    if(action==='save-settings'){
      const data=await api('/api/admin/settings',{method:'PUT',body:formObj(form)});
      toast(data.message);await refresh();await render();return;
    }
  }catch(err){toast(err.message,true);const p=document.querySelector('#auth-error');if(p)p.textContent=err.message;}
  finally{if(button)button.disabled=false;}
});
(async function init(){
  document.querySelector('#year').textContent=String(new Date().getFullYear());
  try{await refresh();await render();}
  catch(err){app.innerHTML=`<section class="container section">${empty('Jalankan npm start dari terminal VS Code. Detail: '+err.message,'Website belum dapat dijalankan')}</section>`;}
  finally{loaderHide();}
})();
