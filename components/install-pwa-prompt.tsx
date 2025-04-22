"use client"

import { useState, useEffect } from "react"
import { Download, X, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export function InstallPWAPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOSDevice, setIsIOSDevice] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  // Função para adicionar informações de debug
  const addDebugInfo = (info: string) => {
    setDebugInfo((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${info}`])
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
      addDebugInfo("Evento beforeinstallprompt capturado")
      setInstallPrompt(e as BeforeInstallPromptEvent)

      // Verificar se devemos mostrar o prompt
      const promptShownBefore = localStorage.getItem("pwaPromptShown")
      if (!promptShownBefore && !isStandalone) {
        setShowPrompt(true)
        addDebugInfo("Mostrando prompt de instalação")
      }
    }

    // Adicionar o evento ao window
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    addDebugInfo("Listener de beforeinstallprompt adicionado")

    // Verificar se o usuário está em um iOS e não está em modo standalone
    if (isIOS && !isStandalone) {
      const promptShownBefore = localStorage.getItem("pwaPromptShown")
      if (!promptShownBefore) {
        setTimeout(() => {
          setShowPrompt(true)
          addDebugInfo("Mostrando prompt de instalação para iOS")
        }, 3000) // Mostrar após 3 segundos para iOS
      }
    }

    // Mostrar o prompt após 5 segundos para garantir que ele apareça
    setTimeout(() => {
      const promptShownBefore = localStorage.getItem("pwaPromptShown")
      if (!promptShownBefore && !isStandalone && !showPrompt) {
        addDebugInfo("Forçando exibição do prompt de instalação")
        setShowPrompt(true)
      }
    }, 5000)

    // Verificar se o app foi instalado
    window.addEventListener("appinstalled", (event) => {
      addDebugInfo("Evento appinstalled capturado - App instalado com sucesso")
      setIsInstalled(true)
      setShowPrompt(false)
      localStorage.setItem("pwaPromptShown", "true")
    })

    // Verificar se o manifesto está disponível
    fetch("/manifest.json")
      .then((response) => {
        if (response.ok) {
          addDebugInfo("Manifesto encontrado e acessível")
          return response.json()
        } else {
          addDebugInfo(`Erro ao acessar o manifesto: ${response.status}`)
          throw new Error(`Erro ao acessar o manifesto: ${response.status}`)
        }
      })
      .then((data) => {
        addDebugInfo(`Manifesto carregado: ${JSON.stringify(data.name)}`)
      })
      .catch((error) => {
        addDebugInfo(`Erro ao buscar o manifesto: ${error}`)
      })

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", () => {})
    }
  }, [showPrompt])

  const handleInstallClick = async () => {
    if (!installPrompt) {
      // Se não temos o prompt, mas o usuário clicou no botão de instalação,
      // vamos mostrar instruções manuais
      addDebugInfo("Prompt de instalação não disponível, mostrando instruções manuais")
      setShowPrompt(true)
      return
    }

    // Mostrar o prompt de instalação nativo
    addDebugInfo("Mostrando prompt de instalação nativo")
    await installPrompt.prompt()

    // Aguardar a escolha do usuário
    const choiceResult = await installPrompt.userChoice

    // Limpar o prompt armazenado
    setInstallPrompt(null)
    setShowPrompt(false)

    // Registrar que o prompt foi mostrado
    localStorage.setItem("pwaPromptShown", "true")

    if (choiceResult.outcome === "accepted") {
      addDebugInfo("Usuário aceitou a instalação do PWA")
      console.log("Usuário aceitou a instalação do PWA")
    } else {
      addDebugInfo("Usuário recusou a instalação do PWA")
      console.log("Usuário recusou a instalação do PWA")
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem("pwaPromptShown", "true")
    addDebugInfo("Prompt de instalação dispensado pelo usuário")
  }

  // Verificar se o manifesto está disponível
  useEffect(() => {
    fetch("/manifest.json")
      .then((response) => {
        if (response.ok) {
          addDebugInfo("Manifesto encontrado e acessível")
        } else {
          addDebugInfo(`Erro ao acessar o manifesto: ${response.status}`)
        }
      })
      .catch((error) => {
        addDebugInfo(`Erro ao buscar o manifesto: ${error}`)
      })
  }, [])

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto">
      <Card className="border-blue-200 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">Instalar Aplicativo</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowDebugInfo(!showDebugInfo)}>
                ?
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDismiss} className="-mt-1 -mr-2">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <CardDescription>Instale o Checklist Veicular para acesso rápido e uso offline</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          {isIOSDevice ? (
            <div className="text-sm space-y-2">
              <p>Para instalar este aplicativo no seu iPhone ou iPad:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>
                  Toque no ícone de compartilhamento <Share2 className="inline h-4 w-4" />
                </li>
                <li>Role para baixo e toque em "Adicionar à Tela de Início"</li>
                <li>Toque em "Adicionar" no canto superior direito</li>
              </ol>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-full">
                <Download className="h-6 w-6 text-blue-500" />
              </div>
              <div className="text-sm">
                Adicione este aplicativo à tela inicial para acesso rápido e funcionalidade offline.
              </div>
            </div>
          )}

          {showDebugInfo && (
            <div className="mt-4 p-2 bg-gray-100 rounded-md text-xs overflow-auto max-h-40">
              <p className="font-bold">Informações de Debug:</p>
              <ul className="list-disc pl-4">
                {debugInfo.map((info, index) => (
                  <li key={index}>{info}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
        <CardFooter>
          {!isIOSDevice && (
            <Button className="w-full bg-blue-500 hover:bg-blue-600" onClick={handleInstallClick}>
              <Download className="h-4 w-4 mr-2" />
              Instalar Aplicativo
            </Button>
          )}
          {isIOSDevice && (
            <Button variant="outline" className="w-full" onClick={handleDismiss}>
              Entendi
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
