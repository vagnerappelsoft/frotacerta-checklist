"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, Download, Smartphone, Share2, Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

interface InstallAppScreenProps {
  onBack: () => void
}

export function InstallAppScreen({ onBack }: InstallAppScreenProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOSDevice, setIsIOSDevice] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [manualInstallShown, setManualInstallShown] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [checkingInstallability, setCheckingInstallability] = useState(false)

  // Função para adicionar informações de debug
  const addDebugInfo = (info: string) => {
    setDebugInfo((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${info}`])
  }

  // Verificar se o app é instalável
  const checkInstallability = async () => {
    setCheckingInstallability(true)
    addDebugInfo("Verificando instalabilidade do PWA...")

    try {
      // Verificar o manifesto
      const manifestResponse = await fetch("/manifest.json")
      if (manifestResponse.ok) {
        const manifest = await manifestResponse.json()
        addDebugInfo(`Manifesto encontrado: ${JSON.stringify(manifest.name)}`)
      } else {
        addDebugInfo(`Erro ao acessar o manifesto: ${manifestResponse.status}`)
      }

      // Verificar o service worker
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        addDebugInfo(`Service Workers registrados: ${registrations.length}`)
        registrations.forEach((reg, i) => {
          addDebugInfo(`SW ${i + 1}: ${reg.scope}, estado: ${reg.active ? "ativo" : "inativo"}`)
        })
      } else {
        addDebugInfo("Service Worker não suportado neste navegador")
      }

      // Verificar se está sendo executado em HTTPS
      addDebugInfo(`Protocolo: ${window.location.protocol}`)

      // Verificar se o display-mode é standalone
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      addDebugInfo(`Modo standalone: ${isStandalone}`)

      // Verificar se o navegador suporta beforeinstallprompt
      addDebugInfo(`Suporte a beforeinstallprompt: ${"onbeforeinstallprompt" in window}`)
    } catch (error) {
      addDebugInfo(`Erro ao verificar instalabilidade: ${error}`)
    } finally {
      setCheckingInstallability(false)
    }
  }

  useEffect(() => {
    // Detectar se é um dispositivo iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOSDevice(isIOS)
    addDebugInfo(`Dispositivo iOS: ${isIOS}`)

    // Verificar se o app já está instalado
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://")

    setIsInstalled(isStandalone)
    addDebugInfo(`Já instalado: ${isStandalone}`)

    // Armazenar o evento beforeinstallprompt para uso posterior
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      addDebugInfo("Evento beforeinstallprompt capturado na tela de instalação")
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    addDebugInfo("Listener de beforeinstallprompt adicionado")

    // Se não recebermos o evento em 3 segundos, mostrar instruções manuais
    const timer = setTimeout(() => {
      if (!installPrompt && !isIOSDevice && !isInstalled) {
        setManualInstallShown(true)
        addDebugInfo("Mostrando instruções manuais após timeout")
      }
    }, 3000)

    // Verificar se o app foi instalado
    window.addEventListener("appinstalled", (event) => {
      addDebugInfo("Evento appinstalled capturado - App instalado com sucesso")
      setIsInstalled(true)
    })

    // Verificar instalabilidade ao montar o componente
    checkInstallability()

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", () => {})
      clearTimeout(timer)
    }
  }, [installPrompt, isIOSDevice, isInstalled])

  const handleInstallClick = async () => {
    if (!installPrompt) {
      // Se não temos o prompt, mostrar instruções manuais
      setManualInstallShown(true)
      addDebugInfo("Prompt de instalação não disponível, mostrando instruções manuais")
      return
    }

    // Mostrar o prompt de instalação nativo
    addDebugInfo("Mostrando prompt de instalação nativo")
    await installPrompt.prompt()

    // Aguardar a escolha do usuário
    const choiceResult = await installPrompt.userChoice
    addDebugInfo(`Resultado da escolha do usuário: ${choiceResult.outcome}`)

    // Limpar o prompt armazenado
    setInstallPrompt(null)

    if (choiceResult.outcome === "accepted") {
      addDebugInfo("Usuário aceitou a instalação do PWA")
      setIsInstalled(true)
    } else {
      addDebugInfo("Usuário recusou a instalação do PWA")
    }
  }

  return (
    <div className="container max-w-md mx-auto p-4 pb-20">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="ml-2">
          <h1 className="text-xl font-bold">Instalar Aplicativo</h1>
          <p className="text-sm text-muted-foreground">Adicione à tela inicial do seu dispositivo</p>
        </div>
        <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setShowDebugInfo(!showDebugInfo)}>
          ?
        </Button>
      </div>

      {isInstalled ? (
        <Card className="p-6 text-center">
          <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Smartphone className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Aplicativo Instalado</h2>
          <p className="text-muted-foreground mb-4">O Checklist Veicular já está instalado no seu dispositivo.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-blue-100 rounded-full p-3">
                <Download className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-lg font-medium">Instale o Aplicativo</h2>
                <p className="text-sm text-muted-foreground">Acesse rapidamente e trabalhe offline</p>
              </div>
            </div>

            {isIOSDevice ? (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-medium">Como instalar no iOS:</h3>
                  <ol className="space-y-3">
                    <li className="flex items-start gap-2">
                      <div className="bg-slate-100 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm">1</span>
                      </div>
                      <div>
                        <p>Toque no ícone de compartilhamento</p>
                        <div className="mt-1 bg-slate-100 rounded-lg p-2 flex justify-center">
                          <Share2 className="h-6 w-6 text-slate-600" />
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-slate-100 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm">2</span>
                      </div>
                      <div>
                        <p>Role para baixo e toque em "Adicionar à Tela de Início"</p>
                        <div className="mt-1 bg-slate-100 rounded-lg p-2 flex items-center gap-2 text-slate-600">
                          <Plus className="h-5 w-5" />
                          <span>Adicionar à Tela de Início</span>
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-slate-100 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm">3</span>
                      </div>
                      <p>Toque em "Adicionar" no canto superior direito</p>
                    </li>
                  </ol>
                </div>
              </div>
            ) : manualInstallShown ? (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-medium">Como instalar manualmente:</h3>
                  <ol className="space-y-3">
                    <li className="flex items-start gap-2">
                      <div className="bg-slate-100 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm">1</span>
                      </div>
                      <div>
                        <p>Abra o menu do navegador (três pontos)</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-slate-100 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm">2</span>
                      </div>
                      <div>
                        <p>Selecione "Instalar aplicativo" ou "Adicionar à tela inicial"</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="bg-slate-100 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm">3</span>
                      </div>
                      <p>Confirme a instalação</p>
                    </li>
                  </ol>
                </div>
              </div>
            ) : (
              <>
                <Button className="w-full bg-blue-500 hover:bg-blue-600 mt-2" onClick={handleInstallClick}>
                  <Download className="h-4 w-4 mr-2" />
                  Instalar Aplicativo
                </Button>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={checkInstallability}
                  disabled={checkingInstallability}
                >
                  {checkingInstallability ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Verificar Instalabilidade
                    </>
                  )}
                </Button>
              </>
            )}
          </Card>

          {showDebugInfo && (
            <Alert>
              <AlertTitle>Informações de Debug</AlertTitle>
              <AlertDescription>
                <div className="mt-2 p-2 bg-gray-100 rounded-md text-xs overflow-auto max-h-60">
                  <ul className="list-disc pl-4">
                    {debugInfo.map((info, index) => (
                      <li key={index}>{info}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Card className="p-6">
            <h3 className="font-medium mb-3">Benefícios da instalação:</h3>
            <CardContent className="p-0 space-y-3">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 rounded-full p-2 mt-0.5">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Acesso rápido</p>
                  <p className="text-sm text-muted-foreground">Abra o aplicativo diretamente da tela inicial</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-green-100 rounded-full p-2 mt-0.5">
                  <Download className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Trabalhe offline</p>
                  <p className="text-sm text-muted-foreground">Use o aplicativo mesmo sem conexão com a internet</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-purple-100 rounded-full p-2 mt-0.5">
                  <Share2 className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Experiência nativa</p>
                  <p className="text-sm text-muted-foreground">Interface otimizada para o seu dispositivo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
