// Sound management utilities
export type SoundType = "default" | "commentary" | "whistle" | "cheer" | "horn" | "bell" | "yellow-horn" | "none"

export const AVAILABLE_SOUNDS: { id: SoundType; name: string; file: string }[] = [
  { id: "none", name: "Brak dźwięku", file: "" },
  { id: "commentary", name: "Komentarz", file: "/sounds/goal-commentary.mp3" },
  { id: "yellow-horn", name: "Klakson Żółtych", file: "/sounds/goal-yellow-horn.mp3" },
  { id: "default", name: "Domyślny", file: "/sounds/goal-default.mp3" },
  { id: "whistle", name: "Gwizdek", file: "/sounds/goal-whistle.mp3" },
  { id: "cheer", name: "Okrzyki", file: "/sounds/goal-cheer.mp3" },
  { id: "horn", name: "Klakson", file: "/sounds/goal-horn.mp3" },
  { id: "bell", name: "Dzwon", file: "/sounds/goal-bell.mp3" },
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
export const TEAM_DEFAULT_SOUNDS: Record<"yellow" | "blue", SoundType> = {
  yellow: "yellow-horn", // Boston Bruins horn for yellow team
  blue: "commentary", // "OOOHHH YESSS!!" commentary for blue team
}

class SoundManager {
  private audioCache: Map<string, HTMLAudioElement> = new Map()
  private enabled = true
  private volume = 0.7

  constructor() {
    // Preload all sounds
    this.preloadSounds()
  }

  private async preloadSounds() {
    for (const sound of AVAILABLE_SOUNDS) {
      if (sound.file) {
        try {
          const audio = new Audio(sound.file)
          audio.volume = this.volume
          audio.preload = "auto"
          this.audioCache.set(sound.id, audio)
        } catch (error) {
          console.warn(`Failed to preload sound: ${sound.id}`, error)
        }
      }
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    localStorage.setItem("football-sounds-enabled", enabled.toString())
  }

  isEnabled(): boolean {
    const stored = localStorage.getItem("football-sounds-enabled")
    return stored !== null ? stored === "true" : true
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
    localStorage.setItem("football-sounds-volume", this.volume.toString())

    // Update volume for all cached audio
    this.audioCache.forEach((audio) => {
      audio.volume = this.volume
    })
  }

  getVolume(): number {
    const stored = localStorage.getItem("football-sounds-volume")
    return stored !== null ? Number.parseFloat(stored) : 0.7
  }

  async playGoalSound(playerName: string, team: "yellow" | "blue") {
    if (!this.enabled) return

    try {
      // First check for player-specific sound, then team default
      const soundType = PLAYER_SOUNDS[playerName] || TEAM_DEFAULT_SOUNDS[team]
      const audio = this.audioCache.get(soundType)

      if (audio) {
        // Reset audio to beginning and play
        audio.currentTime = 0
        await audio.play()
      }
    } catch (error) {
      console.warn("Failed to play goal sound:", error)
    }
  }

  async previewSound(soundType: SoundType) {
    if (soundType === "none") return

    try {
      const audio = this.audioCache.get(soundType)
      if (audio) {
        audio.currentTime = 0
        await audio.play()
      }
    } catch (error) {
      console.warn("Failed to preview sound:", error)
    }
  }

  async stopAllSounds() {
    this.audioCache.forEach((audio) => {
      if (!audio.paused) {
        audio.pause()
        audio.currentTime = 0
      }
    })
  }

  // Helper method to get the sound that would play for a player
  getPlayerSound(playerName: string, team: "yellow" | "blue"): SoundType {
    return PLAYER_SOUNDS[playerName] || TEAM_DEFAULT_SOUNDS[team]
  }
}

export const soundManager = new SoundManager()
