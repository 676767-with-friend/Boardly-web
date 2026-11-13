# CI/CD และ dedicated local runner

## Release path

CI ใช้ GitHub-hosted runners ตรวจ frontend build/Vitest, backend mvn verify กับฐานแยก และ Cypress บน Compose ชื่อ jobs เดิมคงไว้

release.yml รับ workflow_run ที่ CI เสร็จ ตรวจ repository ต้นทาง, push, main, success และครบสาม jobs จาก API ก่อนส่ง exact head SHA ไป local runner PR/fork/failed/cancelled/branch อื่น deploy ไม่ได้ ไม่มี privileged PR trigger หรือ untrusted artifacts

Runner checkout SHA นั้น build/tag/load เข้า Minikube แล้วตรวจ main ใหม่หลัง build ทันทีก่อน deploy เพื่อข้าม revision ที่ถูกแทนที่ Serialize release โดยไม่ยกเลิกงานที่กำลังรัน GitHub อาจแทน pending run ด้วยงานใหม่ แต่ gate ยังตรวจ superseded SHA

ใช้ environment minikube เดิม ไม่ข้าม approvals; job จำกัด 45 นาที มี bounded rollout/migration/HTTP checks ไม่มี publish job หรือ external registry credentials Base images/dependencies ยังดาวน์โหลดเมื่อจำเป็น

## เตรียมเครื่องและขออนุญาต

ทำ [คู่มือ Minikube](LOCAL_KUBERNETES.md) ก่อน เจ้าของเครื่องต้องยืนยันชัดเจนว่าอนุญาต persistent self-hosted runner ซึ่งเปิดให้ eligible GitHub jobs รันคำสั่งบนเครื่องนี้ด้วยสิทธิ์เข้าถึง Docker และ Minikube ของ user นั้น ห้ามลงทะเบียนก่อนยินยอม และห้ามส่ง registration token ในแชต

ใช้ user สำหรับงานพัฒนาที่ไม่มี production credentials จำกัดผู้แก้ workflow/main อย่าเพิ่ม self-hosted runner ใน PR workflows

## ลงทะเบียนผ่าน official GitHub flow

ผู้มีสิทธิ์เข้า repository Settings > Actions > Runners > New self-hosted runner เลือก Linux และ architecture ให้ตรงเครื่อง ทำ download/checksum/config ตามคำสั่งในหน้านั้นบนเครื่องเป้าหมายโดยตรง ดู [GitHub official setup](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners) ใช้ token ชั่วคราวจากหน้า setup ไม่เก็บใน repository

ติดตั้งนอก checkout เช่น ~/actions-runner-boardly กำหนดชื่อและ custom label ที่บ่งชี้เครื่องจริง เช่น boardly-team-laptop-wsl ตั้ง repository variable MINIKUBE_RUNNER_LABEL ให้ตรง label นั้น Workflow เลือก self-hosted + linux + unique label ไม่เลือก runner กว้าง ๆ

ตรวจ Settings > Environments > minikube และคง required approvals/protection เดิมไว้ ตรวจ required checks/reviews ก่อน merge ห้าม bypass

จาก runner directory หลังลงทะเบียน:

```bash
docker info
minikube -p boardly-dev status
kubectl --context boardly-dev -n boardly get secret boardly-secret -o name
./run.sh
```

ต้องเห็น Listening for Jobs และ Idle/Online ใน Settings หยุดด้วย Ctrl+C เริ่มด้วย ./run.sh ใน user เดิม ไม่จำเป็นต้องติดตั้ง service เพื่อสาธิต หากใช้ service ให้ทำตาม official setup และตรวจ service user เข้าถึง Docker/kubeconfig เดียวกันจริง

## เปิดเพื่อ deploy/สาธิต

1. เปิด Docker และ WSL distro ที่ตั้งไว้
2. รัน minikube -p boardly-dev start และตรวจ node Ready
3. เปิด ./run.sh จาก runner directory
4. Push/merge main ตาม checks/reviews แล้วรอ CI สาม jobs
5. ดู Build and deploy locally ที่เริ่มอัตโนมัติ อนุมัติ environment หากกำหนด
6. เทียบ CI head SHA, checkout, image tags, rollouts และ smoke summary
7. เปิด port-forward ตามคู่มือ Minikube แล้วเข้า http://localhost:8088

Manual retry: Actions > Build and deploy locally > Run workflow > main ต้องมี push CI ผ่านสำหรับ SHA เดียวกัน ไม่มี bypass หาก main เปลี่ยนให้รอ CI ใหม่

## Offline และสถานะการตรวจสอบ

เมื่อเครื่องปิด CI hosted และ Vercel ยังทำงานแยกกัน Local deployment รอ runner และอาจหมดเวลารอ เมื่อ online workflow ตรวจ main ก่อน deploy อีกครั้ง ไม่รับประกัน availability 24/7

เจ้าของระบุให้เตรียม repo สำหรับเครื่องอื่น ใน session นี้จึงยังไม่ได้สร้าง cluster/register runner/สังเกต automatic release ต้องบันทึกเครื่อง/user/label จริง, CI/release links, deployed SHA และผล flows ใน PR หลังทดสอบบนเครื่องนั้น YAML/guard tests ไม่ใช่หลักฐาน deploy สำเร็จ

Vercel Git deployment ยังคงเปิดแยกกัน ตรวจ root frontend, production branch main และ deployment ล่าสุดใน dashboard เว็บสาธารณะไม่ได้ยืนยัน Minikube backend
