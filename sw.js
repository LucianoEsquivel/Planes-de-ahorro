// Service Worker básico para permitir la instalación de la PWA
self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    // No interceptamos nada para que Firestore funcione con su propia caché
});