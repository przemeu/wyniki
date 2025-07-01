"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Volume2, VolumeX, Play, RefreshCw, Bug, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { soundManager, AVAILABLE_SOUNDS, PLAYER_SOUNDS, TEAM_DEFAULT_SOUNDS, type SoundType } from "@/lib/sounds"

interface SoundSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SoundSettings({ open, onOpenChange }: SoundSettingsProps) {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [volume, setVolume] = useState(70)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 })

  useEffect(() => {
    setSoundEnabled(soundManager.isEnabled())
    setVolume(Math.round(soundManager.getVolume() * 100))

    // Update loading progress periodically
    const interval = setInterval(() => {
      setLoadingProgress(soundManager.getLoadingProgress())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled)
    soundManager.setEnabled(enabled)
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    soundManager.setVolume(newVolume / 100)
  }

  const handlePreviewSound = async (soundType: SoundType) => {
    await soundManager.previewSound(soundType)
  }

  const handleDebugInfo = () => {
    const status = soundManager.getSoundStatus()
    setDebugInfo(status)
    setShowDebug(true)
    console.log("🐛 Sound Debug Info:", status)
  }

  const handleForceReload = async () => {
    await soundManager.forceReloadSounds()
    const status = soundManager.getSoundStatus()
    setDebugInfo(status)
    setLoadingProgress(soundManager.getLoadingProgress())
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

                  <div className="font-semibold mt-3 mb-2">Dźwięki:</div>
                  {Object.entries(debugInfo.sounds).map(([id, info]: [string, any]) => (
                    <div key={id} className="mb-2 p-2 bg-white rounded">
                      <div className="flex items-center gap-2">
                        {getSoundStatusIcon(info)}
                        <span className="font-medium">{id}</span>
                        <span className="text-gray-500">({info.loadStatus})</span>
                      </div>
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
                  return (
                    <div key={sound.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        {getSoundStatusIcon(soundInfo)}
                        <span className="text-sm font-medium">{sound.name}</span>
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

          {/* Player Sound Assignments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Specjalne Przypisania Graczy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.entries(PLAYER_SOUNDS).map(([playerName, soundType]) => {
                  const sound = AVAILABLE_SOUNDS.find((s) => s.id === soundType)
                  const soundInfo = debugInfo?.sounds?.[soundType]
                  return (
                    <div key={playerName} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <div className="flex items-center gap-2">
                        {getSoundStatusIcon(soundInfo)}
                        <span className="font-medium">{playerName}</span>
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
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mt-3">Pozostali gracze używają domyślnych dźwięków swoich drużyn</p>
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
