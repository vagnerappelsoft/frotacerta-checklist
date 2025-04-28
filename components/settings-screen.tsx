"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, RefreshCw, Trash2, Database, Download, Info, HelpCircle } from "lucide-react"

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

  const handleSyncNow = () => {
    if (onSyncNow) {
      setSyncInProgress(true)
      onSyncNow()
      // Reset após 3 segundos, mesmo se não houver resposta
      setTimeout(() => {
        setSyncInProgress(false)
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
    <div className="container max-w-md mx-auto py-4 px-4">
      <div className="flex justify-between items-center mb-4">
        {onBack ? (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <div />
        )}
        <h1 className="text-xl font-bold">Configurações</h1>
        <div className="w-9" />
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

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onNavigate && onNavigate("updates")}
              >
                <Download className="mr-2 h-4 w-4" />
                Verificar atualizações
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
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
