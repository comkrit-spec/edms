const CACHE_NAME = 'edms-cache-v4'; // หลังจากเปลี่ยนโค้ดนี้ เปลี่ยนชื่อเป็น v3 ครั้งสุดท้าย
const urlsToCache = [
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  // บังคับให้ Service Worker ตัวใหม่ทำงานทันที โดยไม่ต้องรอให้ผู้ใช้ปิดแท็บ
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  // บังคับให้ Service Worker เข้าควบคุมหน้าเว็บที่เปิดอยู่ทันที
  self.clients.claim();
});

// เปลี่ยนกลยุทธ์เป็น Network-First
self.addEventListener('fetch', event => {
  event.respondWith(
    // 1. วิ่งไปหาข้อมูลจาก Network (GitHub/Server) ก่อนเสมอ
    fetch(event.request)
      .then(response => {
        // 2. ถ้าดึงข้อมูลสำเร็จและถูกต้อง ให้อัปเดตเก็บไว้ใน Cache ทันที
        // (ต้องเช็ค status === 200 และ type === 'basic' เพื่อไม่ให้เผลอ Cache หน้า Error หรือไฟล์จากเว็บอื่น)
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response; // ส่งไฟล์เวอร์ชันใหม่ล่าสุดให้หน้าเว็บไปแสดงผล
      })
      .catch(() => {
        // 3. ถ้าดึงจาก Network ไม่ได้ (เช่น เน็ตหลุด หรือ Server ล่ม) ค่อยไปดึงของเก่าจาก Cache มาแสดง
        return caches.match(event.request);
      })
  );
});
