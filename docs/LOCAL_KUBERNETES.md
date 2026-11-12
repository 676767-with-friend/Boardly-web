# Local Kubernetes สำหรับ Boardly

คู่มือนี้ใช้กับ Minikube ในเครื่องพัฒนาเท่านั้น ไม่ใช้กับ shared หรือ production cluster ต้องมี Docker Desktop, Minikube, kubectl และ PowerShell คำสั่งด้านล่างเริ่มจากโฟลเดอร์หลักของ repository

## เริ่ม Minikube และโหลด images (PowerShell)

```powershell
minikube start --driver=docker --cpus=4 --memory=4096 --disk-size=20g
kubectl config use-context minikube
kubectl get nodes
docker build -t boardly-backend:local ./backend
docker build -t boardly-frontend:local -f frontend/Dockerfile .
minikube image load boardly-backend:local boardly-frontend:local
```

ตรวจว่า node เป็น `Ready` และ images โหลดสำเร็จก่อนทำต่อ

## เตรียมข้อมูล Kubernetes (PowerShell)

แทนค่าตัวอย่างด้านล่างด้วยค่าทดสอบเฉพาะเครื่อง ห้ามบันทึก secret ลง Git หากมี `boardly-secret` หรือ `boardly-db-init` อยู่แล้ว ให้ตรวจสอบก่อนสร้างใหม่

```powershell
kubectl apply -f k8s/00-namespace.yaml
kubectl create secret generic boardly-secret -n boardly --from-literal=DB_USERNAME=boardly --from-literal=DB_PASSWORD=YOUR_LOCAL_DB_PASSWORD --from-literal=JWT_SECRET=YOUR_LOCAL_JWT_SECRET_AT_LEAST_32_CHARACTERS
kubectl create configmap boardly-db-init -n boardly --from-file=01-schema.sql=database/Boardly_schema.sql --from-file=02-seed-dev.sql=database/seed-dev.sql --from-file=001-create-notifications.sql=database/migrations/001-create-notifications.sql
```

## ใช้ local overlay และตรวจสอบ (PowerShell)

```powershell
kubectl config current-context
kubectl kustomize --load-restrictor=LoadRestrictionsNone k8s/local | kubectl apply -f -
kubectl rollout status deployment/boardly-db -n boardly --timeout=180s
kubectl wait --for=condition=complete job/boardly-db-migrate -n boardly --timeout=180s
kubectl rollout status deployment/boardly-backend -n boardly --timeout=180s
kubectl rollout status deployment/boardly-frontend -n boardly --timeout=120s
kubectl get pods,svc,pvc,jobs -n boardly
```

ตรวจว่า context เป็น `minikube` ก่อน apply ทุกครั้ง Overlay ใช้ images ในเครื่องและถอด `imagePullSecrets` ออกจาก deployment ในเครื่อง

## เปิดเว็บในเครื่อง (PowerShell)

```powershell
kubectl port-forward svc/frontend 8088:80 -n boardly
```

เปิด `http://localhost:8088` แล้วตรวจ API ใน PowerShell อีกหน้าต่าง:

```powershell
Invoke-WebRequest http://localhost:8088/api/health -UseBasicParsing
```

การ deploy ไป Minikube ไม่ได้เปิดเว็บสู่สาธารณะ หาก migration หรือ rollout ล้มเหลว ให้ดู `kubectl logs job/boardly-db-migrate -n boardly` และ `kubectl get pods -n boardly` อย่าลบ PVC หรือ volume เพื่อแก้ปัญหา
