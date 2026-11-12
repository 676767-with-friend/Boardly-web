# พัฒนาและทดสอบ Boardly

## เครื่องมือ

Frontend ใช้ Node.js 22 และ pnpm 10.34.3; backend ใช้ Java 21 และ Maven
ระบบรวมใช้ Docker Desktop และ Docker Compose

## Frontend (PowerShell)

จากโฟลเดอร์หลัก:

```powershell
Set-Location frontend
corepack enable
corepack prepare pnpm@10.34.3 --activate
pnpm install --frozen-lockfile
pnpm dev
```

ใช้ URL ที่ Vite แสดง หากต้องการตรวจสอบก่อนส่ง PR ให้รันใน `frontend/`:

```powershell
pnpm build
pnpm test:coverage
```

## Backend (PowerShell)

การทดสอบ backend ต้องมี PostgreSQL ที่มี schema/seed data แล้ว เปิด stack ตาม [README](../README.md) ก่อน จากนั้นรันใน `backend/` (PowerShell):

```powershell
$env:DB_URL = "jdbc:postgresql://localhost:5433/boardly_db"
$env:DB_USERNAME = "boardly"
$env:DB_PASSWORD = "boardly"
mvn -B clean verify
```

CI ใช้ PostgreSQL 16 แยกสำหรับการทดสอบ

## ทั้งระบบ (PowerShell)

จากโฟลเดอร์หลัก ใช้คำสั่งเริ่มต้นใน [README](../README.md) หากต้องดูสถานะหรือหยุด:

```powershell
docker compose ps
docker compose down
```

Frontend อยู่ที่ `http://localhost:8443`, backend health ที่ `http://localhost:8080/api/health` และ PostgreSQL ที่ `localhost:5433` อย่าใช้ `docker compose down -v` หากต้องเก็บข้อมูลเดิม

โครงสร้างหลัก: `frontend/`, `backend/`, `database/`, `k8s/` และ `.github/workflows/` อย่าบันทึกรหัสผ่าน, `.env` หรือ kubeconfig ลง Git
