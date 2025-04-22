"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

export function ServiceWorkerUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Verificar se há atualizações do Service Worker
      const checkForUpdates = async () => {
        try {
          const registration = await navigator.serviceWorker.ready

          // Verificar se há uma atualização disponível
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing

            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // Há uma nova versão disponível
                  setUpdateAvailable(true)
                }
              })
            }
          })

          // Forçar uma verificação de atualização
          registration.update()
        } catch (error) {
          console.error("Erro ao verificar atualizações do Service Worker:", error)
        }
      }

      // Verificar atualizações ao montar o componente
      checkForUpdates()

      // Verificar atualizações periodicamente
      const interval = setInterval(checkForUpdates, 60 * 60 * 1000) // A cada hora

      return () => clearInterval(interval)
    }
  }, [])

  const handleUpdate = async () => {
    if ("serviceWorker" in navigator) {
      setUpdating(true)

      try {
        const registrations = await navigator.serviceWorker.getRegistrations()

        for (const registration of registrations) {
          await registration.unregister()
        }

        // Recarregar a página para registrar o novo Service Worker
        window.location.reload()
      } catch (error) {
        console.error("Erro ao atualizar o Service Worker:", error)
        setUpdating(false)
      }
    }
  }

  if (!updateAvailable) return null

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 max-w-md mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm text-blue-700">Nova versão disponível!</p>
        <Button size="sm" onClick={handleUpdate} disabled={updating} className="bg-blue-500 hover:bg-blue-600">
          {updating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Atualizando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
