const CACHE_NAME = 'edru-i-dag-v11';
const ASSETS = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/motivation.html',
    '/social.html',
    '/about.html',
    '/settings.html',
    '/sobertoday.css',
    '/sobertoday.js',
    '/contact.js',
    '/manifest.json',
    '/reminder.ics',
    '/images/sobertoday_wave.webp',
    '/images/badges/1-day.webp',
    '/images/badges/5-days.webp',
    '/images/badges/10-days.webp',
    '/images/badges/1-month.webp',
    '/images/badges/1-year.webp',
    '/images/sobertoday_logo.webp',
    '/images/icon-192.png',
    '/images/icon-512.png'
];

// Installerer service worker og lagrer filene
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

// Fjerner gamle appversjoner når den nye versjonen tas i bruk
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(names => Promise.all(
            names.filter(name => name.startsWith('edru-i-dag-') && name !== CACHE_NAME)
                .map(name => caches.delete(name))
        ))
    );
});

// Henter filer fra cache hvis brukeren er offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
