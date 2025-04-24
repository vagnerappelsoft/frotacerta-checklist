"use client"

import { useState, useEffect } from "react"
import { Check, AlertCircle, Wifi, WifiOff } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { syncService } from "@/lib/sync-service"
import { useOnlineStatus } from "@/hooks/use-online-status"

// Remover o botão de sincronização do componente SyncStatus para evitar duplicação
// e deixar apenas o botão na tela de configurações

// Modificar o componente para remover o botão de sincronização
export function SyncStatus() {
  const [syncState, setSyncState] = useState<{
    isSyncing: boolean
    progress: number
    total: number
    message: string
    error: string | null
    lastSync: Date | null
  }>({
    isSyncing: false,
    progress: 0,
    total: 0,
    message: "Aguardando sincronização",
    error: null,
    lastSync: syncService.getLastSyncTime(),
  })

  const { isOnline } = useOnlineStatus()

  useEffect(() => {
    // Registrar listener para eventos de sincronização
    const handleSyncEvent = (event: any) => {
      switch (event.type) {
        case "start":
          setSyncState((prev) => ({
            ...prev,
            isSyncing: true,
            message: event.message,
            error: null,
          }))
          break

        case "progress":
          setSyncState((prev) => ({
            ...prev,
            isSyncing: true,
            progress: event.data?.current || 0,
            total: event.data?.total || 0,
            message: event.message,
          }))
          break

        case "complete":
          setSyncState((prev) => ({
            ...prev,
            isSyncing: false,
            progress: prev.total,
            message: event.message,
            lastSync: new Date(),
          }))
          break

        case "error":
          setSyncState((prev) => ({
            ...prev,
            isSyncing: false,
            error: event.message,
          }))
          break
      }
    }

    syncService.addEventListener(handleSyncEvent)

    // Limpar listener ao desmontar
    return () => {
      syncService.removeEventListener(handleSyncEvent)
    }
  }, [])

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Status de Sincronização</CardTitle>
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
            <span className="text-sm font-medium">{isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-4">
          {syncState.isSyncing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{syncState.message}</span>
                <span>
                  {syncState.progress} de {syncState.total}
                </span>
              </div>
              <Progress value={(syncState.progress / Math.max(syncState.total, 1)) * 100} className="h-2" />
            </div>
          )}

          {syncState.error && (
            <div className="bg-red-50 p-3 rounded-md text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{syncState.error}</span>
            </div>
          )}

          {!syncState.isSyncing && !syncState.error && (
            <div className="bg-green-50 p-3 rounded-md text-green-700 text-sm flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                {syncState.lastSync
                  ? `Última sincronização: ${syncState.lastSync.toLocaleString()}`
                  : "Nenhuma sincronização realizada"}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
