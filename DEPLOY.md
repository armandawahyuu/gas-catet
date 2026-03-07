# Deploy Guide — GasCatet

## Otomatis (CI/CD)

Push ke `main` → GitHub Actions otomatis deploy ke production.

```bash
git add -A && git commit -m "pesan commit" && git push
```

Workflow: `.github/workflows/deploy.yml`  
CI/CD menggunakan `deploy.sh` di server yang otomatis:
- Pull latest code
- Run pending migrations (tracking file, tidak re-run semua)
- Build Go API → restart → health check
- Build Next.js (skip npm ci jika package-lock.json tidak berubah) → restart → health check

## Manual (SSH)

### Server Info

| Item     | Value                |
| -------- | -------------------- |
| IP       | 43.159.45.249        |
| User     | ubuntu               |
| Domain   | gascatet.my.id       |
| SSL      | Let's Encrypt (auto) |

### SSH ke Server

```bash
ssh ubuntu@43.159.45.249
```

### Deploy Script (Recommended)

```bash
# Deploy semuanya (migrate + api + web)
/home/ubuntu/deploy.sh all

# Deploy API saja
/home/ubuntu/deploy.sh api

# Deploy Web saja
/home/ubuntu/deploy.sh web

# Run migration saja
/home/ubuntu/deploy.sh migrate
```

Deploy script otomatis:
- Track migrasi yang sudah dijalankan (skip yang lama)
- Skip `npm ci` jika `package-lock.json` tidak berubah
- Health check setelah restart
- Tampilkan durasi deploy

## Services

| Service          | Port | Memory Limit | Command                               |
| ---------------- | ---- | ------------ | ------------------------------------- |
| gascatet-api     | 3000 | 256M         | `sudo systemctl restart gascatet-api` |
| gascatet-web     | 3001 | 512M         | `sudo systemctl restart gascatet-web` |

### Cek Status

```bash
sudo systemctl status gascatet-api
sudo systemctl status gascatet-web
```

### Cek Logs

```bash
sudo journalctl -u gascatet-api -f
sudo journalctl -u gascatet-web -f
```

## Nginx

Config: `/etc/nginx/sites-enabled/gascatet`

Fitur:
- Gzip compression (JS, CSS, JSON, SVG)
- Static asset caching (`/_next/static/` → 1 year, immutable)
- Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- Custom 502 page saat deploy (auto-refresh 5 detik)
- Proxy buffering & timeout settings

## GitHub Secrets (sudah di-set)

- `SERVER_HOST` — 43.159.45.249
- `SERVER_USER` — ubuntu
- `SERVER_PASSWORD` — (password SSH)
