"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, Trash2, Database, Info, HelpCircle, Clock, LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { syncService } from "@/lib/sync-service"

export function SettingsScreen({
  onNavigate,
  onBack,
  isOnline,
  pendingSyncs,
  onSyncNow,
}: {
  onNavigate?: (screen: string) => void
  onBack?: () => void
  isOnline?: boolean
  pendingSyncs?: number
  onSyncNow?: () => void
}) {
  const [syncInProgress, setSyncInProgress] = useState(false)
  const { user, logout } = useAuth()

  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = () => {
    const confirmLogout = window.confirm("Tem certeza que deseja sair do aplicativo?")
    if (confirmLogout) {
      setIsLoggingOut(true)
      // Pequeno delay para feedback visual
      setTimeout(() => {
        logout()
        router.push("/login")
      }, 500)
    }
  }

  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  // Buscar a data da última sincronização ao carregar o componente
  useEffect(() => {
    // Obter a data da última sincronização do syncService
    const lastSync = syncService.getLastSyncTime()
    setLastSyncTime(lastSync)
  }, [])

  // Formatar a data da última sincronização
  const formatLastSyncTime = () => {
    if (!lastSyncTime) return "Nunca sincronizado"

    // Verificar se a data é de hoje
    const today = new Date()
    const isToday =
      lastSyncTime.getDate() === today.getDate() &&
      lastSyncTime.getMonth() === today.getMonth() &&
      lastSyncTime.getFullYear() === today.getFullYear()

    // Formatar a hora
    const hours = lastSyncTime.getHours().toString().padStart(2, "0")
    const minutes = lastSyncTime.getMinutes().toString().padStart(2, "0")
    const timeString = `${hours}:${minutes}`

    // Se for hoje, mostrar apenas a hora
    if (isToday) {
      return `Hoje às ${timeString}`
    }

    // Se for ontem
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday =
      lastSyncTime.getDate() === yesterday.getDate() &&
      lastSyncTime.getMonth() === yesterday.getMonth() &&
      lastSyncTime.getFullYear() === yesterday.getFullYear()

    if (isYesterday) {
      return `Ontem às ${timeString}`
    }

    // Para outras datas, mostrar a data completa
    const day = lastSyncTime.getDate().toString().padStart(2, "0")
    const month = (lastSyncTime.getMonth() + 1).toString().padStart(2, "0")
    const year = lastSyncTime.getFullYear()

    return `${day}/${month}/${year} às ${timeString}`
  }

  const handleSyncNow = () => {
    if (onSyncNow) {
      setSyncInProgress(true)
      onSyncNow()

      // Atualizar a data da última sincronização após a sincronização
      setTimeout(() => {
        setSyncInProgress(false)
        // Obter a data atualizada
        const updatedLastSync = syncService.getLastSyncTime()
        setLastSyncTime(updatedLastSync)
      }, 3000)
    }
  }

  const handleClearData = () => {
    const confirmClear = window.confirm(
      "Tem certeza que deseja limpar todos os dados salvos? Esta operação não pode ser desfeita.",
    )
    if (confirmClear) {
      localStorage.clear()
      indexedDB.deleteDatabase("frota-certa-checklist")
      window.location.reload()
    }
  }

  return (
    <div className="container max-w-md mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Gerencie suas preferências e dados</p>
        </div>
        <Avatar>
          <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Usuário" />
          <AvatarFallback>{user?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
        </Avatar>
      </div>

      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="space-y-4 pb-16">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Dados e sincronização</CardTitle>
              <CardDescription>Gerencie seus dados e sincronização</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Status da conexão</p>
                  <p className="text-xs text-gray-500">
                    {isOnline ? "Conectado ao servidor" : "Sem conexão com o servidor"}
                  </p>
                </div>
                <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Sincronizações pendentes</p>
                  <p className="text-xs text-gray-500">
                    {pendingSyncs === 0
                      ? "Todos os dados estão sincronizados"
                      : `${pendingSyncs} item(s) aguardando sincronização`}
                  </p>
                </div>
                <div
                  className={`text-sm font-medium px-2 py-1 rounded-full ${pendingSyncs === 0 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                >
                  {pendingSyncs || 0}
                </div>
              </div>

              {/* Adicionando a data da última sincronização */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Última sincronização</p>
                  <p className="text-xs text-gray-500">{formatLastSyncTime()}</p>
                </div>
                <Clock className="h-4 w-4 text-gray-400" />
              </div>

              <div className="pt-2">
                <Button
                  className="w-full bg-blue-500 hover:bg-blue-600"
                  onClick={handleSyncNow}
                  disabled={!isOnline || syncInProgress}
                >
                  {syncInProgress ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sincronizar agora
                    </>
                  )}
                </Button>
              </div>
              <div className="pt-1">
                <Button variant="outline" className="w-full text-red-600" onClick={handleClearData}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar dados salvos
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ferramentas de diagnóstico</CardTitle>
              <CardDescription>Ferramentas para desenvolvedores e suporte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onNavigate && onNavigate("api-debug")}
              >
                <Database className="mr-2 h-4 w-4" />
                Testar API
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sobre o aplicativo</CardTitle>
              <CardDescription>Informações sobre o aplicativo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-1">
                <p className="flex justify-between">
                  <span>Versão</span>
                  <span className="font-medium">1.0.0</span>
                </p>
                <p className="flex justify-between">
                  <span>Última atualização</span>
                  <span className="font-medium">28/04/2023</span>
                </p>
              </div>
              <div className="pt-2">
                <Button variant="outline" className="w-full justify-start">
                  <Info className="mr-2 h-4 w-4" />
                  Política de privacidade
                </Button>
                <Button variant="outline" className="w-full justify-start mt-1">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Ajuda e suporte
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start mt-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saindo...
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
