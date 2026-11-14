# Observability ใน Grafana

ชุดนี้สำหรับ backend Spring Boot ใน Docker Compose: metrics → Prometheus, JSON logs → Grafana Alloy → Loki, OTLP HTTP traces → Tempo แล้วดูรวมใน Grafana มี dashboard และ data sources provision ให้อัตโนมัติ

## เริ่มใช้งาน

จาก root repository (Bash หรือ PowerShell):

```sh
docker compose -f compose.yaml -f compose.observability.yaml up -d --build
docker compose -f compose.yaml -f compose.observability.yaml ps
```

เข้า http://localhost:3000 ใช้ `admin` / `boardly-local-admin` แล้วเปิด **Dashboards → Boardly → Boardly Overview** หรือ http://localhost:3000/d/boardly-overview

เปิดเว็บ http://localhost:8443 แล้วลองดูสินค้าเพื่อสร้าง traffic หรือรัน:

```sh
curl http://localhost:8080/api/health
curl http://localhost:8080/api/products
python3 observability/smoke.py
```

Windows ใช้ `python observability/smoke.py` ได้ ต้องมี Python 3 โดยไม่ต้องติดตั้ง dependencies เพิ่ม smoke test ตรวจ metrics จริง, log ที่มี trace ID, trace ID เดียวกันใน Tempo, dashboard และสุขภาพ data sources โดยรอข้อมูลได้ถึง 180 วินาทีต่อขั้นตอน

รออย่างน้อย 30 วินาทีสำหรับ metric panels; rate/p95 ต้องมีหลาย requests ส่วน log อาจใช้เวลาราว 5–20 วินาที และ traces จะส่งแบบ batch

## สิ่งที่ดูได้

- Metrics: backend scrape health, request rate แยก route, HTTP 5xx, p95 latency, JVM heap และ Hikari database pool
- Logs: request method, **route template**, status, duration และ `traceId`/`spanId`; ไม่เก็บ headers, query string หรือ request body ใน request logger
- Traces: incoming backend HTTP request และ Spring components ที่รองรับ Micrometer Observation เปิด log รายการ request แล้วกด **TraceID** เพื่อไป Tempo; จาก trace เลือก **Logs for this span** เพื่อย้อนกลับ Loki
- Alerts: `BoardlyBackendDown` เมื่อ scrape ไม่ได้ 1 นาที และ `BoardlyHighErrorRate` เมื่อ HTTP 5xx เกิน 5% นาน 5 นาที ดูใน Grafana Alerting → Alert rules (Prometheus) หรือใช้ PromQL `ALERTS{alertname=~"Boardly.*"}` ใน Explore ชุดนี้ยังไม่ส่งแจ้งเตือนออก email/Slack

Explore ตัวอย่าง:

```promql
sum by (uri, method) (rate(http_server_requests_seconds_count{job="boardly-backend"}[5m]))
```

```logql
{service_name="boardly-backend"} | json | level="ERROR"
{service_name="boardly-backend"} | json | traceId="แทนด้วย_trace_id"
```

```traceql
{ resource.service.name = "boardly-backend" }
```

Trace ครอบคลุม backend เท่านั้น ยังไม่มี browser/RUM, SQL spans หรือ custom business spans ทุก operation; log ที่อยู่นอก request เช่น startup จะไม่มี trace ID ค่า dev เปิด sampling 100% เพื่อสาธิต ตั้ง `TRACING_SAMPLING_PROBABILITY=0.1` เมื่อต้องการลดปริมาณ

## Ports, ข้อมูล และ credentials

Grafana bind เฉพาะ `127.0.0.1:3000` ส่วน Prometheus, Loki, Tempo, Alloy และ management port `9091` ใช้ภายใน Compose network ไม่มี host ports และ frontend proxy ส่งเฉพาะ `/api/` ไป backend จึงไม่มี public `/actuator/prometheus`

Actuator health บน management listener ตรวจฐานข้อมูลด้วย ต่างจาก `/api/health` เดิมซึ่งเป็น app liveness เท่านั้น ไม่เผยรายละเอียด DB ภายนอก ค่า default ของ tracing ปิดไว้เมื่อไม่ได้ใช้ profile `observability`

กำหนด `BOARDLY_GRAFANA_PORT`, `GRAFANA_ADMIN_USER`, `GRAFANA_ADMIN_PASSWORD` ผ่าน environment หรือ `.env` ใน root ได้ ห้าม commit รหัสจริง smoke test ใช้ค่าเดียวกัน (เมื่อเปลี่ยน port ให้ตั้ง `GRAFANA_URL`; เปลี่ยน backend port ให้ตั้ง `BOARDLY_API_URL`) credentials ใช้สร้าง admin ครั้งแรกเท่านั้น หากมี Grafana volume เดิมให้เปลี่ยนรหัสผ่านใน Grafana ด้วย

ข้อมูลเก็บใน named volumes: Prometheus 7 วัน, Loki 7 วัน, Tempo 48 ชั่วโมง; application JSON file หมุนทุกวัน/10 MB เก็บไม่เกิน 3 วัน/100 MB Alloy เก็บตำแหน่งอ่านใน volume เพื่อไม่อ่านใหม่ทุก restart โดย log rotation ยังอาจสูญเสียข้อมูลระหว่างหยุด collector นาน ๆ จึงใช้สำหรับ local demo

หยุดโดยเก็บข้อมูล:

```sh
docker compose -f compose.yaml -f compose.observability.yaml down
```

อย่าเติม `-v` เพราะจะลบฐานข้อมูลและ telemetry ด้วย

## Troubleshooting

```sh
docker compose -f compose.yaml -f compose.observability.yaml logs --tail=100 backend prometheus loki tempo alloy grafana
```

- Metrics ว่าง: ตรวจ backend และ Prometheus target `backend:9091`, รอ scrape 15 วินาที แล้วสร้าง traffic อีกครั้ง
- Logs ว่าง: ตรวจ profile `dev,observability`, file `/var/log/boardly/application.json` และ Alloy อ่าน shared volume ได้
- Trace ว่าง: ตรวจ `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://tempo:4318/v1/traces`, sampling > 0 และรอ batch; startup logs ไม่มี request trace
- 401 จาก smoke test: ใช้ Grafana credentials ของ volume ปัจจุบัน
- Port 3000 ชน: ตั้ง `BOARDLY_GRAFANA_PORT` แล้วใช้ URL ใหม่

## ขอบเขต deployment

Compose override นี้ไม่เปลี่ยน Vercel frontend หรือ Minikube release workflow และยังไม่ติดตั้ง monitoring ใน Kubernetes หากใช้ production ต้องจัดการ authentication/TLS, secret, storage/backup, resource limits และ notification routing ตามสภาพแวดล้อมจริง ไม่มี deployment ไปเครื่องภายนอกจากคำสั่งนี้
