// This service worker was registered by a previous version of this site.
// It immediately unregisters itself to clean up stale browser registrations.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.registration.unregister());
