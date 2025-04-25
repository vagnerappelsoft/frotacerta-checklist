"use client"

import { useEffect, useState } from "react"
import { WifiOff, RefreshCw, Wifi, X } from "lucide-react"
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
  const [manuallyDismissed, setManuallyDismissed] = useState(false)

  // Gerenciar a exibição do banner
  useEffect(() => {
    if (!isOnline) {
      // Mostrar o banner imediatamente quando ficar offline (a menos que tenha sido fechado manualmente)
      if (!manuallyDismissed) {
        setShowBanner(true)
        setShowReconnected(false)
        setSyncingInProgress(false)

        // Auto-ocultar após 10 segundos quando offline
        const timer = setTimeout(() => {
          setShowBanner(false)
        }, 10000)

        return () => clearTimeout(timer)
      }
    } else if (hasConnectionChanged && pendingSyncs > 0) {
      // Se estiver online, já tiver detectado uma mudança de conexão e tiver sincronizações pendentes
      setShowBanner(true)
      setShowReconnected(true)
      setSyncingInProgress(true)
      setManuallyDismissed(false) // Reset quando a conexão muda
    } else if (hasConnectionChanged && pendingSyncs === 0 && showReconnected) {
      // Esconder o banner após 3 segundos quando todas as sincronizações forem concluídas
      setSyncingInProgress(false)
      const timer = setTimeout(() => {
        setShowBanner(false)
        setShowReconnected(false)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [isOnline, pendingSyncs, hasConnectionChanged, showReconnected, manuallyDismissed])

  const handleDismiss = () => {
    setShowBanner(false)
    setManuallyDismissed(true)
  }

  if (!showBanner) return null

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 py-1 px-3 text-white z-50 flex items-center justify-between transition-all duration-300",
        !isOnline ? "bg-blue-500" : showReconnected ? "bg-green-500" : "bg-blue-500",
        className,
      )}
    >
      <div className="flex items-center">
        {!isOnline ? (
          <>
            <WifiOff className="h-3 w-3 mr-1" />
            <span className="text-xs">Você está offline. Os dados serão salvos localmente.</span>
          </>
        ) : showReconnected && pendingSyncs === 0 ? (
          <>
            <Wifi className="h-3 w-3 mr-1" />
            <span className="text-xs">Conexão restaurada. Todos os dados foram sincronizados.</span>
          </>
        ) : (
          <>
            <RefreshCw className={`h-3 w-3 mr-1 ${syncingInProgress ? "animate-spin" : ""}`} />
            <span className="text-xs">
              {pendingSyncs > 0
                ? `Sincronizando ${pendingSyncs} item(s)... Clique em "Tentar" para forçar a sincronização.`
                : "Verificando dados..."}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center">
        {!isOnline && onTrySync && (
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-blue-600 p-1 h-auto text-xs"
            onClick={onTrySync}
          >
            Tentar
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-blue-600 p-1 h-auto ml-1"
          onClick={handleDismiss}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
