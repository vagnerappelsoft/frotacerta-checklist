"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react"

export function PWADiagnostics() {
  const [diagnostics, setDiagnostics] = useState<{
    https: boolean
    manifest: boolean
    serviceWorker: boolean
    icons: boolean
    installable: boolean
    standalone: boolean
  }>({
    https: false,
    manifest: false,
    serviceWorker: false,
    icons: false,
    installable: false,
    standalone: false,
  })

  const [isRunning, setIsRunning] = useState(false)
  const [details, setDetails] = useState<string[]>([])

  const addDetail = (detail: string) => {
    setDetails((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${detail}`])
  }

  const runDiagnostics = async () => {
    setIsRunning(true)
    setDetails([])

    // Verificar HTTPS
    const isHttps = window.location.protocol === "https:" || window.location.hostname === "localhost"
    setDiagnostics((prev) => ({ ...prev, https: isHttps }))
    addDetail(`HTTPS: ${isHttps ? "Sim" : "Não"} (${window.location.protocol})`)

    // Verificar manifesto
    try {
      const manifestResponse = await fetch("/manifest.json")
      const manifestOk = manifestResponse.ok
      setDiagnostics((prev) => ({ ...prev, manifest: manifestOk }))

      if (manifestOk) {
        const manifest = await manifestResponse.json()
        addDetail(`Manifesto: Encontrado (${manifest.name})`)

        // Verificar ícones
        const hasIcons = manifest.icons && manifest.icons.length > 0
        setDiagnostics((prev) => ({ ...prev, icons: hasIcons }))
        addDetail(`Ícones: ${hasIcons ? `${manifest.icons.length} ícones encontrados` : "Nenhum ícone encontrado"}`)
      } else {
        addDetail(`Manifesto: Não encontrado (${manifestResponse.status})`)
      }
    } catch (error) {
      setDiagnostics((prev) => ({ ...prev, manifest: false }))
      addDetail(`Manifesto: Erro ao verificar (${error})`)
    }

    // Verificar Service Worker
    const hasSW = "serviceWorker" in navigator
    setDiagnostics((prev) => ({ ...prev, serviceWorker: hasSW }))
    addDetail(`Service Worker API: ${hasSW ? "Suportada" : "Não suportada"}`)

    if (hasSW) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        addDetail(`Service Workers registrados: ${registrations.length}`)

        for (const reg of registrations) {
          addDetail(`- SW: ${reg.scope}, estado: ${reg.active ? "ativo" : "inativo"}`)
        }
      } catch (error) {
        addDetail(`Erro ao verificar registros de SW: ${error}`)
      }
    }

    // Verificar modo standalone
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://")
    setDiagnostics((prev) => ({ ...prev, standalone: isStandalone }))
    addDetail(`Modo standalone: ${isStandalone ? "Sim" : "Não"}`)

    // Verificar se é instalável
    const installable =
      "BeforeInstallPromptEvent" in window ||
      "onbeforeinstallprompt" in window ||
      (isHttps && hasSW && diagnostics.manifest && diagnostics.icons)
    setDiagnostics((prev) => ({ ...prev, installable }))
    addDetail(`Instalável: ${installable ? "Provavelmente sim" : "Provavelmente não"}`)

    setIsRunning(false)
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Diagnóstico de PWA</CardTitle>
        <CardDescription>Verifique se o aplicativo pode ser instalado como PWA</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            {diagnostics.https ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span>HTTPS</span>
          </div>

          <div className="flex items-center gap-2">
            {diagnostics.manifest ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span>Manifesto</span>
          </div>

          <div className="flex items-center gap-2">
            {diagnostics.serviceWorker ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span>Service Worker</span>
          </div>

          <div className="flex items-center gap-2">
            {diagnostics.icons ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span>Ícones</span>
          </div>
        </div>

        <Alert variant={diagnostics.installable ? "default" : "destructive"}>
          {diagnostics.installable ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertTitle>{diagnostics.installable ? "Instalável" : "Não instalável"}</AlertTitle>
          <AlertDescription>
            {diagnostics.installable
              ? "O aplicativo parece atender aos requisitos para ser instalado como PWA."
              : "O aplicativo não atende a todos os requisitos para ser instalado como PWA."}
          </AlertDescription>
        </Alert>

        {diagnostics.standalone && (
          <Alert variant="default" className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-700">Já instalado</AlertTitle>
            <AlertDescription className="text-green-600">
              O aplicativo já está sendo executado no modo standalone (instalado).
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Detalhes do diagnóstico:</p>
          <div className="bg-slate-50 p-3 rounded-md text-xs h-40 overflow-auto">
            {details.map((detail, index) => (
              <div key={index} className="mb-1">
                {detail}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={runDiagnostics} disabled={isRunning} className="w-full">
          {isRunning ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Executar diagnóstico novamente
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
