# Deploy — Vercel + Turso ($0)

- **Vercel** = รันตัวแอป (serverless)
- **Turso** = ฐานข้อมูล libSQL (SQLite บน cloud) — เลือก region สิงคโปร์ latency ดี
- ทั้งคู่มี free tier · โค้ดพร้อมแล้ว (ใช้ `@libsql/client` อ่าน `DATABASE_URL`)

ลูกค้าสแกน QR โต๊ะจาก 4G ได้ทันที (QR ฝังโดเมน Vercel).

---

## ⚠️ ก่อน deploy — ความปลอดภัย
พอขึ้นเน็ต ระบบเปิดสาธารณะ. auth ใช้ token เทียบตรงๆ → **ความปลอดภัยอยู่ที่ token/รหัสเดายาก**:
- `POS_AUTH_TOKEN` = สุ่มยาว (`openssl rand -hex 32`)
- `POS_ADMIN_PASSWORD` / `POS_STAFF_PASSWORD` = เดายาก (ไม่ใช่ 1234/1111)
- Vercel ให้ HTTPS อัตโนมัติ (รหัส login ไม่วิ่ง plaintext)

---

## 1) สร้าง DB บน Turso

```bash
# ติดตั้ง + login (เปิด browser)
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login

# สร้าง DB (region สิงคโปร์)
turso db create posee-pos --location sin

# เอา URL + token (เก็บไว้ใส่ Vercel)
turso db show posee-pos --url          # libsql://posee-pos-xxx.turso.io
turso db tokens create posee-pos       # เอา token ที่ได้
```

## 2) สร้างตาราง (push schema ขึ้น Turso)

```bash
DATABASE_URL='libsql://...turso.io' DATABASE_AUTH_TOKEN='<token>' npm run db:push
```
(request แรกบนเว็บ `ensureSeeded()` จะเติมเมนู/โต๊ะให้เอง — ไม่ต้อง seed มือ)

## 3) Deploy บน Vercel

1. **vercel.com** → New Project → Import repo `tahrt/posee-v2`
2. Framework = Next.js (auto)
3. **Environment Variables** — ใส่ทั้งหมด:

| ตัวแปร | ค่า |
|--------|-----|
| `DATABASE_URL` | `libsql://...turso.io` |
| `DATABASE_AUTH_TOKEN` | token จาก Turso |
| `POS_ADMIN_PASSWORD` | รหัสแอดมิน |
| `POS_STAFF_PASSWORD` | รหัสพนักงาน |
| `POS_AUTH_TOKEN` | `openssl rand -hex 32` |
| `ELEVENLABS_API_KEY` | key เสียง (ถ้าใช้) |
| `ELEVENLABS_VOICE_ID` | `cgSgspJ2msm6clMCkdW9` |
| `ELEVENLABS_MODEL` | `eleven_v3` |

4. **Deploy** → ได้โดเมน `https://xxx.vercel.app`

> อยากใช้ CLI: `npm i -g vercel && vercel && vercel --prod` (ตั้ง env ผ่าน `vercel env add`)

## 4) หลัง deploy

- เปิดโดเมน → login (รหัสใหม่) → `/settings` ใส่ PromptPay จริง + เพิ่มโต๊ะ + ปริ้น QR
- QR ชี้โดเมน Vercel แล้ว ลูกค้า 4G สแกนได้

---

## หมายเหตุ

- **Polling / Vercel free**: หน้าครัว/โต๊ะ/เสียง poll ทุก 3-4 วิ = invocation ต่อเนื่อง. ถ้าเปิด dashboard ค้างหลายจอทั้งวันอาจเข้าใกล้ลิมิต Hobby → ดู usage ใน Vercel; ถ้าจ่อลิมิตบอกได้ ปรับ interval ให้ช้าลงได้ (เช่น 3→8 วิ) ลด invocation ครึ่งนึง
- **Vercel Hobby ห้ามใช้เชิงพาณิชย์** ตาม ToS — ถ้าจริงจังควร Pro ($20/ด) หรือย้าย host
- **แก้ schema ภายหลัง**: `DATABASE_URL=... DATABASE_AUTH_TOKEN=... npm run db:push` (drizzle-kit turso) — ระวังคอลัมน์ NOT NULL ใหม่, ดู CLAUDE.md
- **สำรองข้อมูล**: `turso db shell posee-pos .dump > backup.sql`
- รูปเมนู PNG ใหญ่ (~30MB) served เป็น static จาก Vercel (มี CDN + browser cache) — ปกติไม่มีปัญหา
