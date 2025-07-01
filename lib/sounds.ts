// Sound management utilities
export type SoundType = "default" | "commentary" | "whistle" | "cheer" | "horn" | "bell" | "yellow-horn" | "none"

export const AVAILABLE_SOUNDS: { id: SoundType; name: string; files: string[] }[] = [
  { id: "none", name: "Brak dźwięku", files: [] },
  { id: "commentary", name: "Komentarz", files: ["/sounds/goal-commentary.mp3", "/sounds/goal-commentary.ogg"] },
  {
    id: "yellow-horn",
    name: "Klakson Żółtych",
    files: ["/sounds/goal-yellow-horn.mp3", "/sounds/goal-yellow-horn.ogg"],
  },
  { id: "default", name: "Domyślny", files: ["/sounds/goal-default.mp3", "/sounds/goal-default.ogg"] },
  { id: "whistle", name: "Gwizdek", files: ["/sounds/goal-whistle.mp3", "/sounds/goal-whistle.ogg"] },
  { id: "cheer", name: "Okrzyki", files: ["/sounds/goal-cheer.mp3", "/sounds/goal-cheer.ogg"] },
  { id: "horn", name: "Klakson", files: ["/sounds/goal-horn.mp3", "/sounds/goal-horn.ogg"] },
  { id: "bell", name: "Dzwon", files: ["/sounds/goal-bell.mp3", "/sounds/goal-bell.ogg"] },
]

// Player-specific sound mappings (can be expanded)
export const PLAYER_SOUNDS: Record<string, SoundType> = {
  "Łukasz J.": "commentary",
  "Maciej M.": "horn",
  "Tomek W.": "whistle",
  "Grzegorz O.": "bell",
  "Krystian G.": "commentary",
  "Adam S.": "commentary",
  "Michał G.": "cheer",
  // Add more players as needed
}

// Team-based default sounds
export const TEAM_DEFAULT_SOUNDS: Record<string, SoundType> = {
  yellow: "yellow-horn", // Boston Bruins horn for yellow team
  blue: "commentary", // "OOOHHH YESSS!!" commentary for blue team
}

class SoundManager {
  private audioCache: Map<string, HTMLAudioElement> = new Map()
  private enabled = true
  private volume = 0.7
  private loadingStatus: Map<string, "loading" | "loaded" | "error"> = new Map()
  private errorDetails: Map<string, string> = new Map()
  private userInteracted = false
  private loadAttempts: Map<string, number> = new Map()
  private isClient = false

  constructor() {
    // Only run client-side code when in browser
    this.isClient = typeof window !== "undefined"

    if (this.isClient) {
      // Initialize client-side settings
      this.enabled = this.isEnabled()
      this.volume = this.getVolume()

      // Wait for user interaction before preloading sounds
      this.setupUserInteractionListener()
    }
  }

  private setupUserInteractionListener() {
    if (!this.isClient) return

    const handleFirstInteraction = () => {
      this.userInteracted = true
      console.log("👆 User interaction detected, loading sounds...")
      this.preloadSounds()
      document.removeEventListener("click", handleFirstInteraction)
      document.removeEventListener("touchstart", handleFirstInteraction)
    }

    document.addEventListener("click", handleFirstInteraction)
    document.addEventListener("touchstart", handleFirstInteraction)
  }

  private async checkFileExists(url: string): Promise<boolean> {
    if (!this.isClient) return false

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-cache",
      })

      clearTimeout(timeoutId)
      return response.ok && response.status === 200
    } catch (error) {
      console.warn(`File check failed for ${url}:`, error)
      return false
    }
  }

  private async preloadSounds() {
    if (!this.isClient) return

    console.log("🎵 Starting to preload sounds...")

    for (const sound of AVAILABLE_SOUNDS) {
      if (sound.files.length > 0) {
        await this.loadSound(sound.id, sound.files)
      }
    }
  }

  private async loadSound(soundId: string, filePaths: string[], retryCount = 0): Promise<void> {
    if (!this.isClient || filePaths.length === 0) return

    const maxRetries = 2

    try {
      this.loadingStatus.set(soundId, "loading")
      this.loadAttempts.set(soundId, (this.loadAttempts.get(soundId) || 0) + 1)

      console.log(`🎵 Loading sound: ${soundId} (attempt ${retryCount + 1})`)

      // Try each file format until one works
      let workingFilePath: string | null = null

      for (const filePath of filePaths) {
        console.log(`🔍 Checking file: ${filePath}`)
        const fileExists = await this.checkFileExists(filePath)

        if (fileExists) {
          // Test if browser can play this format
          const audio = new Audio()
          const canPlay = audio.canPlayType(this.getMimeType(filePath))

          if (canPlay !== "") {
            workingFilePath = filePath
            console.log(`✅ Found working format: ${filePath} (canPlay: ${canPlay})`)
            break
          } else {
            console.log(`⚠️ Browser can't play format: ${filePath}`)
          }
        } else {
          console.log(`❌ File not found: ${filePath}`)
        }
      }

      if (!workingFilePath) {
        throw new Error(`No playable audio format found for ${soundId}`)
      }

      const audio = new Audio()

      // Create a promise that resolves when audio is ready or rejects on error
      const loadPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Load timeout (15s)"))
        }, 15000) // 15 second timeout

        const cleanup = () => {
          clearTimeout(timeout)
          audio.removeEventListener("canplaythrough", onLoad)
          audio.removeEventListener("error", onError)
          audio.removeEventListener("loadeddata", onLoadedData)
        }

        const onLoad = () => {
          cleanup()
          console.log(`✅ Sound loaded successfully: ${soundId}`)
          this.loadingStatus.set(soundId, "loaded")
          resolve()
        }

        const onLoadedData = () => {
          // Fallback if canplaythrough doesn't fire
          if (audio.readyState >= 2) {
            cleanup()
            console.log(`✅ Sound loaded (via loadeddata): ${soundId}`)
            this.loadingStatus.set(soundId, "loaded")
            resolve()
          }
        }

        const onError = (e: Event) => {
          cleanup()
          const errorMsg = `Load error: ${audio.error?.code} - ${audio.error?.message || "Unknown audio error"}`
          console.error(`❌ Failed to load sound: ${soundId}`, errorMsg, e)
          this.errorDetails.set(soundId, errorMsg)
          reject(new Error(errorMsg))
        }

        audio.addEventListener("canplaythrough", onLoad, { once: true })
        audio.addEventListener("loadeddata", onLoadedData, { once: true })
        audio.addEventListener("error", onError, { once: true })
      })

      // Configure audio element
      audio.volume = this.volume
      audio.preload = "auto"
      audio.crossOrigin = "anonymous"

      // Set source and start loading
      audio.src = workingFilePath
      audio.load() // Explicitly trigger load

      await loadPromise
      this.audioCache.set(soundId, audio)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      console.error(`❌ Failed to load sound: ${soundId}`, errorMsg)
      this.loadingStatus.set(soundId, "error")
      this.errorDetails.set(soundId, errorMsg)

      // Retry logic
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying sound load: ${soundId} (${retryCount + 1}/${maxRetries})`)
        await new Promise((resolve) => setTimeout(resolve, 2000)) // Wait 2 seconds
        return this.loadSound(soundId, filePaths, retryCount + 1)
      }
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (this.isClient) {
      localStorage.setItem("football-sounds-enabled", enabled.toString())
    }
    console.log(`🎵 Sounds ${enabled ? "enabled" : "disabled"}`)
  }

  isEnabled(): boolean {
    if (!this.isClient) return true
    const stored = localStorage.getItem("football-sounds-enabled")
    return stored !== null ? stored === "true" : true
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
    if (this.isClient) {
      localStorage.setItem("football-sounds-volume", this.volume.toString())
    }

    // Update volume for all cached audio
    this.audioCache.forEach((audio) => {
      audio.volume = this.volume
    })

    console.log(`🔊 Volume set to: ${Math.round(this.volume * 100)}%`)
  }

  getVolume(): number {
    if (!this.isClient) return 0.7
    const stored = localStorage.getItem("football-sounds-volume")
    return stored !== null ? Number.parseFloat(stored) : 0.7
  }

  async playGoalSound(playerName: string, team: "yellow" | "blue") {
    if (!this.isClient || !this.enabled) {
      console.log("🔇 Sounds disabled or not in browser, skipping playback")
      return
    }

    if (!this.userInteracted) {
      console.log("⚠️ No user interaction yet, cannot play sound")
      return
    }

    try {
      // First check for player-specific sound, then team default
      const soundType = PLAYER_SOUNDS[playerName] || TEAM_DEFAULT_SOUNDS[team]
      console.log(`🎵 Playing goal sound for ${playerName} (${team}): ${soundType}`)

      const audio = this.audioCache.get(soundType)
      const status = this.loadingStatus.get(soundType)

      if (!audio) {
        console.error(`❌ Audio not found for sound type: ${soundType}`)
        return
      }

      if (status === "error") {
        const errorDetail = this.errorDetails.get(soundType)
        console.error(`❌ Sound failed to load: ${soundType} - ${errorDetail}`)
        return
      }

      if (status === "loading") {
        console.log(`⏳ Sound still loading: ${soundType}`)
        return
      }

      // Reset audio to beginning and play
      audio.currentTime = 0
      const playPromise = audio.play()

      if (playPromise !== undefined) {
        await playPromise
        console.log(`✅ Successfully played sound: ${soundType}`)
      }
    } catch (error) {
      console.error("❌ Failed to play goal sound:", error)
    }
  }

  async previewSound(soundType: SoundType) {
    if (!this.isClient || soundType === "none") return

    if (!this.userInteracted) {
      console.log("⚠️ No user interaction yet, cannot preview sound")
      // Try to load sounds if user is interacting now
      this.preloadSounds()
      return
    }

    try {
      console.log(`🎵 Previewing sound: ${soundType}`)
      const audio = this.audioCache.get(soundType)
      const status = this.loadingStatus.get(soundType)

      if (!audio) {
        console.error(`❌ Audio not found for preview: ${soundType}`)
        return
      }

      if (status === "error") {
        const errorDetail = this.errorDetails.get(soundType)
        console.error(`❌ Sound failed to load: ${soundType} - ${errorDetail}`)
        return
      }

      if (status === "loading") {
        console.log(`⏳ Sound still loading: ${soundType}`)
        return
      }

      audio.currentTime = 0
      const playPromise = audio.play()

      if (playPromise !== undefined) {
        await playPromise
        console.log(`✅ Successfully previewed sound: ${soundType}`)
      }
    } catch (error) {
      console.error("❌ Failed to preview sound:", error)
    }
  }

  async stopAllSounds() {
    if (!this.isClient) return

    console.log("🛑 Stopping all sounds")
    this.audioCache.forEach((audio, soundType) => {
      if (!audio.paused) {
        console.log(`🛑 Stopping sound: ${soundType}`)
        audio.pause()
        audio.currentTime = 0
      }
    })
  }

  // Helper method to get the sound that would play for a player
  getPlayerSound(playerName: string, team: "yellow" | "blue"): SoundType {
    return PLAYER_SOUNDS[playerName] || TEAM_DEFAULT_SOUNDS[team]
  }

  private getMimeType(filePath: string): string {
    const extension = filePath.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "mp3":
        return "audio/mpeg"
      case "ogg":
        return "audio/ogg"
      case "wav":
        return "audio/wav"
      case "m4a":
        return "audio/mp4"
      default:
        return "audio/mpeg"
    }
  }

  getAudioSupport() {
    if (!this.isClient) return {}

    const audio = new Audio()
    return {
      mp3: audio.canPlayType("audio/mpeg"),
      ogg: audio.canPlayType("audio/ogg"),
      wav: audio.canPlayType("audio/wav"),
      m4a: audio.canPlayType("audio/mp4"),
    }
  }

  // Debug method to check sound status
  getSoundStatus() {
    const status: Record<string, any> = {
      enabled: this.enabled,
      volume: this.volume,
      userInteracted: this.userInteracted,
      isClient: this.isClient,
      audioSupport: this.getAudioSupport(),
      sounds: {},
    }

    this.loadingStatus.forEach((loadStatus, soundId) => {
      const audio = this.audioCache.get(soundId)
      const errorDetail = this.errorDetails.get(soundId)
      const attempts = this.loadAttempts.get(soundId) || 0

      status.sounds[soundId] = {
        loadStatus,
        hasAudio: !!audio,
        canPlay: audio ? audio.readyState >= 2 : false,
        readyState: audio?.readyState || 0,
        src: audio?.src || "none",
        error: errorDetail || null,
        attempts,
        duration: audio?.duration || 0,
      }
    })

    return status
  }

  // Method to force reload sounds (for debugging)
  async forceReloadSounds() {
    if (!this.isClient) return

    console.log("🔄 Force reloading all sounds...")
    this.audioCache.clear()
    this.loadingStatus.clear()
    this.errorDetails.clear()
    this.loadAttempts.clear()

    if (this.userInteracted) {
      await this.preloadSounds()
    } else {
      console.log("⚠️ Need user interaction first")
    }
  }

  // Get loading progress
  getLoadingProgress() {
    const totalSounds = AVAILABLE_SOUNDS.filter((s) => s.files).length
    const loadedSounds = Array.from(this.loadingStatus.values()).filter((status) => status === "loaded").length
    return { loaded: loadedSounds, total: totalSounds }
  }
}

// Create sound manager instance only on client side
export const soundManager = typeof window !== "undefined" ? new SoundManager() : null

// Make soundManager available globally for debugging (client-side only)
if (typeof window !== "undefined" && soundManager) {
  ;(window as any).soundManager = soundManager
}
