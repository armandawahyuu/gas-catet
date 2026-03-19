# PRD: Buku Juragan v1.0

**Nama Produk:** Buku Juragan
**Tagline:** "Cukup Cekrek, Jadi Rekap. Urusan Beres, Juragan Tenang."
**Platform:** Web Dashboard + Telegram Bot
**Architecture:** Go Modular Monolith (Fiber v2) + Next.js 16 + PostgreSQL + Gemini AI

---

## 1. Masalah & Tujuan

### Masalah Agen BRILink

Agen BRILink melayani puluhan transaksi per hari (transfer, tarik tunai, setor, PPOB). Setiap transaksi ada **2 komponen biaya** yang sering lupa dicatat:
- **Admin Bank** — potongan dari BRI ke agen (biaya yang agen bayar)
- **Admin Toko** — biaya yang agen kenakan ke pelanggan (pendapatan agen)

**Laba agen = Admin Toko - Admin Bank** (per transaksi).

Masalah nyata:
1. **Catat manual di buku fisik** — rawan hilang, susah direkap
2. **Lupa catat admin bank** — agen nggak tau laba bersih sebenarnya
3. **Piutang pelanggan** — pelanggan utang tapi nggak ada catatan digital
4. **Nggak ada laporan** — akhir bulan bingung untung berapa

### Tujuan Buku Juragan

1. **Otomatisasi pencatatan** — foto struk di Telegram → AI extract data → simpan otomatis
2. **Tracking laba real-time** — dashboard yang langsung nunjukin laba bersih (admin toko - admin bank)
3. **Pencatatan piutang** — tau siapa yang masih utang, berapa, kapan
4. **Laporan bisnis** — export Excel buat kebutuhan rekap harian/mingguan/bulanan

---

## 2. User Persona

**Nama:** Pak Joko (Agen BRILink)
- Punya konter pulsa + agen BRILink di depan rumah
- Sehari melayani 15-30 transaksi (transfer, tarik tunai, bayar BPJS, token listrik, pulsa)
- Pakai HP Android, aktif di Telegram & WhatsApp
- Catat di buku tulis, sering lupa catat admin bank
- Kadang pelanggan utang — "besok ya pak" tapi lupa
- Akhir bulan nggak tau laba bersih berapa

**Kebutuhan:**
- Input secepat mungkin (foto struk, jangan banyak ketik)
- Tau laba bersih hari ini tanpa hitung manual
- Catatan piutang yang bisa dilacak
- Laporan simpel yang bisa di-download

---

## 3. Fitur Utama

### A. Telegram Bot — Input Cepat

#### A1. Foto Struk → AI Extract (Fitur Utama)
```
Agen foto struk BRILink di Telegram
        ↓
Bot download foto → kirim ke Gemini Vision API
        ↓
AI extract: Jenis Transaksi, Nominal, Admin Bank, No. Ref
        ↓
Bot balas ringkasan + tanya Admin Toko (fee agen)
        ↓
Inline Keyboard: [✅ Simpan] [✏️ Edit] [❌ Batal]
        ↓
Simpan ke database, update dashboard real-time
```

**Gemini Prompt Design:**
```
Kamu adalah asisten pencatat transaksi BRILink.
Dari foto struk ini, extract data berikut dalam format JSON:
{
  "transaction_type": "TRANSFER|TARIK_TUNAI|SETOR_TUNAI|BPJS|PLN|PULSA|LAINNYA",
  "amount": <nominal transaksi dalam rupiah>,
  "fee_bank": <admin bank/biaya yang dipotong BRI>,
  "ref_number": "<nomor referensi transaksi>",
  "description": "<keterangan singkat, misal: Transfer ke BCA a/n Siti>",
  "date": "<tanggal dari struk format YYYY-MM-DD, atau null jika tidak ada>"
}
Jika bukan struk transaksi, balas: {"error": "bukan struk"}
```

#### A2. Input Manual via Inline Keyboard (FSM)
Percakapan terstruktur pakai Finite State Machine:
1. `/catat` atau tombol "Catat Transaksi"
2. Pilih jenis: Transfer | Tarik Tunai | Setor Tunai | PPOB | Pulsa | Lainnya
3. Ketik nominal transaksi
4. Ketik admin bank (atau 0 jika nggak ada)
5. Ketik admin toko
6. Pilih tanggal (Hari ini | Kemarin | Custom)
7. Konfirmasi → Simpan

#### A3. Command Bot
| Command | Fungsi |
|---------|--------|
| `/start` | Onboarding, connect akun |
| `/catat` | Mulai catat transaksi baru (manual) |
| `/cek` | Laba bersih hari ini + 5 transaksi terakhir |
| `/piutang` | List pelanggan yang masih utang |
| `/bantuan` | Panduan singkat penggunaan bot |

#### A4. Catat Piutang via Bot
```
/piutang catat Siti 50000
→ Bot: "Piutang Siti Rp 50.000 dicatat ✅"

/piutang lunas Siti
→ Bot: "Piutang Siti sudah lunas ✅"
```

### B. Web Dashboard

#### B1. Halaman Utama — Stat Cards
3 card utama (periode bisa dipilih: hari ini / minggu ini / bulan ini):
- **Omzet** — total nominal semua transaksi
- **Laba Bersih** — total (admin_toko - admin_bank) semua transaksi
- **Jumlah Transaksi** — count transaksi

#### B2. Grafik
- **Grafik Batang Harian** — omzet & laba per hari dalam seminggu/sebulan
- **Breakdown Jenis Transaksi** — pie/donut chart: Transfer 40%, Tarik Tunai 25%, PPOB 20%, dll

#### B3. Tabel Transaksi
Kolom: Tanggal | Jenis | Deskripsi | Nominal | Admin Bank | Admin Toko | Laba | No. Ref
- Filter: tanggal range, jenis transaksi
- Search: deskripsi, no. ref
- Action: edit, hapus
- Pagination

#### B4. Buku Piutang
Tabel: Pelanggan | Nominal | Tanggal | Status
- Filter: Lunas / Belum Lunas
- Action: Tandai Lunas, Edit, Hapus
- Total piutang outstanding di atas tabel

#### B5. Export Laporan
- Export transaksi ke **Excel (XLSX)** atau CSV
- Filter: range tanggal, jenis transaksi
- Kolom: Tanggal, Jenis, Deskripsi, Nominal, Admin Bank, Admin Toko, Laba, No. Ref

#### B6. Settings
- Edit profil (nama toko, nama agen)
- Connect/disconnect Telegram
- Custom kategori transaksi (tambahan selain default BRILink)

---

## 4. Arsitektur Teknis

### Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Backend | Go 1.25, Fiber v2 |
| Database | PostgreSQL, pgx/v5 |
| SQL Codegen | sqlc |
| Auth | JWT (golang-jwt), bcrypt |
| Frontend | Next.js, React 19, TailwindCSS v4 |
| Charts | Recharts |
| Telegram Bot | Bot API (webhook mode) + FSM |
| OCR/AI | Gemini Vision API (gemini-2.0-flash-lite) |
| File Upload | Local storage (`/uploads/`) |
| Payment | Tripay (opsional, buat fitur premium) |

### Module Structure (Go Backend)

```
buku-juragan/
├── cmd/api/main.go              # Entry point, router setup
├── internal/
│   ├── database/                # PostgreSQL connection pool (pgx/v5)
│   ├── user/                    # Auth (register, login, JWT), profil agen, link Telegram
│   ├── transaction/             # CRUD transaksi (amount, fee_bank, fee_shop, ref_number)
│   ├── debt/                    # Buku piutang pelanggan (CRUD, tandai lunas)
│   ├── category/                # Kategori transaksi per user (seed default BRILink)
│   ├── wallet/                  # Manajemen saldo (BRILink, Cash, Rekening)
│   ├── telegram/                # Bot webhook, FSM, OCR (Gemini), inline keyboard
│   ├── analytics/               # Agregasi: omzet, laba bersih, chart endpoints
│   ├── admin/                   # Admin dashboard (opsional)
│   └── feedback/                # User feedback (opsional)
├── db/migrations/               # SQL migration files
├── web/                         # Next.js frontend
│   └── src/
│       ├── app/                 # Pages (dashboard, login, register)
│       ├── components/          # UI components
│       └── lib/                 # API client, auth context, utils
├── sqlc.yaml                    # sqlc config
└── .env                         # Environment variables
```

---

## 5. Skema Database

### users
```sql
CREATE TABLE users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                   VARCHAR(255) UNIQUE NOT NULL,
    password_hash           TEXT NOT NULL,
    name                    VARCHAR(100) NOT NULL,
    shop_name               VARCHAR(100) NOT NULL DEFAULT '',  -- nama toko/agen
    telegram_id             BIGINT UNIQUE,                     -- Telegram user ID
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### transactions
```sql
CREATE TYPE transaction_type AS ENUM ('INCOME', 'EXPENSE');

CREATE TABLE transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount              BIGINT NOT NULL,                -- nominal transaksi (Rupiah)
    fee_bank            BIGINT NOT NULL DEFAULT 0,      -- admin bank (biaya ke BRI)
    fee_shop            BIGINT NOT NULL DEFAULT 0,      -- admin toko (pendapatan agen)
    transaction_type    transaction_type NOT NULL,
    description         TEXT NOT NULL DEFAULT '',
    category            VARCHAR(50) NOT NULL,           -- jenis: Transfer, Tarik Tunai, dll
    ref_number          VARCHAR(50) DEFAULT '',          -- nomor referensi struk
    raw_text            TEXT DEFAULT '',                  -- raw OCR text dari AI
    receipt_url         TEXT NOT NULL DEFAULT '',         -- URL/path foto struk
    wallet_id           UUID REFERENCES wallets(id) ON DELETE SET NULL,
    transaction_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(user_id, transaction_date);
```

**Kalkulasi laba:**
- Per transaksi: `fee_shop - fee_bank`
- Total laba: `SUM(fee_shop) - SUM(fee_bank)`

### categories
```sql
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(50) NOT NULL,
    type        transaction_type NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name, type)
);
```

### wallets
```sql
CREATE TABLE wallets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(50) NOT NULL,
    icon        VARCHAR(10) NOT NULL DEFAULT '💰',
    balance     BIGINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);
```

### debts (Buku Piutang)
```sql
CREATE TABLE debts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_name   VARCHAR(100) NOT NULL,
    amount          BIGINT NOT NULL,           -- nominal piutang dalam rupiah
    description     TEXT DEFAULT '',            -- keterangan (misal: "transfer BCA")
    is_paid         BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at         TIMESTAMPTZ,               -- tanggal lunas
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_debts_user_id ON debts(user_id);
CREATE INDEX idx_debts_is_paid ON debts(user_id, is_paid);
```

### link_tokens (Telegram Linking)
```sql
CREATE TABLE link_tokens (
    token       VARCHAR(64) PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Ringkasan Tabel

| Table | Deskripsi |
|-------|-----------|
| users | Auth, profil agen, telegram linking |
| transactions | Transaksi + fee_bank + fee_shop + ref_number |
| categories | Kategori transaksi per user |
| wallets | Sumber dana (Saldo BRILink, Cash, Rekening) |
| debts | Buku piutang pelanggan |
| link_tokens | Token untuk connect akun Telegram |

---

## 6. Default Seed Data (Registrasi Agen Baru)

### Kategori Default BRILink

**EXPENSE (Biaya/Pengeluaran Agen):**
| Kategori | Deskripsi |
|----------|-----------|
| Transfer | Transfer antar bank |
| Tarik Tunai | Penarikan tunai BRILink |
| Setor Tunai | Setoran tunai |
| BPJS | Pembayaran BPJS |
| PLN Token | Token listrik |
| PLN Pascabayar | Tagihan listrik bulanan |
| Pulsa & Data | Pulsa, paket data |
| PDAM | Tagihan air |
| Telkom/Indihome | Tagihan telepon/internet |
| Cicilan/Kredit | Pembayaran angsuran |
| Top Up E-Wallet | Top up Gopay, OVO, Dana, dll |
| Lainnya | Transaksi lain |

**INCOME (Pemasukan Agen):**
| Kategori | Deskripsi |
|----------|-----------|
| Pendapatan Admin | Laba dari fee admin toko |
| Komisi BRI | Komisi/insentif dari BRI |
| Penjualan Toko | Pendapatan dari jualan toko/konter |
| Lainnya | Pemasukan lain |

### Wallet Default
- **Saldo BRILink** (🏦) — saldo di mesin BRILink
- **Cash** (💵) — uang tunai di toko
- **Rekening Pribadi** (🏧) — rekening agen

---

## 7. API Endpoints

### Auth (Public, Rate Limited: 10 req/min)
```
POST   /api/auth/register          → { email, password, name, shop_name }
POST   /api/auth/login             → { email, password } → { token, user }
```

### User (Private — JWT Required)
```
GET    /api/user/profile           → profil agen (name, shop_name, telegram_id)
PUT    /api/user/profile           → update profil (name, shop_name)
PUT    /api/user/password           → ganti password
POST   /api/user/link-telegram     → generate link token buat connect Telegram
DELETE /api/user/link-telegram     → disconnect Telegram
```

### Transactions (Private)
```
POST   /api/transactions/          → buat transaksi { amount, fee_bank, fee_shop, category, description, ref_number, transaction_type, transaction_date, wallet_id }
GET    /api/transactions/          → list transaksi (pagination, filter: date range, category, search)
GET    /api/transactions/summary   → { omzet, laba_bersih, count } (bulan ini)
GET    /api/transactions/today     → { omzet, laba_bersih, count } (hari ini)
GET    /api/transactions/export    → download CSV/XLSX (filter: date range)
GET    /api/transactions/:id       → detail transaksi
PUT    /api/transactions/:id       → update transaksi
DELETE /api/transactions/:id       → hapus transaksi
POST   /api/transactions/:id/receipt → upload foto struk
DELETE /api/transactions/:id/receipt → hapus foto struk
```

### Debts / Piutang (Private)
```
GET    /api/debts/                 → list piutang (filter: is_paid=true/false)
POST   /api/debts/                 → catat piutang baru { customer_name, amount, description }
PUT    /api/debts/:id              → edit piutang
PATCH  /api/debts/:id/pay          → tandai lunas
DELETE /api/debts/:id              → hapus piutang
GET    /api/debts/summary          → { total_outstanding, total_paid, count }
```

### Categories (Private)
```
GET    /api/categories/            → list kategori user
POST   /api/categories/            → buat kategori custom
DELETE /api/categories/:id         → hapus kategori
```

### Wallets (Private)
```
GET    /api/wallets/               → list wallet user
POST   /api/wallets/               → buat wallet baru
PUT    /api/wallets/:id            → update nama/icon wallet
PATCH  /api/wallets/:id/balance    → set saldo manual
DELETE /api/wallets/:id            → hapus wallet
```

### Analytics (Private)
```
GET    /api/analytics/summary      → { omzet, laba_bersih, count } (per bulan)
GET    /api/analytics/daily        → breakdown harian: [{ date, omzet, laba, count }]
GET    /api/analytics/top-expenses  → top kategori pengeluaran
GET    /api/analytics/categories   → breakdown per jenis transaksi
```

### Telegram (Public)
```
POST   /webhook/telegram           → Telegram Bot webhook endpoint
GET    /api/telegram/info          → bot info (username, status)
```

### Health
```
GET    /health                     → { status: "ok" }
```

---

## 8. OCR & AI Integration

### Stack
- **Gemini Vision API** (`gemini-2.0-flash-lite`) — module: `internal/telegram/ocr.go`
- Input: foto struk BRILink dari Telegram
- Output: JSON terstruktur

### Jenis Struk yang Harus Bisa Di-parse
1. **Struk Transfer** — nominal, bank tujuan, nama penerima, admin bank, no. ref
2. **Struk Tarik Tunai** — nominal, admin bank, no. ref
3. **Struk PPOB** — jenis (PLN/BPJS/Telkom), nominal, admin bank, no. ref
4. **Struk Pulsa** — nomor HP, nominal, admin bank

### AI Response Format
```json
{
  "transaction_type": "TRANSFER",
  "amount": 1000000,
  "fee_bank": 6500,
  "ref_number": "1234567890",
  "description": "Transfer BCA a/n Siti Aminah",
  "date": "2026-03-10"
}
```

Bot kemudian tanya: "Admin toko berapa, Juragan?" → Agen ketik nominal → Simpan.

### Edge Cases
- Foto blur / nggak jelas → Bot: "Maaf Juragan, struk-nya kurang jelas. Coba foto ulang ya 📸"
- Bukan foto struk → Bot: "Ini bukan struk transaksi. Kirim foto struk BRILink buat dicatat otomatis 🧾"
- AI gagal extract → Fallback ke input manual via FSM

---

## 9. Design Guideline

### Warna
| Token | Hex | Penggunaan |
|-------|-----|------------|
| Primary | `#00529C` | Navy Blue — header, button, link (warna BRI) |
| Success | `#16A34A` | Green — laba positif, status lunas |
| Warning | `#EA580C` | Orange — piutang belum lunas, alert |
| Danger | `#DC2626` | Red — rugi, hapus |
| Background | `#F9FAFB` | Soft Gray — body background |
| Card | `#FFFFFF` | White — card background |
| Text | `#111827` | Dark — body text |
| Muted | `#6B7280` | Gray — secondary text |

### Typography
- **Font:** Plus Jakarta Sans (Google Fonts)
- Heading: Bold, ukuran proporsional
- Body: Regular 14-16px

### Style
- Flat, clean, high-contrast
- Tanpa gradasi, shadow tipis (`shadow-sm`)
- Border radius kecil (`rounded-lg`)
- Card-based layout
- Mobile-first (agen akses dari HP)
- Nggak pakai Neo-brutalism (terlalu "techy" buat target agen BRILink)

---

## 10. Halaman Web

### Public
- `/` — Landing page (penjelasan produk, CTA daftar)
- `/login` — Login (email + password)
- `/register` — Registrasi (nama, email, password, nama toko)

### Dashboard (Auth Required)
- `/dashboard` — Stat cards + grafik + 5 transaksi terakhir
- `/dashboard/transactions` — Tabel transaksi lengkap (CRUD, filter, search)
- `/dashboard/debts` — Buku piutang (CRUD, filter lunas/belum)
- `/dashboard/analytics` — Grafik detail (harian, breakdown kategori)
- `/dashboard/telegram` — Connect akun Telegram
- `/dashboard/settings` — Edit profil, nama toko, password
- `/dashboard/export` — Export laporan Excel/CSV

### Opsional (Phase 2)
- `/dashboard/wallets` — Manajemen saldo
- `/dashboard/categories` — Custom kategori
- `/dashboard/admin` — Admin panel

---

## 11. Telegram Bot Flow Detail

### Onboarding
```
User: /start
Bot:  "Halo Juragan! 👋 Selamat datang di Buku Juragan.
       Asisten pencatat transaksi BRILink kamu.

       📸 Kirim foto struk → otomatis dicatat
       ✍️ /catat → catat manual
       💰 /cek → lihat laba hari ini
       📋 /piutang → kelola piutang pelanggan

       Untuk mulai, hubungkan akun kamu dulu di web:
       🔗 https://bukujuragan.id/dashboard/telegram"
```

### Flow Foto Struk (Utama)
```
User: [kirim foto struk]
Bot:  "⏳ Proses struk..."
Bot:  "📋 Hasil:
       Jenis: Transfer
       Nominal: Rp 1.000.000
       Admin Bank: Rp 6.500
       No. Ref: 1234567890
       Ket: Transfer BCA a/n Siti

       💰 Admin toko berapa, Juragan?"
User: "5000"
Bot:  "✅ Dicatat!
       Laba transaksi ini: Rp 5.000 - Rp 6.500 = -Rp 1.500

       [✏️ Edit] [❌ Hapus]"
```

### Flow Manual (/catat)
```
User: /catat
Bot:  "Pilih jenis transaksi:"
      [Transfer] [Tarik Tunai] [Setor Tunai]
      [PPOB] [Pulsa] [Lainnya]
User: [Transfer]
Bot:  "Nominal transaksi?"
User: "1000000"
Bot:  "Admin bank?"
User: "6500"
Bot:  "Admin toko?"
User: "5000"
Bot:  "Keterangan? (atau ketik - untuk skip)"
User: "Transfer BCA Siti"
Bot:  "Tanggal?"
      [Hari ini] [Kemarin] [Custom]
User: [Hari ini]
Bot:  "✅ Transaksi dicatat!
       Transfer - Rp 1.000.000
       Admin Bank: Rp 6.500 | Admin Toko: Rp 5.000
       Laba: Rp -1.500"
```

### Flow /cek
```
User: /cek
Bot:  "📊 Laporan Hari Ini (10 Mar 2026):
       ━━━━━━━━━━━━━━━━
       💰 Omzet: Rp 5.250.000
       📈 Laba Bersih: Rp 87.500
       📝 Transaksi: 12

       5 Terakhir:
       1. Transfer Rp 1.000.000 (laba -Rp 1.500)
       2. Tarik Tunai Rp 500.000 (laba Rp 3.000)
       3. PLN Token Rp 200.000 (laba Rp 2.500)
       4. Pulsa Rp 50.000 (laba Rp 2.000)
       5. BPJS Rp 150.000 (laba Rp 1.500)"
```

### Flow /piutang
```
User: /piutang
Bot:  "📋 Piutang Belum Lunas:
       1. Siti - Rp 50.000 (3 hari lalu)
       2. Budi - Rp 100.000 (5 hari lalu)
       Total: Rp 150.000

       /piutang catat [nama] [nominal]
       /piutang lunas [nama]"
```

---

## 12. Roadmap Implementasi

### Phase 1: Foundation (Backend + Database)

1. **Setup project** — Go module, Fiber router, PostgreSQL connection pool
2. **Database migrations** — Buat semua tabel (users, transactions, categories, wallets, debts, link_tokens)
3. **Auth module** (`internal/user/`) — Register, Login, JWT middleware, profil
4. **Transaction module** (`internal/transaction/`) — CRUD dengan fee_bank, fee_shop, ref_number
5. **Category module** (`internal/category/`) — CRUD + seed default BRILink
6. **Wallet module** (`internal/wallet/`) — CRUD + seed default (Saldo BRILink, Cash, Rekening)
7. **Debt module** (`internal/debt/`) — CRUD piutang, tandai lunas, summary
8. **sqlc setup** — Config + generate type-safe queries

### Phase 2: Telegram Bot

1. **Bot setup** (`internal/telegram/bot.go`) — Webhook handler, Telegram API client
2. **FSM engine** (`internal/telegram/fsm.go`) — State machine untuk percakapan (idle → pilih jenis → nominal → fee_bank → fee_shop → konfirmasi)
3. **OCR service** (`internal/telegram/ocr.go`) — Gemini Vision API integration, prompt BRILink
4. **Bot handler** (`internal/telegram/handler.go`) — /start, /catat, /cek, /piutang, foto struk
5. **Daily reporter** (`internal/telegram/reporter.go`) — Laporan harian otomatis via Telegram
6. **Account linking** — Token-based linking dari web ke Telegram

### Phase 3: Frontend (Next.js)

1. **Setup** — Next.js + TailwindCSS + API client + auth context
2. **Auth pages** — Login, Register (dengan field nama toko)
3. **Dashboard** — Stat cards (omzet, laba, count) + grafik harian + 5 transaksi terakhir
4. **Halaman Transaksi** — Tabel CRUD dengan kolom fee_bank, fee_shop, laba, ref_number
5. **Halaman Piutang** — Tabel CRUD piutang pelanggan
6. **Halaman Analytics** — Grafik batang harian, breakdown kategori
7. **Halaman Telegram** — Connect/disconnect akun Telegram
8. **Settings** — Edit profil, nama toko, ganti password
9. **Export** — Download laporan CSV/XLSX

### Phase 4: Polish & Launch

1. **Landing page** — Penjelasan produk, CTA daftar
2. **Design system** — Terapkan color scheme BRI (navy blue), Plus Jakarta Sans
3. **Mobile responsive** — Pastikan semua halaman mobile-friendly
4. **Testing OCR** — Test dengan berbagai jenis struk BRILink asli
5. **Optimize AI prompt** — Iterasi prompt Gemini sampai akurasi > 90%
6. **Deploy** — Backend (VPS/Railway), Frontend (Vercel), PostgreSQL (managed)

---

## 13. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/bukujuragan

# Auth
JWT_SECRET=<random-secret-key>

# Server
APP_PORT=3000
CORS_ORIGINS=http://localhost:3001

# Telegram Bot
TELEGRAM_BOT_TOKEN=<dari-@BotFather>
TELEGRAM_BOT_USERNAME=bukujuragan_bot
TELEGRAM_WEBHOOK_SECRET=<random-secret>

# AI/OCR — Gemini Vision API
GEMINI_API_KEY=<dari-Google-AI-Studio>
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_MODEL=gemini-2.0-flash-lite

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## 14. Metrik Sukses

| Metrik | Target |
|--------|--------|
| Akurasi OCR struk BRILink | > 90% extract benar |
| Waktu input via foto | < 15 detik (foto → simpan) |
| Daily active users | 50 agen dalam 3 bulan |
| Retensi minggu ke-2 | > 60% |
| Transaksi per user per hari | > 10 |

---

**Fokus utama: akurasi AI buat parse struk BRILink & kecepatan akses dari Telegram.**