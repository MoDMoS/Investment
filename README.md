# บันทึกการลงทุน

เว็บบันทึกการแลกเงินบาท–USD และการซื้อขายหุ้นสหรัฐ หน้าบ้านเป็น React หลังบ้านเป็น NestJS ข้อมูลแยกตามบัญชีที่สมัคร

## โครงสร้าง

- `frontend/` — Vite + React + Tailwind
- `backend/` — NestJS + Prisma + **PostgreSQL**

## รันบนเครื่องตัวเอง

ต้องมี Node.js 20+ และ Postgres (หรือ `docker compose up -d db` จาก root โปรเจกต์)

```bash
cd backend
copy .env.example .env
npm install
npx prisma migrate deploy
npm run start:dev
```

อีกหน้าต่าง:

```bash
cd frontend
npm install
npm run dev
```

เปิด [http://localhost:5173](http://localhost:5173) สมัครสมาชิกแล้วเริ่มบันทึก

- แลกเงิน: กรอกอย่างน้อย 2 ใน 3 ของบาท / USD / เรท
- เงินนำกลับ: กรอกเองเมื่อโอนเข้าไทยจริง ไม่ถูกสร้างตอนขายหุ้นหรือได้ปันผล
- ซื้อขายหุ้น: เลือกตลาดหุ้นไทยหรือหุ้นนอก หุ้นไทยกรอกราคาเป็นบาท หุ้นนอกเป็น USD
- ปันผล: บันทึกยอดก่อนหักภาษีและภาษีหัก ณ ที่จ่าย ยอดสุทธิเข้าเงินสด USD
- ราคาตลาดบน dashboard ดึงจาก Yahoo แบบฟรี (หน่วงได้) หุ้นไทยใช้สัญลักษณ์ `.BK` เช่น PTT.BK

## ขึ้น VPS (เข้าด้วย IP ไม่ต้องมีโดเมน)

ขั้นตอนเต็มอยู่ที่ [docs/vps-setup.md](docs/vps-setup.md)

สรุปสั้นๆ:

```bash
cp .env.example .env
# ใส่ AUTH_SECRET ที่สุ่มด้วย: openssl rand -base64 48
# คง COOKIE_SECURE=false ไว้ เพราะเข้าผ่าน http://IP
docker compose up -d --build
```

เปิด `http://YOUR_VPS_IP`

- `/` ไปที่หน้า React
- `/api` ไปที่ NestJS
- ฐานข้อมูล **PostgreSQL** (docker service `db` ที่ host พอร์ต `5434`)
- อย่าเปิดพอร์ต 3000 ของ API ออกเน็ตตรงๆ

### ย้ายข้อมูลจาก SQLite เดิม (ครั้งเดียว)

```bash
# สำรองก่อน
cp data/app.db data/app.db.bak-$(date +%F)

cd backend
cp .env.example .env   # DATABASE_URL ชี้ localhost:5434
npm ci
npx prisma migrate deploy

# จาก root โปรเจกต์ให้ Postgres ขึ้นก่อน
cd ..
docker compose up -d db
# รอ healthy แล้ว
cd backend
unset DATABASE_URL
SQLITE_PATH=../data/app.db npm run migrate:from-sqlite

cd ..
docker compose up -d --build
```
