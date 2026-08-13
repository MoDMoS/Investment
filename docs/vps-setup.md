# ขั้นตอนตั้งค่า VPS (ไม่มีโดเมน)

เข้าเว็บด้วย **IP ของ VPS** เช่น `http://203.0.113.10` ไม่ต้องมีโดเมน ไม่ต้องมี HTTPS

คู่มือนี้สมมติใช้ **Ubuntu 22.04 หรือ 24.04**

ผลลัพธ์ที่ต้องการ:

- `http://YOUR_VPS_IP` → หน้า React
- `http://YOUR_VPS_IP/api` → NestJS
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

เปิดเฉพาะ SSH กับ HTTP:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
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
curl -I http://127.0.0.1
```

เปิดจากเครื่องคุณ: `http://YOUR_VPS_IP` แล้วสมัครบัญชีแรก

`docker-compose.yml` เปิดพอร์ต `80` ของหน้าเว็บออกเน็ต API อยู่ในเครือข่าย Docker ภายใน ไม่ได้เปิด `3000` ออกมา

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

## 9. อัปเดตเวอร์ชันใหม่

```bash
cd /investment
git pull
docker compose up -d --build
```

ข้อมูลใน `./data/app.db` ไม่ถูกลบตอน rebuild เพราะ mount เป็น volume

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

- [ ] UFW เปิดแค่ 22 และ 80
- [ ] มี `.env` โดย `AUTH_SECRET` สุ่มเอง และ `COOKIE_SECURE=false`
- [ ] `docker compose ps` สถานะ `running`
- [ ] เปิด `http://YOUR_VPS_IP` ได้
- [ ] สมัครสมาชิกและล็อกอินได้
- [ ] มี cron สำรอง `app.db`

---

## ปัญหาที่พบบ่อย

**เปิด IP แล้วไม่ขึ้น**  
ตรวจไฟร์วอลล์ของผู้ให้ VPS (นอกจาก UFW) ว่าเปิดพอร์ต 80 หรือยัง แล้วดู

```bash
docker compose ps
docker compose logs --tail=50
curl -I http://127.0.0.1
```

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
