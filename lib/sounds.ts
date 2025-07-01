// Sound management utilities - now supports custom sounds
export type SoundType = string // Changed from union to string for flexibility

// Base sounds that come with the app
export const BASE_SOUNDS: { id: string; name: string; files: string[] }[] = [
  { id: "none", name: "Brak dźwięku", files: [] },
  {
    id: "commentary",
    name: "Komentarz",
    files: [
      "https://9khsqqthqxvjkwqf.public.blob.vercel-storage.com/Cs-1.6-HeadShot-Sound-Effect.mp3",
      "/sounds/goal-commentary.mp3", // Fallback to local file
    ],
  },
  {
    id: "horn",
    name: "Żółci Klakson",
    files: [
      "https://9khsqqthqxvjkwqf.public.blob.vercel-storage.com/Cs-1.6-HeadShot-Sound-Effect.mp3",
      "/sounds/goal-horn.mp3", // Fallback to local file
    ],
  },
]

// Custom sound interface
export interface CustomSound {
  id: string
  name: string
  url: string
  uploadedAt: string
  fileSize?: number
  originalName?: string
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
  private playerAssignments: Record<string, SoundType> = {}
  private deploymentInfo: any = {}
  private customSounds: CustomSound[] = []

  constructor() {
    // Only run client-side code when in browser
    this.isClient = typeof window !== "undefined"

    if (this.isClient) {
      // Initialize client-side settings
      this.enabled = this.isEnabled()
      this.volume = this.getVolume()
      this.loadCustomSounds()

      // Detect deployment environment
      this.detectDeploymentEnvironment()

      // Wait for user interaction before preloading sounds
      this.setupUserInteractionListener()
    }
  }

  private loadCustomSounds() {
    if (!this.isClient) return

    try {
      const saved = localStorage.getItem("football-custom-sounds")
      if (saved) {
        this.customSounds = JSON.parse(saved)
        console.log(`🎵 Loaded ${this.customSounds.length} custom sounds from storage`)
      }
    } catch (error) {
      console.error("Failed to load custom sounds:", error)
      this.customSounds = []
    }
  }

  private saveCustomSounds() {
    if (!this.isClient) return

    try {
      localStorage.setItem("football-custom-sounds", JSON.stringify(this.customSounds))
      console.log(`🎵 Saved ${this.customSounds.length} custom sounds to storage`)
    } catch (error) {
      console.error("Failed to save custom sounds:", error)
    }
  }

  // Get all available sounds (base + custom)
  getAllAvailableSounds(): { id: string; name: string; files: string[]; isCustom?: boolean }[] {
    const baseSounds = BASE_SOUNDS.map((sound) => ({ ...sound, isCustom: false }))
    const customSoundEntries = this.customSounds.map((sound) => ({
      id: sound.id,
      name: sound.name,
      files: [sound.url],
      isCustom: true,
    }))

    return [...baseSounds, ...customSoundEntries]
  }

  // Add a custom sound
  async addCustomSound(file: File): Promise<{ success: boolean; sound?: CustomSound; error?: string }> {
    if (!this.isClient) {
      return { success: false, error: "Not in browser environment" }
    }

    try {
      // Validate file
      if (!file.type.startsWith("audio/")) {
        return { success: false, error: "File must be an audio file" }
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        return { success: false, error: "File size must be less than 10MB" }
      }

      console.log(`📤 Uploading custom sound: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

      // Upload to Vercel Blob
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-sound", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.error || "Upload failed" }
      }

      const result = await response.json()

      // Create custom sound entry
      const customSound: CustomSound = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        url: result.url,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        originalName: file.name,
      }

      // Add to custom sounds
      this.customSounds.push(customSound)
      this.saveCustomSounds()

      // Preload the new sound
      await this.loadSound(customSound.id, [customSound.url])

      console.log(`✅ Custom sound added: ${customSound.name}`)
      return { success: true, sound: customSound }
    } catch (error) {
      console.error("Failed to add custom sound:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  // Remove a custom sound
  removeCustomSound(soundId: string): boolean {
    if (!this.isClient) return false

    const index = this.customSounds.findIndex((sound) => sound.id === soundId)
    if (index === -1) return false

    const sound = this.customSounds[index]

    // Remove from arrays
    this.customSounds.splice(index, 1)
    this.saveCustomSounds()

    // Remove from cache
    this.audioCache.delete(soundId)
    this.loadingStatus.delete(soundId)
    this.errorDetails.delete(soundId)

    // Remove from player assignments
    Object.keys(this.playerAssignments).forEach((player) => {
      if (this.playerAssignments[player] === soundId) {
        delete this.playerAssignments[player]
      }
    })
    this.savePlayerAssignments()

    console.log(`🗑️ Removed custom sound: ${sound.name}`)
    return true
  }

  // Get custom sounds
  getCustomSounds(): CustomSound[] {
    return [...this.customSounds]
  }

  private detectDeploymentEnvironment() {
    if (!this.isClient) return

    this.deploymentInfo = {
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      isLocalhost: window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1",
      isVercel: window.location.hostname.includes("vercel.app") || window.location.hostname.includes("vercel.com"),
      isHTTPS: window.location.protocol === "https:",
      userAgent: navigator.userAgent,
      isProduction: process.env.NODE_ENV === "production",
      hasBlobStorage: process.env.BLOB_READ_WRITE_TOKEN ? "✅" : "❌",
    }

    console.log("🌐 Deployment Environment:", this.deploymentInfo)
  }

  private setupUserInteractionListener() {
    if (!this.isClient) return

    const handleFirstInteraction = () => {
      this.userInteracted = true
      console.log("👆 User interaction detected, loading sounds...")
      console.log("🌐 Environment:", this.deploymentInfo)
      this.preloadSounds()
      document.removeEventListener("click", handleFirstInteraction)
      document.removeEventListener("touchstart", handleFirstInteraction)
      document.removeEventListener("keydown", handleFirstInteraction)
    }

    document.addEventListener("click", handleFirstInteraction)
    document.addEventListener("touchstart", handleFirstInteraction)
    document.addEventListener("keydown", handleFirstInteraction)
  }

  private async checkFileExists(url: string): Promise<boolean> {
    if (!this.isClient) return false

    try {
      console.log(`🔍 Checking file existence: ${url}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout for blob storage

      // For Vercel Blob URLs, use a simpler approach
      if (url.includes("blob.vercel-storage.com")) {
        try {
          const response = await fetch(url, {
            method: "HEAD",
            signal: controller.signal,
            cache: "no-cache",
          })
          clearTimeout(timeoutId)

          const exists = response.ok && response.status === 200
          console.log(
            `🔍 Blob file check: ${url} - ${exists ? "✅ EXISTS" : "❌ NOT FOUND"} (status: ${response.status})`,
          )
          return exists
        } catch (error) {
          console.warn(`⚠️ Blob file check failed for ${url}:`, error)
          return false
        }
      }

      // For local files, try multiple methods
      const methods = [
        // Method 1: HEAD request
        async () => {
          const response = await fetch(url, {
            method: "HEAD",
            signal: controller.signal,
            cache: "no-cache",
            mode: "cors",
          })
          return { method: "HEAD", status: response.status, ok: response.ok }
        },
        // Method 2: GET request with range header (for audio files)
        async () => {
          const response = await fetch(url, {
            method: "GET",
            signal: controller.signal,
            cache: "no-cache",
            mode: "cors",
            headers: {
              Range: "bytes=0-1023", // Just get first 1KB
            },
          })
          return { method: "GET-Range", status: response.status, ok: response.ok }
        },
        // Method 3: Simple GET request
        async () => {
          const response = await fetch(url, {
            signal: controller.signal,
            cache: "no-cache",
            mode: "cors",
          })
          return { method: "GET", status: response.status, ok: response.ok }
        },
      ]

      let lastError: any = null

      for (const method of methods) {
        try {
          const result = await method()
          clearTimeout(timeoutId)

          console.log(
            `🔍 File check result (${result.method}): ${url} - ${result.ok ? "✅ EXISTS" : "❌ NOT FOUND"} (status: ${result.status})`,
          )

          if (result.ok) {
            return true
          }
        } catch (error) {
          lastError = error
          console.warn(`⚠️ File check method failed:`, error)
          continue
        }
      }

      clearTimeout(timeoutId)
      console.error(`❌ All file check methods failed for ${url}:`, lastError)
      return false
    } catch (error) {
      console.error(`❌ File check failed for ${url}:`, error)
      return false
    }
  }

  private async preloadSounds() {
    if (!this.isClient) return

    console.log("🎵 Starting to preload sounds...")
    console.log("🌐 Current environment:", this.deploymentInfo)

    // First, try to load a fallback sound
    await this.loadFallbackSound()

    // Load all available sounds (base + custom)
    const allSounds = this.getAllAvailableSounds()
    for (const sound of allSounds) {
      if (sound.files.length > 0) {
        await this.loadSound(sound.id, sound.files)
      }
    }

    console.log("🎵 Sound preloading completed")
    this.logSoundStatus()
  }

  private logSoundStatus() {
    console.log("📊 Sound Loading Summary:")
    this.loadingStatus.forEach((status, soundId) => {
      const audio = this.audioCache.get(soundId)
      const error = this.errorDetails.get(soundId)
      const attempts = this.loadAttempts.get(soundId) || 0

      console.log(`🎵 ${soundId}: ${status} (attempts: ${attempts})${error ? ` - Error: ${error}` : ""}`)
    })
  }

  private async loadFallbackSound() {
    try {
      console.log("🎵 Loading fallback sound...")

      // Try blob URLs first, then local files
      const allSounds = this.getAllAvailableSounds()
      const fallbackFiles = [
        ...allSounds.flatMap((sound) => sound.files.filter((file) => file.includes("blob.vercel-storage.com"))),
        "/sounds/goal-commentary.mp3",
        "/sounds/goal-horn.mp3",
      ]

      for (const filePath of fallbackFiles) {
        console.log(`🔍 Trying fallback: ${filePath}`)
        const fileExists = await this.checkFileExists(filePath)
        if (fileExists) {
          try {
            const audio = await this.createAudioElement(filePath, `fallback-${filePath.split("/").pop()}`)
            this.fallbackSound = audio
            console.log(`✅ Fallback sound loaded: ${filePath}`)
            break
          } catch (error) {
            console.warn(`Failed to load fallback sound ${filePath}:`, error)
          }
        }
      }

      if (!this.fallbackSound) {
        console.warn("⚠️ No fallback sound could be loaded")
      }
    } catch (error) {
      console.warn("Failed to load any fallback sound:", error)
    }
  }

  private async createAudioElement(filePath: string, debugId: string): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      const audio = new Audio()

      // Longer timeout for blob storage
      const timeoutDuration = filePath.includes("blob.vercel-storage.com") ? 30000 : 25000
      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error(`Audio load timeout (${timeoutDuration / 1000}s) for ${debugId}`))
      }, timeoutDuration)

      const cleanup = () => {
        clearTimeout(timeout)
        audio.removeEventListener("canplaythrough", onLoad)
        audio.removeEventListener("loadeddata", onLoadedData)
        audio.removeEventListener("error", onError)
        audio.removeEventListener("loadstart", onLoadStart)
        audio.removeEventListener("progress", onProgress)
      }

      const onLoadStart = () => {
        console.log(`📥 Started loading audio: ${debugId}`)
      }

      const onProgress = () => {
        console.log(`📊 Loading progress: ${debugId} (readyState: ${audio.readyState}/4)`)
      }

      const onLoad = () => {
        cleanup()
        console.log(
          `✅ Audio loaded successfully: ${debugId} (duration: ${audio.duration?.toFixed(1)}s, readyState: ${audio.readyState})`,
        )
        resolve(audio)
      }

      const onLoadedData = () => {
        if (audio.readyState >= 2) {
          // HAVE_CURRENT_DATA or higher
          cleanup()
          console.log(`✅ Audio loaded (via loadeddata): ${debugId} (readyState: ${audio.readyState})`)
          resolve(audio)
        }
      }

      const onError = (e: Event) => {
        cleanup()
        const errorMsg = `Audio load error: ${audio.error?.code} - ${audio.error?.message || "Unknown audio error"}`
        console.error(`❌ Failed to load audio: ${debugId}`, errorMsg, e)
        reject(new Error(errorMsg))
      }

      // Configure audio element BEFORE setting src
      audio.volume = this.volume
      audio.preload = "auto"

      // Don't set crossOrigin for blob URLs as they're same-origin
      if (!filePath.includes("blob.vercel-storage.com")) {
        audio.crossOrigin = "anonymous"
      }

      // Add event listeners
      audio.addEventListener("loadstart", onLoadStart, { once: true })
      audio.addEventListener("progress", onProgress)
      audio.addEventListener("canplaythrough", onLoad, { once: true })
      audio.addEventListener("loadeddata", onLoadedData, { once: true })
      audio.addEventListener("error", onError, { once: true })

      console.log(`🎵 Setting audio source: ${debugId} -> ${filePath}`)

      // Set source and start loading
      audio.src = filePath
      audio.load() // Explicitly trigger load
    })
  }

  private async loadSound(soundId: string, filePaths: string[], retryCount = 0): Promise<void> {
    if (!this.isClient || filePaths.length === 0) return

    const maxRetries = 3

    try {
      this.loadingStatus.set(soundId, "loading")
      this.loadAttempts.set(soundId, (this.loadAttempts.get(soundId) || 0) + 1)

      console.log(`🎵 Loading sound: ${soundId} (attempt ${retryCount + 1}/${maxRetries + 1})`)

      // Prioritize blob URLs over local files
      const sortedFilePaths = [...filePaths].sort((a, b) => {
        if (a.includes("blob.vercel-storage.com") && !b.includes("blob.vercel-storage.com")) return -1
        if (!a.includes("blob.vercel-storage.com") && b.includes("blob.vercel-storage.com")) return 1
        return 0
      })

      let workingFilePath: string | null = null

      for (const filePath of sortedFilePaths) {
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
        throw new Error(
          `No playable audio format found for ${soundId}. Checked files: ${sortedFilePaths.join(", ")}. Environment: ${JSON.stringify(this.deploymentInfo)}`,
        )
      }

      const audio = await this.createAudioElement(workingFilePath, soundId)
      this.audioCache.set(soundId, audio)
      this.loadingStatus.set(soundId, "loaded")
      console.log(
        `🎵 Successfully cached sound: ${soundId} from ${workingFilePath.includes("blob.vercel-storage.com") ? "Blob Storage" : "Local"}`,
      )
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      console.error(`❌ Failed to load sound: ${soundId}`, errorMsg)
      this.loadingStatus.set(soundId, "error")
      this.errorDetails.set(soundId, errorMsg)

      // Try to use fallback for failed sounds
      if (this.fallbackSound && soundId !== "commentary") {
        console.log(`🔄 Using fallback sound for: ${soundId}`)
        try {
          const fallbackAudio = this.fallbackSound.cloneNode() as HTMLAudioElement
          fallbackAudio.volume = this.volume
          this.audioCache.set(soundId, fallbackAudio)
          this.loadingStatus.set(soundId, "loaded")
          return
        } catch (cloneError) {
          console.error(`❌ Failed to clone fallback sound:`, cloneError)
        }
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

  updatePlayerAssignments(assignments: Record<string, SoundType>) {
    this.playerAssignments = assignments
    this.savePlayerAssignments()
    console.log("🎵 Updated player sound assignments:", assignments)
  }

  private savePlayerAssignments() {
    if (!this.isClient) return
    localStorage.setItem("football-player-sounds", JSON.stringify(this.playerAssignments))
  }

  getPlayerSound(playerName: string, team: "yellow" | "blue"): SoundType {
    return this.playerAssignments[playerName] || TEAM_DEFAULT_SOUNDS[team]
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
      const soundType = this.playerAssignments[playerName] || TEAM_DEFAULT_SOUNDS[team]
      console.log(`🎵 Playing goal sound for ${playerName} (${team}): ${soundType}`)
      console.log(`🌐 Environment: ${JSON.stringify(this.deploymentInfo)}`)

      const audio = this.audioCache.get(soundType)
      const status = this.loadingStatus.get(soundType)

      console.log(`🎵 Audio status: ${status}, hasAudio: ${!!audio}, readyState: ${audio?.readyState}`)

      if (!audio) {
        console.error(`❌ Audio not found for sound type: ${soundType}`)
        await this.tryFallbackSound("Audio not found")
        return
      }

      if (status === "error") {
        const errorDetail = this.errorDetails.get(soundType)
        console.error(`❌ Sound failed to load: ${soundType} - ${errorDetail}`)
        await this.tryFallbackSound("Sound load error")
        return
      }

      if (status === "loading") {
        console.log(`⏳ Sound still loading: ${soundType}`)
        return
      }

      // Reset audio to beginning and play
      audio.currentTime = 0

      console.log(`🎵 Attempting to play sound: ${soundType}`)
      const playPromise = audio.play()

      if (playPromise !== undefined) {
        await playPromise
        console.log(`✅ Successfully played sound: ${soundType}`)
      }
    } catch (error) {
      console.error("❌ Failed to play goal sound:", error)
      await this.tryFallbackSound("Play error")
    }
  }

  private async tryFallbackSound(reason: string) {
    if (this.fallbackSound) {
      try {
        console.log(`🔄 Using fallback sound (${reason})`)
        this.fallbackSound.currentTime = 0
        await this.fallbackSound.play()
        console.log("✅ Fallback sound played successfully")
      } catch (fallbackError) {
        console.error("❌ Even fallback sound failed:", fallbackError)
      }
    } else {
      console.error("❌ No fallback sound available")
    }
  }

  async previewSound(soundType: SoundType) {
    if (!this.isClient || soundType === "none") return

    if (!this.userInteracted) {
      console.log("⚠️ No user interaction yet, cannot preview sound")
      this.preloadSounds()
      return
    }

    try {
      console.log(`🎵 Previewing sound: ${soundType}`)
      const audio = this.audioCache.get(soundType)
      const status = this.loadingStatus.get(soundType)

      if (!audio) {
        console.error(`❌ Audio not found for preview: ${soundType}`)
        await this.tryFallbackSound("Preview - audio not found")
        return
      }

      if (status === "error") {
        const errorDetail = this.errorDetails.get(soundType)
        console.error(`❌ Sound failed to load: ${soundType} - ${errorDetail}`)
        await this.tryFallbackSound("Preview - load error")
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

  getSoundStatus() {
    const status: Record<string, any> = {
      enabled: this.enabled,
      volume: this.volume,
      userInteracted: this.userInteracted,
      isClient: this.isClient,
      hasFallback: !!this.fallbackSound,
      fallbackSrc: this.fallbackSound?.src || "none",
      deploymentInfo: this.deploymentInfo,
      audioSupport: this.getAudioSupport(),
      customSoundsCount: this.customSounds.length,
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

  getLoadingProgress() {
    const allSounds = this.getAllAvailableSounds()
    const totalSounds = allSounds.filter((s) => s.files.length > 0).length
    const loadedSounds = Array.from(this.loadingStatus.values()).filter((status) => status === "loaded").length
    return { loaded: loadedSounds, total: totalSounds }
  }
}

export const soundManager = typeof window !== "undefined" ? new SoundManager() : null

if (typeof window !== "undefined" && soundManager) {
  ;(window as any).soundManager = soundManager
}
