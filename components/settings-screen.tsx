"use client"

import { ChevronRight, HelpCircle, LogOut, RefreshCw, Info, Download, Database, Trash2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { syncService } from "@/lib/sync-service"
import { offlineStorage } from "@/lib/offline-storage"
import { SyncStatus } from "@/components/sync-status"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { apiService } from "@/lib/api-service"

interface SettingsScreenProps {
  onNavigate: (screen: string) => void
  isOnline: boolean
  pendingSyncs: number
  onSyncNow?: () => void
}

export function SettingsScreen({ onNavigate, isOnline, pendingSyncs, onSyncNow }: SettingsScreenProps) {
  const [syncStatus, setSyncStatus] = useState<"synced" | "pending" | "syncing" | "error">("synced")
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(syncService.getLastSyncTime())
  const [isSyncing, setIsSyncing] = useState(false)
  const [showClearDataDialog, setShowClearDataDialog] = useState(false)
  const [clearDataLoading, setClearDataLoading] = useState(false)
  const [clearDataError, setClearDataError] = useState<string | null>(null)
  const [showFullSyncDialog, setShowFullSyncDialog] = useState(false)
  const [fullSyncLoading, setFullSyncLoading] = useState(false)
  const [fullSyncError, setFullSyncError] = useState<string | null>(null)
  const { user, logout } = useAuth()
  const router = useRouter()
  const [setPendingSyncs] = useState<number>(0)
  const [setOfflineMode] = useState<boolean>(false)

  // Atualizar o status de sincronização com base nas props
  useEffect(() => {
    if (pendingSyncs > 0) {
      setSyncStatus("pending")
    } else {
      setSyncStatus("synced")
    }

    // Atualizar a última sincronização
    setLastSyncTime(syncService.getLastSyncTime())
  }, [pendingSyncs])

  // Registrar listener para eventos de sincronização
  useEffect(() => {
    const handleSyncEvent = (event: any) => {
      if (event.type === "start") {
        setIsSyncing(true)
        setSyncStatus("syncing")
      } else if (event.type === "complete") {
        setIsSyncing(false)
        setSyncStatus("synced")
        setLastSyncTime(new Date())
      } else if (event.type === "error") {
        setIsSyncing(false)
        setSyncStatus("error")
      }
    }

    syncService.addEventListener(handleSyncEvent)

    return () => {
      syncService.removeEventListener(handleSyncEvent)
    }
  }, [])

  // Modificar o método handleSync para garantir que ele está chamando corretamente a função onSyncNow

  const handleSync = () => {
    if (!isOnline || isSyncing) {
      console.log("Não é possível sincronizar: offline ou já está sincronizando")
      return
    }

    console.log("Iniciando sincronização manual...")
    setIsSyncing(true)
    setSyncStatus("syncing")

    // Desativar o modo mockado para garantir que estamos usando a API real
    apiService.setMockMode(false)

    // Verificar se temos um clientId armazenado e usá-lo
    const storedClientId = localStorage.getItem("client_id")
    if (storedClientId) {
      console.log(`Usando clientId armazenado: ${storedClientId}`)
      apiService.setClientId(storedClientId)
    }

    // Chamar diretamente o serviço de sincronização
    syncService
      .forceSyncNow()
      .then((result) => {
        console.log("Resultado da sincronização forçada:", result)

        // Atualizar o contador de sincronizações pendentes
        offlineStorage.getPendingSyncs().then((syncs) => {
          setPendingSyncs(syncs.length)

          // Se não houver mais sincronizações pendentes e estiver online, desativar o modo offline
          if (syncs.length === 0 && isOnline) {
            setOfflineMode(false)
          }
        })

        setSyncStatus(result ? "synced" : "error")
      })
      .catch((error) => {
        console.error("Erro ao forçar sincronização:", error)
        setSyncStatus("error")
      })
      .finally(() => {
        setIsSyncing(false)

        // Chamar o callback onSyncNow se existir (para manter compatibilidade)
        if (onSyncNow) {
          onSyncNow()
        }
      })
  }

  const handleFullSync = async () => {
    try {
      setFullSyncLoading(true)
      setFullSyncError(null)

      const result = await syncService.forceFullSync()

      if (!result) {
        throw new Error("Falha na sincronização completa")
      }

      setShowFullSyncDialog(false)
    } catch (error: any) {
      setFullSyncError(error.message || "Erro na sincronização completa")
    } finally {
      setFullSyncLoading(false)
    }
  }

  const handleClearData = async () => {
    try {
      setClearDataLoading(true)
      setClearDataError(null)

      // Limpar todos os dados do IndexedDB
      await offlineStorage.clearAllData()

      // Limpar dados de sincronização
      localStorage.removeItem("last_sync_time")

      setShowClearDataDialog(false)

      // Recarregar a página para reiniciar o aplicativo
      window.location.reload()
    } catch (error: any) {
      setClearDataError(error.message || "Erro ao limpar dados")
      setClearDataLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <div className="container max-w-md mx-auto p-4 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências</p>
      </div>

      <div className="flex items-center gap-4 mb-6">
        {/* Status de sincronização */}
        <Avatar className="h-16 w-16">
          <AvatarImage src="/placeholder.svg?height=64&width=64" alt="Motorista" />
          <AvatarFallback>{user?.name?.charAt(0).toUpperCase() || "M"}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-medium">{user?.name || "Usuário"}</h2>
          <p className="text-sm text-muted-foreground">
            {user?.role || "Motorista"} - ID: {user?.userId || "N/A"}
          </p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <SyncStatus />

        {/* Botão de sincronização */}
        <Button onClick={handleSync} disabled={isSyncing || !isOnline} className="w-full">
          {isSyncing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar Agora
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        <Card className="divide-y">
          <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => onNavigate("updates")}>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-muted-foreground" />
              <span>Últimas Atualizações</span>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Novo
            </Badge>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>

          <div
            className="p-4 flex items-center justify-between cursor-pointer"
            onClick={() => onNavigate("install-app")}
          >
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-muted-foreground" />
              <span>Instalar Aplicativo</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>

          <div
            className="p-4 flex items-center justify-between cursor-pointer"
            onClick={() => setShowFullSyncDialog(true)}
          >
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              <span>Sincronização Completa</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>

          {process.env.NODE_ENV !== "production" && (
            <div
              className="p-4 flex items-center justify-between cursor-pointer"
              onClick={() => onNavigate("api-debug")}
            >
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-muted-foreground" />
                <span>Visualizar Dados da API</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          )}

          <div
            className="p-4 flex items-center justify-between cursor-pointer"
            onClick={() => setShowClearDataDialog(true)}
          >
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              <span className="text-red-500">Limpar Dados</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => onNavigate("help")}>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
              <span>Ajuda e Suporte</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Button variant="destructive" className="w-full" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>

        <div className="text-center text-xs text-muted-foreground">
          <p>Versão 1.2.0</p>
          <p>© 2023 Sistema de Checklist Veicular</p>
        </div>
      </div>

      {/* Dialog para sincronização completa */}
      <Dialog open={showFullSyncDialog} onOpenChange={setShowFullSyncDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sincronização Completa</DialogTitle>
            <DialogDescription>
              Isso irá baixar todos os dados novamente do servidor. Seus dados locais não serão perdidos.
            </DialogDescription>
          </DialogHeader>

          {fullSyncError && (
            <Alert variant="destructive">
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{fullSyncError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFullSyncDialog(false)} disabled={fullSyncLoading}>
              Cancelar
            </Button>
            <Button onClick={handleFullSync} disabled={fullSyncLoading} className="bg-blue-500 hover:bg-blue-600">
              {fullSyncLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                "Sincronizar Agora"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para limpar dados */}
      <Dialog open={showClearDataDialog} onOpenChange={setShowClearDataDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpar Todos os Dados</DialogTitle>
            <DialogDescription>
              Isso irá remover todos os dados armazenados localmente. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          {clearDataError && (
            <Alert variant="destructive">
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{clearDataError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDataDialog(false)} disabled={clearDataLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleClearData} disabled={clearDataLoading}>
              {clearDataLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Limpando...
                </>
              ) : (
                "Limpar Dados"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
