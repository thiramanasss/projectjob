# Backup & Restore (โหมด local)

สำรอง/กู้ฐานข้อมูลสำหรับการรันแบบ **local** (`DATABASE_URL=file:sqlite.db`).
โหมด **cloud (Turso)** ใช้ backup ของ Turso เอง — สคริปต์นี้ไม่เกี่ยว.

หัวใจ: เก็บเป็น **ไฟล์ DB ทั้งก้อน** (ไม่แตกเป็นตาราง/Sheet) → กู้ได้ครบ 100%.

## สร้าง snapshot

```bash
npm run backup
```
- ใช้ `VACUUM INTO` → snapshot ที่ consistent (ปลอดภัยแม้ร้านกำลังขาย)
- เก็บที่ `backups/pos-YYYYMMDD-HHmmss.db` (โฟลเดอร์ถูก gitignore)
- ตรวจว่า snapshot เปิดได้ + มีตารางก่อนถือว่าสำเร็จ (กันไฟล์เสียเงียบๆ)
- เก็บ **14 ไฟล์ล่าสุด** อัตโนมัติ (ปรับ `BACKUP_KEEP`)

ตัวแปร: `BACKUP_DIR` (ปลายทาง, default `backups/`) · `BACKUP_KEEP` (จำนวนไฟล์, default 14).

## อัปขึ้นคลาวด์ (Drive / R2) — กันเครื่องพัง

สคริปต์สร้าง snapshot ในเครื่อง; อัปขึ้นคลาวด์ด้วย **rclone** (รองรับ Google Drive, Cloudflare R2, S3, ฯลฯ):

```bash
# ตั้งครั้งเดียว: rclone config  (สร้าง remote ชื่อ เช่น "drive" หรือ "r2")
npm run backup && rclone copy backups/ drive:pos-backups/ --max-age 1h
```

รวมเป็นสคริปต์เดียวสำหรับ cron.

## อัตโนมัติ (cron / ตามเวลา)

**Linux/mac (crontab)** — สำรองทุกชั่วโมง + ตอนปิดร้าน:
```cron
0 * * * *  cd /path/to/pos && /usr/local/bin/npm run backup && rclone copy backups/ drive:pos-backups/ >> /tmp/pos-backup.log 2>&1
```

> ⚠️ **monitoring** — backup เงียบๆ พังได้ (เน็ตล่ม/ดิสก์เต็ม). ควรเช็ก log หรือ alert ว่ายังวิ่ง
> (เช่น cron ส่งผลไป healthchecks.io). อย่านึกเอาเองว่ามี backup.

## กู้คืน (restore)

1. หยุดแอป
2. เอา snapshot ล่าสุดมาวางทับ:
   ```bash
   cp backups/pos-YYYYMMDD-HHmmss.db sqlite.db
   ```
   (ถ้าอยู่บนคลาวด์: `rclone copy drive:pos-backups/<ไฟล์> .` ก่อน)
3. เปิดแอปต่อ — ข้อมูลกลับมาถึงจุด snapshot นั้น

> ยอมรับได้ว่าเสียข้อมูลช่วงสั้น (ระหว่าง snapshot ล่าสุด → ตอนพัง) เพราะออเดอร์มี **ใบพิมพ์ (ตั๋วครัว/ใบเสร็จ)** เป็นหลักฐานสำรอง คีย์กลับได้. อยากเสียน้อยระดับวินาที → ใช้ Litestream stream ไป R2/S3 แบบต่อเนื่อง

## เกี่ยวข้อง
- `src/db/backup.ts` — สคริปต์
- `scripts/backup-and-upload.sh` — cron: snapshot + upload (rclone) + healthcheck ping
