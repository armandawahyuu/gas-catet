# Deploy Guide — GasCatet

## Otomatis (CI/CD)

Push ke `main` → GitHub Actions otomatis deploy ke production.

```bash
git add -A && git commit -m "pesan commit" && git push
```

Workflow: `.github/workflows/deploy.yml`

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

### Deploy Backend (Go API)

```bash
cd /home/ubuntu/gas-catet
git pull origin main
export PATH=$PATH:/usr/local/go/bin
go build -o gascatet-api ./cmd/api
sudo systemctl restart gascatet-api
```

### Deploy Frontend (Next.js)

```bash
cd /home/ubuntu/gas-catet/web
git pull origin main
NEXT_PUBLIC_API_URL=https://gascatet.my.id npx next build
sudo systemctl restart gascatet-web
```

> **Penting**: Build DULU baru restart, supaya nggak ada downtime.

### Run Migrations

```bash
for f in db/migrations/*.sql; do
  sed -n '/^-- +migrate Up/,/^-- +migrate Down/p' "$f" | head -n -1 | \
  psql 'postgres://gascatet:gascatet2026@localhost:5432/gascatet?sslmode=disable' || true
done
```

## Services

| Service          | Port | Command                                  |
| ---------------- | ---- | ---------------------------------------- |
| gascatet-api     | 3000 | `sudo systemctl restart gascatet-api`    |
| gascatet-web     | 3001 | `sudo systemctl restart gascatet-web`    |

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

## GitHub Secrets (sudah di-set)

- `SERVER_HOST` — 43.159.45.249
- `SERVER_USER` — ubuntu
- `SERVER_PASSWORD` — (password SSH)
