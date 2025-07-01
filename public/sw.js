const CACHE_NAME = "football-scorer-v4"
const urlsToCache = [
  "/",
  "/offline",
  "/logos/yellow.png",
  "/logos/blue.png",
  "/manifest.json",
  "/sounds/goal-commentary.mp3",
  "/sounds/goal-horn.mp3",
]

// Install event - cache resources
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker installing...")
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log("📦 Opened cache:", CACHE_NAME)

      // Cache files one by one with better error handling
      const cachePromises = urlsToCache.map(async (url) => {
        try {
          console.log(`📥 Caching: ${url}`)
          const response = await fetch(url, {
            cache: "no-cache",
            mode: "cors",
          })

          if (response.ok) {
            await cache.put(url, response)
            console.log(`✅ Cached successfully: ${url}`)
          } else {
            console.warn(`⚠️ Failed to cache ${url}: ${response.status}`)
          }
        } catch (error) {
          console.error(`❌ Error caching ${url}:`, error)
        }
      })

      await Promise.allSettled(cachePromises)
      console.log("📦 Cache setup completed")
    }),
  )
  self.skipWaiting()
})

// Fetch event - serve from cache when offline
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") {
    return
  }

  // Special handling for audio files
  if (event.request.url.includes("/sounds/")) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log(`🎵 Serving cached audio: ${event.request.url}`)
          return cachedResponse
        }

        console.log(`🎵 Fetching audio from network: ${event.request.url}`)
        return fetch(event.request, {
          mode: "cors",
          cache: "no-cache",
        })
          .then((response) => {
            // Cache successful audio responses
            if (response.ok) {
              const responseClone = response.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone)
                console.log(`🎵 Cached new audio: ${event.request.url}`)
              })
            }
            return response
          })
          .catch((error) => {
            console.error(`❌ Failed to fetch audio: ${event.request.url}`, error)
            throw error
          })
      }),
    )
    return
  }

  // Default fetch handling for other requests
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
  console.log("🔧 Service Worker activating...")
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("🗑️ Deleting old cache:", cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})

// Add message handling for debugging
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }

  if (event.data && event.data.type === "GET_CACHE_STATUS") {
    caches.open(CACHE_NAME).then(async (cache) => {
      const keys = await cache.keys()
      const status = {
        cacheName: CACHE_NAME,
        cachedUrls: keys.map((req) => req.url),
        expectedUrls: urlsToCache,
      }
      event.ports[0].postMessage(status)
    })
  }
})
