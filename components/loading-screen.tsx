"use client"

interface LoadingScreenProps {
  message?: string
  subMessage?: string
}

export function LoadingScreen({
  message = "Carregando...",
  subMessage = "Inicializando o aplicativo",
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center p-8 max-w-md">
        {/* Spinner simples */}
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto mb-8"></div>

        <h2 className="text-xl font-medium text-blue-500 mb-2">{message}</h2>
        <p className="text-sm text-slate-500">{subMessage}</p>
      </div>
    </div>
  )
}
