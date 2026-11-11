\# คู่มือ Local Kubernetes



คู่มือนี้ใช้สำหรับรัน Boardly บน Minikube ในเครื่องสำหรับการพัฒนาและทดสอบเท่านั้น ไม่ใช่ Production หรือ Shared Cluster



\## 1. เครื่องมือที่ต้องมี



\- Docker Desktop และ Docker Compose

\- Minikube

\- kubectl

\- PowerShell



\## 2. เริ่ม Minikube



จาก Repository root:



```powershell

minikube start --driver=docker --cpus=4 --memory=4096 --disk-size=20g

kubectl config use-context minikube

kubectl get nodes

```



ตรวจสอบว่า Node มีสถานะ `Ready` ก่อนดำเนินการต่อ



\## 3. Build และ Load Images



```powershell

docker build -t boardly-backend:local .\\backend

docker build -t boardly-frontend:local -f frontend/Dockerfile .

minikube image load boardly-backend:local boardly-frontend:local

```



ตรวจสอบ Images:



```powershell

minikube image ls

```



\## 4. เตรียม Namespace, Secret และ ConfigMap



```powershell

kubectl apply -f .\\k8s\\00-namespace.yaml



kubectl create secret generic boardly-secret -n boardly `

&#x20; --from-literal=DB\_USERNAME=boardly `

&#x20; --from-literal=DB\_PASSWORD=YOUR\_LOCAL\_DB\_PASSWORD `

&#x20; --from-literal=JWT\_SECRET=YOUR\_LOCAL\_JWT\_SECRET\_AT\_LEAST\_32\_CHARACTERS



kubectl create configmap boardly-db-init -n boardly `

&#x20; --from-file=01-schema.sql=.\\database\\Boardly\_schema.sql `

&#x20; --from-file=02-seed-dev.sql=.\\database\\seed-dev.sql `

&#x20; --from-file=001-create-notifications.sql=.\\database\\migrations\\001-create-notifications.sql

```



เปลี่ยนค่า Placeholder เป็นรหัสผ่านสำหรับการทดสอบในเครื่อง และใช้ JWT secret ที่ยาวอย่างน้อย 32 ตัวอักษร ห้ามบันทึก Secret ลง Git



หากมี Secret หรือ ConfigMap อยู่แล้ว อย่าสร้างทับโดยไม่ตรวจสอบค่าก่อน



\## 5. Deploy ด้วย Local Overlay



```powershell

kubectl kustomize --load-restrictor=LoadRestrictionsNone .\\k8s\\local

kubectl kustomize --load-restrictor=LoadRestrictionsNone .\\k8s\\local | kubectl apply -f -

```



Overlay นี้นำ Manifest หลักจาก `k8s/` มาใช้ และถอด `imagePullSecrets` สำหรับ Local Images เท่านั้น โดยไม่แก้ Manifest หลัก



\## 6. ตรวจสอบ Rollout



```powershell

kubectl rollout status deployment/boardly-db -n boardly --timeout=180s

kubectl wait --for=condition=complete job/boardly-db-migrate -n boardly --timeout=180s

kubectl rollout status deployment/boardly-backend -n boardly --timeout=180s

kubectl rollout status deployment/boardly-frontend -n boardly --timeout=120s

kubectl get pods,svc,pvc,jobs -n boardly

```



Pod ของ Migration Job ที่เป็น `Completed` ถือว่าทำงานสำเร็จ



\## 7. เปิดเว็บไซต์และทดสอบ



```powershell

kubectl port-forward svc/frontend 8088:80 -n boardly

```



เปิด `http://localhost:8088`



ใน PowerShell อีกหน้าต่างหนึ่ง:



```powershell

Invoke-WebRequest http://localhost:8088/api/health -UseBasicParsing

kubectl exec -n boardly deployment/boardly-db -- pg\_isready -U boardly -d boardly\_db

kubectl logs job/boardly-db-migrate -n boardly

```



API ควรตอบ HTTP 200 และ PostgreSQL ควรแสดง `accepting connections`



\## 8. ข้อควรระวัง



\- ตรวจสอบ Context ก่อน Apply ทุกครั้ง และใช้เฉพาะ Local Minikube

\- ห้ามใช้กับ Production หรือ Shared Cluster

\- ห้ามลบ PVC หรือใช้คำสั่งลบ Volume เพื่อแก้ปัญหา Database

\- อย่า Commit Secret หรือ Credential

\- Base manifests ใน `k8s/` ใช้สำหรับ Release ส่วน `k8s/local/` ใช้สำหรับ Local Images

###### \- การ Publish Images และ Release เป็นขั้นตอน Manual แยกต่างหาก

