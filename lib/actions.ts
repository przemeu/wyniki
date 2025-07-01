"use server"

import { supabaseServer } from "./supabase-server"

export async function getPlayers() {
  // If no Supabase client is available, return default players immediately
  if (!supabaseServer) {
    console.log("Supabase not configured, using default players")
    return getDefaultPlayers()
  }

  try {
    const { data, error } = await supabaseServer.from("players").select("*").order("name")

    if (error) {
      console.error("Error fetching players:", error)
      // Return default players if database table doesn't exist or other error
      return getDefaultPlayers()
    }

    // If we got data from the database, use it, otherwise use defaults
    return data && data.length > 0 ? data : getDefaultPlayers()
  } catch (error) {
    console.error("Error in getPlayers:", error)
    // Return default players if there's any connection issue
    return getDefaultPlayers()
  }
}

// Fallback default players if database is not available - ALPHABETICALLY SORTED
function getDefaultPlayers() {
  return [
    { id: 1, name: "Adam S.", created_at: new Date().toISOString() },
    { id: 2, name: "Adam T.", created_at: new Date().toISOString() },
    { id: 3, name: "Andrzej T.", created_at: new Date().toISOString() },
    { id: 4, name: "Bartek D.", created_at: new Date().toISOString() },
    { id: 5, name: "Franek W.", created_at: new Date().toISOString() },
    { id: 6, name: "Grzegorz G.", created_at: new Date().toISOString() },
    { id: 7, name: "Grzegorz O.", created_at: new Date().toISOString() },
    { id: 8, name: "Jakub K.", created_at: new Date().toISOString() },
    { id: 9, name: "Jędrek K.", created_at: new Date().toISOString() },
    { id: 10, name: "Kamil E.", created_at: new Date().toISOString() },
    { id: 11, name: "Konrad L.", created_at: new Date().toISOString() },
    { id: 12, name: "Kornel O.", created_at: new Date().toISOString() },
    { id: 13, name: "Krystian G.", created_at: new Date().toISOString() },
    { id: 14, name: "Łukasz B.", created_at: new Date().toISOString() },
    { id: 15, name: "Łukasz J.", created_at: new Date().toISOString() },
    { id: 16, name: "Maciej M.", created_at: new Date().toISOString() },
    { id: 17, name: "Marcin P.", created_at: new Date().toISOString() },
    { id: 18, name: "Marek Z.", created_at: new Date().toISOString() },
    { id: 19, name: "Mateusz W.", created_at: new Date().toISOString() },
    { id: 20, name: "Michał G.", created_at: new Date().toISOString() },
    { id: 21, name: "Michał T.", created_at: new Date().toISOString() },
    { id: 22, name: "Mikołaj T.", created_at: new Date().toISOString() },
    { id: 23, name: "Oskar B.", created_at: new Date().toISOString() },
    { id: 24, name: "Paweł L.", created_at: new Date().toISOString() },
    { id: 25, name: "Paweł W.", created_at: new Date().toISOString() },
    { id: 26, name: "Piotrek P.", created_at: new Date().toISOString() },
    { id: 27, name: "Przemek W.", created_at: new Date().toISOString() },
    { id: 28, name: "Radek K.", created_at: new Date().toISOString() },
    { id: 29, name: "Radek P.", created_at: new Date().toISOString() },
    { id: 30, name: "Robert G.", created_at: new Date().toISOString() },
    { id: 31, name: "Szymon B.", created_at: new Date().toISOString() },
    { id: 32, name: "Tomasz Ł.", created_at: new Date().toISOString() },
    { id: 33, name: "Tomek Ł.", created_at: new Date().toISOString() },
    { id: 34, name: "Tomek W.", created_at: new Date().toISOString() },
  ]
}
