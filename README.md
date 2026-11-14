# Boardly

เว็บจัดการร้านบอร์ดเกมและคาเฟ่ ลูกค้าสมัครบัญชี เลือกสินค้า สั่งรับหน้าร้าน จองโต๊ะและดูการแจ้งเตือน พนักงานรับ walk-in/check-in จัดการรอบเล่น ชำระเงินและสินค้า ผู้จัดการ/ผู้ดูแลจัดการสาขา โต๊ะ สินค้าและผู้ใช้ตามสิทธิ์

## เทคโนโลยี

React 19, TypeScript 5.7, Vite 8, Tailwind CSS 4; Java 21, Spring Boot 3.3.5, Spring Security/JPA, Maven; PostgreSQL 16 ทดสอบด้วย Vitest/Testing Library, JUnit/MockMvc/JaCoCo และ Cypress ใช้ Docker Compose, Kubernetes/Minikube และ GitHub Actions ส่วน Vercel ให้บริการ frontend แยกกัน

## สิ่งที่ต้องติดตั้ง

| วิธีใช้งาน | เครื่องมือ |
| --- | --- |
| Docker Compose | Git, Docker และ Compose v2; Windows ใช้ Docker Desktop แบบ Linux containers |
| Manual development | เพิ่ม Node.js 22, pnpm 10.34.3, Java 21 และ Maven 3.9+ |
| Kubernetes | Linux หรือ Ubuntu WSL2 บนเครื่องที่ทีมอนุญาต พร้อม Bash, Docker, kubectl, Minikube และ dedicated Linux runner |

แอปในเครื่องไม่บังคับใช้ cloud database, Vercel หรือ external image registry การดาวน์โหลด dependencies/base images และ GitHub Actions ยังต้องใช้อินเทอร์เน็ต

## เริ่มด้วย Docker Compose

จาก root (PowerShell หรือ Bash):

```powershell
docker compose up -d --build --wait --wait-timeout 300
docker compose ps
```

| บริการ | URL/address |
| --- | --- |
| เว็บ | http://localhost:8443 |
| API ผ่าน frontend | http://localhost:8443/api/health |
| Backend โดยตรง | http://localhost:8080/api/health |
| PostgreSQL พัฒนา | localhost:5433 / boardly_db |

Volume ใหม่รัน schema แล้ว seed จาก `database/Boardly_schema.sql` และ `database/seed-dev.sql` ก่อน service `db-migrate` รัน migration แล้ว backend จึงเริ่ม บัญชี demo ใน seed ใช้กับข้อมูลพัฒนาเท่านั้น

```powershell
docker compose logs --tail=100 db db-migrate backend
docker compose down
```

`down` เก็บ volume ห้ามเติม `-v` หากต้องเก็บข้อมูล รหัส `boardly` ใน Compose ใช้กับฐานใหม่ของชุดนี้เท่านั้น ไม่รับประกันตรงกับ volume เดิม อย่าลบข้อมูลเพื่อแก้รหัส/schema ไม่ตรง

## พัฒนาแบบ manual

จาก root เปิดฐานข้อมูลก่อน (PowerShell):

```powershell
docker compose up -d --wait db
docker compose run --rm db-migrate
Set-Location backend
$env:SPRING_PROFILES_ACTIVE = "dev"
$env:DB_URL = "jdbc:postgresql://localhost:5433/boardly_db"
$env:DB_USERNAME = "boardly"
$env:DB_PASSWORD = "boardly"
$env:JWT_SECRET = "boardly-manual-development-secret-at-least-32-characters"
mvn spring-boot:run
```

ตัวอย่างนี้ใช้ฐาน Compose ใหม่ หากเป็นฐานเดิมให้ใช้ credentials จริง เปิด terminal อีกหน้าจาก root:

```powershell
Set-Location frontend
corepack enable
corepack prepare pnpm@10.34.3 --activate
pnpm install --frozen-lockfile
pnpm dev
```

Vite ใช้ http://localhost:8443 และ proxy `/api` ไป port 8080 หยุด frontend/backend ใน Compose ก่อนถ้ารันชนกับ manual servers ดู [การพัฒนา](docs/DEVELOPMENT.md)

## ทดสอบ

Frontend ใน `frontend/`:

```powershell
pnpm build
pnpm test:coverage
```

Backend tests ต้องใช้ฐานข้อมูลแยก ห้ามชี้ไปฐานพัฒนาปกติหรือข้อมูลใช้งาน จาก root เปิด PowerShell ใหม่:

```powershell
$env:BOARDLY_DB_PORT = "55433"
docker compose -p boardly-test up -d --wait db
docker compose -p boardly-test run --rm db-migrate
Set-Location backend
$env:SPRING_PROFILES_ACTIVE = "test"
$env:DB_URL = "jdbc:postgresql://localhost:55433/boardly_db"
$env:DB_USERNAME = "boardly"
$env:DB_PASSWORD = "boardly"
$env:JWT_SECRET = "boardly-isolated-test-secret-at-least-32-characters"
mvn -B clean verify
Set-Location ..
docker compose -p boardly-test down
Remove-Item Env:BOARDLY_DB_PORT
```

Project `boardly-test` แยก volume/port จาก development ตรวจ credentials/schema ก่อน reuse ฐานทดสอบเดิม รายงาน coverage อยู่ที่ `backend/target/site/jacoco/index.html` และ `frontend/coverage/index.html`

Cypress ต้องใช้ stack เต็มบน port 8443 เริ่มด้วย Compose quick start ด้านบน แล้วรันใน `frontend/`:

```powershell
pnpm exec cypress install
pnpm exec cypress run
```

Release guard tests จาก root: `node .github/scripts/release-guard.test.cjs`

## CI/CD และ Vercel

CI บน GitHub-hosted runners ต้องผ่านครบ: `Frontend (build + Vitest)`, `Backend (mvn verify)` และ `E2E (Cypress)` PR ไม่ใช้ persistent runner

Release workflow ถูกออกแบบให้เริ่มหลัง push CI บน main ผ่าน ใช้ SHA ที่ทดสอบจริง checkout และ tag images บน dedicated Linux self-hosted runner จากนั้น load เข้า Minikube profile `boardly-dev` ไม่ publish images ภายนอก มี manual retry บน main ผ่าน gate เดียวกัน ข้าม revision ที่ main แทนที่แล้ว และ serialize deployment โดยไม่ยกเลิกงานที่กำลังรัน

[Vercel frontend](https://boardly-web-ebon.vercel.app/) ใช้ Git integration แยกกัน ยังเปิด automatic deployment ตรวจ production branch main, root frontend และผล deploy ใน dashboard ไม่ใช่ URL ของ Minikube

เครื่อง, Docker, Minikube และ runner ต้องพร้อมตอน deploy/สาธิต เมื่อ offline CI/Vercel ยังทำงานได้ แต่ local deployment รอ runner และอาจหมดเวลารอ ไม่บังคับเปิด 24 ชั่วโมง

สถานะ session นี้: เตรียม repo สำหรับเครื่องเป้าหมายอื่น ยังไม่ได้ยืนยัน local deploy หรือ Auto CD end-to-end ดู [Release และ runner](docs/RELEASE.md)

## Kubernetes

ใช้ canonical manifests `k8s/` ผ่าน `k8s/local/` และ dedicated profile `boardly-dev` Setup/Secret/migration ตาม [คู่มือ Minikube](docs/LOCAL_KUBERNETES.md) ห้ามใช้ shared/production cluster

หลัง deploy ผ่านแล้ว เปิดจากเครื่องเป้าหมาย:

```bash
kubectl --context boardly-dev -n boardly port-forward svc/frontend 8088:80
```

เข้า http://localhost:8088 และ http://localhost:8088/api/health หยุดโดยเก็บข้อมูลด้วย `minikube -p boardly-dev stop`

## Troubleshooting และ observability

- Docker ไม่พร้อม: เปิด Docker Desktop ตรวจ `docker info`; WSL ต้องเปิด integration สำหรับ distro ที่ใช้
- Port ชน: หยุด service เดิม หรือตั้ง `BOARDLY_DB_PORT`, `BOARDLY_BACKEND_PORT`, `BOARDLY_FRONTEND_PORT` ให้สอดคล้องกัน
- Backend ไม่เริ่ม: ตรวจ Java, DB credentials, schema/seed/migration และ JWT secret อย่างน้อย 32 ตัวอักษร
- Migration ล้มเหลว: ดู logs ก่อนแก้ schema ไม่ลบ volume/PVC; `IF NOT EXISTS` ไม่ซ่อมตารางเดิมที่มีโครงสร้างผิด
- Image หาไม่พบ: ตรวจ profile, SHA tags และ image loading ใน profile เดียวกับ runner
- Runner ไม่รับงาน: ตรวจ label, online และ environment approval ตามคู่มือ Release

มี health/readiness endpoint ที่รวมสถานะฐานข้อมูล, Prometheus metrics, distributed traces, Loki log aggregation และ Grafana dashboard สำหรับ local development ดู [คู่มือ Observability](docs/OBSERVABILITY.md) สำหรับคำสั่งเปิด stack งานนี้ยังไม่ตั้ง alerting และไม่เปลี่ยน production deployment
