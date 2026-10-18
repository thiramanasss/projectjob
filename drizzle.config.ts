import type { Config } from "drizzle-kit";

const raw = process.env.DATABASE_URL || "file:sqlite.db";
const url = raw.includes("://") || raw.startsWith("file:") ? raw : `file:${raw}`;
const isFile = url.startsWith("file:");

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso", // libSQL (Turso cloud + ไฟล์ local)
  dbCredentials: {
    url,
    // drizzle-kit dialect "turso" บังคับต้องมี authToken (≥0.30.6) แม้ url เป็นไฟล์ local ที่ไม่ใช้ token จริง
    // → ไฟล์ local ใส่ placeholder กัน `db:push` ล้ม ("Please provide required params"); cloud ใช้ token จริง
    authToken: process.env.DATABASE_AUTH_TOKEN || (isFile ? "local-file" : undefined),
  },
} satisfies Config;
