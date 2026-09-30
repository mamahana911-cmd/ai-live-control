# AI LIVE CONTROL SaaS V2

## Target
Satu frontend GitHub Pages untuk sampai 30 akun:
- Admin
- User
- video cloud per user
- trigger per user
- event log per user
- license table
- dashboard admin dasar

## A. Buat project Supabase

1. Buat project di Supabase.
2. Buka SQL Editor.
3. Jalankan `supabase-schema.sql`.
4. Buka Project Settings → API.
5. Ambil Project URL.
6. Ambil publishable/anon key.
7. Edit `config.js`:

```js
window.APP_CONFIG = {
  appName: "AI LIVE CONTROL",
  supabaseUrl: "https://PROJECT.supabase.co",
  supabaseAnonKey: "PUBLISHABLE_OR_ANON_KEY"
};
```

Jangan gunakan `service_role` key di GitHub.

## B. Authentication

Supabase Auth → Email provider.

Untuk tahap awal, email/password sudah digunakan.

## C. Jadikan akun pertama sebagai admin

Setelah mendaftar, buka Table Editor → `profiles`.
Ubah:

role = admin

Catatan: untuk produksi sebaiknya gunakan server-side admin management/Edge Function, bukan mengandalkan edit tabel manual.

## D. Video

Bucket `videos` dibuat oleh SQL.
Aplikasi menyimpan file dalam:

videos/<user-id>/<random>-filename.mp4

Data metadata masuk tabel `videos`.

## E. GitHub Pages

1. Buat repository.
2. Upload semua file.
3. Pastikan `index.html` di root.
4. Settings → Pages → GitHub Actions.
5. Tambahkan workflow deployment atau gunakan GitHub Actions Pages.
6. Buka URL Pages.

## F. Alur user

Login
→ Dashboard
→ Upload Video
→ Trigger Manager
→ LIVE/Event Gateway
→ Trigger mencocokkan event
→ Video diputar

## G. Event gateway

Frontend disiapkan untuk event standar:

```json
{"type":"comment","value":"JOGED"}
{"type":"gift","value":"Rose","diamonds":10}
{"type":"boss","value":"BOSS","diamonds":500}
```

Gateway yang terpisah nantinya menerima event LIVE dan mengirim format standar tersebut.

## H. 30 user

Semua user menggunakan aplikasi yang sama.

Contoh:

Admin
- User 01
- User 02
- ...
- User 30

Data dipisahkan berdasarkan `user_id`.

## I. License

Tabel `licenses` sudah tersedia.

Untuk produk komersial, validasi license sebaiknya dilakukan server-side:
- aktif/tidak
- tanggal expired
- paket
- batas device
- status pembayaran

Jangan menjadikan localStorage sebagai sumber kebenaran license.

## J. Catatan TikTok

Aplikasi ini tidak meminta password TikTok.

Koneksi LIVE nyata harus menggunakan mekanisme/API/event source yang memang tersedia dan diizinkan untuk aplikasi Anda. Jika event LIVE tidak tersedia melalui API yang Anda gunakan, gunakan gateway/connector yang sesuai ketentuan platform.

## K. Batasan versi ini

Versi V2 ini sudah menyediakan:
- Auth
- Profile
- Multi-user data isolation
- Cloud video metadata + storage upload
- Trigger
- Event log
- Admin user list dasar
- GitHub Pages compatibility

Belum termasuk:
- pembayaran otomatis
- license server/Edge Function produksi
- konektor TikTok LIVE final
- OBS automation final
- queue/anti-spam event
- analytics lengkap
- white-label per tenant

Itu sengaja dipisahkan agar fondasi SaaS tetap bersih.


## FINAL SETUP NOTES

1. Edit `config.js` before deploying. Use the Supabase Project URL and Publishable Key only.
2. NEVER put a Supabase Secret Key in `config.js` or GitHub.
3. The `videos` bucket is PRIVATE. The app creates a 1-hour signed URL when a user plays a video.
4. The SQL schema keeps the `videos` bucket private and adds admin profile policies.
5. If the existing `videos` bucket is already private, do not manually upload anything yet.
6. Large AI videos should eventually use resumable/TUS uploads for production.
