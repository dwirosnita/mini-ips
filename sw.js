// Service worker: kuis tetap bisa dibuka tanpa internet.
// Naikkan VERSION setiap kali file aplikasi diubah agar cache lama diganti.
const VERSION = "kuis-v8";
const APP_FILES = [
  "./", "./index.html", "./ibukota.html", "./provinsi.html", "./budaya.html",
  "./manifest.webmanifest",
  "./ikon/nusantara.svg", "./ikon/ibukota.svg", "./ikon/provinsi.svg", "./ikon/budaya.svg",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Halaman HTML: utamakan jaringan (agar pembaruan guru langsung terpakai), cadangan dari cache saat offline
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // Font Google & file lokal: ambil dari cache, perbarui di belakang layar
  if (url.origin === location.origin || url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(
      caches.match(req).then(cached => {
        const net = fetch(req).then(res => {
          if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
          return res;
        }).catch(() => cached);
        return cached || net;
      })
    );
  }
});
