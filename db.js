import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const OFFICIAL_RULES = 'https://pramuka.or.id/peraturan/';
const GOLONGAN = 'https://www.pramuka.or.id/files/document/Salinan-SK-055-1982-Tanda-Pengenal-Gerakan-Pramuka.pdf';
const GARUDA = 'https://pramuka.or.id/peraturan/';
const materialsSeed = [
  ['Umum','Sejarah dan tujuan Gerakan Pramuka','Mengenal gerakan pendidikan kepramukaan di Indonesia.',`Gerakan Pramuka merupakan organisasi pendidikan nonformal yang membantu membentuk karakter, kepemimpinan, dan keterampilan hidup melalui pengalaman langsung.\nPelajari sejarah dan tujuan organisasi melalui sumber resmi. Hubungkan setiap kegiatan dengan nilai pengabdian, tanggung jawab, dan gotong royong.\nAktivitas: buat garis waktu singkat perkembangan Gerakan Pramuka menggunakan rujukan resmi.`,OFFICIAL_RULES],
  ['Umum','Lambang tunas kelapa','Memahami makna lambang Gerakan Pramuka.',`Lambang Gerakan Pramuka adalah tunas kelapa. Lambang ini memiliki kiasan tentang daya tahan, kemampuan menyesuaikan diri, cita-cita, landasan hidup, dan manfaat bagi sesama.\nDiskusikan contoh perilaku sehari-hari yang mencerminkan makna lambang tersebut.\nRujukan: penjelasan resmi pada laman Lambang Kwartir Nasional.`, 'https://pramuka.or.id/lambang/'],
  ['Umum','Kode kehormatan dan sikap anggota','Mengenal penerapan kode kehormatan sesuai golongan.',`Kode kehormatan membimbing anggota Pramuka dalam bertindak. Rumusan dan praktiknya dipelajari sesuai golongan usia.\nLatihan: berikan tiga contoh sikap bertanggung jawab di rumah, sekolah, dan kegiatan kelompok.\nGunakan dokumen resmi sebagai rujukan utama untuk menghafal bunyi kode kehormatan secara tepat.`,OFFICIAL_RULES],
  ['Umum','Keselamatan kegiatan luar ruang','Pencegahan risiko saat berkemah dan berkegiatan.',`Sebelum berangkat, periksa cuaca, lokasi, daftar peserta, pendamping, sarana komunikasi, dan rencana darurat.\nBawa air minum, pelindung cuaca, obat pribadi sesuai petunjuk keluarga, serta perlengkapan yang disyaratkan panitia.\nJangan meninggalkan kelompok tanpa izin pembina. Aktivitas dengan api, air, tali, atau alat tajam harus diawasi pembina yang kompeten.`,OFFICIAL_RULES],
  ['Siaga','Pengenalan golongan Siaga','Belajar sambil bermain dan bekerja sama dalam barung.',`Pramuka Siaga menjalankan kegiatan yang sesuai tahap perkembangannya melalui permainan, cerita, kerja sama, dan praktik sederhana.\nKenali struktur barung dan lingkungan perindukan. Diskusikan cara saling membantu dan menghargai teman.\nLatihan: membuat permainan kerja sama yang aman dan dipandu pembina.`,GOLONGAN],
  ['Siaga','Dwisatya dan Dwidarma','Pembiasaan nilai dasar Siaga dalam kehidupan sehari-hari.',`Pelajari Dwisatya dan Dwidarma dari pedoman resmi bersama pembina.\nLatihan: ceritakan pengalaman membantu keluarga, menghormati teman, dan menjaga kebersihan lingkungan.\nPemahaman lebih penting daripada sekadar hafalan.`,OFFICIAL_RULES],
  ['Siaga','Tingkatan Mula, Bantu, dan Tata','Pengenalan tahapan kecakapan umum Siaga.',`Tingkatan kecakapan umum untuk Siaga adalah Mula, Bantu, dan Tata. Setiap tahap dilalui dengan pembinaan serta penilaian sesuai persyaratan yang berlaku.\nBuat daftar latihan bersama pembina berdasarkan SKU resmi, bukan daftar yang dibuat sendiri oleh website ini.`,GOLONGAN],
  ['Siaga','Kebersihan dan kesehatan diri','Kebiasaan sederhana untuk kegiatan Siaga.',`Biasakan mencuci tangan, membawa air minum, menjaga kebersihan pakaian, dan membuang sampah pada tempatnya.\nLatihan: susun daftar pemeriksaan pribadi sebelum latihan mingguan dan terapkan bersama barung.`,OFFICIAL_RULES],
  ['Penggalang','Tingkatan Ramu, Rakit, dan Terap','Memahami tahapan kecakapan umum Penggalang.',`Penggalang mengenal tingkatan Ramu, Rakit, dan Terap.\nSetiap kenaikan tingkat didasarkan pada pemenuhan Syarat Kecakapan Umum dan pengujian oleh pihak yang berwenang.\nLatihan: diskusikan target belajar pribadi bersama pembina dan catat progresnya.`,GOLONGAN],
  ['Penggalang','Trisatya dan Dasadarma','Mengenal prinsip dasar perilaku Penggalang.',`Pelajari rumusan Trisatya dan Dasadarma sesuai pedoman yang digunakan gugusdepan.\nDiskusikan cara menerapkannya dalam tugas regu, menjaga lingkungan, dan menghormati perbedaan.\nLatihan: buat jurnal tindakan baik selama tujuh hari.`,OFFICIAL_RULES],
  ['Penggalang','Simpul dan ikatan dasar','Latihan ketangkasan tali dengan pengawasan.',`Kenali perbedaan simpul yang menghubungkan atau mengamankan tali dan ikatan yang menyatukan tongkat.\nPelajari simpul mati, simpul pangkal, dan simpul anyam dari pembina. Periksa kekuatan dan tujuan pemakaiannya.\nJangan gunakan hasil latihan sebagai perangkat penopang beban manusia atau kegiatan berisiko tanpa supervisi ahli.`,OFFICIAL_RULES],
  ['Penggalang','Sandi Morse dan semaphore','Belajar komunikasi isyarat.',`Morse menyampaikan pesan dengan kombinasi tanda pendek dan panjang. Semaphore menggunakan posisi dua bendera sebagai kode huruf.\nLatihan: kirim pesan singkat antarkelompok menggunakan tabel sandi resmi dan periksa ketepatannya.`,OFFICIAL_RULES],
  ['Penggalang','Peta, arah mata angin, dan kompas','Dasar membaca arah dan orientasi.',`Pahami delapan arah mata angin, perbedaan utara peta dan arah kompas, serta simbol peta sederhana.\nLatihan: lakukan permainan orientasi di lokasi aman yang dibatasi dan diawasi pembina. Jangan mengandalkan kompas saja untuk perjalanan di alam bebas.`,OFFICIAL_RULES],
  ['Penggalang','Perencanaan perkemahan regu','Belajar menyiapkan kegiatan bersama.',`Tentukan tujuan latihan, susunan peserta, jadwal, pembagian tugas, kebutuhan alat, izin keluarga, dan langkah keselamatan.\nSesudah kegiatan, evaluasi apa yang berhasil dan apa yang perlu diperbaiki.`,OFFICIAL_RULES],
  ['Penegak','Bantara dan Laksana','Tahapan kecakapan umum Pramuka Penegak.',`Penegak memiliki dua tingkatan kecakapan umum, yaitu Bantara dan Laksana.\nPemenuhannya harus mengikuti SKU dan proses pembinaan yang berlaku.\nLatihan: susun rencana pengembangan diri, pembelajaran, dan pengabdian yang dapat dibuktikan.`,GOLONGAN],
  ['Penegak','Kepemimpinan ambalan','Mengelola kegiatan dengan partisipasi anggota.',`Pelajari perencanaan rapat, musyawarah, delegasi tugas, pencatatan keputusan, dan evaluasi kegiatan.\nSimulasi: bentuk panitia kecil kegiatan bakti, bagi tanggung jawab secara adil, dan laporkan hasilnya.`,OFFICIAL_RULES],
  ['Penegak','Penyusunan proposal kegiatan','Merancang kegiatan yang terukur dan aman.',`Proposal memuat latar belakang, tujuan, peserta, kegiatan, waktu, tempat, anggaran, penanggung jawab, dan rencana keselamatan.\nCantumkan sumber dana secara transparan dan dokumentasikan persetujuan pihak berwenang.`,OFFICIAL_RULES],
  ['Penegak','Pengabdian masyarakat','Menentukan kebutuhan masyarakat bersama warga.',`Awali dari dialog dengan warga atau pihak setempat, bukan asumsi sepihak.\nPilih kegiatan yang realistis dan bermanfaat, seperti pengelolaan lingkungan atau kegiatan literasi.\nEvaluasi manfaat kegiatan dan minta umpan balik penerima manfaat.`,OFFICIAL_RULES],
  ['Penegak','Dasar dokumentasi dan publikasi etis','Mengelola informasi kegiatan secara bertanggung jawab.',`Minta izin sebelum memotret atau mempublikasikan data pribadi, terutama anak-anak.\nCantumkan tempat, tanggal, dan sumber pada pengumuman kegiatan. Hindari klaim keikutsertaan atau prestasi yang belum diverifikasi.`,OFFICIAL_RULES],
  ['Pandega','Peran dan kecakapan Pandega','Pengembangan kemandirian serta pelayanan.',`Pandega mengembangkan kepemimpinan, kemandirian, kemampuan merancang kegiatan, dan pengabdian masyarakat.\nPenilaian kecakapan mengikuti SKU Pandega dan ketentuan organisasi.\nLatihan: tentukan kebutuhan masyarakat yang dapat dibantu secara kolaboratif.`,GOLONGAN],
  ['Pandega','Manajemen proyek pengabdian','Dari pemetaan masalah sampai evaluasi.',`Tentukan masalah yang benar-benar ada, sasaran, mitra, anggaran, indikator keberhasilan, jadwal, dan pembagian tugas.\nJangan mengumpulkan data pribadi masyarakat tanpa tujuan dan perlindungan yang jelas.\nDokumentasikan proses dan hasil evaluasi.`,OFFICIAL_RULES],
  ['Pandega','Mentoring dan fasilitasi latihan','Membantu anggota muda belajar dengan aman.',`Pandega dapat berperan sebagai pendamping dalam batas kewenangan pembinaan yang berlaku.\nGunakan metode belajar aktif, perlakukan peserta secara adil, dan pastikan pengawasan serta perlindungan anak.`,OFFICIAL_RULES],
  ['Pandega','Evaluasi dan refleksi kegiatan','Belajar dari bukti hasil kegiatan.',`Bandingkan tujuan awal, proses, capaian, kendala, serta masukan peserta dan mitra.\nSusun laporan yang membedakan fakta, bukti dokumentasi, dan rekomendasi.`,OFFICIAL_RULES],
  ['Garuda','Apa itu Pramuka Garuda?','Penghargaan kecakapan, bukan golongan usia tersendiri.',`Pramuka Garuda adalah capaian kecakapan tertinggi yang dapat ditempuh sesuai persyaratan golongan Siaga, Penggalang, Penegak, atau Pandega.\nDengan demikian, Garuda bukan golongan usia kelima setelah Pandega.\nPahami persyaratan dan tata cara penilaian dari petunjuk penyelenggaraan Pramuka Garuda resmi.`,GARUDA],
  ['Garuda','Persiapan portofolio Pramuka Garuda','Mendokumentasikan proses pembinaan.',`Bersama pembina, identifikasi persyaratan Garuda yang berlaku untuk golongan masing-masing.\nSiapkan bukti kegiatan dan perkembangan keterampilan secara jujur, dengan persetujuan apabila terdapat data atau foto orang lain.\nPortofolio merupakan pendukung penilaian, bukan pengganti proses ujian resmi.`,GARUDA],
  ['Garuda','Keteladanan dan pengabdian Garuda','Menghubungkan kecakapan dengan perilaku.',`Capaian kecakapan perlu tercermin dalam perilaku sehari-hari, termasuk disiplin, saling menolong, dan kesediaan menjadi teladan.\nLatihan: buat rencana tindakan nyata yang bermanfaat bagi sekolah atau lingkungan.`,GARUDA]
];

const eventsSeed = [
  {
    title:'Peringatan Hari Pramuka dan Pelantikan Pengurus Saka POM di Toba',
    scope:'Toba', date:'2026-10-09', time:'', location:'Lapangan Hijau Kantor Bupati Toba', organizer:'Kwarcab Gerakan Pramuka Kabupaten Toba',
    description:'Peringatan Hari Pramuka di Kabupaten Toba disertai pelantikan pengurus Saka POM Balai POM di Toba periode 2026–2031. Kegiatan ini diberitakan oleh Balai POM di Toba. Agenda sudah berlangsung, bukan pembukaan pendaftaran baru.',
    source_url:'https://toba.pom.go.id/berita/pelantikan-pengurus-saka-pom-balai-pom-di-toba-periode-2026-sampai-2031-warnai-peringatan-hari-pramuka',
    related_toba:true, published:true, registration_open:false
  },
  {
    title:'Jambore Daerah XI Gerakan Pramuka Sumatera Utara 2026',
    scope:'Sumut',date:'2026-07-08',time:'',location:'Bumi Perkemahan Sibolangit, Sumatera Utara',organizer:'Kwartir Daerah Sumatera Utara',
    description:'Jambore Daerah XI berlangsung pada 8–12 Juli 2026 dan diikuti kontingen Pramuka Penggalang dari berbagai kabupaten/kota Sumatera Utara. Agenda tingkat daerah ini relevan bagi Kwartir Cabang Toba sebagai bagian dari wilayah Sumatera Utara; halaman ini tidak mengklaim kehadiran kontingen Toba secara khusus.',
    source_url:'https://bapperida.sumutprov.go.id/berita/read/jambore-daerah-jamda-xi-gerakan-pramuka-sumatera-utara-tahun-2026-resmi-ditutup-gubernur',
    related_toba:true,published:true,registration_open:false
  },
  {
    title:'Pertemuan Kwarda Sumut dengan perwakilan Kwarcab Toba',
    scope:'Sumut',date:'2026-02-28',time:'',location:'Medan, Sumatera Utara',organizer:'Kwartir Daerah Sumatera Utara',
    description:'Dalam kegiatan buka puasa bersama dan pembahasan program Kwarda Sumatera Utara pada 28 Februari 2026, perwakilan Kwartir Cabang Toba disebut hadir bersama Kwarcab lain. Agenda sudah selesai.',
    source_url:'https://pramuka.id/kwarda-pramuka-sumut-gelar-buka-puasa-bersama-tegaskan-program-prioritas-dan-skema-kolaborasi-pengelolaan-bumper-sibolangit-medan-28-februari-2026/',
    related_toba:true,published:true,registration_open:false
  }
];

export function openDatabase(databasePath) {
  const file = databasePath === ':memory:' ? ':memory:' : resolve(databasePath);
  if (file !== ':memory:') mkdirSync(dirname(file),{recursive:true});
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, scope TEXT NOT NULL CHECK(scope IN ('Toba','Sumut','Nasional')),
      date TEXT NOT NULL, time TEXT NOT NULL DEFAULT '', location TEXT NOT NULL,
      organizer TEXT NOT NULL, description TEXT NOT NULL, source_url TEXT NOT NULL DEFAULT '',
      related_toba INTEGER NOT NULL DEFAULT 1, published INTEGER NOT NULL DEFAULT 0,
      registration_open INTEGER NOT NULL DEFAULT 0, capacity INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'menunggu' CHECK(status IN ('menunggu','diterima','ditolak')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_id,user_id)
    );
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY, category TEXT NOT NULL, title TEXT NOT NULL,
      summary TEXT NOT NULL, content TEXT NOT NULL, source_url TEXT NOT NULL DEFAULT '',
      published INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '');
    CREATE INDEX IF NOT EXISTS idx_event_date ON events(date);
    CREATE INDEX IF NOT EXISTS idx_registration_event ON registrations(event_id);
    CREATE INDEX IF NOT EXISTS idx_session_expiry ON sessions(expires_at);
  `);
  if (file !== ':memory:') db.exec('PRAGMA journal_mode=WAL;');
  if (db.prepare('SELECT COUNT(*) AS n FROM events').get().n === 0) {
    const stmt = db.prepare(`INSERT INTO events
      (id,title,scope,date,time,location,organizer,description,source_url,related_toba,published,registration_open,capacity)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const e of eventsSeed) stmt.run(randomUUID(), e.title,e.scope,e.date,e.time,e.location,e.organizer,e.description,e.source_url,1,1,0,null);
  }
  if (db.prepare('SELECT COUNT(*) AS n FROM materials').get().n === 0) {
    const stmt = db.prepare(`INSERT INTO materials (id,category,title,summary,content,source_url,published) VALUES (?,?,?,?,?,?,1)`);
    for (const [category,title,summary,content,url] of materialsSeed) stmt.run(randomUUID(),category,title,summary,content,url);
  }
  for (const k of ['instagram','facebook','tiktok','youtube','whatsapp','email']) {
    db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').run(k,'');
  }
  return db;
}
