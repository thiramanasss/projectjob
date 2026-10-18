/** @type {import('next').NextConfig} */
const nextConfig = {
  // single/local: build เป็น standalone Node server (node .next/standalone/server.js)
  // เปิดเฉพาะตอนไม่ได้ build บน Vercel — Vercel ใช้ adapter ของตัวเอง (standalone ทำ prerender
  // /_not-found ไปแตะ DB ตอน build → พัง). local/single ไม่มี VERCEL env → ได้ standalone
  output: process.env.VERCEL ? undefined : "standalone",
  // libSQL client มี native binding — ไม่ให้ Next bundle
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;
