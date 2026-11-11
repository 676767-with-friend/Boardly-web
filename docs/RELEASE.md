\# คู่มือ CI/CD และ Release



\## 1. Continuous Integration (CI)



Workflow อยู่ที่ `.github/workflows/ci.yml`



ทำงานเมื่อมี Push ไปยัง Branch ที่กำหนด หรือ Pull Request ตามเงื่อนไขใน Workflow



มี 3 Jobs หลัก:



1\. `Frontend (build + Vitest)` — ใช้ Node.js 22 และ pnpm 10.34.3

2\. `Backend (mvn verify)` — ใช้ Java 21 และ PostgreSQL 16

3\. `E2E (Cypress)` — ทดสอบ Integration ผ่าน Docker Compose



CI ใช้สำหรับตรวจสอบคุณภาพโค้ด ไม่ได้ Deploy Kubernetes โดยอัตโนมัติ



\## 2. Vercel Frontend



Frontend ใช้ Vercel Project เดิม:



`https://boardly-web-ebon.vercel.app/`



การตั้งค่า Root Directory ที่ใช้เดิมคือ `frontend`



ไฟล์ `frontend/vercel.json` ไม่ได้ปิด Git Deployment แล้ว การ Push หรือ Merge จึงสามารถทำให้ Vercel สร้าง Deployment ได้ หาก Git Integration ใน Vercel Project Settings เปิดใช้งานและเชื่อม Repository ถูกต้อง



หลัง Push ให้ตรวจสอบใน Vercel Dashboard:



\- Git Repository ที่เชื่อมต่อ

\- Production Branch เป็น `main`

\- Root Directory เป็น `frontend`

\- Git Deployments เปิดใช้งาน

\- สถานะ Deployment ล่าสุด



การแก้ `vercel.json` เพียงอย่างเดียวไม่ได้ยืนยันว่า Dashboard ตั้งค่าถูกต้องหรือ Deployment สำเร็จ



\## 3. Kubernetes Release



Workflow อยู่ที่ `.github/workflows/release.yml`



Release เป็นแบบ Manual เท่านั้น โดยผู้ดูแลต้องเข้า GitHub Actions เลือก `Publish and deploy` และกด `Run workflow` บน Branch `main`



Workflow ตรวจสอบ CI ของ Commit ที่จะ Release ก่อน Build และ Publish Images ไปยัง Registry เดิม จากนั้นจึง Deploy ไปยัง Minikube



\*\*ห้ามเปลี่ยน Release เป็น Automatic Push Deployment\*\*



\## 4. สิ่งที่ต้องเตรียมก่อน Release



Repository Secrets ที่ Workflow ต้องใช้:



\- `IMAGE\_REGISTRY`

\- `REGISTRY\_USERNAME`

\- `REGISTRY\_PASSWORD`

\- `K8S\_DB\_USERNAME`

\- `K8S\_DB\_PASSWORD`

\- `K8S\_JWT\_SECRET`



JWT Secret ต้องมีความยาวอย่างน้อย 32 bytes



นอกจากนี้ต้องมี Linux self-hosted GitHub Actions runner ที่:



\- ติดตั้ง Bash และ kubectl

\- ใช้ kubeconfig ที่ Context ปัจจุบันชื่อ `minikube`

\- ติดต่อ Minikube API และ Image Registry ได้

\- มีสิทธิ์จัดการ Resources ใน Namespace `boardly`



GitHub-hosted runner ไม่สามารถเข้าถึง Minikube ในเครื่องส่วนตัวได้โดยอัตโนมัติ



ห้ามนำ Credential, kubeconfig หรือ Secret ใส่ Repository



\## 5. ข้อควรระวัง



\- Release ต้องได้รับการตรวจสอบและอนุมัติก่อนดำเนินการ

\- ห้ามทดสอบ Release กับ Production หรือ Shared Cluster โดยไม่ได้รับอนุญาต

\- Local Minikube ที่ทดสอบด้วย `

