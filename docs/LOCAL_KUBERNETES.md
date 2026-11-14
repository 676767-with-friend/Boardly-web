# Minikube บนเครื่องที่ทีมอนุญาต

## เตรียมเครื่อง

ยืนยันกับเจ้าของเครื่องก่อน setup ถาวร ใช้ Linux หรือ Ubuntu WSL2 โดยให้ Docker, kubectl, Minikube และ runner ใช้ Linux user เดียวกัน ไม่สมมติว่า Windows กับ WSL ใช้ kubeconfig เดียวกัน

บน Windows เปิด Docker Desktop > Settings > Resources > WSL Integration สำหรับ Ubuntu ที่ใช้ ตรวจจาก Ubuntu:

```bash
uname -a
docker info
free -h
df -h .
command -v git bash curl kubectl minikube
kubectl config get-contexts
minikube profile list
```

ติดตั้งจาก [Minikube official setup](https://minikube.sigs.k8s.io/docs/start/) และ [kubectl official install](https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/) เท่านั้น เลือก architecture และตรวจ checksum ตามเอกสาร แนะนำพื้นที่ว่างอย่างน้อย 20GB จัดสรร cluster 2 CPU/RAM 4GB และเหลือ RAM สำหรับ host/image builds

## Profile และ credentials ครั้งแรก

รัน Bash จาก root ของ checkout บนเครื่องเป้าหมาย ตรวจว่า profile `boardly-dev` ไม่ใช่งานอื่น หากมีแล้วต้องยืนยันว่าเป็น development profile ที่อนุญาตก่อน reuse:

```bash
minikube start -p boardly-dev --driver=docker --cpus=2 --memory=4096
kubectl --context boardly-dev wait --for=condition=Ready nodes --all --timeout=180s
kubectl --context boardly-dev apply -f k8s/00-namespace.yaml
```

เฉพาะ namespace ใหม่ที่ยังไม่มี Secret สร้าง development credentials แบบสุ่มโดยไม่แสดงค่าบนจอ คำสั่ง create จะไม่เขียนทับ Secret เดิม:

```bash
set -euo pipefail
umask 077
secret_file=$(mktemp)
trap 'rm -f "$secret_file"' EXIT
printf 'DB_USERNAME=boardly\nDB_PASSWORD=%s\nJWT_SECRET=%s\n' "$(head -c 32 /dev/urandom | base64 -w0)" "$(head -c 48 /dev/urandom | base64 -w0)" > "$secret_file"
kubectl --context boardly-dev -n boardly create secret generic boardly-secret --from-env-file="$secret_file"
rm -f "$secret_file"
trap - EXIT
```

หากมี Secret/PVC เดิมให้เก็บไว้ ตรวจว่าค่าเดิมใช้ได้ ไม่สร้างใหม่ Release ต้องพบ Secret ก่อนเริ่มและไม่ rotate credentials ไม่ต้องคัดลอก DB/JWT secrets ไป GitHub

## Build และ deploy

ใช้ checkout สะอาดของ commit ที่ต้องการตรวจสอบ จาก root:

```bash
export IMAGE_TAG=$(git rev-parse HEAD)
bash .github/scripts/deploy.sh build
bash .github/scripts/deploy.sh deploy
```

สคริปต์ build ด้วย SHA tags, load เข้า profile เดียวกัน ใช้ local overlay ที่ตั้ง IfNotPresent เริ่ม PostgreSQL และรอพร้อมก่อนรัน migration จากนั้น apply images ตาม SHA ครั้งเดียว รอ rollouts ตรวจ tags และ HTTP หน้าเว็บ/health ผ่าน proxy คืน nonzero เมื่อขั้นตอนล้มเหลว

ฐานใหม่รัน schema แล้ว seed ผ่าน init ConfigMap ฐานเดิมไม่รัน init ซ้ำ Migration notifications มี transaction/IF NOT EXISTS จึง rerun ได้ แต่ไม่ซ่อม schema ที่ไม่ตรง ลบเฉพาะ migration Job เก่า ไม่ลบ Secret/PVC/ข้อมูล

## เปิดเว็บและตรวจ representative flows

```bash
kubectl --context boardly-dev -n boardly get pods,svc,pvc,jobs
kubectl --context boardly-dev -n boardly port-forward svc/frontend 8088:80
```

เข้า http://localhost:8088 อีก terminal:

```bash
curl --fail --max-time 15 http://localhost:8088/api/health
kubectl --context boardly-dev -n boardly get deployments -o wide
```

ทดสอบสมัครบัญชี เข้าระบบ ดูสินค้า/สาขา เพิ่มตะกร้าและจองโต๊ะด้วยข้อมูลพัฒนา ตรวจฝั่งพนักงานตามบัญชีใน seed แล้วบันทึกผลจริงใน PR Health ผ่านไม่ได้หมายถึง flows ผ่านทั้งหมด

WSL ต้องตรวจว่า Windows browser เข้าถึง localhost forwarding ได้จริง ไม่ใช้ public tunnel ไม่เพิ่ม --address=0.0.0.0 โดยไม่จำเป็น

## หยุดและเริ่มใหม่

หยุด port-forward ด้วย Ctrl+C แล้ว:

```bash
minikube -p boardly-dev stop
# เริ่มใหม่ด้วย user เดิม
minikube -p boardly-dev start
```

เก็บข้อมูลไว้ ห้ามใช้ minikube delete, ลบ PVC หรือ volume prune เพื่อแก้ปัญหา

## Troubleshooting และ observability

```bash
kubectl --context boardly-dev -n boardly get pods,events
kubectl --context boardly-dev -n boardly logs deployment/boardly-db --tail=100
kubectl --context boardly-dev -n boardly logs job/boardly-db-migrate --tail=100
kubectl --context boardly-dev -n boardly logs deployment/boardly-backend --tail=100
kubectl --context boardly-dev -n boardly logs deployment/boardly-frontend --tail=100
minikube -p boardly-dev image ls
```

ปกปิดข้อมูลส่วนบุคคล/secret ก่อนแนบ logs ใน issue หาก migration ผิดให้ดู Job logs ก่อน rerun หาก image ผิดให้เทียบ SHA/profile ไม่แก้ด้วยการ pull จาก registry อื่น

มีแล้ว: /api/health, backend readiness/liveness, frontend readiness, PostgreSQL pg_isready, container stdout/stderr และ CI failure logs

สำหรับ Kubernetes ยังต้องติดตั้ง Prometheus/Grafana, Loki และ Tempo เพิ่ม ส่วน Docker Compose มี [Observability stack](OBSERVABILITY.md) พร้อม metrics, logs, traces, retention และ alert rules แล้ว `/api/health` ยังคงเป็น liveness เดิม; Actuator health บน management port ตรวจ DB ได้ ยังไม่สรุปว่างานวิชาครบจนมีหลักฐานจาก deployment เป้าหมาย
