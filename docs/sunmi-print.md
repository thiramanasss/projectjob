# พิมพ์บนเครื่อง Sunmi V2 (เครื่องพิมพ์ในตัว)

> ✅ **วิธีที่ใช้จริง (สร้างเสร็จแล้ว):** แอป WebView + Sunmi SDK ใน **[`sunmi-print-app/`](sunmi-print-app/README.md)**
> — GitHub Actions build APK ให้อัตโนมัติ → กดติดตั้งจากปุ่มในหน้า `/kitchen`
> RawBT/Bluetooth (ด้านล่าง) ลองแล้ว **คิวค้าง** เพราะเครื่องพิมพ์ในตัว Sunmi ต้องสั่งผ่าน SDK ไม่ใช่ BT ธรรมดา

เว็บ (Chrome ปกติบน Sunmi) **สั่งเครื่องพิมพ์ในตัวตรงๆ ไม่ได้** — ต้องมีแอป Android เล็กๆ บนเครื่องช่วยรับข้อมูลแล้วสั่งพิมพ์ผ่าน Sunmi SDK

## ฝั่งเว็บทำอะไรแล้ว (เสร็จแล้ว)

`src/lib/thermal.ts` → `printBytes(bytes)` ลองพิมพ์ตามลำดับ:
1. **Sunmi WebView bridge** — `window.SunmiPrint.printBase64(b64)` หรือ `window.sunmiInnerPrinter.sendRAWData(...)`
2. **RawBT** — intent URL (`scheme=rawbt`) บน Android ← **แนะนำ ไม่ต้องเขียนแอป**
3. **แอปตัวกลาง (localhost)** — `POST http://127.0.0.1:9100/print` body = ไบต์ ESC/POS ดิบ
4. **USB serial** — เดสก์ท็อป (ของเดิม)
5. ไม่ได้เลย → `window.print()` (พิมพ์ผ่าน OS driver)

โหมดต่อเครื่อง `localStorage["pos-print-mode"]`: `auto` (ค่าเริ่มต้น — Android ลอง RawBT ให้เอง) · `rawbt` (บังคับ RawBT) · `browser` (ใช้ window.print เลย)

ไบต์ ESC/POS สร้างจาก `src/lib/escpos.ts`:
- `buildKitchenTicket()` — บิลครัว (ไม่มีราคา)
- `buildReceipt()` — ใบเสร็จลูกค้า (มีราคา/ยอดสุทธิ) ← เพิ่มใหม่

ปุ่มที่ต่อแล้ว: บิลครัว (`/kitchen`), ใบเสร็จ POS (`/`), ปริ้นบิลย้อนหลัง (`/orders`)

ภาษาไทยเข้ารหัส **TIS-620**; ถ้าพิมพ์ไทยเป็นตัวขยะ แก้ค่า `THAI_CODE_TABLE` ใน `escpos.ts` (ลอง 20 / 255 / 0)

---

## ทาง 0 ⭐⭐ RawBT (แนะนำสุด — ไม่ต้องเขียนแอป)

1. บน Sunmi เปิด Play Store → ติดตั้ง **RawBT print service** (ผู้พัฒนา `ru.a402d`)
2. เปิดแอป RawBT → เลือกเครื่องพิมพ์เป็น **"Internal printer"** (หรือ Sunmi) → ทดสอบพิมพ์ในแอปให้ออกก่อน
3. กลับมาที่เว็บ POS บน Chrome → กดปริ้นบิลครัว/ใบเสร็จ → เว็บจะส่ง ESC/POS เข้า RawBT อัตโนมัติ
   (ครั้งแรก Chrome อาจถามว่าจะเปิด RawBT — กด "เปิด/อนุญาต" และติ๊ก "จำไว้เสมอ")

ถ้าเว็บไม่เด้งเข้า RawBT ให้บังคับโหมด: เปิด Chrome console หรือหน้าเว็บ แล้วรัน
`localStorage.setItem("pos-print-mode","rawbt")` ครั้งเดียวบนเครื่อง Sunmi

> ข้อดี: ฟรี ไม่ต้อง build APK · ใช้ ESC/POS ที่เราสร้างเอง (ตัวหนา/ตัดกระดาษ/ไทยครบ) · เปิดเว็บใน Chrome ปกติ

---

## เลือก 1 ใน 2 ทาง (ถ้าไม่อยากใช้ RawBT — ต้องสร้างแอป Android เอง)

### ทาง 1 ⭐ แอปตัวกลาง (แนะนำ — เปิดเว็บใน Chrome เหมือนเดิม)

แอปเล็กรันพื้นหลัง เปิด HTTP server ที่ `127.0.0.1:9100` รับไบต์ → สั่ง Sunmi พิมพ์
(Chrome ยอมให้หน้า HTTPS ยิงไป `127.0.0.1` ได้ ไม่ติด mixed-content)

**สัญญา:** `POST /print` body = ESC/POS ไบต์ดิบ → ตอบ `200`

```kotlin
// build.gradle: implementation("org.nanohttpd:nanohttpd:2.3.1") + Sunmi Printer SDK
class PrintServer(private val printer: SunmiPrinterService) : NanoHTTPD(9100) {
  override fun serve(session: IHTTPSession): Response {
    if (session.method == Method.OPTIONS) return cors(newFixedLengthResponse(""))   // preflight
    if (session.uri != "/print" || session.method != Method.POST)
      return cors(newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", ""))
    val len = session.headers["content-length"]?.toInt() ?: 0
    val buf = ByteArray(len); session.inputStream.read(buf, 0, len)
    printer.sendRAWData(buf, null)     // ← ส่ง ESC/POS ตรงเข้าเครื่องพิมพ์ในตัว
    return cors(newFixedLengthResponse("ok"))
  }
  private fun cors(r: Response) = r.apply { addHeader("Access-Control-Allow-Origin", "*") }
}
```
- bind Sunmi service: `InnerPrinterManager.getInstance().bindService(ctx, callback)` → ได้ `SunmiPrinterService`
- รันเป็น **foreground service** ให้ server ไม่ถูกฆ่า + ตั้ง auto-start ตอนเปิดเครื่อง
- เปลี่ยน port ได้ที่ฝั่งเว็บ: `localStorage["pos-print-url"] = "http://127.0.0.1:PORT/print"`

### ทาง 2 แอปครอบเว็บ (WebView — ใช้แอปแทน Chrome)

```kotlin
webView.settings.javaScriptEnabled = true
webView.addJavascriptInterface(object {
  @JavascriptInterface fun printBase64(b64: String) {
    printer.sendRAWData(android.util.Base64.decode(b64, android.util.Base64.DEFAULT), null)
  }
}, "SunmiPrint")                                  // ← ตรงกับ window.SunmiPrint.printBase64
webView.loadUrl("https://your-pos-domain.example")
```
ฝั่งเว็บไม่ต้องแก้อะไร — เจอ `window.SunmiPrint` เองอัตโนมัติ

---

## ลำดับทดสอบ

1. **ลอง RawBT ก่อน (ง่ายสุด):** ติดตั้ง RawBT บน Sunmi → ตั้ง Internal printer → พิมพ์ทดสอบในแอปให้ออก → กลับมากดปริ้นในเว็บ
2. ถ้าไม่อยากใช้ RawBT → สร้างแอปเอง (ทาง 1 หรือ 2)
3. เทสต์: กดปริ้นบิลครัว + ใบเสร็จ ดูตัวหนา/ตัดกระดาษ/ภาษาไทย
4. ไทยเพี้ยน → ปรับ `THAI_CODE_TABLE`; เลย์เอาต์เพี้ยน (58 vs 80mm) → ปรับ `RECEIPT_WIDTH`
