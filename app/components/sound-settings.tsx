"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Volume2, VolumeX, Play } from "lucide-react"
import { soundManager, AVAILABLE_SOUNDS, PLAYER_SOUNDS, type SoundType } from "@/lib/sounds"

interface SoundSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SoundSettings({ open, onOpenChange }: SoundSettingsProps) {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [volume, setVolume] = useState(70)

  useEffect(() => {
    setSoundEnabled(soundManager.isEnabled())
    setVolume(Math.round(soundManager.getVolume() * 100))
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

          {/* Available Sounds */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dostępne Dźwięki</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {AVAILABLE_SOUNDS.filter((sound) => sound.id !== "none").map((sound) => (
                  <div key={sound.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{sound.name}</span>
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
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Player Sound Assignments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Przypisane Dźwięki Graczy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.entries(PLAYER_SOUNDS).map(([playerName, soundType]) => {
                  const sound = AVAILABLE_SOUNDS.find((s) => s.id === soundType)
                  return (
                    <div key={playerName} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <span className="font-medium">{playerName}</span>
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
              <p className="text-xs text-gray-500 mt-3">Pozostali gracze używają domyślnego dźwięku</p>
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
