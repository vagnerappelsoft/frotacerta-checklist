"use client"

import { useState, useEffect } from "react"
import { Wifi, WifiOff, Database, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { apiService } from "@/lib/api-service"
import { syncService } from "@/lib/sync-service"

export function ApiStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true)
  const [isMockMode, setIsMockMode] = useState(apiService.isUsingMockData())
  const [isChecking, setIsChecking] = useState(false)
  const [apiUrl, setApiUrl] = useState<string>(() => {
    // Safely get the API URL
    if (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL
    }
    return "Não configurada"
  })

  // Adicione a exibição do Client ID
  const [clientId, setClientId] = useState<string>(() => {
    // Safely get the Client ID
    if (typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_CLIENT_ID) {
      return process.env.NEXT_PUBLIC_CLIENT_ID
    }
    return "Não configurado"
  })

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handleToggleMockMode = (checked: boolean) => {
    apiService.setMockMode(checked)
    setIsMockMode(checked)

    // If switching to mock mode, trigger a sync to load mock data
    if (checked) {
      syncService.forceFullSync()
    }
  }

  // Modifique a função checkApiConnection para usar o endpoint de healthcheck
  const checkApiConnection = async () => {
    setIsChecking(true)
    try {
      // Try to fetch from the API URL to check if it's reachable
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      // Use o endpoint de healthcheck da API Frota Certa
      const response = await fetch(`${apiUrl}/healthcheck`, {
        method: "GET",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        alert("API está acessível!")
        // If API is accessible but we're in mock mode, ask if user wants to switch
        if (isMockMode) {
          const wantToSwitch = confirm("API está acessível. Deseja desativar o modo de dados de exemplo?")
          if (wantToSwitch) {
            handleToggleMockMode(false)
          }
        }
      } else {
        alert(`API retornou status ${response.status}`)
      }
    } catch (error: any) {
      console.error("Erro ao verificar conexão com API:", error)
      alert(`Não foi possível conectar à API: ${error.message || "Erro desconhecido"}`)

      // If we're not already in mock mode, suggest switching
      if (!isMockMode) {
        const wantToSwitch = confirm("Falha ao conectar à API. Deseja ativar o modo de dados de exemplo?")
        if (wantToSwitch) {
          handleToggleMockMode(true)
        }
      }
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Status da API</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
            <span className="text-sm">Conexão de rede: {isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>

        <div className="text-sm space-y-1">
          <p>
            URL da API: <span className="font-mono text-xs">{apiUrl}</span>
          </p>
          <p>
            Client ID: <span className="font-mono text-xs">{clientId}</span>
          </p>
          <p>Modo atual: {isMockMode ? "Dados de exemplo" : "API real"}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="mock-mode">Usar dados de exemplo</Label>
          </div>
          <Switch id="mock-mode" checked={isMockMode} onCheckedChange={handleToggleMockMode} />
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" className="w-full" onClick={checkApiConnection} disabled={isChecking}>
          {isChecking ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Verificar Conexão com API
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
