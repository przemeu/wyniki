"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, RotateCcw, Download, Settings, Users, Trophy, Plus, X } from "lucide-react"
import { getPlayers } from "@/lib/actions"
import InstallPrompt from "./components/install-prompt"

interface Player {
  id: string
  name: string
  goals: number
  assists: number
}

interface GameAction {
  id: string
  timestamp: string
  type: "goal" | "own_goal"
  team: "yellow" | "blue"
  scorer: string
  assistant?: string
}

interface DBPlayer {
  id: number
  name: string
  created_at: string
}

export default function FootballScorer() {
  const [mode, setMode] = useState<"setup" | "game">("setup")
  const [gameActive, setGameActive] = useState(false)
  const [availablePlayers, setAvailablePlayers] = useState<DBPlayer[]>([])
  const [playerSelectDialog, setPlayerSelectDialog] = useState<{ open: boolean; team: "yellow" | "blue" | null }>({
    open: false,
    team: null,
  })

  // Add loading state
  const [playersLoading, setPlayersLoading] = useState(true)

  // Initialize with empty arrays - players will be selected from database
  const [yellowPlayers, setYellowPlayers] = useState<Player[]>([])
  const [bluePlayers, setBluePlayers] = useState<Player[]>([])

  const [yellowScore, setYellowScore] = useState(0)
  const [blueScore, setBlueScore] = useState(0)
  const [actions, setActions] = useState<GameAction[]>([])
  const [assistDialogOpen, setAssistDialogOpen] = useState(false)
  const [pendingGoal, setPendingGoal] = useState<{ team: "yellow" | "blue"; scorer: string } | null>(null)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  // Load players on component mount
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setPlayersLoading(true)
        const players = await getPlayers()
        setAvailablePlayers(players)
      } catch (error) {
        console.error("Failed to load players:", error)
        // This shouldn't happen now since getPlayers always returns default players on error
        setAvailablePlayers([])
      } finally {
        setPlayersLoading(false)
      }
    }
    loadPlayers()
  }, [])

  // Setup mode - player management
  const openPlayerSelect = (team: "yellow" | "blue") => {
    setPlayerSelectDialog({ open: true, team })
  }

  const addPlayerFromDB = (dbPlayer: DBPlayer) => {
    if (!playerSelectDialog.team) return

    const newPlayer: Player = {
      id: `${playerSelectDialog.team}_${dbPlayer.id}`,
      name: dbPlayer.name,
      goals: 0,
      assists: 0,
    }

    if (playerSelectDialog.team === "yellow") {
      if (yellowPlayers.length < 8 && !yellowPlayers.some((p) => p.name === dbPlayer.name)) {
        setYellowPlayers([...yellowPlayers, newPlayer])
      }
    } else {
      if (bluePlayers.length < 8 && !bluePlayers.some((p) => p.name === dbPlayer.name)) {
        setBluePlayers([...bluePlayers, newPlayer])
      }
    }

    setPlayerSelectDialog({ open: false, team: null })
  }

  const removePlayer = (team: "yellow" | "blue", playerId: string) => {
    if (team === "yellow") {
      setYellowPlayers(yellowPlayers.filter((p) => p.id !== playerId))
    } else {
      setBluePlayers(bluePlayers.filter((p) => p.id !== playerId))
    }
  }

  const canStartGame = yellowPlayers.length >= 5 && bluePlayers.length >= 5

  // Game mode functions
  const handlePlayerClick = (team: "yellow" | "blue", playerName: string) => {
    if (!gameActive) return

    setPendingGoal({ team, scorer: playerName })
    setAssistDialogOpen(true)
  }

  const handleOwnGoal = (team: "yellow" | "blue") => {
    if (!gameActive) return

    const action: GameAction = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
      type: "own_goal",
      team: team,
      scorer: "SAMOBÓJ",
    }

    setActions([...actions, action])

    if (team === "yellow") {
      setYellowScore(yellowScore + 1)
    } else {
      setBlueScore(blueScore + 1)
    }
  }

  const confirmGoal = (assistantName?: string) => {
    if (!pendingGoal) return

    const action: GameAction = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
      type: "goal",
      team: pendingGoal.team,
      scorer: pendingGoal.scorer,
      assistant: assistantName,
    }

    setActions([...actions, action])

    if (pendingGoal.team === "yellow") {
      setYellowScore(yellowScore + 1)
    } else {
      setBlueScore(blueScore + 1)
    }

    // Update player stats
    const updatePlayerStats = (players: Player[], setPlayers: (players: Player[]) => void) => {
      const updatedPlayers = players.map((player) => {
        if (player.name === pendingGoal.scorer) {
          return { ...player, goals: player.goals + 1 }
        }
        if (assistantName && player.name === assistantName) {
          return { ...player, assists: player.assists + 1 }
        }
        return player
      })
      setPlayers(updatedPlayers)
    }

    if (pendingGoal.team === "yellow") {
      updatePlayerStats(yellowPlayers, setYellowPlayers)
    } else {
      updatePlayerStats(bluePlayers, setBluePlayers)
    }

    setPendingGoal(null)
    setAssistDialogOpen(false)
  }

  const undoLastAction = () => {
    if (actions.length === 0) return

    const lastAction = actions[actions.length - 1]
    setActions(actions.slice(0, -1))

    if (lastAction.team === "yellow") {
      setYellowScore(Math.max(0, yellowScore - 1))
    } else {
      setBlueScore(Math.max(0, blueScore - 1))
    }

    if (lastAction.type === "goal") {
      const revertPlayerStats = (players: Player[], setPlayers: (players: Player[]) => void) => {
        const updatedPlayers = players.map((player) => {
          if (player.name === lastAction.scorer) {
            return { ...player, goals: Math.max(0, player.goals - 1) }
          }
          if (lastAction.assistant && player.name === lastAction.assistant) {
            return { ...player, assists: Math.max(0, player.assists - 1) }
          }
          return player
        })
        setPlayers(updatedPlayers)
      }

      if (lastAction.team === "yellow") {
        revertPlayerStats(yellowPlayers, setYellowPlayers)
      } else {
        revertPlayerStats(bluePlayers, setBluePlayers)
      }
    }
  }

  const exportLog = () => {
    const date = new Date().toLocaleDateString("pl-PL")
    let logContent = `Dziennik Meczu Piłkarskiego - ${date}\n\n`
    logContent += `Wynik Końcowy: Żółci ${yellowScore} - ${blueScore} Niebiescy\n\n`
    logContent += `Wydarzenia Meczu:\n`

    actions.forEach((action) => {
      if (action.type === "goal") {
        logContent += `${action.timestamp} - Gol: ${action.scorer} (${action.team === "yellow" ? "Żółci" : "Niebiescy"})`
        if (action.assistant) {
          logContent += `, Asysta: ${action.assistant}`
        }
        logContent += "\n"
      } else {
        logContent += `${action.timestamp} - Samobój (${action.team === "yellow" ? "Żółci" : "Niebiescy"})\n`
      }
    })

    logContent += "\nStatystyki Graczy:\n"
    const allPlayers = [
      ...yellowPlayers.map((p) => ({ ...p, team: "Żółci" })),
      ...bluePlayers.map((p) => ({ ...p, team: "Niebiescy" })),
    ]

    // Sort by goals (descending), then by assists (descending)
    const sortedPlayers = allPlayers
      .filter((player) => player.goals > 0 || player.assists > 0)
      .sort((a, b) => {
        if (b.goals !== a.goals) {
          return b.goals - a.goals // Sort by goals descending
        }
        return b.assists - a.assists // If goals are equal, sort by assists descending
      })

    sortedPlayers.forEach((player) => {
      logContent += `${player.name} (${player.team}): ${player.goals} ${player.goals === 1 ? "gol" : "gole"}, ${player.assists} ${player.assists === 1 ? "asysta" : "asysty"}\n`
    })

    // Create blob with UTF-8 BOM for proper Polish character encoding
    const BOM = "\uFEFF"
    const blob = new Blob([BOM + logContent], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `dziennik_meczu_${date.replace(/\./g, "-")}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const confirmReset = () => {
    setYellowScore(0)
    setBlueScore(0)
    setActions([])
    setGameActive(false)
    setYellowPlayers(yellowPlayers.map((p) => ({ ...p, goals: 0, assists: 0 })))
    setBluePlayers(bluePlayers.map((p) => ({ ...p, goals: 0, assists: 0 })))
    setResetDialogOpen(false)
  }

  // Get available players for selection (not already selected)
  const getAvailablePlayersForTeam = (team: "yellow" | "blue") => {
    const selectedPlayers = [...yellowPlayers, ...bluePlayers].map((p) => p.name)
    return availablePlayers.filter((p) => !selectedPlayers.includes(p.name))
  }

  if (mode === "setup") {
    return (
      <>
        <div
          className="min-h-screen p-2 sm:p-4"
          style={{
            background: "linear-gradient(to bottom, #fefce8, #fef3c7, #fde68a)",
          }}
        >
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6 gap-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="w-12 h-12 sm:w-20 sm:h-20 flex items-center justify-center">
                  <img src="/logos/yellow.png" alt="Żółci" className="w-12 h-12 sm:w-20 sm:h-20 object-contain" />
                </div>
                <span className="text-xl sm:text-2xl font-bold">0</span>
              </div>

              <div className="text-center">
                <Trophy className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-gray-600" />
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Konfiguracja Meczu</h1>
                <p className="text-sm sm:text-base text-gray-600">Wybierz 5-8 graczy na drużynę</p>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <span className="text-xl sm:text-2xl font-bold">0</span>
                <div className="w-12 h-12 sm:w-20 sm:h-20 flex items-center justify-center">
                  <img src="/logos/blue.png" alt="Niebiescy" className="w-12 h-12 sm:w-20 sm:h-20 object-contain" />
                </div>
              </div>
            </div>

            {/* Team Setup */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-4 sm:mb-6">
              {/* Yellow Team */}
              <Card className="border-l-4 border-l-yellow-400 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-yellow-600 text-base sm:text-lg">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                    Żółci ({yellowPlayers.length}/8)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                  {yellowPlayers.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                      <span className="text-sm sm:text-base font-medium">{player.name}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removePlayer("yellow", player.id)}
                        className="text-xs sm:text-sm"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}

                  {yellowPlayers.length < 8 && (
                    <Button
                      variant="outline"
                      className="w-full border-dashed border-yellow-300 text-yellow-600 hover:bg-yellow-50 bg-transparent text-sm sm:text-base"
                      onClick={() => openPlayerSelect("yellow")}
                      disabled={playersLoading || getAvailablePlayersForTeam("yellow").length === 0}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {playersLoading ? "Ładowanie..." : `Dodaj Gracza (${yellowPlayers.length}/8)`}
                    </Button>
                  )}

                  {yellowPlayers.length >= 5 && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <span>✓</span> Gotowy do gry
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Blue Team */}
              <Card className="border-l-4 border-l-blue-500 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-blue-600 text-base sm:text-lg">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                    Niebiescy ({bluePlayers.length}/8)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                  {bluePlayers.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span className="text-sm sm:text-base font-medium">{player.name}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removePlayer("blue", player.id)}
                        className="text-xs sm:text-sm"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}

                  {bluePlayers.length < 8 && (
                    <Button
                      variant="outline"
                      className="w-full border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 bg-transparent text-sm sm:text-base"
                      onClick={() => openPlayerSelect("blue")}
                      disabled={playersLoading || getAvailablePlayersForTeam("blue").length === 0}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {playersLoading ? "Ładowanie..." : `Dodaj Gracza (${bluePlayers.length}/8)`}
                    </Button>
                  )}

                  {bluePlayers.length >= 5 && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <span>✓</span> Gotowy do gry
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Start Game Button */}
            <div className="text-center mb-4">
              <Button
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 sm:px-8 text-sm sm:text-base"
                disabled={!canStartGame}
                onClick={() => setMode("game")}
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                ROZPOCZNIJ GRĘ
              </Button>
              {!canStartGame && (
                <p className="text-xs sm:text-sm text-gray-500 mt-2">Każda drużyna musi mieć minimum 5 graczy</p>
              )}
            </div>

            {/* Match Log Placeholder */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs sm:text-sm text-gray-600">📋 Dziennik Meczu (0 akcji)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-gray-400 italic py-4 sm:py-8 text-sm">Akcje gry pojawią się tutaj...</p>
              </CardContent>
            </Card>
          </div>

          {/* Player Selection Dialog */}
          <Dialog open={playerSelectDialog.open} onOpenChange={(open) => setPlayerSelectDialog({ open, team: null })}>
            <DialogContent className="w-[95vw] max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">
                  Wybierz gracza dla drużyny {playerSelectDialog.team === "yellow" ? "Żółci" : "Niebiescy"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                {playersLoading ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">Ładowanie graczy...</p>
                  </div>
                ) : (
                  <ScrollArea className="h-60">
                    {getAvailablePlayersForTeam(playerSelectDialog.team || "yellow").map((player) => (
                      <Button
                        key={player.id}
                        variant="outline"
                        className="w-full justify-start mb-2 bg-transparent text-sm sm:text-base"
                        onClick={() => addPlayerFromDB(player)}
                      >
                        {player.name}
                      </Button>
                    ))}
                    {getAvailablePlayersForTeam(playerSelectDialog.team || "yellow").length === 0 && (
                      <p className="text-center text-gray-500 py-4">Brak dostępnych graczy</p>
                    )}
                  </ScrollArea>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <InstallPrompt />
      </>
    )
  }

  return (
    <>
      <div
        className="min-h-screen p-2 sm:p-4"
        style={{
          background: "linear-gradient(to bottom, #fefce8, #fef3c7, #fde68a)",
        }}
      >
        <div className="max-w-6xl mx-auto">
          {/* Header with scores and controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-12 h-12 sm:w-20 sm:h-20 flex items-center justify-center">
                <img src="/logos/yellow.png" alt="Żółci" className="w-12 h-12 sm:w-20 sm:h-20 object-contain" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold">{yellowScore}</span>
            </div>

            <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
              <Button
                variant={gameActive ? "destructive" : "default"}
                onClick={() => setGameActive(!gameActive)}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                size="sm"
              >
                {gameActive ? <Pause className="w-3 h-3 sm:w-4 sm:h-4" /> : <Play className="w-3 h-3 sm:w-4 sm:h-4" />}
                {gameActive ? "PAUZA" : "START"}
              </Button>

              <Button
                variant="outline"
                onClick={() => setGameActive(false)}
                size="sm"
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                ZATRZYMAJ
              </Button>

              <Button
                variant="outline"
                onClick={undoLastAction}
                disabled={actions.length === 0}
                size="sm"
                className="text-xs sm:text-sm px-2 sm:px-3 bg-transparent"
              >
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                COFNIJ
              </Button>

              <Button
                variant="outline"
                onClick={exportLog}
                size="sm"
                className="text-xs sm:text-sm px-2 sm:px-3 bg-transparent"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                EKSPORT
              </Button>

              <Button
                variant="outline"
                onClick={() => setResetDialogOpen(true)}
                size="sm"
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                RESETUJ
              </Button>

              <Button
                variant="outline"
                onClick={() => setMode("setup")}
                size="sm"
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                KONFIGURACJA
              </Button>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-2xl sm:text-3xl font-bold">{blueScore}</span>
              <div className="w-12 h-12 sm:w-20 sm:h-20 flex items-center justify-center">
                <img src="/logos/blue.png" alt="Niebiescy" className="w-12 h-12 sm:w-20 sm:h-20 object-contain" />
              </div>
            </div>
          </div>

          {/* Teams - SIDE BY SIDE ON LARGER SCREENS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Yellow Team */}
            <Card className="border-l-4 border-l-yellow-400 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-yellow-600 text-base sm:text-lg">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  Gracze Żółci
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {yellowPlayers.map((player) => (
                    <Button
                      key={player.id}
                      variant="outline"
                      className="h-10 sm:h-12 bg-yellow-400 hover:bg-yellow-500 text-blue-800 border-yellow-400 relative font-medium text-xs sm:text-sm px-2"
                      onClick={() => handlePlayerClick("yellow", player.name)}
                      disabled={!gameActive}
                    >
                      <span className="absolute top-1 left-1 sm:left-2 text-xs opacity-75">⚽</span>
                      <span className="truncate pl-3 sm:pl-4">{player.name}</span>
                      {(player.goals > 0 || player.assists > 0) && (
                        <Badge variant="secondary" className="ml-1 text-xs absolute top-1 right-1">
                          {player.goals}G {player.assists}A
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="destructive"
                  className="w-full h-10 sm:h-12 text-sm sm:text-base"
                  onClick={() => handleOwnGoal("yellow")}
                  disabled={!gameActive}
                >
                  ⚠️ SAMOBÓJ
                </Button>
              </CardContent>
            </Card>

            {/* Blue Team */}
            <Card className="border-l-4 border-l-blue-500 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-600 text-base sm:text-lg">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  Gracze Niebiescy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {bluePlayers.map((player) => (
                    <Button
                      key={player.id}
                      variant="outline"
                      className="h-10 sm:h-12 bg-blue-500 hover:bg-blue-600 text-yellow-400 border-blue-500 relative font-medium text-xs sm:text-sm px-2"
                      onClick={() => handlePlayerClick("blue", player.name)}
                      disabled={!gameActive}
                    >
                      <span className="absolute top-1 left-1 sm:left-2 text-xs opacity-75">⚽</span>
                      <span className="truncate pl-3 sm:pl-4">{player.name}</span>
                      {(player.goals > 0 || player.assists > 0) && (
                        <Badge variant="secondary" className="ml-1 text-xs absolute top-1 right-1">
                          {player.goals}G {player.assists}A
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="destructive"
                  className="w-full h-10 sm:h-12 text-sm sm:text-base"
                  onClick={() => handleOwnGoal("blue")}
                  disabled={!gameActive}
                >
                  ⚠️ SAMOBÓJ
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Match Log */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs sm:text-sm text-gray-600">
                📋 Dziennik Meczu ({actions.length} {actions.length === 1 ? "akcja" : "akcji"})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-32 sm:h-48">
                {actions.length === 0 ? (
                  <p className="text-center text-gray-400 italic py-4 sm:py-8 text-sm">
                    Akcje gry pojawią się tutaj...
                  </p>
                ) : (
                  <div className="space-y-2">
                    {actions.map((action) => (
                      <div key={action.id} className="flex items-center gap-2 sm:gap-3 p-2 bg-gray-50 rounded">
                        <span className="text-xs sm:text-sm text-gray-500 min-w-[40px] sm:min-w-[50px]">
                          {action.timestamp}
                        </span>
                        <span className="text-xs sm:text-sm">
                          {action.type === "goal" ? (
                            <>
                              <span className="font-medium">Gol:</span> {action.scorer}
                              <span
                                className={`ml-1 ${action.team === "yellow" ? "text-yellow-600" : "text-blue-600"}`}
                              >
                                ({action.team === "yellow" ? "Żółci" : "Niebiescy"})
                              </span>
                              {action.assistant && <span className="text-gray-600">, Asysta: {action.assistant}</span>}
                            </>
                          ) : (
                            <>
                              <span className="font-medium text-red-600">Samobój</span>
                              <span
                                className={`ml-1 ${action.team === "yellow" ? "text-yellow-600" : "text-blue-600"}`}
                              >
                                ({action.team === "yellow" ? "Żółci" : "Niebiescy"})
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Assist Dialog */}
          <Dialog open={assistDialogOpen} onOpenChange={setAssistDialogOpen}>
            <DialogContent className="w-[95vw] max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">Czy była asysta?</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 sm:space-y-4">
                <p className="text-sm text-gray-600">
                  Gol: <strong>{pendingGoal?.scorer}</strong> ({pendingGoal?.team === "yellow" ? "Żółci" : "Niebiescy"})
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent text-sm sm:text-base h-10 sm:h-auto"
                    onClick={() => confirmGoal()}
                  >
                    Bez asysty
                  </Button>

                  {pendingGoal &&
                    (pendingGoal.team === "yellow" ? yellowPlayers : bluePlayers)
                      .filter((p) => p.name !== pendingGoal.scorer)
                      .map((player) => (
                        <Button
                          key={player.id}
                          variant="outline"
                          className="w-full justify-start bg-transparent text-sm sm:text-base h-10 sm:h-auto"
                          onClick={() => confirmGoal(player.name)}
                        >
                          Asysta: {player.name}
                        </Button>
                      ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Reset Confirmation Dialog */}
          <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <DialogContent className="w-[95vw] max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">Potwierdź reset meczu</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 sm:space-y-4">
                <p className="text-sm text-gray-600">
                  Czy na pewno chcesz zresetować mecz? Ta akcja usunie wszystkie gole, asysty i historię akcji.
                </p>
                <p className="text-sm font-medium text-red-600">Tej operacji nie można cofnąć!</p>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setResetDialogOpen(false)} size="sm" className="text-sm">
                    Anuluj
                  </Button>
                  <Button variant="destructive" onClick={confirmReset} size="sm" className="text-sm">
                    Tak, resetuj mecz
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <InstallPrompt />
    </>
  )
}
