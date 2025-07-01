"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import {
  Volume2,
  VolumeX,
  Play,
  RefreshCw,
  Bug,
  AlertTriangle,
  CheckCircle,
  Clock,
  TestTube,
  Pause,
  X,
} from "lucide-react"
import { soundManager, AVAILABLE_SOUNDS, TEAM_DEFAULT_SOUNDS, type SoundType } from "@/lib/sounds"

interface SoundSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface TestResult {
  soundId: string
  name: string
  status: "pending" | "testing" | "success" | "error"
  error?: string
  duration?: number
}

export default function SoundSettings({ open, onOpenChange }: SoundSettingsProps) {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [volume, setVolume] = useState(70)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 })

  // Testing states
  const [isTestingAll, setIsTestingAll] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [currentTestIndex, setCurrentTestIndex] = useState(-1)
  const [testProgress, setTestProgress] = useState(0)

  // Add state for managing player sound assignments
  const [playerSoundAssignments, setPlayerSoundAssignments] = useState<Record<string, SoundType>>({})
  const [showPlayerAssignments, setShowPlayerAssignments] = useState(false)
  const [selectedPlayerForSound, setSelectedPlayerForSound] = useState<string | null>(null)

  useEffect(() => {
    if (soundManager) {
      setSoundEnabled(soundManager.isEnabled())
      setVolume(Math.round(soundManager.getVolume() * 100))

      // Load player sound assignments from localStorage
      const savedAssignments = localStorage.getItem("football-player-sounds")
      if (savedAssignments) {
        try {
          const assignments = JSON.parse(savedAssignments)
          setPlayerSoundAssignments(assignments)
          // Update the sound manager with saved assignments
          soundManager.updatePlayerAssignments(assignments)
        } catch (error) {
          console.error("Failed to load player sound assignments:", error)
        }
      }

      // Update loading progress periodically
      const interval = setInterval(() => {
        setLoadingProgress(soundManager.getLoadingProgress())
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [])

  // Add function to save player assignments
  const savePlayerAssignments = (assignments: Record<string, SoundType>) => {
    setPlayerSoundAssignments(assignments)
    localStorage.setItem("football-player-sounds", JSON.stringify(assignments))
    soundManager?.updatePlayerAssignments(assignments)
  }

  // Add function to assign sound to player
  const assignSoundToPlayer = (playerName: string, soundType: SoundType) => {
    const newAssignments = { ...playerSoundAssignments }
    if (soundType === "none") {
      delete newAssignments[playerName]
    } else {
      newAssignments[playerName] = soundType
    }
    savePlayerAssignments(newAssignments)
    setSelectedPlayerForSound(null)
  }

  // Add function to get all unique player names from the app
  const getAllPlayerNames = (): string[] => {
    // This will be populated from the main app - for now return common names
    const commonPlayers = [
      "Adam S.",
      "Adam T.",
      "Andrzej T.",
      "Bartek D.",
      "Franek W.",
      "Grzegorz G.",
      "Grzegorz O.",
      "Jakub K.",
      "Jędrek K.",
      "Kamil E.",
      "Konrad L.",
      "Kornel O.",
      "Krystian G.",
      "Łukasz B.",
      "Łukasz J.",
      "Maciej M.",
      "Marcin P.",
      "Marek Z.",
      "Mateusz W.",
      "Michał G.",
      "Michał T.",
      "Mikołaj T.",
      "Oskar B.",
      "Paweł L.",
      "Paweł W.",
      "Piotrek P.",
      "Przemek W.",
      "Radek K.",
      "Radek P.",
      "Robert G.",
      "Szymon B.",
      "Tomasz Ł.",
      "Tomek Ł.",
      "Tomek W.",
    ]
    return commonPlayers.sort()
  }

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled)
    soundManager?.setEnabled(enabled)
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    soundManager?.setVolume(newVolume / 100)
  }

  const handlePreviewSound = async (soundType: SoundType) => {
    await soundManager?.previewSound(soundType)
  }

  const handleDebugInfo = () => {
    if (soundManager) {
      const status = soundManager.getSoundStatus()
      setDebugInfo(status)
      setShowDebug(true)
      console.log("🐛 Sound Debug Info:", status)
    }
  }

  const handleForceReload = async () => {
    if (soundManager) {
      await soundManager.forceReloadSounds()
      const status = soundManager.getSoundStatus()
      setDebugInfo(status)
      setLoadingProgress(soundManager.getLoadingProgress())
    }
  }

  const handleTestAllSounds = async () => {
    if (!soundManager || isTestingAll) return

    setIsTestingAll(true)
    setCurrentTestIndex(-1)
    setTestProgress(0)

    const soundsToTest = AVAILABLE_SOUNDS.filter((sound) => sound.id !== "none")
    const results: TestResult[] = soundsToTest.map((sound) => ({
      soundId: sound.id,
      name: sound.name,
      status: "pending",
    }))

    setTestResults(results)

    console.log("🧪 Starting comprehensive sound test...")

    for (let i = 0; i < soundsToTest.length; i++) {
      const sound = soundsToTest[i]
      setCurrentTestIndex(i)
      setTestProgress(((i + 1) / soundsToTest.length) * 100)

      console.log(`🧪 Testing sound ${i + 1}/${soundsToTest.length}: ${sound.name}`)

      // Update status to testing
      setTestResults((prev) => prev.map((result, index) => (index === i ? { ...result, status: "testing" } : result)))

      try {
        const startTime = Date.now()

        // Test the sound
        await soundManager.previewSound(sound.id)

        const duration = Date.now() - startTime

        // Wait a bit to hear the sound
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // Update status to success
        setTestResults((prev) =>
          prev.map((result, index) => (index === i ? { ...result, status: "success", duration } : result)),
        )

        console.log(`✅ Sound test passed: ${sound.name} (${duration}ms)`)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"

        // Update status to error
        setTestResults((prev) =>
          prev.map((result, index) => (index === i ? { ...result, status: "error", error: errorMsg } : result)),
        )

        console.error(`❌ Sound test failed: ${sound.name}`, errorMsg)
      }

      // Small delay between tests
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    setCurrentTestIndex(-1)
    setIsTestingAll(false)

    // Generate test summary
    const successCount = results.filter((r) => r.status === "success").length
    const errorCount = results.filter((r) => r.status === "error").length

    console.log(`🧪 Sound test completed: ${successCount} passed, ${errorCount} failed`)

    // Update debug info after test
    handleDebugInfo()
  }

  const handleStopTesting = () => {
    setIsTestingAll(false)
    setCurrentTestIndex(-1)
    soundManager?.stopAllSounds()
  }

  const getSoundStatusIcon = (soundInfo: any) => {
    if (!soundInfo) return <Clock className="w-3 h-3 text-gray-400" />

    switch (soundInfo.loadStatus) {
      case "loaded":
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case "error":
        return <AlertTriangle className="w-3 h-3 text-red-500" />
      case "loading":
        return <Clock className="w-3 h-3 text-yellow-500" />
      default:
        return <Clock className="w-3 h-3 text-gray-400" />
    }
  }

  const getTestStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case "error":
        return <AlertTriangle className="w-3 h-3 text-red-500" />
      case "testing":
        return <Clock className="w-3 h-3 text-blue-500 animate-spin" />
      case "pending":
        return <Clock className="w-3 h-3 text-gray-400" />
    }
  }

  // Show message if soundManager is not available (SSR)
  if (!soundManager) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Volume2 className="w-5 h-5" />
              Ustawienia Dźwięków
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-gray-500">Ładowanie systemu dźwięków...</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Ustawienia Dźwięków
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Loading Progress */}
          {loadingProgress.total > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Ładowanie dźwięków:</span>
                  <span>
                    {loadingProgress.loaded}/{loadingProgress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(loadingProgress.loaded / loadingProgress.total) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sound Enable/Disable */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dźwięki Goli</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span className="text-sm">Włącz dźwięki</span>
                </div>
                <Switch checked={soundEnabled} onCheckedChange={handleSoundToggle} />
              </div>

              {soundEnabled && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <VolumeX className="w-4 h-4 text-gray-400" />
                    <Slider value={[volume]} onValueChange={handleVolumeChange} max={100} step={5} className="flex-1" />
                    <Volume2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm min-w-[3ch] text-right">{volume}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sound Testing Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TestTube className="w-4 h-4" />
                Test Wszystkich Dźwięków
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestAllSounds}
                  disabled={!soundEnabled || isTestingAll}
                  className="text-xs bg-transparent"
                >
                  <TestTube className="w-3 h-3 mr-1" />
                  {isTestingAll ? "Testowanie..." : "Testuj Wszystkie"}
                </Button>

                {isTestingAll && (
                  <Button size="sm" variant="outline" onClick={handleStopTesting} className="text-xs bg-transparent">
                    <Pause className="w-3 h-3 mr-1" />
                    Zatrzymaj
                  </Button>
                )}
              </div>

              {isTestingAll && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Postęp testu:</span>
                    <span>{Math.round(testProgress)}%</span>
                  </div>
                  <Progress value={testProgress} className="h-2" />
                  {currentTestIndex >= 0 && (
                    <p className="text-xs text-gray-600">Testowanie: {AVAILABLE_SOUNDS[currentTestIndex]?.name}</p>
                  )}
                </div>
              )}

              {testResults.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  <h4 className="text-sm font-medium">Wyniki testów:</h4>
                  {testResults.map((result, index) => (
                    <div
                      key={result.soundId}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {getTestStatusIcon(result.status)}
                        <span className="font-medium">{result.name}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {result.status === "success" && result.duration && `${result.duration}ms`}
                        {result.status === "error" && "❌"}
                        {result.status === "testing" && "🧪"}
                        {result.status === "pending" && "⏳"}
                      </div>
                    </div>
                  ))}

                  {!isTestingAll && testResults.length > 0 && (
                    <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                      <div className="font-medium">Podsumowanie:</div>
                      <div>✅ Udane: {testResults.filter((r) => r.status === "success").length}</div>
                      <div>❌ Błędy: {testResults.filter((r) => r.status === "error").length}</div>
                      <div>⏳ Oczekujące: {testResults.filter((r) => r.status === "pending").length}</div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Debug Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Diagnostyka Dźwięków
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDebugInfo} className="text-xs bg-transparent">
                  <Bug className="w-3 h-3 mr-1" />
                  Sprawdź Status
                </Button>
                <Button size="sm" variant="outline" onClick={handleForceReload} className="text-xs bg-transparent">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Przeładuj Dźwięki
                </Button>
              </div>

              {showDebug && debugInfo && (
                <div className="bg-gray-100 p-3 rounded text-xs max-h-60 overflow-y-auto">
                  <div className="font-semibold mb-2">Status Systemu:</div>
                  <div>Włączone: {debugInfo.enabled ? "✅" : "❌"}</div>
                  <div>Głośność: {Math.round(debugInfo.volume * 100)}%</div>
                  <div>Interakcja użytkownika: {debugInfo.userInteracted ? "✅" : "❌"}</div>
                  <div>Środowisko: {debugInfo.isClient ? "Przeglądarka ✅" : "Serwer ❌"}</div>
                  <div>Fallback: {debugInfo.hasFallback ? "✅" : "❌"}</div>
                  {debugInfo.fallbackSrc && debugInfo.fallbackSrc !== "none" && (
                    <div>Fallback źródło: {debugInfo.fallbackSrc.split("/").pop()}</div>
                  )}

                  {debugInfo.audioSupport && (
                    <>
                      <div className="font-semibold mt-3 mb-2">Wsparcie Audio:</div>
                      <div>MP3: {debugInfo.audioSupport.mp3 || "❌"}</div>
                      <div>OGG: {debugInfo.audioSupport.ogg || "❌"}</div>
                      <div>WAV: {debugInfo.audioSupport.wav || "❌"}</div>
                      <div>M4A: {debugInfo.audioSupport.m4a || "❌"}</div>
                    </>
                  )}

                  <div className="font-semibold mt-3 mb-2">Dźwięki:</div>
                  {Object.entries(debugInfo.sounds).map(([id, info]: [string, any]) => (
                    <div key={id} className="mb-2 p-2 bg-white rounded">
                      <div className="flex items-center gap-2">
                        {getSoundStatusIcon(info)}
                        <span className="font-medium">{id}</span>
                        <span className="text-gray-500">({info.loadStatus})</span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        ReadyState: {info.readyState}/4 | Duration: {info.duration?.toFixed(1) || 0}s
                      </div>
                      {info.src && info.src !== "none" && (
                        <div className="text-xs text-gray-500 mt-1 break-all">Źródło: {info.src.split("/").pop()}</div>
                      )}
                      {info.error && <div className="text-red-600 text-xs mt-1">❌ {info.error}</div>}
                      {info.attempts > 1 && (
                        <div className="text-yellow-600 text-xs mt-1">🔄 Próby: {info.attempts}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Default Sounds */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Domyślne Dźwięki Drużyn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-yellow-700">🟡 Żółci</span>
                    <span className="text-xs text-gray-600">
                      ({AVAILABLE_SOUNDS.find((s) => s.id === TEAM_DEFAULT_SOUNDS.yellow)?.name})
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePreviewSound(TEAM_DEFAULT_SOUNDS.yellow)}
                    disabled={!soundEnabled}
                    className="text-xs px-2 py-1"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Test
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-700">🔵 Niebiescy</span>
                    <span className="text-xs text-gray-600">
                      ({AVAILABLE_SOUNDS.find((s) => s.id === TEAM_DEFAULT_SOUNDS.blue)?.name})
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePreviewSound(TEAM_DEFAULT_SOUNDS.blue)}
                    disabled={!soundEnabled}
                    className="text-xs px-2 py-1"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Test
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Sounds */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Wszystkie Dostępne Dźwięki</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {AVAILABLE_SOUNDS.filter((sound) => sound.id !== "none").map((sound) => {
                  const soundInfo = debugInfo?.sounds?.[sound.id]
                  const testResult = testResults.find((r) => r.soundId === sound.id)

                  return (
                    <div key={sound.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        {getSoundStatusIcon(soundInfo)}
                        <span className="text-sm font-medium">{sound.name}</span>
                        {testResult && (
                          <div className="flex items-center gap-1">
                            {getTestStatusIcon(testResult.status)}
                            {testResult.status === "success" && <span className="text-xs text-green-600">✓</span>}
                            {testResult.status === "error" && <span className="text-xs text-red-600">✗</span>}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreviewSound(sound.id)}
                        disabled={!soundEnabled}
                        className="text-xs px-2 py-1"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Test
                      </Button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Player Sound Assignments - NEW INTERACTIVE VERSION */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Przypisania Dźwięków Graczy</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPlayerAssignments(!showPlayerAssignments)}
                  className="text-xs"
                >
                  {showPlayerAssignments ? "Ukryj" : "Zarządzaj"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showPlayerAssignments ? (
                <div className="space-y-4">
                  {/* Add New Assignment */}
                  <div className="p-3 bg-green-50 rounded border">
                    <h4 className="text-sm font-medium mb-2">Dodaj Przypisanie</h4>
                    <div className="space-y-2">
                      <select
                        value={selectedPlayerForSound || ""}
                        onChange={(e) => setSelectedPlayerForSound(e.target.value || null)}
                        className="w-full p-2 border rounded text-sm"
                      >
                        <option value="">Wybierz gracza...</option>
                        {getAllPlayerNames()
                          .filter((name) => !playerSoundAssignments[name])
                          .map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                      </select>

                      {selectedPlayerForSound && (
                        <div className="flex gap-2 flex-wrap">
                          {AVAILABLE_SOUNDS.map((sound) => (
                            <Button
                              key={sound.id}
                              size="sm"
                              variant="outline"
                              onClick={() => assignSoundToPlayer(selectedPlayerForSound, sound.id)}
                              className="text-xs"
                            >
                              {sound.name}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Current Assignments */}
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    <h4 className="text-sm font-medium">Aktualne Przypisania:</h4>
                    {Object.keys(playerSoundAssignments).length === 0 ? (
                      <p className="text-sm text-gray-500 italic">Brak specjalnych przypisań</p>
                    ) : (
                      Object.entries(playerSoundAssignments).map(([playerName, soundType]) => {
                        const sound = AVAILABLE_SOUNDS.find((s) => s.id === soundType)
                        const soundInfo = debugInfo?.sounds?.[soundType]
                        const testResult = testResults.find((r) => r.soundId === soundType)

                        return (
                          <div
                            key={playerName}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                          >
                            <div className="flex items-center gap-2">
                              {getSoundStatusIcon(soundInfo)}
                              <span className="font-medium">{playerName}</span>
                              {testResult && getTestStatusIcon(testResult.status)}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">{sound?.name}</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePreviewSound(soundType)}
                                disabled={!soundEnabled}
                                className="text-xs px-1 py-0.5"
                              >
                                <Play className="w-2.5 h-2.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => assignSoundToPlayer(playerName, "none")}
                                className="text-xs px-1 py-0.5 text-red-600 hover:text-red-700"
                              >
                                <X className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Clear All Button */}
                  {Object.keys(playerSoundAssignments).length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => savePlayerAssignments({})}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Wyczyść Wszystkie
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.keys(playerSoundAssignments).length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Brak specjalnych przypisań. Wszyscy gracze używają domyślnych dźwięków swoich drużyn.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 mb-2">
                        Specjalne przypisania ({Object.keys(playerSoundAssignments).length}):
                      </p>
                      {Object.entries(playerSoundAssignments)
                        .slice(0, 3)
                        .map(([playerName, soundType]) => {
                          const sound = AVAILABLE_SOUNDS.find((s) => s.id === soundType)
                          return (
                            <div key={playerName} className="text-xs text-gray-600">
                              • {playerName} → {sound?.name}
                            </div>
                          )
                        })}
                      {Object.keys(playerSoundAssignments).length > 3 && (
                        <div className="text-xs text-gray-500">
                          ...i {Object.keys(playerSoundAssignments).length - 3} więcej
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Close Button */}
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)} className="bg-green-500 hover:bg-green-600">
              Gotowe
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
