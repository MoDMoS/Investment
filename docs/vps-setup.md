# ขั้นตอนตั้งค่า VPS (ไม่มีโดเมน)

เข้าเว็บด้วย **IP ของ VPS** เช่น `http://203.0.113.10` ไม่ต้องมีโดเมน ไม่ต้องมี HTTPS

คู่มือนี้สมมติใช้ **Ubuntu 22.04 หรือ 24.04**

ผลลัพธ์ที่ต้องการ:

- `http://YOUR_VPS_IP:8080` → หน้า React
- `http://YOUR_VPS_IP:8080/api` → NestJS
- ฐานข้อมูล SQLite ที่ `./data/app.db`
- พอร์ต API `3000` ไม่เปิดออกเน็ต

Let's Encrypt ออกใบรับรองให้โดเมนเท่านั้น ใช้ IP จึงเป็น HTTP

---

## 1. สิ่งที่ต้องมีก่อน

- VPS อย่างน้อย 1 vCPU / 1 GB RAM / 20 GB disk
- IP สาธารณะของ VPS
- เครื่องตัวเองที่ SSH เข้า VPS ได้
- โปรเจกต์นี้อยู่ใน Git หรือจะอัปโหลดขึ้นเซิร์ฟเวอร์

---

## 2. เข้า VPS ครั้งแรก

```bash
ssh root@YOUR_VPS_IP
```

อัปเดตระบบ สร้าง user ธรรมดา แล้วให้สิทธิ์ sudo:

```bash
apt update && apt upgrade -y
adduser deploy
usermod -aG sudo deploy
```

คัดลอก SSH key จากเครื่องตัวเอง (รันบนเครื่องคุณ ไม่ใช่บน VPS):

```bash
ssh-copy-id deploy@YOUR_VPS_IP
```

จากนั้นเข้าด้วย user ใหม่:

```bash
ssh deploy@YOUR_VPS_IP
```

---

## 3. เปิดไฟร์วอลล์

เปิดเฉพาะ SSH กับพอร์ตเว็บ (ตอนนี้แอปใช้ 8080):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 8080/tcp
sudo ufw enable
sudo ufw status
```

อย่าเปิดพอร์ต `3000`

---

## 4. ติดตั้ง Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

ออกจาก SSH แล้วเข้าใหม่ เพื่อให้กลุ่ม `docker` มีผล แล้วตรวจ:

```bash
docker --version
docker compose version
```

---

## 5. วางโปรเจกต์บน VPS

### แบบ clone จาก Git

```bash
sudo mkdir -p /investment
sudo chown $USER:$USER /investment
cd /investment
git clone YOUR_REPO_URL .
```

### แบบอัปโหลดจากเครื่องคุณ

```bash
scp -r ./Investment deploy@YOUR_VPS_IP:/investment
```

---

## 6. ตั้งค่า `.env`

```bash
cd /investment
cp .env.example .env
nano .env
```

ใส่:

```env
AUTH_SECRET=วางสตริงสุ่มยาวๆที่นี่
COOKIE_SECURE=false
```

สร้าง `AUTH_SECRET`:

```bash
openssl rand -base64 48
```

`COOKIE_SECURE=false` จำเป็นเมื่อเข้าผ่าน `http://IP` ถ้าเป็น `true` เบราว์เซอร์จะไม่เก็บ cookie ล็อกอิน

---

## 7. สร้างโฟลเดอร์ข้อมูล แล้วรันแอป

```bash
cd /investment
mkdir -p data backups
docker compose up -d --build
docker compose ps
```

ตรวจบนเซิร์ฟเวอร์:

```bash
curl -I http://127.0.0.1:8080
```

เปิดจากเครื่องคุณ: `http://YOUR_VPS_IP:8080` แล้วสมัครบัญชีแรก

`docker-compose.yml` เปิดพอร์ต `8080` ของหน้าเว็บออกเน็ต (เพราะพอร์ต 80 มักถูก nginx บนเครื่องยึดไว้) API อยู่ในเครือข่าย Docker ภายใน ไม่ได้เปิด `3000` ออกมา

---

## 8. สำรองฐานข้อมูลทุกวัน

ฐานข้อมูลอยู่ที่ `/investment/data/app.db`

```bash
crontab -e
```

เพิ่มบรรทัด:

```cron
0 2 * * * cp /investment/data/app.db /investment/backups/app-$(date +\%F).db
```

ลบไฟล์เก่ากว่า 30 วัน (ไม่บังคับ):

```cron
30 2 * * * find /investment/backups -name 'app-*.db' -mtime +30 -delete
```

ดาวน์โหลดสำเนามาเครื่องตัวเองเป็นครั้งคราว:

```bash
scp deploy@YOUR_VPS_IP:/investment/data/app.db ./app-backup.db
```

---

## 9. เมื่อ `git pull` แล้วต้องทำอะไรต่อ

`git pull` ดึงโค้ดลงดิสก์อย่างเดียว **ยังไม่เข้า container** ต้อง build ใหม่ทุกครั้ง

```bash
cd /investment
git pull
docker compose up -d --build
docker compose ps
```

เปิดเว็บตามพอร์ตใน `docker-compose.yml` ตอนนี้เป็น **8080**:

`http://YOUR_VPS_IP:8080`

### เทียบ `.env` ก่อน build ถ้ามีของใหม่

ดูว่า `.env.example` เพิ่มตัวแปรหรือยัง

```bash
diff .env .env.example
```

- ตัวแปรเดิม (`AUTH_SECRET`, `COOKIE_SECURE`) **อย่าทับของบน VPS**
- ถ้ามีชื่อใหม่ ให้เติมใน `/investment/.env` แล้วค่อย `docker compose up -d --build`

อย่า `cp .env.example .env` ทับไฟล์เดิม จะทำให้ `AUTH_SECRET` หาย

### สิ่งที่ไม่ต้องทำหลัง pull

- ไม่ต้องลบโฟลเดอร์ `data/` — ฐานข้อมูลอยู่ที่ `/investment/data/app.db` และไม่ถูกลบตอน rebuild
- ไม่ต้องรัน `npx prisma` เอง — ตอน container `api` ขึ้นจะ `db push` ให้อัตโนมัติ
- ไม่ต้อง `npm install` บนโฮสต์ — ทำใน Docker ตอน build
- ไม่ต้องสร้าง `.env` ใหม่ ถ้าไม่ได้เพิ่มตัวแปร

### ถ้า build ไม่ขึ้น

```bash
docker compose logs --tail=80
```

ดู `api` และ `web` ว่า error ที่ขั้นไหน แก้แล้วรัน `docker compose up -d --build` อีกครั้ง

---

## 10. คำสั่งดูแลที่ใช้บ่อย

```bash
cd /investment

docker compose ps
docker compose logs -f --tail=100
docker compose restart
docker compose down
docker compose logs -f api
```

---

## ตรวจว่าตั้งครบหรือยัง

- [ ] UFW เปิดแค่ 22 และ 8080
- [ ] มี `.env` โดย `AUTH_SECRET` สุ่มเอง และ `COOKIE_SECURE=false`
- [ ] `docker compose ps` สถานะ `running`
- [ ] เปิด `http://YOUR_VPS_IP:8080` ได้
- [ ] สมัครสมาชิกและล็อกอินได้
- [ ] มี cron สำรอง `app.db`

---

## ปัญหาที่พบบ่อย

**เปิด IP แล้วไม่ขึ้น**  
ตรวจไฟร์วอลล์ของผู้ให้ VPS (นอกจาก UFW) ว่าเปิดพอร์ต 8080 หรือยัง แล้วดู

```bash
docker compose ps
docker compose logs --tail=50
curl -I http://127.0.0.1:8080
```

ถ้า error `address already in use` ที่พอร์ต 80/8080 แปลว่ามี nginx หรือโปรเซสอื่นยึดพอร์ตอยู่ ดูด้วย `sudo ss -tlnp | grep ':80\|:8080'`

**สมัครหรือล็อกอินแล้วเด้งกลับหน้า login**  
ตรวจว่า `.env` มี `COOKIE_SECURE=false` แล้วรัน `docker compose up -d` ใหม่ ต้องเข้าด้วย `http://` ไม่ใช่ `https://`

**ข้อมูลหายหลัง rebuild**  
ตรวจว่ามีโฟลเดอร์ `/investment/data` และใน `docker-compose.yml` ยังมี

```yaml
volumes:
  - ./data:/data
```

---

## ถ้ามีโดเมนทีหลัง

ค่อยใส่ Nginx + Let's Encrypt ด้านนอก แล้วตั้ง `COOKIE_SECURE=true`  
ตอนนี้ยังไม่ต้องทำขั้นตอนนั้น
