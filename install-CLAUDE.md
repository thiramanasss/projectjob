# install-CLAUDE.md — ให้ Claude Code พาติดตั้ง POS จนใช้งานได้

> **ไฟล์นี้เขียน "ถึง Claude Code"** — ลูกค้าแค่เปิด Claude Code ในโฟลเดอร์นี้แล้วพิมพ์
> _"ติดตั้ง POS ให้หน่อย"_ แล้ว Claude อ่านไฟล์นี้ทำตามทีละ Phase
> ถ้าคุณเป็นมนุษย์อยากอ่านภาพรวมการติดตั้ง → ดู `CLAUDE.md` (install guide สำหรับคน)

## กติกาสำหรับ Claude (อ่านก่อนเริ่ม)

- ทำทีละ Phase ตามลำดับ **หยุดที่จุด 🙋 HUMAN แล้วบอกผู้ใช้ให้ทำเอง** อย่าทำแทน
- **ห้ามพิมพ์/สร้างรหัสผ่านแอดมินแทนผู้ใช้** — ให้ผู้ใช้ตั้งเองที่หน้า `/setup`
- **ห้ามทำ login/OAuth แทน** (GitHub, Tailscale, Anthropic) — สั่งคำสั่งแล้วให้ผู้ใช้คลิกยืนยัน
- คำสั่งที่ต้อง `sudo` → บอกผู้ใช้ว่าจะต้องพิมพ์รหัสเครื่อง
- **จบแต่ละ Phase = ยืนยันจุดเช็ก (✅) ก่อนไปต่อ** ถ้าไม่ผ่าน หยุดแก้ก่อน
- **ถามผู้ใช้ก่อนเริ่ม: cloud หรือ local?** โชว์ตารางนี้ให้เขาเลือกเป็น:

  | | ☁️ **Cloud** (Vercel+Turso) | 🏠 **Local** (เครื่องในร้าน+Tailscale) |
  |---|---|---|
  | เปิดคอมในร้าน | **ไม่ต้อง** (รันบน Vercel) | **ต้องเปิดตลอดเวลา** (+UPS กันไฟดับ) |
  | เน็ตล่มยังขายได้ | ❌ ล่ม=ขายไม่ได้ | ✅ พนักงานขายต่อผ่าน Wi-Fi ร้าน |
  | พนักงานเข้า | ผ่านเน็ต (ธรรมดา) | **เร็วกว่า** — LAN ไม่วิ่งออกเน็ต |
  | ลูกค้า 4G สแกน QR | โดเมน Vercel (เร็ว) | Tailscale Funnel (ช้ากว่านิด) |
  | ตั้ง/ดูแล | ง่าย | ยุ่งกว่า (เครื่อง/backup/tunnel) |
  | เหมาะกับ | เน็ตนิ่ง อยากง่าย | ร้านจริงที่เน็ตไม่นิ่ง คุมข้อมูลเอง |

  > จุดต่างตัวจริง = **offline** (ไม่ใช่ speed ล้วน). local เร็วเฉพาะฝั่งพนักงาน(LAN); ลูกค้า cloud อาจเร็วกว่าด้วยซ้ำ
- **เลือกแล้ว → ทำ Phase 0.5 (🙋 เคลียร์บัญชีให้จบรอบเดียว) ก่อน** แล้วค่อยรันยาว. ไฟล์นี้ครอบ **local** เป็นหลัก — cloud อยู่ท้ายไฟล์

---

## Phase 0 — เช็ก + ลงเครื่องมือที่ต้องมี (ตามทางที่เลือก)

**ทั้ง 2 ทาง:**
1. **Node ≥ 20 + git** — `node -v && git --version`
   - ไม่มี → macOS `brew install node git` (ไม่มี brew → 🙋 HUMAN ลง Homebrew จาก brew.sh ก่อน — ต้องรหัสเครื่อง) · Windows `winget install OpenJS.NodeJS.LTS Git.Git` · Linux `sudo apt update && sudo apt install -y nodejs npm git` (🙋 sudo)

**ถ้า 🏠 Local — Claude เช็ก/ลงเพิ่ม:**
2. **Tailscale** (เปิด Funnel ให้ลูกค้า 4G) — `command -v tailscale` ไม่เจอ → ลงให้: macOS `brew install tailscale` · Windows `winget install tailscale.tailscale` · Linux `curl -fsSL https://tailscale.com/install.sh | sh` → จากนั้น 🙋 login `tailscale up` (คลิกยืนยันบัญชี — ปกติทำใน Phase 0.5)
3. *(ถ้าจะทำ auto-backup)* **rclone** — `command -v rclone` ไม่เจอ → macOS `brew install rclone` · Windows `winget install Rclone.Rclone` · Linux `curl https://rclone.org/install.sh | sudo bash`
   > ⚠️ **Windows local ยังไม่พร้อมเต็ม** — ลงเครื่องมือผ่าน winget ได้ แต่ **รัน + auto-start ยังเป็น mac/linux เท่านั้น** (`start-local.sh` + launchd/systemd; ยังไม่มี `.ps1`/Windows service). Windows ตอนนี้เหมาะกับ **cloud** — local ใช้ mac/mini-PC Linux ไปก่อน

**ถ้า ☁️ Cloud — Claude เช็ก/ลงเพิ่ม:**
2. **turso CLI** (ทางเลือก CLI) — `command -v turso` ไม่เจอ → `curl -sSfL https://get.tur.so/install.sh | bash` (**Windows: turso CLI native จำกัด → ใช้ web dashboard `app.turso.tech` แทน**)
3. **Vercel — ไม่ต้องลง CLI** (deploy ผ่าน import บนเว็บ) · **gh** (ออปชัน) — มีก็ push ผ่าน CLI ได้, ไม่มีก็ push แบบ https/token
   > 💻 **Windows cloud ใช้ได้ครบ:** node/git (winget) + Turso web dashboard + Vercel import เว็บ — ไม่ต้องพึ่ง unix script

✅ **ผ่านเมื่อ:** เครื่องมือของทางที่เลือกครบ (ขั้นต่ำ `node -v` v20+)

## Phase 0.5 — 🙋 เคลียร์บัญชี/login ให้จบรอบเดียว (แล้วปล่อย Claude รันยาว)

> **แนวคิด:** งานที่ Claude ทำแทนไม่ได้ = สมัคร/login (ต้องคลิกยืนยันในเบราว์เซอร์). พวกนี้ **ไม่ต้องรอผลอะไร** → ทำให้จบทีเดียวตรงนี้ แล้วหลังจากนี้ Claude รันรวดได้ยาวๆ เกือบไม่ต้องมากวนคุณ
> Claude: บอกลูกค้าให้ทำ **ทั้งหมดในลิสต์ของทางที่เขาเลือก** ก่อน แล้วรอให้เขายืนยันว่าเสร็จ ค่อยไปต่อ

**ถ้าเลือก 🏠 Local — 🙋 ทำให้ครบก่อน:**
1. **login GitHub** — `gh auth login` (คลิกยืนยันในเบราว์เซอร์) *(ถ้า clone repo มาแล้ว/มี token ข้ามได้)*
2. **login Tailscale** — เปิด/ลงแอป Tailscale แล้ว `tailscale up` (คลิกยืนยันบัญชี) — ไว้เปิด Funnel ให้ลูกค้า 4G
3. *(ถ้าจะทำ auto-backup)* **login rclone → Google Drive/R2** — `rclone config` (login บริการคลาวด์)

**ถ้าเลือก ☁️ Cloud — 🙋 ทำให้ครบก่อน:**
1. **สมัคร/login Turso** — ทาง A: ให้ Claude ลง CLI แล้ว `turso auth signup` · ทาง B: สมัครที่ `app.turso.tech` (ดู Cloud Phase 1)
2. **สมัคร/login Vercel** — `vercel.com` (login ด้วย GitHub ได้)
3. **มีบัญชี GitHub** + push/fork repo `tahrt/posee-v2` ขึ้น GitHub ตัวเอง

✅ **ผ่านเมื่อ:** login ครบทุกบริการของทางที่เลือก → จากนี้ Claude ทำต่อได้ยาว

> ⚠️ **มี 3 จุดที่ต้องแทรกกลาง เลี่ยงไม่ได้** (เพราะต้องรอผล Claude ก่อน) — Claude จะหยุดถามตอนถึง:
> (1) ตั้งรหัสแอดมินที่ `/setup` (รอ server รัน) · (2) ตัดสาย WAN ทดสอบ offline (รอร้านตั้งเสร็จ — local) · (3) สแกน QR ด้วย 4G (รอ funnel + ร้านตั้งเสร็จ)

## Phase 1 — โค้ด + dependencies

> ถ้ารันไฟล์นี้อยู่ = clone มาแล้ว ข้ามข้อ clone ได้

1. (ถ้ายังไม่ได้ clone) — repo เป็น **private**:
   🙋 **HUMAN:** ต้อง login GitHub ก่อน (`gh auth login` แล้วทำตามขั้นตอนในเบราว์เซอร์) หรือใส่ token
   จากนั้น: `git clone https://github.com/tahrt/posee-v2.git pos && cd pos`
2. ลง dependencies:
   ```bash
   npm install
   ```

✅ **ผ่านเมื่อ:** `node_modules/` เกิดขึ้น ไม่มี error

## Phase 2 — ตั้งค่า + ฐานข้อมูล

1. **สร้าง `.env` อัตโนมัติ** (สุ่ม `POS_AUTH_TOKEN` ให้เอง, `DATABASE_URL=file:sqlite.db` default):
   ```bash
   npm run env:init
   ```
   > ⚠️ ถ้าไม่ตั้ง `POS_AUTH_TOKEN` แอปจะไม่ยอมรัน (กันปลอม login) — `env:init` ใส่ให้แล้ว. รหัสแอดมินตั้งที่ `/setup`
2. สร้างตาราง (DB เปล่า = ไม่มี prompt, ลงตารางครบ):
   ```bash
   npm run db:push
   ```
   > **อย่ารัน** `npm run db:seed` — นั่นคือเมนูตัวอย่าง (ร้านจริงเริ่มจากว่าง)

✅ **ผ่านเมื่อ:** ขึ้น "Changes applied"

## Phase 3 — รัน + ให้ผู้ใช้ตั้งค่าร้าน

1. รัน standalone server:
   ```bash
   ./scripts/start-local.sh
   ```
   (build ครั้งแรกจะนานหน่อย → รันที่ `http://0.0.0.0:3000`)
2. 🙋 **HUMAN:** เปิด `http://localhost:3000` ในเบราว์เซอร์ → จะเด้งไปหน้า `/setup`
   → กรอก **ชื่อร้าน · พร้อมเพย์ · ชื่อผู้ใช้ + รหัสแอดมิน (≥8 ตัว)** เอง แล้วกด "เริ่มใช้งานร้าน"
   → เพิ่มเมนู 2-3 อย่าง (หน้า "เมนู") + โต๊ะ (หน้า "ตั้งค่า")

✅ **ผ่านเมื่อ:** ผู้ใช้ login เข้าหน้าขายได้ + มีเมนู

## Phase 4 — LAN + ทดสอบ offline

1. หา LAN IP:
   ```bash
   ipconfig getifaddr en0 || hostname -I
   ```
2. 🙋 **HUMAN:** อีกเครื่อง (ต่อ Wi-Fi ร้านเดียวกัน) เปิด `http://<LAN-IP>:3000` → login พนักงาน → ลองรับออเดอร์
3. 🙋 **HUMAN:** ทดสอบ offline — **ตัดเน็ต WAN ของ router** (Wi-Fi ยังอยู่) → ต้องยังขาย/เข้าครัวได้

✅ **ผ่านเมื่อ:** ขายได้แม้เน็ตล่ม (ผ่าน Wi-Fi ร้าน)

## Phase 5 — เปิดให้ลูกค้าสแกน QR (Tailscale Funnel)

1. Tailscale login แล้วตั้งแต่ **Phase 0.5** → เช็กว่าพร้อม: `tailscale status` (เห็น `BackendState:Running`)
   > ถ้ายังไม่ได้ login: 🙋 **HUMAN** `tailscale up` (คลิก URL ยืนยันบัญชี) — แต่ปกติทำใน Phase 0.5 ไปแล้ว
2. Claude เปิด Funnel:
   ```bash
   tailscale funnel --bg 3000
   tailscale funnel status   # ได้ URL https://<เครื่อง>.<tailnet>.ts.net
   ```
   > ⚠️ request แรกออก HTTPS cert ช้า (>15 วิ) — รอแล้วลองใหม่
3. 🙋 **HUMAN:** เปิด URL funnel → หน้า "ตั้งค่า" → โชว์ QR โต๊ะ → เอามือถือ **ปิด Wi-Fi ใช้ 4G** → สแกน → "ขอเปิดโต๊ะ" → (staff กดเปิด) → สั่ง → เช็กเข้าครัว
   > QR ต้องสร้างตอนเปิดผ่านโดเมน funnel เท่านั้น (ไม่งั้นฝัง IP ในบ้าน สแกนไม่ติด)

✅ **ผ่านเมื่อ:** ลูกค้า 4G นอกร้านสั่งได้

## Phase 6 — auto-start + backup (ก่อนใช้จริง)

1. **auto-start** (reboot/crash เด้งเอง) — ใช้เทมเพลตใน `scripts/`:
   - macOS: แก้ path ใน `scripts/com.pos.server.plist.example` → คัดลอกไป `~/Library/LaunchAgents/com.pos.server.plist` → `launchctl load ...`
   - Linux: แก้ path ใน `scripts/pos.service.example` → `sudo cp ... /etc/systemd/system/pos.service` → `sudo systemctl enable --now pos` (🙋 sudo)
2. **backup อัตโนมัติ**:
   - 🙋 **HUMAN:** `rclone config` เชื่อม Google Drive / R2 (ต้อง login บริการนั้น)
   - Claude ตั้ง cron รัน `scripts/backup-and-upload.sh` (ดู `docs/backup.md`)
   - ลอง restore 1 รอบให้แน่ใจว่ากู้ได้

✅ **ผ่านเมื่อ:** reboot แล้ว POS กลับมาเอง + snapshot ขึ้นคลาวด์ + กู้กลับได้

## เครื่องพิมพ์ (ทำเมื่อมีฮาร์ดแวร์)

🙋 **HUMAN:** Sunmi → ติดตั้งแอปพิมพ์จากปุ่มในหน้า `/kitchen`. เครื่องอื่น → ESC/POS ผ่าน RawBT/local-bridge/Web Serial. ถ้าไทยเพี้ยน/เลย์เอาต์เบี้ยว ดู `docs/sunmi-print.md`

---

## แบบ Cloud (Vercel + Turso)

> เหมาะกับร้านเน็ตนิ่ง อยากง่าย ไม่ดูแลเครื่อง. **ไม่ทนเน็ตล่ม** (เน็ตล่ม = ขายไม่ได้) — ถ้าต้อง offline ใช้แบบ local
> Turso = SQLite บนคลาวด์ → codebase เดียวกับ local, ต่างแค่ `DATABASE_URL` ชี้ `libsql://` แทนไฟล์
> **พิสูจน์ครบทั้งเส้นแล้ว 2026-07-09** (db:push→Turso · VERCEL build · runtime อ่าน/เขียน Turso · login+หน้า staff)

### Cloud Phase 1 — บัญชี + DB บน Turso
> **buyer เริ่มจากศูนย์:** ยังไม่มีบัญชี Turso, ยังไม่มี CLI. เลือก **ทาง A (CLI)** หรือ **ทาง B (เว็บ ไม่ต้องลง CLI)**

**ทาง A — ผ่าน CLI (Claude ช่วยได้มากสุด)**
1. Claude ลง turso CLI ถ้ายังไม่มี (`command -v turso` ไม่เจอ):
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash    # mac+linux; หรือ mac: brew install tursodatabase/tap/turso
   ```
2. 🙋 **HUMAN:** สมัคร/login บัญชี Turso (เปิดเบราว์เซอร์ยืนยันเอง — Claude ทำแทนไม่ได้):
   ```bash
   turso auth signup     # บัญชีใหม่   (มีบัญชีแล้วใช้  turso auth login)
   ```
3. Claude สร้าง DB + ดึง URL + token:
   ```bash
   turso db create <ชื่อร้าน>
   turso db show <ชื่อร้าน> --url          # ได้ libsql://xxx.turso.io  → DATABASE_URL
   turso db tokens create <ชื่อร้าน>       # ได้ token               → DATABASE_AUTH_TOKEN
   ```

**ทาง B — ผ่านเว็บ dashboard (ไม่ต้องลง CLI — ง่ายกว่าสำหรับคนไม่สายเทค)**
1. 🙋 **HUMAN:** สมัครที่ **app.turso.tech** → สร้าง Database ในหน้าเว็บ → copy **Database URL** (`libsql://…`) + กด create token → copy token
2. 🙋 **HUMAN:** ส่งค่า 2 ตัวนั้นให้ Claude (วางในแชต)

**จากนั้น (ทั้งสองทาง) — Claude สร้าง `.env` อัตโนมัติ + สร้าง schema บน Turso:**
```bash
# สร้าง .env ให้เลย (สุ่ม POS_AUTH_TOKEN ให้เอง) + พิมพ์ 3 บรรทัดพร้อมวางลง Vercel
DATABASE_URL="libsql://xxx.turso.io" DATABASE_AUTH_TOKEN="<token>" npm run env:init
npm run db:push        # อ่าน .env ที่เพิ่งสร้าง
```
> **อย่ารัน** `db:seed` (เมนูตัวอย่าง) — ร้านจริงเริ่มจากว่าง
> `env:init` จะพิมพ์บล็อก `DATABASE_URL` + `DATABASE_AUTH_TOKEN` + `POS_AUTH_TOKEN` ให้ copy ไปวางบน Vercel (Phase 2). **รหัสแอดมินไม่ต้องใส่ env** — ตั้งที่ `/setup`

✅ **ผ่านเมื่อ:** ขึ้น "Changes applied" (สร้างตารางครบ)

### Cloud Phase 2 — Deploy บน Vercel
> เลือก **ทาง A (Vercel CLI, ไม่ต้องมี GitHub)** หรือ **ทาง B (GitHub + import ผ่านเว็บ)**

**ทาง A — Vercel CLI (แนะนำถ้า buyer ไม่มีบัญชี GitHub)**
1. Claude ลง CLI: `npm i -g vercel`
2. 🙋 **HUMAN:** `vercel login` (คลิกยืนยันบัญชีในเบราว์เซอร์)
3. Claude: `vercel` (deploy preview + ตั้งชื่อโปรเจกต์) — อัปโหลดโฟลเดอร์นี้ตรงๆ ไม่ต้อง push GitHub
4. Claude ตั้ง env (ค่าจาก `env:init`) แล้ว deploy จริง:
   ```bash
   vercel env add DATABASE_URL production        # วางค่า
   vercel env add DATABASE_AUTH_TOKEN production  # วางค่า
   vercel env add POS_AUTH_TOKEN production       # วางค่า
   vercel --prod                                  # deploy จริงให้ env มีผล
   ```

**ทาง B — GitHub + Vercel (ถ้ามี/อยากได้ auto-deploy เวลาแก้โค้ด)**
1. 🙋 **HUMAN:** push repo ขึ้น GitHub ของคุณ + สมัคร/login **Vercel** (vercel.com) → **import repo** ในหน้าเว็บ
2. 🙋 **HUMAN:** หน้า Environment Variables → **วาง 3 บรรทัดที่ `env:init` พิมพ์ให้** (`DATABASE_URL` + `DATABASE_AUTH_TOKEN` + `POS_AUTH_TOKEN`)

> ทั้งสองทาง: `POS_AUTH_TOKEN` **ไม่ตั้ง = เว็บ 500 ทุกหน้า** (กันปลอม cookie) — `env:init` สุ่มให้แล้ว. รหัสแอดมิน**ไม่ต้องใส่ env**.
> Vercel ใช้ adapter ตัวเอง (ไม่ใช่ standalone) — โค้ด gate `output` ด้วย env `VERCEL` ให้แล้ว ไม่ต้องแตะ

✅ **ผ่านเมื่อ:** เปิดโดเมน Vercel ได้ ไม่ 500

### Cloud Phase 3 — ตั้งค่าร้าน
1. 🙋 **HUMAN:** เปิดโดเมน Vercel **ทันทีหลัง deploy** → เด้ง `/setup` → ตั้งชื่อร้าน + พร้อมเพย์ + บัญชีแอดมิน (รหัสของคุณเอง)
2. เพิ่มเมนู/โต๊ะ → QR โต๊ะสร้างจากหน้า "ตั้งค่า" (ต้องเปิดผ่านโดเมน Vercel)

✅ **ผ่านเมื่อ:** login เข้าหน้าขายได้ + ลูกค้าสแกน QR สั่งได้

> ⚠️ **cloud ไม่มี LAN → ระบบใช้โหมด staff-access = public อัตโนมัติ** (หน้า staff เข้าจากเน็ตได้หลัง login).
> เพราะ `/setup` เปิดบนเน็ตสาธารณะ ใครเข้าก่อนตั้งแอดมินได้ก่อน → **เปิด `/setup` ตั้งแอดมินทันทีหลัง deploy** (กันเหนียว: ตั้ง env `POS_ADMIN_PASSWORD` ล่วงหน้า = สร้างแอดมินให้เลย ข้าม `/setup`) + ใช้รหัสแข็ง

---

## สรุปสิ่งที่ Claude ทำแทนไม่ได้ (ต้อง 🙋 HUMAN)
ลง Claude Code + login Anthropic (ขั้น bootstrap) · login GitHub/Tailscale/Vercel/Turso/rclone · **ตั้งรหัสแอดมินที่ /setup** · เสียบเครื่องพิมพ์/ต่อ router · พิมพ์รหัสเครื่องตอน sudo · ตัดเน็ตทดสอบ offline · สแกน QR จากมือถือ 4G
