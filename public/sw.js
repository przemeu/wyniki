const CACHE_NAME = "football-scorer-v2"
const urlsToCache = [
  "/",
  "/offline",
  "/logos/yellow.png",
  "/logos/blue.png",
  "/manifest.json",
  "/sounds/goal-default.mp3",
  "/sounds/goal-whistle.mp3",
  "/sounds/goal-cheer.mp3",
  "/sounds/goal-horn.mp3",
  "/sounds/goal-bell.mp3",
]

// Install event - cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache")
      return cache.addAll(urlsToCache)
    }),
  )
  self.skipWaiting()
})

// Fetch event - serve from cache when offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      if (response) {
        return response
      }

      return fetch(event.request).catch(() => {
        // If both cache and network fail, show offline page for navigation requests
        if (event.request.destination === "document") {
          return caches.match("/offline")
        }
      })
    }),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})
