# CLAUDE.md — คู่มือติดตั้งร้าน POS (ให้ Claude Code พาทำ)

> ไฟล์นี้ช่วยให้ **Claude Code** พาติดตั้ง POS ตัวนี้ให้ร้านของคุณจนใช้งานได้จริง
> ถ้าคุณเป็น **นักพัฒนา** จะแก้โค้ด → อ่าน **`docs/DEVELOPMENT.md`** (สถาปัตยกรรม/สแตก/DB/auth/พิมพ์ใบเสร็จ)

**นี่คืออะไร:** ระบบขายหน้าร้าน (POS) + สั่งอาหารผ่าน QR ที่โต๊ะ สำหรับร้านอาหาร — Next.js 15 + libSQL.
**repo นี้มีโค้ดครบแต่ไม่มีข้อมูลร้าน** → ตั้งค่าครั้งแรกผ่านหน้า `/setup` (ตั้งชื่อร้าน + บัญชีแอดมิน) ในเบราว์เซอร์.

---

## เลือกแบบติดตั้ง (2 แบบ)

| | ☁️ **Cloud** (Vercel + Turso) | 🏠 **Local** (เครื่องในร้าน + Tailscale) |
|---|---|---|
| เหมาะกับ | อยากง่าย ไม่ดูแลเครื่อง เน็ตร้านนิ่ง | อยากขายได้แม้เน็ตล่ม, คุมข้อมูลเอง |
| ทำงานตอนเน็ตล่ม | ❌ | ✅ (พนักงานผ่าน Wi-Fi ร้าน) |
| ค่าใช้จ่าย | ฟรี tier ได้ | เครื่อง 1 ตัว (+UPS/สำรอง) |
| ลูกค้าสแกน QR | โดเมน Vercel | Tailscale Funnel |
| ต้องดูแล | น้อย | มากกว่า (เครื่อง/backup/tunnel) |

> **สั่ง Claude:** "ติดตั้งแบบ cloud" หรือ "ติดตั้งแบบ local" แล้วทำตามหัวข้อที่ตรงกันด้านล่าง
> (Claude จะทำตาม **`install-CLAUDE.md`** ที่เขียนเป็นขั้นตอนให้ Claude รันเอง หยุดให้คุณทำเฉพาะ login/รหัส/ฮาร์ดแวร์)

**สิ่งที่มนุษย์ต้องทำเอง** (Claude ทำแทนไม่ได้): สมัคร/ล็อกอิน Vercel · Turso · Tailscale (คลิกยืนยันบัญชี), และ **ตั้งรหัสผ่านแอดมินเองในหน้า `/setup`** (Claude ไม่กรอกรหัสให้).

---

## ☁️ แบบ Cloud (Vercel + Turso)

**ขั้นตอนร่วม (ทำก่อนทั้งสองทาง):**

1. **สร้าง DB บน Turso** — `turso db create <ชื่อ>` → เก็บ `libsql://…` URL + สร้าง token (`turso db tokens create <ชื่อ>`).
2. **สร้าง `.env` อัตโนมัติ** — `DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npm run env:init` → เขียน `.env` ให้ + **สุ่ม `POS_AUTH_TOKEN` ให้เอง** + พิมพ์ 3 บรรทัดพร้อมวางลง Vercel.
3. **สร้าง schema** — `npm run db:push` (อ่าน `.env` ที่เพิ่งสร้าง; DB เปล่า = ลงตารางให้เลย ไม่มี prompt). ⚠️ อย่าใส่ข้อมูลตัวอย่าง (`db:seed`) ถ้าเป็นร้านจริง — ปล่อยว่างแล้วตั้งค่าที่ `/setup`.

**จากนั้นเลือก 1 ทาง deploy:**

**ทาง A — Vercel CLI (ไม่ต้องมี GitHub, แนะนำถ้าไม่มีบัญชี GitHub):**
1. `npm i -g vercel` → `vercel login` (คุณคลิกยืนยันบัญชีเอง).
2. `vercel` (deploy preview ครั้งแรก จะถามตั้งชื่อโปรเจกต์) → แล้ว `vercel --prod` (deploy จริง). CLI อัปโหลดโฟลเดอร์นี้ขึ้น Vercel ตรงๆ ไม่ต้อง push GitHub.
3. **ตั้ง env** — `vercel env add DATABASE_URL production` (วางค่า), ทำซ้ำกับ `DATABASE_AUTH_TOKEN` + `POS_AUTH_TOKEN` (ค่าจาก `env:init`) → แล้ว `vercel --prod` อีกรอบให้ env มีผล.

**ทาง B — GitHub + Vercel (ถ้ามี/อยากได้ auto-deploy เวลาแก้โค้ด):**
1. **push repo นี้ขึ้น GitHub** ของคุณ.
2. **Deploy บน Vercel** — import repo → ที่หน้า Environment Variables **วาง 3 บรรทัดที่ `env:init` พิมพ์ให้** (`DATABASE_URL` + `DATABASE_AUTH_TOKEN` + `POS_AUTH_TOKEN`).

**ปิดท้าย (ทั้งสองทาง):** รหัสแอดมิน**ไม่ต้องใส่ env**.
- **เปิดเว็บ → `/setup` ทันทีหลัง deploy** — ตั้งชื่อร้าน + บัญชีแอดมิน (รหัสของคุณเอง) → เริ่มใช้ได้.
- เพิ่มเมนู/โต๊ะ/พนักงานที่หน้า "เมนู" และ "ตั้งค่า". QR โต๊ะสร้างจากหน้า "ตั้งค่า" (ต้องเปิดผ่านโดเมนสาธารณะ).

> Cloud ไม่มี LAN → ระบบใช้โหมด staff-access = **public** อัตโนมัติ. **แนะนำเปิด `/setup` ตั้งแอดมินทันทีหลัง deploy** — เพราะ `/setup` เปิดบนเน็ตสาธารณะ ใครเข้าก่อนตั้งแอดมินได้ก่อน. (ทางเลือกกันเหนียว: ตั้ง env `POS_ADMIN_PASSWORD` ล่วงหน้า = สร้างแอดมินให้เลย ข้าม `/setup`.)

## 🏠 แบบ Local (เครื่องในร้าน + Tailscale)

1. **ติดตั้ง deps + DB ไฟล์** — `npm install` · `.env`: `DATABASE_URL=file:sqlite.db` · `POS_AUTH_TOKEN=$(openssl rand -hex 32)` · `npm run db:push` (DB เปล่า = ลงตารางเลย ไม่ prompt).
2. **Build + รัน standalone:**
   ```bash
   npm run build
   cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public
   HOSTNAME=0.0.0.0 PORT=3000 DATABASE_URL="file:$PWD/sqlite.db" POS_AUTH_TOKEN="<token>" node .next/standalone/server.js
   ```
3. **auto-start/restart** — ตั้ง service ให้เด้งเองเมื่อ reboot/crash (macOS: launchd · Linux: systemd/PM2).
4. **ลูกค้าเข้าผ่าน 4G** — `tailscale up` (คุณคลิกยืนยันบัญชี) → `tailscale funnel --bg 3000` → ได้ URL `https://<เครื่อง>.<tailnet>.ts.net`. เอา URL นี้ไปทำ QR โต๊ะ.
5. **พนักงานเข้าผ่าน Wi-Fi ร้าน** — `http://<ip เครื่อง>:3000` (โหมด lan-only default → หน้า staff เข้าได้เฉพาะ Wi-Fi ร้าน; หน้า `/setup` ครั้งแรกก็ทำบน Wi-Fi ร้าน).
6. **เปิด `/setup`** ตั้งชื่อร้าน + แอดมิน → เริ่มใช้.
7. **Backup** — snapshot ไฟล์ DB (`VACUUM INTO`) → อัปขึ้น Drive/R2 เป็นระยะ (ดู `docs/plans/delivery.md` M2).

> โหมด staff-access: local ใช้ **lan-only** (ปลอดภัยสุด) — สลับ public ได้ที่หน้า "ตั้งค่า". กู้ตอนล็อกตัวเอง: ตั้ง env `POS_STAFF_ACCESS=public` แล้ว restart.

---

## Environment variables

| ตัวแปร | จำเป็น | ค่า |
|---|---|---|
| `DATABASE_URL` | ✅ | `libsql://…turso.io` (cloud) หรือ `file:sqlite.db` (local) |
| `DATABASE_AUTH_TOKEN` | cloud | token ของ Turso |
| `POS_AUTH_TOKEN` | ✅ | **สุ่ม** `openssl rand -hex 32` — ใช้เซ็น session. **prod ที่ไม่ตั้ง = แอปจะปฏิเสธทำงาน** (กันปลอม) |
| `POS_ADMIN_PASSWORD` | ไม่บังคับ | ถ้าตั้ง = สร้างแอดมินอัตโนมัติ (ข้าม `/setup`). ไม่ตั้ง = ตั้งผ่าน wizard |
| `POS_STAFF_ACCESS` | ไม่บังคับ | `public`/`lan-only` — override โหมด (break-glass) |
| `ELEVENLABS_API_KEY` ฯลฯ | ไม่บังคับ | เสียงแจ้งเตือน (มี mp3 สำรองใน `public/audio/` แล้ว) |

`.env.example` มีรายการครบ (ค่าว่าง). **ห้าม commit ค่าจริง** — `.env` ถูก gitignore.

---

## ตรวจว่าใช้ได้ (หลังติดตั้ง)

- เปิดเว็บครั้งแรก → เด้งไป `/setup` (ยังไม่ตั้งค่า) → กรอกเสร็จ → เข้าหน้าขายได้
- ลูกค้าสแกน QR โต๊ะ (จาก URL สาธารณะ) → "ขอเปิดโต๊ะ" → พนักงานกดเปิด → สั่งได้ → เข้าครัว
- เมนูว่างตอนแรกเป็นปกติ (repo ไม่มีข้อมูลร้าน) — เพิ่มเองที่หน้า "เมนู"

**ปัญหาที่พบบ่อย:** เว็บ 500 หมดทุกหน้าหลัง deploy = ลืมตั้ง `POS_AUTH_TOKEN` · staff login ผ่าน Wi-Fi ไม่ได้ = เช็คว่าเข้าผ่าน `http://<ip>` จริง (ไม่ใช่ localhost) · ลูกค้าสแกน QR ไม่ติด = QR ต้องฝัง URL สาธารณะ (สร้าง QR ตอนเปิดผ่านโดเมนนั้น).

---

## อ้างอิงเพิ่ม
- **`docs/DEVELOPMENT.md`** — คู่มือนักพัฒนา (สถาปัตยกรรม, DB, auth, ธีม, พิมพ์ใบเสร็จ, Sunmi)
- **`docs/plans/delivery.md`** — แผนทำ single ให้พร้อมส่งมอบ (M1–M7)
- **`docs/plans/security-hardening.md`** — รายการความปลอดภัย
- **`DEPLOY.md`** — ขั้นตอน deploy Vercel+Turso ละเอียด
