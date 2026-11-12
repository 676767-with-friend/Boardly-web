# CI/CD และ Release

## CI และ Vercel

[`ci.yml`](../.github/workflows/ci.yml) รันเมื่อมี pull request ที่ตรงเงื่อนไข หรือ push ไป `main` โดยมีสามงาน: `Frontend (build + Vitest)`, `Backend (mvn verify)` และ `E2E (Cypress)` Pull request ไม่เผยแพร่ images และไม่ deploy Minikube

Vercel ใช้ Git integration แยกจาก Kubernetes สำหรับ frontend ที่ https://boardly-web-ebon.vercel.app/ โปรเจกต์ Vercel ควรเชื่อม repository นี้ ตั้ง production branch เป็น `main` และ root directory เป็น `frontend` การตั้งค่าและผล deploy จริงต้องตรวจใน Vercel dashboard

## Kubernetes release อัตโนมัติ

[`release.yml`](../.github/workflows/release.yml) เริ่มเมื่อ CI บน `main` เสร็จ ระบบยอมรับเฉพาะ CI จาก repository นี้ที่เกิดจาก `push`, สำเร็จ, และทั้งสามงานข้างต้นผ่าน หาก CI ล้มเหลว ถูกยกเลิก มาจาก PR หรือ branch อื่น จะไม่ publish/deploy

Workflow ใช้ SHA ของ commit ที่ CI ทดสอบจริงสำหรับ checkout, Docker image tags และ deployment หาก `main` เปลี่ยนไปแล้ว จะข้าม release ก่อน publish หรือก่อน deploy เพื่อไม่ให้เวอร์ชันเก่าทับเวอร์ชันใหม่ งาน deploy ใช้ runner เดียวในแต่ละครั้งและไม่ยกเลิกงานที่กำลังทำอยู่

ผู้ดูแลใช้ `workflow_dispatch` บน `main` เพื่อ retry ได้ โดยยังต้องมี push-triggered CI ที่ผ่านสำหรับ commit เดียวกัน ไม่มีตัวเลือกข้ามการตรวจสอบ

## การตั้งค่าที่ต้องมี

- Repository secrets เดิม: `IMAGE_REGISTRY`, `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`, `K8S_DB_USERNAME`, `K8S_DB_PASSWORD`, `K8S_JWT_SECRET` โดย JWT secret ต้องยาวอย่างน้อย 32 ตัวอักษร
- Repository variable `MINIKUBE_RUNNER_LABEL`: ใส่ label เฉพาะของ Linux self-hosted runner ที่ผู้ดูแลยืนยันว่าอยู่บนเครื่อง Minikube ที่อนุญาต ห้ามใช้เพียง `self-hosted`, `linux` หรือ `x64`
- Runner ต้องออนไลน์ มี Bash, kubectl, Minikube และ kubeconfig context `minikube` ที่เข้าถึง local cluster ได้ รวมทั้งเข้าถึง registry สำหรับ image pull
- GitHub environment `minikube`: ตรวจ approval rules และ secrets ที่ใช้ก่อนเปิดใช้งาน หากบังคับ approval งานจะรอผู้มีสิทธิ์อนุมัติ; workflow ไม่ข้ามกฎนี้

Registry เดิมต้องให้สิทธิ์ push แก่ workflow และ pull แก่ cluster ห้ามใส่ credentials หรือ kubeconfig ลง repository หาก variable หรือ secrets ขาด gate/publish จะล้มเหลว; หาก runner offline หรือ label ไม่ตรง งาน deploy จะรอ runner อย่าตั้ง runner ให้ชี้ไป shared/production cluster

Migration ปัจจุบันคือ `001-create-notifications.sql` ใช้ transaction และ `IF NOT EXISTS` จึงรันซ้ำกับ schema เดิมได้ แต่ไม่ตรวจว่าโครงสร้างตารางที่มีอยู่ตรงกัน Workflow ลบเฉพาะ Job เก่าก่อนรัน migration ใหม่ ไม่ลบข้อมูลหรือ PVC

## ตรวจผล

ดู CI และ `Publish and deploy` ใน GitHub Actions ตรวจ SHA ของ CI, image tags, สถานะ publish, migration, rollout และ smoke test ใน run เดียวกัน เมื่อ deploy สำเร็จ จึงใช้ `kubectl port-forward svc/frontend 8088:80 -n boardly` บนเครื่องที่เข้าถึง Minikube แล้วเปิด `http://localhost:8088` การ deploy ในเครื่องไม่เปิด URL สาธารณะ
