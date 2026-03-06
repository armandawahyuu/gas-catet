Bungkus, Wahyu! Nama GasCatet ini emang paling dapet vibe-nya. Sat-set, nggak ribet, dan bener-bener ngewakilin fungsi utamanya: tinggal buka Telegram, ketik angkanya, gas catet!

Ini update final untuk dokumen prd.md lu. Silakan langsung di-copy-paste buat modal vibe coding lu nanti.

📄 Product Requirements Document (PRD)
Project Name: GasCatet

Platform: Web Application & Telegram Bot

Target Market: Indonesia (Fokus kemudahan pencatatan keuangan harian yang sat-set)

Architecture: Modular Monolith (Golang)

1. Executive Summary
GasCatet adalah aplikasi pelacak keuangan personal yang menyelesaikan masalah "mager nyatet" melalui integrasi Telegram Bot interaktif. Menggunakan sistem Finite State Machine (FSM) via Inline Keyboards, pengguna dapat mencatat pengeluaran dan pemasukan dengan sangat cepat tanpa perlu menghafal format teks. Data dari Telegram tersinkronisasi secara real-time ke dashboard Web bergaya Neo-brutalism.

2. Brand Guidelines & UI/UX
Vibe & Persona: Kasual, action-oriented, cepat. Bot Telegram bertindak sebagai asisten pencatat yang responsif dan anti-ribet.

Design Style: Neo-brutalism. Garis tepi tebal (border-2 border-black), bayangan solid (hard shadows), tanpa gradasi, dan tata letak raw/edgy.

Color Palette:

🔴 Primary (Pengeluaran/Action): #FF3B30

🟡 Secondary (Highlight/Kategori): #FFCC00

🟢 Accent (Pemasukan/Aman): #00C781

⚫ Base (Teks & Border): #121212

⚪ Background: #FAFAFA

Typography:

Heading: Space Grotesk / Clash Display.

Body: Plus Jakarta Sans / Inter.

Angka/Nominal: JetBrains Mono / Fira Code.

3. System Architecture & Tech Stack
Backend: Golang (Fiber atau Gin) dengan pola arsitektur Modular Monolith. Sangat bersahabat untuk alur kerja vibe coding karena konteks kode terpusat dan mudah dipahami oleh AI.

Database: PostgreSQL.

Database Tooling: sqlc untuk type-safe SQL atau GORM.

State Management (Bot): In-memory cache (fase MVP) atau Redis (fase Production) untuk FSM Telegram.

Frontend: Next.js / React dengan TailwindCSS.

4. Core Modules
Aplikasi dibagi menjadi 4 modul utama di dalam direktori /internal/...:

A. User & Auth Module (/internal/user)
Autentikasi Web (Login/Register via Email & Password).

Telegram Linking: Mengeluarkan kode unik (Token Tautan) di Web yang dikirimkan pengguna ke Bot Telegram untuk mengaitkan telegram_id dengan akun Web mereka.

B. Telegram Bot Module (/internal/telegram)
Mengelola Webhook masuk dari server Telegram.

Menjalankan Finite State Machine (FSM) untuk melacak posisi percakapan user.

Memproses CallbackQuery dari Inline Keyboards (tombol Telegram).

Zero-AI Parsing: Seluruh input difilter melalui alur tombol statis untuk menghemat biaya server dan memastikan akurasi data 100%.

C. Transaction Module (/internal/transaction)
Menangani operasi CRUD (Create, Read, Update, Delete) untuk transaksi keuangan.

Memvalidasi input nominal menjadi tipe data Integer yang aman.

Menerapkan stempel waktu (Timestamp) yang akurat.

D. Analytics & Dashboard Module (/internal/analytics)
Menyediakan endpoint API agregasi (contoh: Total Pengeluaran Bulan Ini, Sisa Saldo).

Mengirimkan data dalam format JSON untuk dirender menjadi grafik/visualisasi di frontend Web.

5. User Flow: Telegram FSM (Input Gateway)
Alur ketika pengguna mencatat transaksi via Telegram:

State 0 (Idle): User tap /start atau Menu.

Bot: "Mau nyatet apa nih bos?" + Tombol [ 💸 Pengeluaran ] & [ 💰 Pemasukan ]

State 1 (Waiting for Name): User klik tipe transaksi (misal Pengeluaran).

Bot: "Beli apa tuh? (Ketik nama barangnya)"

State 2 (Waiting for Amount): User mengetik nama barang (misal: "Kopi").

Bot: "Berapa harganya? (Ketik angkanya aja, misal: 40000)"

State 3 (Waiting for Date): User mengetik nominal (misal: "40000").

Bot: "Kapan transaksinya?" + Tombol [ 🕒 Hari Ini ] & [ 🔙 Kemarin ] & [ 📅 Pilih Tanggal ]

State 4 (Finish/Insert DB): User menekan [ 🕒 Hari Ini ].

Bot: "✅ Gas! Kopi Rp40.000 udah masuk catetan GasCatet." (Data masuk ke PostgreSQL secara asinkron menggunakan Goroutines).

6. Database Schema (PostgreSQL)
Table: users

id (UUID, Primary Key)

email (VARCHAR, Unique, Not Null)

password_hash (VARCHAR, Not Null)

telegram_id (BIGINT, Unique, Nullable)

name (VARCHAR, Not Null)

created_at (TIMESTAMP)

Table: transactions

id (UUID, Primary Key)

user_id (UUID, Foreign Key to users)

amount (BIGINT, Not Null) - Disimpan sebagai integer (bukan float).

transaction_type (VARCHAR, Not Null) - Hanya menerima INCOME atau EXPENSE.

description (TEXT)

transaction_date (TIMESTAMP) - Waktu transaksi yang dipilih user.

created_at (TIMESTAMP) - Waktu sistem mencatat ke DB.

7. Technical Considerations & Constraints
Timezone Handling (Krusial): Seluruh pencatatan waktu transaksi harian (transaction_date) wajib menggunakan Waktu Indonesia Barat (WIB). Set timezone Golang ke Asia/Jakarta (time.LoadLocation("Asia/Jakarta")) agar pencatatan timestamp pada database selalu sinkron dan presisi dengan waktu aktual di Pontianak.

Development Environment: Codebase dirancang ringan dan optimal untuk dikompilasi pada arsitektur ARM64 Apple Silicon. Proses iterasi lokal akan berjalan instan tanpa kendala performa.