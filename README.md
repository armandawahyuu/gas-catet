# ⚡ GasCatet

**Personal Finance Tracker — Telegram Bot + Web Dashboard**

> Sat-set nyatet keuangan. Buka Telegram, ketik angkanya, gas catet!

GasCatet adalah aplikasi pelacak keuangan personal yang menyelesaikan masalah **"mager nyatet"** melalui integrasi Telegram Bot interaktif. Catat pengeluaran dan pemasukan langsung dari Telegram dengan sistem tombol — tanpa perlu hafal format. Data tersinkronisasi real-time ke dashboard Web bergaya **Neo-brutalism**.

**by [Codebyu](https://github.com/armandawahyuu)**

---

## ✨ Fitur Utama

### 🤖 Telegram Bot
- Catat transaksi via **Inline Keyboard** (tombol interaktif)
- **Finite State Machine (FSM)** — alur percakapan terstruktur, nggak perlu hafal command
- Pilih tipe → kategori → nama → nominal → tanggal → selesai!
- `/saldo` — cek saldo bulan ini langsung dari chat
- Deep link one-click connect dari web ke Telegram

### 🌐 Web Dashboard
- **Dashboard** — ringkasan keuangan bulan ini (pemasukan, pengeluaran, saldo)
- **Transaksi** — CRUD lengkap dengan filter & kategori
- **Analitik** — chart harian, tren bulanan, top pengeluaran, breakdown per kategori
- **Telegram** — hubungkan akun Telegram dengan satu klik
- **Settings** — edit profil, ganti password, custom kategori

### 🏷️ Custom Kategori
- Buat kategori sendiri untuk pengeluaran & pemasukan
- Kategori default otomatis tersedia saat registrasi
- Sinkron di Web dan Telegram Bot

---

## 🏗️ Arsitektur

```
Modular Monolith (Golang)
├── /internal/user         → Auth, JWT, profil, link Telegram
├── /internal/transaction  → CRUD transaksi, summary
├── /internal/telegram     → Webhook, FSM, inline keyboard
├── /internal/analytics    → Agregasi data, chart endpoints
├── /internal/category     → Custom kategori per user
└── /internal/database     → PostgreSQL connection pool
```

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Backend** | Go 1.25, Fiber v2 |
| **Database** | PostgreSQL, pgx/v5 |
| **SQL Codegen** | sqlc |
| **Auth** | JWT (golang-jwt), bcrypt |
| **Frontend** | Next.js 16, React 19, TailwindCSS v4 |
| **Charts** | Recharts |
| **Bot** | Telegram Bot API (webhook mode) |
| **Tunnel** | Cloudflared (dev) |
| **Design** | Neo-brutalism |

---

## 📁 Struktur Project

```
gas-catet/
├── cmd/api/main.go           # Entry point
├── internal/
│   ├── user/                  # Auth & user management
│   ├── transaction/           # Transaction CRUD
│   ├── telegram/              # Bot webhook & FSM
│   ├── analytics/             # Data aggregation
│   ├── category/              # Custom categories
│   └── database/              # DB connection
├── db/migrations/             # SQL migrations
├── web/                       # Next.js frontend
│   ├── src/app/dashboard/     # Dashboard pages
│   ├── src/lib/               # API client, auth, utils
│   └── public/                # Static assets
├── sqlc.yaml                  # sqlc configuration
├── .env.example               # Environment template
└── prd.md                     # Product Requirements
```

---

## 🚀 Getting Started

### Prerequisites

- **Go** 1.25+
- **Node.js** 18+
- **PostgreSQL** 15+
- **sqlc** (optional, untuk regenerate queries)

### 1. Clone & Setup Environment

```bash
git clone https://github.com/armandawahyuu/gas-catet.git
cd gas-catet
cp .env.example .env
```

Edit `.env` sesuai konfigurasi lokal:

```env
DATABASE_URL=postgres://user:password@localhost:5432/gascatet?sslmode=disable
JWT_SECRET=your-super-secret-key-change-this
APP_PORT=3000
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_BOT_USERNAME=your_bot_username
```

### 2. Setup Database

```bash
createdb gascatet
psql -d gascatet -f db/migrations/001_create_users.sql
psql -d gascatet -f db/migrations/002_create_transactions.sql
psql -d gascatet -f db/migrations/003_add_category.sql
psql -d gascatet -f db/migrations/004_custom_categories_and_user_update.sql
```

> **Note:** Jalankan hanya bagian `-- +migrate Up` dari setiap file migration.

### 3. Run Backend

```bash
go run cmd/api/main.go
```

Backend akan berjalan di `http://localhost:3000`.

### 4. Run Frontend

```bash
cd web
npm install
npm run dev
```

Frontend akan berjalan di `http://localhost:3001`.

### 5. Setup Telegram Bot (Optional)

1. Buat bot di [@BotFather](https://t.me/BotFather)
2. Masukkan token dan username ke `.env`
3. Expose backend dengan tunnel (cloudflared/ngrok)
4. Set webhook:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<TUNNEL_URL>/webhook/telegram"
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/register` | Registrasi user baru |
| POST | `/api/auth/login` | Login, return JWT |

### User (🔒 Protected)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/user/profile` | Get profil user |
| PUT | `/api/user/profile` | Update nama & email |
| PUT | `/api/user/password` | Ganti password |
| POST | `/api/user/link-telegram` | Generate link token |

### Transactions (🔒 Protected)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/transactions/` | List transaksi (filter, pagination) |
| POST | `/api/transactions/` | Buat transaksi baru |
| GET | `/api/transactions/:id` | Detail transaksi |
| PUT | `/api/transactions/:id` | Update transaksi |
| DELETE | `/api/transactions/:id` | Hapus transaksi |
| GET | `/api/transactions/summary` | Ringkasan bulanan |

### Categories (🔒 Protected)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/categories/` | List kategori user |
| POST | `/api/categories/` | Tambah kategori baru |
| DELETE | `/api/categories/:id` | Hapus kategori |

### Analytics (🔒 Protected)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/analytics/summary` | Summary bulan ini |
| GET | `/api/analytics/daily` | Breakdown harian |
| GET | `/api/analytics/trend` | Tren bulanan |
| GET | `/api/analytics/top-expenses` | Top pengeluaran |
| GET | `/api/analytics/categories` | Breakdown per kategori |

### Telegram
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/telegram/info` | Info bot (public) |
| POST | `/webhook/telegram` | Webhook handler |

---

## 🎨 Design System

**Neo-brutalism** — bold, raw, anti-ribet.

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#FF3B30` | Pengeluaran, CTA, danger |
| Secondary | `#FFCC00` | Highlight, kategori |
| Accent | `#00C781` | Pemasukan, success |
| Base | `#121212` | Teks, border |
| Background | `#FAFAFA` | Page background |

**Typography:**
- Heading: Space Grotesk
- Body: Plus Jakarta Sans
- Numbers: JetBrains Mono

**Components:** Border 3px solid, hard shadow `4px 4px 0px #121212`, no gradients, no rounded corners.

---

## 🤖 Telegram Bot Flow

```
/start → Menu Utama
  ├── 💸 Pengeluaran → Pilih Kategori → Nama Item → Nominal → Tanggal → ✅ Tercatat!
  └── 💰 Pemasukan  → Pilih Kategori → Nama Item → Nominal → Tanggal → ✅ Tercatat!

/saldo → Ringkasan bulan ini
/help  → Panduan penggunaan
```

---

## 📝 Catatan Teknis

- **Timezone:** Semua waktu menggunakan WIB (`Asia/Jakarta`)
- **Amount:** Disimpan sebagai `BIGINT` (integer), bukan float
- **FSM:** In-memory (MVP), siap migrasi ke Redis
- **Auth:** JWT 72 jam expiry, bcrypt password hashing
- **Categories:** Per-user, seeded otomatis saat registrasi

---

## 📄 License

MIT License — feel free to use and modify.

---

<p align="center">
  <b>⚡ GasCatet</b> — Sat-set nyatet keuangan!<br>
  <sub>Built with ❤️ by <a href="https://github.com/armandawahyuu">Codebyu</a></sub>
</p>
