# PRAMUKA TOBA — Portal Kegiatan & Buku Pramuka

Prototipe website komunitas informasi kegiatan dan pembelajaran Pramuka Kabupaten Toba. **Belum merupakan website resmi Kwarcab / DKC Toba.** Diperlukan izin dan verifikasi dari pengurus sebelum mengklaim status resmi.

## Fitur yang sudah berjalan

- Animasi loading tunas kelapa dengan efek putar dan tampilan responsif.
- Navigasi: **Beranda, Kegiatan, DKC, Buku Pramuka, Masuk / Daftar**.
- Beranda: agenda mendatang, arsip kegiatan lampau, contoh kegiatan dengan tautan sumber.
- Kegiatan: pencarian, penyaringan waktu dan cakupan Toba / Sumut / Nasional, detail, link sumber.
- Registrasi akun, login, logout, cookie sesi HttpOnly, password scrypt + garam unik.
- Klik **Daftar Kegiatan** diarahkan login bila belum masuk, pendaftaran tercatat, kuota dan pendaftaran ganda dicegah.
- Buku Pramuka hanya dapat dibuka setelah login; 26 materi awal (ringkasan orisinal) mencakup Umum, Siaga, Penggalang, Penegak, Pandega, Garuda.
- DKC: Instagram, Facebook, TikTok, YouTube, WhatsApp dan email (kosong sampai divalidasi admin).
- Akun Saya: riwayat dan status pendaftaran.
- Panel admin: tambah/edit kegiatan, draf/publikasi, buka/tutup pendaftaran, status peserta, tambah/edit materi, kontak DKC.
- SQLite lokal sebagai database. Tidak perlu memasang paket tambahan (zero npm dependencies).

## A. Persiapan (Windows)

1. Instal **Visual Studio Code** dari https://code.visualstudio.com/
2. Instal **Node.js 24.15 atau versi LTS yang lebih baru** dari https://nodejs.org/
3. Instal **Git** dari https://git-scm.com/downloads
4. Setelah instal, buka kembali VS Code dan pilih **Terminal > New Terminal**.
5. Cek instalasi:

   ```powershell
   node -v
   npm -v
   git --version
   ```

   Node.js perlu versi **24.15+** karena proyek menggunakan `node:sqlite` bawaan Node. Pada versi Node tertentu modul SQLite masih berstatus *release candidate*.

## B. Masukkan ke repositori GitHub yang sudah kamu buat

Repositori milikmu: https://github.com/rivaldosiagian93-code/Pramuka-Toba-

Cara yang paling aman karena repo sudah memiliki `README.md`:

1. Buka VS Code > Terminal.
2. Masuk ke folder yang ingin kamu gunakan, misalnya:

   ```powershell
   cd "$HOME\Documents"
   git clone https://github.com/rivaldosiagian93-code/Pramuka-Toba-.git
   cd Pramuka-Toba-
   code .
   ```

3. **Ekstrak ZIP proyek Pramuka-Toba-Website.zip** yang disediakan. Salin **isi di dalam folder `Pramuka-Toba-Website`** (bukan folder luarnya) ke folder repository `Pramuka-Toba-` yang baru di-clone.
4. Jika Windows bertanya apakah `README.md` lama akan diganti, pilih **Replace**. Repositori saat ini hanya berisi README awal.
5. Di VS Code kamu akan melihat `server.js`, `db.js`, `security.js`, `package.json`, folder `public`, `scripts`, `tests`, dan `README.md`.

> Tidak perlu menggunakan Live Server atau membuka `index.html` dengan klik ganda. Registrasi dan login membutuhkan server Node.js.

## C. Jalankan website di komputer

Dalam Terminal VS Code **di direktori root repo**:

```powershell
npm start
```

Buka browser:

**http://127.0.0.1:3000**

Jika port 3000 dipakai proses lain, di PowerShell jalankan:

```powershell
$env:PORT=3001
npm start
```

Kemudian buka `http://127.0.0.1:3001`. Hentikan server dengan `Ctrl + C`. Untuk pengembangan otomatis reload:

```powershell
npm run dev
```

Database akan dibuat otomatis dalam `data/pramuka-toba.sqlite`. **Jangan upload database ini ke GitHub.** Folder `data/` sudah masuk `.gitignore`.

## D. Buat akun admin pertama

1. Buka website, klik **Masuk / Daftar > Daftar**.
2. Buat akun menggunakan email yang kamu kendalikan dan password minimal 10 karakter.
3. Kembali ke terminal, **Ctrl+C** bila perlu, lalu jalankan:

   ```powershell
   npm run make-admin -- emailkamu@contoh.com
   ```

4. Ganti `emailkamu@contoh.com` dengan email yang benar-benar kamu daftarkan.
5. Jalankan kembali `npm start` jika server dihentikan.
6. Refresh halaman browser. Tombol **Admin** muncul di kanan atas. Hanya akun yang dinaikkan perannya dari terminal ini yang bisa menjadi admin.

## E. Isi agenda resmi

Buka **Panel Admin > Kelola Kegiatan**. Isi:

- Judul kegiatan, cakupan **Toba / Sumut / Nasional**.
- Pelaksana, tanggal, waktu jika diketahui, lokasi, dan deskripsi.
- **URL sumber HTTPS yang dapat diperiksa**. URL saja tidak membuktikan kebenaran: admin wajib membaca dan memverifikasi sumber, tanggal, dan syarat pendaftaran.
- Centang **Relevan untuk Toba**, **Terbitkan ke publik** untuk menampilkan informasi.
- Centang **Buka pendaftaran** hanya bila pengelola memang berwenang menerima pendaftaran di website.
- Kapasitas opsional. Kosong berarti tidak ada batas kuota berbasis aplikasi.

Acara lampau otomatis tidak dapat menerima pendaftaran baru. Saat ini hanya ada **tiga berita kegiatan lampau dari sumber yang dicantumkan**, dan **belum ada acara mendatang** sampai kamu menambahkannya.

### Kriteria khusus

Kegiatan Kwarda Sumut dan nasional dimasukkan hanya jika relevan untuk peserta/pengurus Toba. Jangan menyebut orang atau kontingen Toba benar-benar hadir tanpa sumber yang mengonfirmasi hal itu. Untuk agenda nasional yang tidak terbukti terkait Toba, **jangan publikasikan** di portal ini.

## F. Perbarui kontak DKC

Di **Panel Admin > Kontak DKC**, masukkan tautan Instagram, Facebook, TikTok, YouTube, email, atau WhatsApp **yang telah mendapat persetujuan pemilik/pengurus**. Format nomor WhatsApp: `62812xxxxxxxx` atau `0812xxxxxxxx`. Sistem membuat tautan chat langsung `https://wa.me/62812...`.

Tidak ada nomor telepon atau akun sosial fiktif dalam data awal.

## G. Tambah materi Buku Pramuka

Di **Panel Admin > Materi Buku**, kamu dapat membuat judul, memilih kategori, menulis ringkasan, isi lengkap, menambah sumber, dan mengatur publikasi. Materi awal merupakan **ringkasan pengantar**, bukan seluruh buku SKU atau SKK resmi, bukan pengganti evaluasi pembina, dan bukan izin menyalin dokumen yang memiliki hak cipta.

**Garuda merupakan penghargaan kecakapan yang tersedia bagi beberapa golongan, bukan golongan usia baru.** Rujuk: https://pramuka.or.id/peraturan/

## H. Kirim perubahan ke GitHub

Dari Terminal VS Code:

```powershell
git status
git add .
git commit -m "Membangun portal Pramuka Toba"
git push origin main
```

Jika Git meminta autentikasi, masuk melalui browser dan ikuti instruksi Git Credential Manager. **Jangan menempelkan password/token GitHub ke file proyek.**

## I. Menayangkan ke internet

**GitHub adalah tempat kode, bukan otomatis backend Node.js.** GitHub Pages hanya meng-host file statis. Halaman boleh tampil, tetapi endpoint `/api/*`, database, register, dan login **tidak akan bekerja** jika hanya disajikan lewat GitHub Pages.

Untuk online diperlukan hosting yang menjalankan server Node.js, HTTPS, storage database persisten, backup terjadwal dan konfigurasi domain. **Jangan menggunakan hosting gratis yang storage-nya terhapus saat restart** untuk database SQLite pendaftar. Saat kebutuhan multiadmin dan trafik meningkat, migrasikan database ke PostgreSQL terkelola dan tambahkan sistem email resmi.

**Penting: situs ini merupakan MVP lokal, belum siap menyimpan data pribadi anak dalam layanan publik.** Sebelum membuka pendaftaran nyata, implementasikan:

- Kebijakan privasi, batas pengumpulan data, aturan retensi, dan prosedur penghapusan data.
- Persetujuan orang tua/wali untuk pengguna yang belum dewasa, mekanisme verifikasinya, dan pembatasan data/foto peserta.
- Verifikasi email dan fitur lupa password/reset password.
- Pengamanan hosting HTTPS, pemantauan, log keamanan, backup & restore, rate limiting terpusat.
- Verifikasi identitas admin/otorisasi pengurus, kebijakan pembatalan dan konfirmasi peserta melalui email.
- Audit akses data pendaftar dan prosedur incident response.

Saat ini login dan registrasi **berjalan di lokal**, tetapi belum ada verifikasi email atau pemulihan password otomatis. Semua itu perlu sebelum peluncuran publik.

## J. Jalankan pengujian

```powershell
npm test
```

Pengujian otomatis memeriksa autentikasi, proteksi buku, CSRF, pendaftaran kegiatan, kapasitas, izin admin, dan keberadaan data sumber. Pengujian memakai SQLite in-memory sehingga tidak mengubah database pengguna.

## Struktur file

```text
Pramuka-Toba-Website/
├── server.js                    # Backend API + HTTP server
├── db.js                        # Skema dan data awal SQLite
├── security.js                  # Hash password + pemeriksaan URL/tanggal
├── package.json                 # Perintah start/dev/test/make-admin
├── .env.example                 # Contoh konfigurasi opsional
├── .gitignore                   # Mencegah upload data nyata
├── public/
│   ├── index.html               # Kerangka website
│   ├── style.css                # Desain responsif dan animasi
│   ├── app.js                   # Navigasi, halaman, form, admin
│   └── assets/
│       ├── tunas-kelapa.svg     # Ilustrasi tunas kelapa
│       └── hero-toba.svg        # Ilustrasi alam Toba orisinal
├── scripts/
│   └── promote-admin.js         # Promosikan pengguna ke admin dari terminal
├── tests/
│   └── app.test.js              # Tes backend
└── README.md                    # Panduan ini
```

## Sumber contoh berita / materi

- Peringatan Hari Pramuka di Toba: https://toba.pom.go.id/berita/pelantikan-pengurus-saka-pom-balai-pom-di-toba-periode-2026-sampai-2031-warnai-peringatan-hari-pramuka
- Jambore Daerah XI Sumut: https://bapperida.sumutprov.go.id/berita/read/jambore-daerah-jamda-xi-gerakan-pramuka-sumatera-utara-tahun-2026-resmi-ditutup-gubernur
- Kwarda Sumut dan kehadiran perwakilan Kwarcab Toba: https://pramuka.id/kwarda-pramuka-sumut-gelar-buka-puasa-bersama-tegaskan-program-prioritas-dan-skema-kolaborasi-pengelolaan-bumper-sibolangit-medan-28-februari-2026/
- Peraturan Gerakan Pramuka: https://pramuka.or.id/peraturan/
- Lambang Gerakan Pramuka: https://pramuka.or.id/lambang/

### Catatan hak cipta dan identitas

Lambang dalam `public/assets/tunas-kelapa.svg` merupakan **ilustrasi SVG sederhana**, bukan reproduksi resmi bersertifikat. Ketika akan diluncurkan sebagai kanal resmi, ganti dengan file lambang identitas yang disetujui pengurus sesuai pedoman Gerakan Pramuka. Ilustrasi lanskap `hero-toba.svg` dibuat untuk proyek ini, bukan foto lokasi sebenarnya.
