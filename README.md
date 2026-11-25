# poseev2 — ระบบ POS ร้านอาหาร

POS ร้านอาหาร **2 ระบบในแอปเดียว**:

1. **ขายหน้าร้าน (Counter POS)** — พนักงานคิดเงินที่เคาน์เตอร์: เลือกเมนู → ส่วนลด → ชำระ (เงินสด/โอน/บัตร) → ใบเสร็จ
2. **ลูกค้าสแกน QR สั่งที่โต๊ะ** — สแกน → สั่งจากมือถือ → เข้าครัว → เสิร์ฟ → เก็บเงิน PromptPay → ปิดโต๊ะ

UI ภาษาไทยทั้งหมด · ตั้งค่าร้าน (ชื่อ / โลโก้ / สีแบรนด์ / เมนู / โต๊ะ / พนักงาน) ได้เองในแอป ไม่ต้องแก้โค้ด

## ทำอะไรได้บ้าง

| หน้า | ทำอะไร |
|---|---|
| ขายของ (`/`) | เมนู → ตะกร้า → เลือกพนักงาน → ส่วนลด → ชำระ → ใบเสร็จ |
| ครัว (`/kitchen`) | ออเดอร์ตามโต๊ะ + เปลี่ยนสถานะ + เสียงเรียก |
| พนักงาน (`/staff`) | เปิดโต๊ะ / QR ต่อรอบ / เสิร์ฟ / เก็บเงิน PromptPay |
| เมนู (`/products`) | เพิ่ม/แก้/รูป/ตัวเลือกเมนู/เปิด-ปิดขาย + สูตรตัดสต๊อก |
| รายงาน (`/reports`) | ยอดขาย / เมนูขายดี / แยกพนักงาน / กำไร |
| ตั้งค่า (`/settings`) | ข้อมูลร้าน / PromptPay / โต๊ะ / โหมดเข้าถึง / ธีมสี |

รองรับพิมพ์ใบเสร็จ + ตั๋วครัวผ่านเครื่องพิมพ์ความร้อน (ESC/POS · Sunmi) และทำงาน **offline** ได้เมื่อรันแบบ local

## สิ่งที่ต้องมี

- Node.js 18.18 ขึ้นไป และ npm
- Git
- (ถ้าติดตั้งบนคลาวด์) บัญชี [Vercel](https://vercel.com) และ [Turso](https://turso.tech) ใช้แพ็กเกจฟรีได้

## ติดตั้งแบบ local (รันบนเครื่องในร้าน)

ข้อมูลเก็บเป็นไฟล์ SQLite บนเครื่อง ไม่ต้องใช้อินเทอร์เน็ต

```bash
git clone https://github.com/thiramanasss/projectjob.git
cd projectjob
npm install
npm run env:init      # สร้างไฟล์ .env และสุ่มค่า POS_AUTH_TOKEN ให้
npm run db:push       # สร้างตารางในฐานข้อมูล
npm run build
npm start
```

เปิด `http://localhost:3000` บนเครื่องที่รัน หรือ `http://<IP เครื่อง>:3000` จากมือถือ/แท็บเล็ตที่ต่อ Wi-Fi วงเดียวกัน

ถ้าจะแก้โค้ด ใช้ `npm run dev` แทน `npm run build` + `npm start`

> อย่ารัน `npm run db:seed` กับร้านที่ใช้งานจริง เพราะจะใส่ข้อมูลตัวอย่างลงฐานข้อมูล

## ติดตั้งแบบ cloud (Vercel + Turso)

### 1. สร้างฐานข้อมูลบน Turso

```bash
turso auth login
turso db create posee-pos --location sin
turso db show posee-pos --url        # ได้ libsql://posee-pos-xxx.turso.io
turso db tokens create posee-pos     # ได้ token
```

บน Windows ต้องใช้ Turso CLI ผ่าน WSL หรือสร้างฐานข้อมูลและ token จากหน้าเว็บ Turso แทนก็ได้

### 2. สร้างไฟล์ .env และสร้างตาราง

```bash
npm install
DATABASE_URL=libsql://posee-pos-xxx.turso.io DATABASE_AUTH_TOKEN=<token> npm run env:init
npm run db:push
```

ถ้าใช้ PowerShell ให้ตั้งตัวแปรก่อน แล้วค่อยรัน `npm run env:init`:

```powershell
$env:DATABASE_URL="libsql://posee-pos-xxx.turso.io"
$env:DATABASE_AUTH_TOKEN="<token>"
npm run env:init
```

### 3. Deploy ขึ้น Vercel (เลือกวิธีใดวิธีหนึ่ง)

**วิธี A: ใช้ Vercel CLI**

```bash
npm i -g vercel
vercel login
vercel
vercel env add DATABASE_URL production
vercel env add DATABASE_AUTH_TOKEN production
vercel env add POS_AUTH_TOKEN production
vercel --prod
```

**วิธี B: นำเข้าจาก GitHub**

1. ที่ vercel.com กด **Add New Project** → Import repository นี้
2. ตรวจว่า Framework Preset เป็น **Next.js**
3. ใส่ Environment Variables ตามตารางด้านล่าง แล้วกด **Deploy**

หลังจากนี้ push โค้ดใหม่ขึ้น GitHub เมื่อไร Vercel จะ deploy ให้อัตโนมัติ

### ตัวแปรสภาพแวดล้อม

| ตัวแปร | จำเป็น | ความหมาย |
|---|---|---|
| `DATABASE_URL` | ใช่ (cloud) | URL ฐานข้อมูล Turso `libsql://…turso.io` |
| `DATABASE_AUTH_TOKEN` | ใช่ (cloud) | token เชื่อมต่อ Turso |
| `POS_AUTH_TOKEN` | ใช่ | ค่าสุ่มยาวสำหรับเซ็นคุกกี้เซสชัน ถ้าไม่ตั้ง ระบบจะไม่ทำงานในโหมด production |
| `POS_ADMIN_PASSWORD` | ไม่ | ถ้าตั้งไว้ ระบบสร้างบัญชีแอดมินให้และข้ามหน้า `/setup` |
| `POS_STAFF_ACCESS` | ไม่ | `public` หรือ `lan-only` ใช้กู้คืนเมื่อล็อกตัวเองออก (บน Vercel ใช้ `public` อัตโนมัติ) |
| `ELEVENLABS_API_KEY` | ไม่ | สร้างเสียงแจ้งเตือนใหม่ (มีไฟล์เสียงสำรองให้แล้ว) |

ค่าเหล่านี้เป็นความลับ ห้าม commit ไฟล์ `.env` ขึ้น GitHub

## ครั้งแรกหลังติดตั้ง

1. เปิดเว็บ ระบบจะพาไปหน้า `/setup` ให้ตั้งชื่อร้านและบัญชีแอดมิน
   (บน cloud ควรทำทันทีหลัง deploy เพราะใครเข้าก่อนก็ตั้งแอดมินได้ก่อน)
2. หน้า **ตั้งค่า** ใส่เลขพร้อมเพย์ ค่าบริการ และ VAT
3. เพิ่มพนักงาน เมนู สูตรอาหาร และวัตถุดิบ (เมนูว่างตอนแรกเป็นเรื่องปกติ)
4. เพิ่มโต๊ะและพิมพ์ QR ประจำโต๊ะ ต้องสร้าง QR ขณะเปิดเว็บจากโดเมน/IP ที่ลูกค้าจะใช้จริง เพราะ QR ฝัง URL ที่เปิดอยู่ตอนนั้น

## ปัญหาที่พบบ่อย

- **ทุกหน้าขึ้น error 500 หลัง deploy** — ยังไม่ได้ตั้ง `POS_AUTH_TOKEN` หรือตั้งแล้วแต่ยังไม่ได้ deploy ใหม่
- **ฐานข้อมูลมีข้อมูลแล้ว อย่าใช้ `db:push` เพิ่มคอลัมน์** — อาจลบข้อมูลในตาราง ให้ใช้ `ALTER TABLE` ผ่าน `turso db shell` แทน
- **สำรองข้อมูล (cloud)** — `turso db shell posee-pos .dump > backup.sql`
- Vercel แพ็กเกจ Hobby ไม่อนุญาตให้ใช้เชิงพาณิชย์ ถ้าใช้งานในร้านจริงระยะยาว ใช้แพ็กเกจ Pro หรือติดตั้งแบบ local

## เอกสารเพิ่มเติม

- **`DEPLOY.md`** — deploy Vercel + Turso แบบละเอียด
- **`docs/DEVELOPMENT.md`** — คู่มือนักพัฒนา (สถาปัตยกรรม / DB / auth / ธีม / พิมพ์)
- **`docs/backup.md`** — การสำรองข้อมูล
- **`docs/sunmi-print.md`** — ตั้งค่าเครื่องพิมพ์ Sunmi

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Drizzle ORM (SQLite ไฟล์ / Turso)
