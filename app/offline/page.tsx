"use client"

export default function OfflinePage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(to bottom, #fefce8, #fef3c7, #fde68a)",
      }}
    >
      <div className="text-center max-w-md mx-auto">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center bg-white/80 rounded-full">
            <span className="text-3xl">⚽</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Tryb Offline</h1>
          <p className="text-gray-600">Nie masz połączenia z internetem, ale aplikacja nadal działa!</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Dostępne funkcje offline:</h2>
          <ul className="text-left space-y-2 text-sm text-gray-700">
            <li>✅ Prowadzenie meczu</li>
            <li>✅ Dodawanie goli i asyst</li>
            <li>✅ Eksport dziennika meczu</li>
            <li>✅ Wszystkie 34 graczy dostępnych</li>
            <li>✅ Pełna funkcjonalność aplikacji</li>
          </ul>
        </div>

        <button
          onClick={() => (window.location.href = "/")}
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium"
        >
          Powrót do aplikacji
        </button>
      </div>
    </div>
  )
}
