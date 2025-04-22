"use client"

import { useEffect, useState } from "react"
import { WifiOff, RefreshCw, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { cn } from "@/lib/utils"

interface OfflineBannerProps {
  pendingSyncs: number
  onTrySync?: () => void
  className?: string
}

export function OfflineBanner({ pendingSyncs, onTrySync, className }: OfflineBannerProps) {
  const { isOnline, hasConnectionChanged } = useOnlineStatus()
  const [showBanner, setShowBanner] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)
  const [syncingInProgress, setSyncingInProgress] = useState(false)

  // Gerenciar a exibição do banner
  useEffect(() => {
    if (!isOnline) {
      // Mostrar o banner imediatamente quando ficar offline
      setShowBanner(true)
      setShowReconnected(false)
      setSyncingInProgress(false)
    } else if (hasConnectionChanged && pendingSyncs > 0) {
      // Se estiver online, já tiver detectado uma mudança de conexão e tiver sincronizações pendentes
      setShowBanner(true)
      setShowReconnected(true)
      setSyncingInProgress(true)
    } else if (hasConnectionChanged && pendingSyncs === 0 && showReconnected) {
      // Esconder o banner após 3 segundos quando todas as sincronizações forem concluídas
      setSyncingInProgress(false)
      const timer = setTimeout(() => {
        setShowBanner(false)
        setShowReconnected(false)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [isOnline, pendingSyncs, hasConnectionChanged, showReconnected])

  if (!showBanner) return null

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 py-2 px-4 text-white z-50 flex items-center justify-between transition-all duration-300",
        !isOnline ? "bg-blue-500" : showReconnected ? "bg-green-500" : "bg-blue-500",
        className,
      )}
    >
      <div className="flex items-center">
        {!isOnline ? (
          <>
            <WifiOff className="h-4 w-4 mr-2" />
            <span className="text-sm">Você está offline. Os dados serão salvos localmente.</span>
          </>
        ) : showReconnected && pendingSyncs === 0 ? (
          <>
            <Wifi className="h-4 w-4 mr-2" />
            <span className="text-sm">Conexão restaurada. Todos os dados foram sincronizados.</span>
          </>
        ) : (
          <>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncingInProgress ? "animate-spin" : ""}`} />
            <span className="text-sm">
              {pendingSyncs > 0 ? `Sincronizando ${pendingSyncs} item(s) pendente(s)...` : "Verificando dados..."}
            </span>
          </>
        )}
      </div>

      {!isOnline && onTrySync && (
        <Button variant="ghost" size="sm" className="text-white hover:bg-blue-600 p-1 h-auto" onClick={onTrySync}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
