\# คู่มือพัฒนา Boardly



\## 1. เทคโนโลยีที่ใช้



\- Frontend: React 19, TypeScript, Vite 8, Tailwind CSS 4

\- Frontend package manager: pnpm 10.34.3

\- Backend: Java 21, Spring Boot 3.3.5, Maven

\- Database: PostgreSQL 16

\- E2E Testing: Cypress

\- Unit Testing: Vitest และ JUnit



\## 2. เครื่องมือที่ต้องติดตั้ง



\- Node.js 22

\- Corepack และ pnpm 10.34.3

\- Java JDK 21

\- Maven

\- Docker Desktop และ Docker Compose



ตรวจสอบเวอร์ชัน:



```powershell

node --version

pnpm --version

java -version

docker --version

docker compose version

```



\## 3. ติดตั้ง Frontend Dependencies



จาก Repository root:



```powershell

Set-Location .\\frontend

corepack enable

corepack prepare pnpm@10.34.3 --activate

pnpm install --frozen-lockfile

```



เริ่ม Frontend Development Server:



```powershell

pnpm dev

```



ใช้ URL ที่ Vite แสดงใน Terminal



\## 4. เริ่มระบบด้วย Docker Compose



กลับไป Repository root:



```powershell

Set-Location ..

docker compose up --build -d

docker compose ps

```



บริการที่เปิดใช้งาน:



\- Frontend: `http://localhost:8443`

\- Backend Health: `http://localhost:8080/api/health`

\- Frontend ผ่าน Backend Proxy: `http://localhost:8443/api/health`

\- PostgreSQL: `localhost:5433`



หยุดบริการ:



```powershell

docker compose down

```



คำสั่งนี้เก็บ Database Volume ไว้ ห้ามเติม `-v` หากไม่ต้องการลบข้อมูล



\## 5. ทดสอบ Frontend



จาก `frontend/`:



```powershell

pnpm test

pnpm test:coverage

pnpm build

```



\## 6. ทดสอบ Backend



จาก `backend/` โดยใช้ Java 21 และมี PostgreSQL สำหรับ Test Environment:



```powershell

mvn -B clean verify

```



CI ใช้ PostgreSQL 16 สำหรับ Backend Tests



\## 7. โครงสร้าง Repository



\- `frontend/` — React Application และ Nginx Configuration

\- `backend/` — Spring Boot REST API

\- `database/` — Schema, Seed Data และ Migrations

\- `k8s/` — Kubernetes Base Manifests

\- `k8s/local/` — Local Minikube Overlay

\- `docs/` — คู่มือการพัฒนาและการ Deploy

\- `.github/workflows/` — CI และ Manual Release Workflows

\- `compose.yaml` — Local Docker Compose Stack



\## 8. แนวทางการทำงาน



\- ใช้ pnpm และ `pnpm-lock.yaml` สำหรับ Frontend

\- ใช้ Java 21 สำหรับ Backend

\- อย่า Commit `.env`, Password, JWT Secret หรือ Credential

\- ตรวจสอบ `git diff` และทดสอบก่อน Commit

\- ใช้ Pull Request และรอ CI ผ่านก่อน Merge

\- อ่าน `LOCAL\_KUBERNETES.md` สำหรับ Local Kubernetes

\- อ่าน `RELEASE.md` สำหรับ CI/CD และ Release

