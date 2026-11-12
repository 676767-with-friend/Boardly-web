# Boardly V.1.3

Boardly เป็นเว็บแอปพลิเคชันสำหรับจัดการร้านบอร์ดเกมและคาเฟ่ ครอบคลุมการใช้งานของลูกค้า พนักงาน และผู้ดูแลระบบ เช่น การจัดการบัญชี การสั่งซื้อสินค้า การจองโต๊ะ การเช็กอิน การจัดการรอบการเล่น และการจัดการข้อมูลร้านค้า

## เทคโนโลยี

- Frontend: React 19, TypeScript, Vite 8 และ Tailwind CSS 4
- Backend: Java 21, Spring Boot 3.3 และ Maven
- Database: PostgreSQL 16
- Testing: Vitest, JUnit และ Cypress
- Deployment: Docker, Kubernetes (Minikube), GitHub Actions และ Vercel

## สิ่งที่ต้องติดตั้ง

- Node.js 22
- pnpm 10.34.3
- JDK 21 และ Maven
- Docker Desktop
- kubectl และ Minikube (สำหรับทดสอบ Kubernetes)

## เริ่มต้นใช้งานด้วย Docker Compose

เปิด Docker Desktop ก่อน จากนั้นรันคำสั่งที่โฟลเดอร์หลักของโปรเจกต์

```bash
docker compose up --build
```

เมื่อระบบเริ่มทำงานแล้ว สามารถเข้าใช้งานได้ที่:

- Frontend: http://localhost:8443
- Backend: http://localhost:8080
- Backend Health: http://localhost:8080/api/health

หยุดระบบด้วยคำสั่ง:

```bash
docker compose down
```

คำสั่งนี้จะไม่ลบข้อมูลใน Database Volume หากต้องการเก็บข้อมูลเดิมไว้ ห้ามใช้ `docker compose down -v`

## Frontend

เข้าโฟลเดอร์ `frontend` และติดตั้ง dependencies:

```bash
cd frontend
pnpm install
pnpm dev
```

คำสั่งที่ใช้ตรวจสอบและทดสอบ:

```bash
pnpm build
pnpm test
pnpm test:coverage
```

## Backend

Backend ต้องใช้ Java 21 และ Maven สำหรับการทดสอบ:

```bash
cd backend
mvn clean verify
```

## CI/CD และ Deployment

- GitHub Actions ใช้สำหรับตรวจสอบและทดสอบ Frontend, Backend และ E2E
- Vercel ใช้สำหรับ Deploy Frontend โดยตั้ง Project Root Directory เป็น `frontend`
- Kubernetes ใช้สำหรับ Deploy และทดสอบระบบบน Minikube
- Kubernetes Release Workflow เป็นแบบ Manual (`workflow_dispatch`) ไม่ได้ Deploy อัตโนมัติเมื่อ Push

ดูขั้นตอนเพิ่มเติมได้ที่:

- [Development Guide](docs/DEVELOPMENT.md)
- [Local Kubernetes Guide](docs/LOCAL_KUBERNETES.md)
- [Release Guide](docs/RELEASE.md)

## Repository

GitHub: https://github.com/676767-with-friend/Boardly-web

Vercel: https://boardly-web-ebon.vercel.app/
