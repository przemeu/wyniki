// Sound management utilities
export type SoundType = "commentary" | "horn" | "none"

export const AVAILABLE_SOUNDS: { id: SoundType; name: string; files: string[] }[] = [
  { id: "none", name: "Brak dźwięku", files: [] },
  { id: "commentary", name: "Komentarz", files: ["/sounds/goal-commentary.mp3"] },
  { id: "horn", name: "Żółci Klakson", files: ["/sounds/goal-horn.mp3"] },
]

// Clear all player-specific sound mappings - now empty by default
export const PLAYER_SOUNDS: Record<string, SoundType> = {
  // Players can now be assigned sounds through the app interface
}

// Team-based default sounds
export const TEAM_DEFAULT_SOUNDS: Record<string, SoundType> = {
  yellow: "horn", // Żółci Klakson for yellow team
  blue: "commentary", // Komentarz for blue team
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
  private fallbackSound: HTMLAudioElement | null = null
  // Add private property to store player assignments
  private playerAssignments: Record<string, SoundType> = {}

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
      const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout

      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-cache",
      })

      clearTimeout(timeoutId)
      const exists = response.ok && response.status === 200
      console.log(`🔍 File check for ${url}: ${exists ? "✅ EXISTS" : "❌ NOT FOUND"} (status: ${response.status})`)
      return exists
    } catch (error) {
      console.warn(`❌ File check failed for ${url}:`, error)
      return false
    }
  }

  private async preloadSounds() {
    if (!this.isClient) return

    console.log("🎵 Starting to preload sounds...")

    // First, try to load a fallback sound
    await this.loadFallbackSound()

    for (const sound of AVAILABLE_SOUNDS) {
      if (sound.files.length > 0) {
        await this.loadSound(sound.id, sound.files)
      }
    }
  }

  private async loadFallbackSound() {
    try {
      console.log("🎵 Loading fallback sound...")
      const fallbackFiles = ["/sounds/goal-commentary.mp3", "/sounds/goal-horn.mp3"]

      for (const filePath of fallbackFiles) {
        console.log(`🔍 Trying fallback: ${filePath}`)
        const fileExists = await this.checkFileExists(filePath)
        if (fileExists) {
          const audio = new Audio()
          audio.volume = this.volume
          audio.crossOrigin = "anonymous"
          audio.src = filePath

          try {
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => reject(new Error("Timeout")), 15000)

              const cleanup = () => {
                clearTimeout(timeout)
                audio.removeEventListener("canplaythrough", onLoad)
                audio.removeEventListener("loadeddata", onLoadedData)
                audio.removeEventListener("error", onError)
              }

              const onLoad = () => {
                cleanup()
                resolve()
              }

              const onLoadedData = () => {
                if (audio.readyState >= 2) {
                  cleanup()
                  resolve()
                }
              }

              const onError = (e: Event) => {
                cleanup()
                console.error(`Fallback load error for ${filePath}:`, e)
                reject(new Error("Load failed"))
              }

              audio.addEventListener("canplaythrough", onLoad, { once: true })
              audio.addEventListener("loadeddata", onLoadedData, { once: true })
              audio.addEventListener("error", onError, { once: true })

              audio.load()
            })

            this.fallbackSound = audio
            console.log(`✅ Fallback sound loaded: ${filePath}`)
            break
          } catch (error) {
            console.warn(`Failed to load fallback sound ${filePath}:`, error)
          }
        }
      }
    } catch (error) {
      console.warn("Failed to load any fallback sound:", error)
    }
  }

  private async loadSound(soundId: string, filePaths: string[], retryCount = 0): Promise<void> {
    if (!this.isClient || filePaths.length === 0) return

    const maxRetries = 3

    try {
      this.loadingStatus.set(soundId, "loading")
      this.loadAttempts.set(soundId, (this.loadAttempts.get(soundId) || 0) + 1)

      console.log(`🎵 Loading sound: ${soundId} (attempt ${retryCount + 1}/${maxRetries + 1})`)

      // Try each file format until one works
      let workingFilePath: string | null = null

      for (const filePath of filePaths) {
        console.log(`🔍 Checking file: ${filePath}`)
        const fileExists = await this.checkFileExists(filePath)

        if (fileExists) {
          // Test if browser can play this format
          const audio = new Audio()
          const canPlay = audio.canPlayType(this.getMimeType(filePath))

          console.log(`🎵 Browser support for ${filePath}: "${canPlay}"`)

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
        throw new Error(`No playable audio format found for ${soundId}. Checked files: ${filePaths.join(", ")}`)
      }

      const audio = new Audio()

      // Create a promise that resolves when audio is ready or rejects on error
      const loadPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Load timeout (20s)"))
        }, 20000) // 20 second timeout

        const cleanup = () => {
          clearTimeout(timeout)
          audio.removeEventListener("canplaythrough", onLoad)
          audio.removeEventListener("error", onError)
          audio.removeEventListener("loadeddata", onLoadedData)
          audio.removeEventListener("loadstart", onLoadStart)
          audio.removeEventListener("progress", onProgress)
        }

        const onLoadStart = () => {
          console.log(`📥 Started loading: ${soundId}`)
        }

        const onProgress = () => {
          console.log(`📊 Loading progress: ${soundId} (readyState: ${audio.readyState})`)
        }

        const onLoad = () => {
          cleanup()
          console.log(`✅ Sound loaded successfully: ${soundId} (duration: ${audio.duration}s)`)
          this.loadingStatus.set(soundId, "loaded")
          resolve()
        }

        const onLoadedData = () => {
          // Fallback if canplaythrough doesn't fire
          if (audio.readyState >= 2) {
            cleanup()
            console.log(`✅ Sound loaded (via loadeddata): ${soundId} (readyState: ${audio.readyState})`)
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

        audio.addEventListener("loadstart", onLoadStart, { once: true })
        audio.addEventListener("progress", onProgress)
        audio.addEventListener("canplaythrough", onLoad, { once: true })
        audio.addEventListener("loadeddata", onLoadedData, { once: true })
        audio.addEventListener("error", onError, { once: true })
      })

      // Configure audio element
      audio.volume = this.volume
      audio.preload = "auto"
      audio.crossOrigin = "anonymous"

      console.log(`🎵 Setting source for ${soundId}: ${workingFilePath}`)

      // Set source and start loading
      audio.src = workingFilePath
      audio.load() // Explicitly trigger load

      await loadPromise
      this.audioCache.set(soundId, audio)
      console.log(`🎵 Successfully cached sound: ${soundId}`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      console.error(`❌ Failed to load sound: ${soundId}`, errorMsg)
      this.loadingStatus.set(soundId, "error")
      this.errorDetails.set(soundId, errorMsg)

      // Try to use fallback for failed sounds
      if (this.fallbackSound && soundId !== "commentary") {
        console.log(`🔄 Using fallback sound for: ${soundId}`)
        const fallbackAudio = this.fallbackSound.cloneNode() as HTMLAudioElement
        fallbackAudio.volume = this.volume
        this.audioCache.set(soundId, fallbackAudio)
        this.loadingStatus.set(soundId, "loaded")
        return
      }

      // Retry logic
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying sound load: ${soundId} (${retryCount + 1}/${maxRetries})`)
        await new Promise((resolve) => setTimeout(resolve, 3000)) // Wait 3 seconds
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

    // Update fallback sound volume
    if (this.fallbackSound) {
      this.fallbackSound.volume = this.volume
    }

    console.log(`🔊 Volume set to: ${Math.round(this.volume * 100)}%`)
  }

  getVolume(): number {
    if (!this.isClient) return 0.7
    const stored = localStorage.getItem("football-sounds-volume")
    return stored !== null ? Number.parseFloat(stored) : 0.7
  }

  // Add method to update player assignments in the SoundManager class
  updatePlayerAssignments(assignments: Record<string, SoundType>) {
    // Store the assignments for use in sound selection
    this.playerAssignments = assignments
    console.log("🎵 Updated player sound assignments:", assignments)
  }

  // Update the getPlayerSound method to use dynamic assignments
  getPlayerSound(playerName: string, team: "yellow" | "blue"): SoundType {
    return this.playerAssignments[playerName] || TEAM_DEFAULT_SOUNDS[team]
  }

  // Update playGoalSound method to use dynamic assignments
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
      // Use dynamic assignments instead of static PLAYER_SOUNDS
      const soundType = this.playerAssignments[playerName] || TEAM_DEFAULT_SOUNDS[team]
      console.log(`🎵 Playing goal sound for ${playerName} (${team}): ${soundType}`)

      const audio = this.audioCache.get(soundType)
      const status = this.loadingStatus.get(soundType)

      if (!audio) {
        console.error(`❌ Audio not found for sound type: ${soundType}`)
        // Try fallback sound
        if (this.fallbackSound) {
          console.log("🔄 Using fallback sound")
          this.fallbackSound.currentTime = 0
          await this.fallbackSound.play()
        }
        return
      }

      if (status === "error") {
        const errorDetail = this.errorDetails.get(soundType)
        console.error(`❌ Sound failed to load: ${soundType} - ${errorDetail}`)
        // Try fallback sound
        if (this.fallbackSound) {
          console.log("🔄 Using fallback sound due to error")
          this.fallbackSound.currentTime = 0
          await this.fallbackSound.play()
        }
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
      // Try fallback sound as last resort
      if (this.fallbackSound) {
        try {
          console.log("🔄 Using fallback sound as last resort")
          this.fallbackSound.currentTime = 0
          await this.fallbackSound.play()
        } catch (fallbackError) {
          console.error("❌ Even fallback sound failed:", fallbackError)
        }
      }
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
        // Try fallback sound
        if (this.fallbackSound) {
          console.log("🔄 Using fallback sound for preview")
          this.fallbackSound.currentTime = 0
          await this.fallbackSound.play()
        }
        return
      }

      if (status === "error") {
        const errorDetail = this.errorDetails.get(soundType)
        console.error(`❌ Sound failed to load: ${soundType} - ${errorDetail}`)
        // Try fallback sound
        if (this.fallbackSound) {
          console.log("🔄 Using fallback sound for preview due to error")
          this.fallbackSound.currentTime = 0
          await this.fallbackSound.play()
        }
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

    // Also stop fallback sound
    if (this.fallbackSound && !this.fallbackSound.paused) {
      console.log("🛑 Stopping fallback sound")
      this.fallbackSound.pause()
      this.fallbackSound.currentTime = 0
    }
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
      hasFallback: !!this.fallbackSound,
      fallbackSrc: this.fallbackSound?.src || "none",
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
    this.fallbackSound = null

    if (this.userInteracted) {
      await this.preloadSounds()
    } else {
      console.log("⚠️ Need user interaction first")
    }
  }

  // Get loading progress
  getLoadingProgress() {
    const totalSounds = AVAILABLE_SOUNDS.filter((s) => s.files.length > 0).length
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
