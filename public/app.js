const app = document.querySelector('#app');
const state = {
  user:null,events:[],settings:{},materialsCount:0,materials:[],registrations:[],
  filter:'semua',scope:'Semua',query:'',bookCategory:'Semua',bookQuery:'',
  adminTab:'kegiatan',adminData:null
};
const CATEGORY=['Semua','Umum','Siaga','Penggalang','Penegak','Pandega','Garuda'];
const ICONS={Umum:'✦',Siaga:'◎',Penggalang:'⌁',Penegak:'⚑',Pandega:'✧',Garuda:'★'};
const ACTIVITY_PHOTOS=[
  {src:'/assets/scout-camp.jpg',alt:'Pramuka mengikuti kegiatan kelompok di area Candi Prambanan, Yogyakarta',artist:'FAIZ DILA',license:'CC BY-SA 4.0',source:'https://commons.wikimedia.org/wiki/File:Kegiatan_Pramuka_di_Candi_Prambanan.jpg'},
  {src:'/assets/scout-drill.jpg',alt:'Pasukan Pramuka berbaris saat kegiatan latihan di Indonesia',artist:'Dicky Herlambang',license:'CC0 1.0',source:'https://commons.wikimedia.org/wiki/File:Anak_pramuka_sedang_melakukan_gerakan_baris_berbaris.jpg'}
];
let toastTimeout;
const h=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function href(url){try{const u=new URL(url);return u.protocol==='https:'?h(u.href):'#';}catch{return '#';}}
function photoCredit(photo,label='Foto ilustrasi'){return `<a class="photo-credit" href="${href(photo.source)}" target="_blank" rel="noopener noreferrer">${h(label)} · ${h(photo.artist)} · ${h(photo.license)}</a>`;}
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
  el.innerHTML=state.user?`<a href="#akun" class="nav-account">Akun Saya <span aria-hidden="true">♙</span></a>${state.user.role==='admin'?'<a href="#admin" class="nav-admin">Admin</a>':''}<button type="button" class="logout" data-action="logout">Keluar</button>`:
    '<a class="nav-account" href="#login">Akun Saya <span aria-hidden="true">♙</span></a>';
  const raw=location.hash.replace(/^#/,'');
  const key=raw.split(/[/?]/)[0]||'beranda';
  const activeKey=key==='kegiatan'?`kegiatan-${state.filter==='selesai'?'selesai':'mendatang'}`:key;
  document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===activeKey));
  document.querySelector('#main-nav')?.classList.remove('open');
  document.querySelector('#menu-toggle')?.setAttribute('aria-expanded','false');
}
function eventArt(e){const photo=ACTIVITY_PHOTOS[Math.abs(String(e.title).split('').reduce((sum,char)=>sum+char.charCodeAt(0),0))%ACTIVITY_PHOTOS.length];return `<div class="event-art scope-${h(e.scope)}"><img src="${photo.src}" alt="${photo.alt}" loading="lazy" /><span class="pill">${h(e.scope==='Toba'?'KABUPATEN TOBA':e.scope==='Sumut'?'KWARDA SUMUT':'NASIONAL')}</span><span class="event-art-label">${h(e.scope==='Toba'?'Toba.':e.scope==='Sumut'?'Sumatera Utara.':'Indonesia.')}</span>${photoCredit(photo,'Ilustrasi, bukan dokumentasi Toba')}</div>`;}
function eventCard(e){
  return `<article class="event-card">${eventArt(e)}<div class="event-body"><div class="event-date">${h(shortDate(e.date))}${e.time?' · '+h(e.time)+' WIB':''}</div><h3>${h(e.title)}</h3><p class="event-desc">${h(e.description)}</p><div class="event-meta"><span aria-hidden="true">⌖</span>${h(e.location)}</div><div class="event-card-bottom"><span class="pill ${upcoming(e)?'pill-gold':'pill-grey'}">${upcoming(e)?'Mendatang':'Sudah berlalu'}</span><a class="link-inline" href="#acara/${h(e.id)}">Detail ↗</a></div></div></article>`;
}
function empty(text,title='Belum ada kegiatan terverifikasi'){return `<div class="empty"><div class="empty-icon">✧</div><h3>${h(title)}</h3><p>${h(text)}</p></div>`;}
function gridOrEmpty(list,text){return list.length?`<div class="cards">${list.map(eventCard).join('')}</div>`:empty(text);}
function agendaRow(e){
  const date=new Date(`${e.date}T12:00:00`);
  return `<a class="agenda-row" href="#acara/${h(e.id)}"><span class="date-tile"><b>${date.toLocaleDateString('id-ID',{day:'2-digit'})}</b><small>${date.toLocaleDateString('id-ID',{month:'short'}).toUpperCase()}</small></span><span class="agenda-copy"><small>${h(e.scope==='Toba'?'KEGIATAN TOBA':e.scope==='Sumut'?'KWARDA SUMUT':'KEGIATAN NASIONAL')}</small><strong>${h(e.title)}</strong><span>${e.time?h(e.time)+' WIB · ':''}${h(e.location)}</span></span><span class="agenda-arrow" aria-hidden="true">↗</span></a>`;
}
function featuredEvent(e,label){
  return `<article class="featured-event"><div class="featured-event-image">${eventArt(e)}</div><div class="featured-event-copy"><span class="eyebrow">${h(label)}</span><h2>${h(e.title)}</h2><p class="featured-meta">${h(dateId(e.date))}${e.time?' · '+h(e.time)+' WIB':''}</p><p>${h(e.location)}${e.organizer?' · '+h(e.organizer):''}</p><a class="button light-button" href="#acara/${h(e.id)}">Lihat informasi kegiatan <span aria-hidden="true">→</span></a></div></article>`;
}
function home(){
  const upcomingEvents=state.events.filter(upcoming).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
  const past=state.events.filter(e=>!upcoming(e)).slice(0,3);
  const heroPhoto=ACTIVITY_PHOTOS[0];
  return `<section class="home-hero"><div class="home-hero-inner"><div class="home-hero-copy"><span class="eyebrow">SALAM PRAMUKA</span><h1>Bertumbuh bersama.<br>Mengabdi untuk Indonesia.</h1><p>Ruang bersama anggota dan pengurus kwartir untuk terhubung, berkegiatan, dan memberi dampak nyata.</p><div class="hero-actions"><a href="#kegiatan?filter=mendatang" class="button">Jelajahi kegiatan <span aria-hidden="true">→</span></a><a href="#buku" class="button outline">Kenali Pramuka</a></div></div><div class="home-hero-image"><img src="${heroPhoto.src}" alt="${heroPhoto.alt}" fetchpriority="high" /><div class="image-caption"><small>SATU JANJI, BANYAK AKSI.</small><strong>Bersama, setiap langkah menjadi berarti.</strong><small>Foto ilustrasi, bukan dokumentasi Pramuka Toba.</small>${photoCredit(heroPhoto)}</div></div></div></section>
    <nav class="quick-links container" aria-label="Jelajahi portal"><a href="#kegiatan?filter=mendatang"><span>♧</span><strong>Kegiatan mendatang</strong><small>Temukan pengalaman baru</small><b aria-hidden="true">→</b></a><a href="#akun"><span>♙</span><strong>Akun anggota</strong><small>Pantau pendaftaran dan akses layanan</small><b aria-hidden="true">→</b></a><a href="#buku"><span>▤</span><strong>Buku Pramuka</strong><small>Buka untuk terus bertumbuh</small><b aria-hidden="true">→</b></a><a href="#dkc"><span>♧</span><strong>DKC</strong><small>Kenali Dewan Kerja Cabang</small><b aria-hidden="true">→</b></a></nav>
    <section class="home-agenda-section"><div class="container"><div class="home-agenda-grid"><div><div class="section-heading-row"><div><span class="eyebrow">LANGKAH BAIK BERIKUTNYA</span><h2>Saatnya ikut ambil bagian.</h2><p>Informasi kegiatan yang terverifikasi untuk anggota Pramuka.</p></div><a class="link-inline" href="#kegiatan?filter=mendatang">Lihat agenda <span aria-hidden="true">→</span></a></div><div class="agenda-list">${upcomingEvents.length?upcomingEvents.map(agendaRow).join(''):'<div class="agenda-empty">Belum ada agenda mendatang yang diumumkan oleh pengelola.</div>'}</div></div><aside class="home-notice"><span class="eyebrow">PAPAN PENGUMUMAN</span><h3>Informasi untuk langkah yang lebih siap.</h3><strong>Akun untuk layanan anggota</strong><p>Gunakan akun untuk membaca materi dan memantau pendaftaran kegiatan.</p><a href="#akun">Buka Akun Saya <span aria-hidden="true">→</span></a></aside></div></div></section>
    <section class="archive-section"><div class="container"><div class="section-heading-row"><div><span class="eyebrow">JEJAK KEGIATAN</span><h2>Cerita dari kegiatan berlalu.</h2></div><a class="link-inline" href="#kegiatan?filter=selesai">Semua arsip <span aria-hidden="true">→</span></a></div>${gridOrEmpty(past,'Belum ada kegiatan lampau yang tersedia.','Belum ada arsip')}</div></section>
    <section class="action-banner"><div class="container"><div><h2>Siap melanjutkan pengabdian?</h2><p>Akses akun Anda dan temukan ruang untuk ikut berkontribusi.</p></div><a class="button light-button" href="#akun">Buka Akun Saya <span aria-hidden="true">↗</span></a></div></section>
    <section class="container home-disclaimer"><div class="notice">Portal komunitas ini bukan kanal resmi Kwarcab Toba. Periksa informasi kegiatan melalui sumber dan panitia yang berwenang.</div></section>`;
}
function eventsPage(){
  const isPast=state.filter==='selesai';
  const filtered=state.events.filter(e=>
    (state.filter==='semua'||(isPast?!upcoming(e):upcoming(e)))&&
    (state.scope==='Semua'||e.scope===state.scope)&&
    (e.title+' '+e.description+' '+e.location).toLowerCase().includes(state.query.toLowerCase()))
    .sort((a,b)=>isPast?b.date.localeCompare(a.date):a.date.localeCompare(b.date));
  const featured=filtered[0];
  return `<section class="page-hero event-page-hero"><div class="container"><div class="crumbs"><a href="#beranda">Beranda</a><span>›</span><span>Kegiatan</span><span>›</span><span>${isPast?'Sudah berlalu':'Akan datang'}</span></div><span class="eyebrow">${isPast?'ARSIP KEGIATAN':'AGENDA KEGIATAN'}</span><h1>${isPast?'Jejak langkah, cerita pengabdian.':'Siapkan langkah baik berikutnya.'}</h1><p>${isPast?'Merawat kenangan, mengambil pelajaran, dan membawa semangatnya ke langkah berikutnya.':'Temukan ruang untuk belajar, bertemu, dan memberi dampak bersama anggota lainnya.'}</p><small>${isPast?'Arsip informasi kegiatan · Sumber rujukan tersedia pada halaman detail.':'Agenda terverifikasi · Periksa kembali informasi kepada penyelenggara.'}</small></div></section>
    <section class="container event-browser">
      ${featured?featuredEvent(featured,isPast?'CERITA PILIHAN / KEGIATAN':'KEGIATAN TERDEKAT'):empty(isPast?'Belum ada arsip kegiatan yang cocok dengan pilihan Anda.':'Belum ada agenda mendatang yang dipublikasikan. Pengelola dapat menambahkan kegiatan setelah informasi dikonfirmasi.','Belum ada kegiatan')}
      <div class="event-controls"><div class="event-tabs" role="group" aria-label="Filter waktu"><button type="button" data-filter="selesai" class="${isPast?'selected':''}">Sudah berlalu</button><button type="button" data-filter="mendatang" class="${!isPast?'selected':''}">Akan datang</button></div><div class="event-filters"><label class="search"><span>⌕</span><input class="text-input" id="event-search" placeholder="Cari kegiatan..." value="${h(state.query)}" aria-label="Cari kegiatan" /></label><select class="select filter-select" id="scope-filter" aria-label="Filter cakupan">${['Semua','Toba','Sumut','Nasional'].map(x=>`<option value="${h(x)}" ${x===state.scope?'selected':''}>${x==='Semua'?'Semua kategori':x==='Sumut'?'Kwarda Sumut':x}</option>`).join('')}</select></div></div>
      <div class="agenda-archive-layout"><div><div class="section-heading-row compact"><h2>${isPast?'Cerita kegiatan lainnya':'Agenda berikutnya'}</h2><span>${filtered.length} ${isPast?'catatan arsip':'kegiatan'}</span></div>${isPast?gridOrEmpty(filtered.slice(featured?1:0),'Tidak ada kegiatan yang cocok dengan filter.','Arsip kegiatan'):filtered.length>1?`<div class="agenda-list">${filtered.slice(1).map(agendaRow).join('')}</div>`:'<div class="agenda-empty">Ikuti kanal pengumuman resmi untuk kabar kegiatan berikutnya.</div>'}</div><aside class="event-sidebar"><span class="eyebrow">${isPast?'CATATAN ARSIP':'SEBELUM BERKEGIATAN'}</span><h3>${isPast?'Setiap langkah memberi pelajaran.':'Siap ikut ambil bagian?'}</h3><ol>${(isPast?['Kenang proses dan kebersamaan','Catat hal yang dipelajari','Bawa pengalaman ke langkah berikutnya']:['Lengkapi profil anggota','Baca informasi kegiatan','Ikuti arahan panitia']).map((item,i)=>`<li><b>0${i+1}</b><span>${item}</span></li>`).join('')}</ol><a class="link-inline" href="${isPast?'#beranda':'#akun'}">${isPast?'Kembali ke beranda':'Buka Akun Saya'} <span aria-hidden="true">→</span></a></aside></div>
      <p class="event-page-note">Informasi agenda ditampilkan setelah diperiksa oleh pengelola. Hubungi panitia untuk memastikan rincian dan persyaratan kegiatan.</p>
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
  const roles=['Ketua','Wakil Ketua','Sekretaris','Bendahara'];
  return `<section class="split-page-hero dkc-hero"><div class="container split-page-inner"><div class="split-page-copy"><div class="crumbs"><a href="#beranda">Beranda</a><span>›</span><span>DKC</span></div><span class="eyebrow">DEWAN KERJA CABANG</span><h1>Ruang bertumbuh.<br>Wadah berkarya.</h1><p>Mengenal DKC dan semangat kolaborasi Pramuka Penegak dan Pandega di tingkat cabang.</p><span class="text-link">Dari kita, untuk gerakan kita. <span aria-hidden="true">↗</span></span></div><div class="split-page-image"><img src="/assets/hero-toba.svg" alt="Ilustrasi kegiatan kepramukaan bersama" /><span>Ilustrasi Pramuka Toba · bukan dokumentasi pengurus</span></div></div></section>
    <section class="container dkc-content"><div class="section-heading-row"><div><span class="eyebrow">MENGENAL DKC</span><h2>Bersama menggerakkan<br>Pramuka Penegak dan Pandega.</h2></div><p>Wadah pengembangan kepemimpinan, kebersamaan, dan pengabdian yang mendukung kegiatan di tingkat cabang.</p></div>
      <div class="dkc-pillars"><article><small>01</small><h3>Kepemimpinan</h3><p>Belajar mengambil peran, membangun tim, dan tumbuh melalui pengalaman.</p></article><article><small>02</small><h3>Kolaborasi</h3><p>Menghubungkan gagasan anggota dengan ruang berkarya bersama.</p></article><article><small>03</small><h3>Pengabdian</h3><p>Mendorong kegiatan yang bermanfaat bagi lingkungan dan masyarakat.</p></article></div>
      <div class="section-heading-row board-heading"><div><h2>Kepengurusan DKC</h2><p>Nama cabang, masa bakti, dan data pengurus belum dipublikasikan.</p></div></div>
      <div class="dkc-board"><div class="board-table"><div class="board-table-head"><span>POSISI</span><span>PENGURUS</span></div>${roles.map(role=>`<div class="board-row"><strong>${role}</strong><span>Belum dipublikasikan</span></div>`).join('')}</div><aside class="board-note"><small>RUANG INFORMASI</small><h3>Kenali orangnya.<br>Ikuti gerakannya.</h3><p>Profil ini akan dilengkapi dengan susunan pengurus, masa bakti, dan program kerja yang telah dipublikasikan secara resmi.</p><span>Kontak resmi akan ditambahkan pengurus.</span></aside></div>
      <div class="section-heading-row contacts-heading"><div><span class="eyebrow">TERHUBUNG</span><h2>Media sosial dan kontak</h2><p>Tombol kontak aktif hanya jika alamatnya sudah dikonfirmasi pengelola.</p></div></div>
      <div class="contact-grid">${contacts.map(([key,title,icon,action])=>{
        const value=state.settings[key]||'';
        const target=key==='whatsapp'?`https://wa.me/${encodeURIComponent(value)}`:key==='email'?`mailto:${encodeURIComponent(value)}`:value;
        return `<div class="contact-card"><div class="contact-icon">${icon}</div><h3>${title}</h3><p>${value?(key==='whatsapp'?('+'+h(value)):key==='email'?h(value):'Kanal komunikasi terdaftar'):'Belum dikonfirmasi oleh pengelola.'}</p>${value?`<a href="${key==='email'?h(target):href(target)}" ${key==='email'?'':'target="_blank" rel="noopener noreferrer"'}>${action} ↗</a>`:'<span class="unavailable">Belum tersedia</span>'}</div>`;
      }).join('')}</div><div class="notice dkc-notice">Identitas akun dan nomor WhatsApp tidak diisi secara otomatis agar tidak mengarahkan pengunjung ke orang yang salah. Admin dapat mengisinya dari Panel Admin setelah mendapat konfirmasi pengurus.</div></section>`;
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
  return `<section class="book-hero"><div class="container book-hero-inner"><div><div class="crumbs"><a href="#beranda">Beranda</a><span>›</span><span>Buku Pramuka</span></div><span class="eyebrow">BEKAL UNTUK TERUS BERTUMBUH</span><h1>Buku Pramuka</h1><p>Temukan panduan, keterampilan, dan inspirasi untuk menemani setiap langkah pengabdian.</p></div><blockquote>Baca.<br>Pahami.<br>Amalkan.</blockquote></div></section>
    <section class="container book-library"><div class="book-toolbar"><label class="search"><span>⌕</span><input class="text-input" id="material-search" value="${h(state.bookQuery)}" placeholder="Cari judul buku atau topik..." aria-label="Cari materi" /></label><span class="book-count">${list.length} materi</span></div>
      <div class="library-tabs">${CATEGORY.map(x=>`<button class="category-btn ${state.bookCategory===x?'active':''}" type="button" data-category="${h(x)}">${h(x==='Semua'?'Semua':x)}</button>`).join('')}</div>
      <div class="book-collection-head"><div><h2>Koleksi untuk anggota dan pengurus</h2><p>Ringkasan materi tersedia di website ini dan disusun menurut golongan.</p></div><span>${list.length} materi</span></div>
      <div id="material-results">${materialCards(list)}</div>
      <div class="study-steps"><div><span>01</span><strong>Pilih materi</strong><small>Sesuaikan dengan kebutuhan latihan.</small></div><div><span>02</span><strong>Pelajari bersama</strong><small>Diskusikan dengan satuan atau pembina.</small></div><div><span>03</span><strong>Praktikkan</strong><small>Bawa pengetahuan ke aksi nyata.</small></div></div>
      <p class="book-note">Koleksi ini merupakan rangkuman pilihan, bukan pengganti pedoman resmi. Periksa SKU/SKK dan petunjuk terbaru bersama pembina.</p></section>
      <section class="action-banner"><div class="container"><div><h2>Pengetahuan tumbuh saat dibagikan.</h2><p>Punya usulan materi? Sampaikan kepada pengurus kwartir.</p></div><a class="button light-button" href="#dkc">Hubungi pengurus <span aria-hidden="true">↗</span></a></div></section>`;
}
function materialCards(list){return list.length?`<div class="book-grid">${list.map(m=>`<article class="book-card"><div class="book-cover book-cover-${h(m.category).toLowerCase()}"><small>PRAMUKA</small><strong>${h(m.title)}</strong><span>MATERI DIGITAL</span></div><div class="book-card-copy"><span class="eyebrow">${h(m.category)}</span><h3>${h(m.title)}</h3><p>${h(m.summary)}</p><a href="#materi/${h(m.id)}">Baca materi <span aria-hidden="true">↗</span></a></div></article>`).join('')}</div>`:empty('Materi tidak ditemukan. Ubah kata kunci atau pilih golongan lain.','Tidak ada materi yang cocok');}
async function materialDetail(id){
  if(!state.user){go('login?next=buku');return '';}
  let material;
  try{material=(await api(`/api/materials/${encodeURIComponent(id)}`)).material;}catch{return notFound('Materi tidak ditemukan');}
  return `${bannerHead('Ruang belajar','Isi materi tersedia langsung di website Pramuka Toba.','Materi')}
    <article class="container reader"><div class="paper"><a class="link-inline" href="#buku">← Kembali ke Buku Pramuka</a><div style="margin-top:25px"><span class="pill">${h(material.category)}</span></div>
      <h1>${h(material.title)}</h1><p class="section-subtitle">${h(material.summary)}</p><div class="reader-text">${material.content.split(/\n+/).filter(Boolean).map(p=>`<p>${h(p)}</p>`).join('')}</div>
      ${material.source_url?`<div class="source"><span class="data-label">Rujukan sumber (teks, tidak membuka situs lain)</span><p style="font-size:12px;line-height:1.6;color:var(--muted);overflow-wrap:anywhere">${h(material.source_url)}</p></div>`:''}
      <div class="notice" style="margin-top:23px">Gunakan pembinaan dan petunjuk resmi yang masih berlaku ketika melaksanakan praktik atau menempuh syarat kecakapan. Materi ini merupakan pengantar, bukan salinan buku resmi.</div></div></article>`;
}
async function accountPage(){
  if(!state.user){go('login?next=akun');return '';}
  const data=await api('/api/me');state.user=data.user;state.registrations=data.registrations;
  return `<section class="account-page-hero"><div class="container"><div class="crumbs"><a href="#beranda">Beranda</a><span>›</span><span>Akun Saya</span></div><h1>Akun Saya</h1><p>Kelola identitas dan perjalanan Anda di Pramuka.</p></div></section>
    <section class="container account-dashboard"><div class="account-side-column"><nav class="account-menu" aria-label="Menu akun"><a class="selected" href="#akun"><span>♙</span>Profil saya</a><a href="#kegiatan?filter=mendatang"><span>▣</span>Kegiatan Pramuka</a><button type="button" data-action="logout"><span>↪</span>Keluar</button></nav><aside class="account-help"><strong>Butuh bantuan?</strong><p>Hubungi pengurus kwartir untuk pembaruan data keanggotaan.</p><a href="#dkc">Hubungi pengurus <span aria-hidden="true">↗</span></a></aside></div>
      <div class="account-main"><section class="paper profile-details"><span class="eyebrow">DATA PRIBADI</span><h2>Profil anggota</h2><p>Informasi akun yang digunakan untuk layanan keanggotaan.</p><div class="profile-fields"><div><small>Nama lengkap</small><strong>${h(state.user.name)}</strong></div><div><small>Alamat email</small><strong>${h(state.user.email)}</strong></div><div><small>Status akun</small><strong>${state.user.role==='admin'?'Administrator':'Anggota terdaftar'}</strong></div></div>${state.user.role==='admin'?'<a href="#admin" class="button">Buka Panel Admin <span aria-hidden="true">→</span></a>':''}</section>
      <section class="paper account-registrations" id="registrations"><span class="eyebrow">KEGIATAN SAYA</span><h2>Pendaftaran kegiatan saya</h2><p>Status pendaftaran diperbarui setelah pengelola memeriksa data.</p>
        ${data.registrations.length?`<div class="reg-list">${data.registrations.map(r=>`<div class="reg-item"><div><a class="link-inline" href="#acara/${h(r.event_id)}">${h(r.title)}</a><p>${h(dateId(r.date))} · ${h(r.location)}</p></div><span class="pill ${r.status==='diterima'?'':r.status==='ditolak'?'pill-red':'pill-gold'}">${h(r.status)}</span></div>`).join('')}</div>`:empty('Cari kegiatan yang membuka pendaftaran dan kirim formulirnya.','Belum ada pendaftaran')}
        <a href="#kegiatan?filter=mendatang" class="text-link">Jelajahi kegiatan <span aria-hidden="true">→</span></a></section></div>
      <aside class="account-side-info"><div class="member-card"><span>PRAMUKA</span><small>KARTU ANGGOTA DIGITAL</small><h3>Identitas untuk setiap langkah pengabdian.</h3><span class="member-status">Belum tersedia</span></div><div class="profile-status"><h3>Profil anggota</h3><p>Informasi profil terhubung dengan akun Anda.</p><ul><li>Nama akun tersimpan</li><li>Email akun tersimpan</li><li>Data keanggotaan resmi belum tersedia</li></ul></div><blockquote>Satyaku Kudarmakan,<br>Darmaku Kubaktikan.</blockquote></aside></section>`;
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
  const raw=location.hash.replace(/^#/,'')||'beranda';
  const [route,queryString='']=raw.split('?');
  const [page,id]=route.split('/');
  const requestedFilter=new URLSearchParams(queryString).get('filter');
  if(page==='kegiatan'&&['semua','mendatang','selesai'].includes(requestedFilter))state.filter=requestedFilter;
  updateNav();
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
  if(el.hasAttribute('data-filter')){state.filter=el.dataset.filter;go(`kegiatan?filter=${encodeURIComponent(state.filter)}`);return;}
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
