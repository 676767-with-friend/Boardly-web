# Boardly V.1.3

เว็บจัดการร้านบอร์ดเกมและคาเฟ่ มี React/Vite frontend, Spring Boot API และ PostgreSQL

## เริ่มใช้งานในเครื่อง

ติดตั้ง Docker Desktop แล้วรันจากโฟลเดอร์หลักของ repository:

```powershell
docker compose up --build --wait
```

เปิดเว็บที่ http://localhost:8443 และตรวจสอบ API ที่ http://localhost:8080/api/health
หยุดระบบด้วย `docker compose down` ซึ่งยังเก็บข้อมูลใน database volume ไว้

## คู่มือ

- [พัฒนาและทดสอบ](docs/DEVELOPMENT.md) — เครื่องมือและคำสั่ง frontend/backend
- [Local Kubernetes](docs/LOCAL_KUBERNETES.md) — ทดลองใช้ Minikube ในเครื่อง
- [CI/CD และ Release](docs/RELEASE.md) — เงื่อนไข CI, Vercel และการปล่อยเวอร์ชัน

Pull request รัน CI เท่านั้น เมื่อ CI ของการ push ไป `main` ผ่านทั้งสามงาน ระบบจะเริ่ม release ไปยัง Minikube ที่กำหนดไว้โดยอัตโนมัติเมื่อมี runner, registry และ environment พร้อมใช้งาน Vercel เป็นเส้นทางแยกสำหรับเผยแพร่ frontend

Repository: https://github.com/676767-with-friend/Boardly-web
