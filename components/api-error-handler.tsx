"use client"

import { useState, useEffect } from "react"
import { AlertCircle, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

// Create a custom event for API errors
export const dispatchApiError = (message: string, statusCode: number, isAuthError = false) => {
  const event = new CustomEvent("api-error", {
    detail: { message, statusCode, isAuthError },
  })
  window.dispatchEvent(event)
}

export function ApiErrorHandler() {
  const [error, setError] = useState<{ message: string; statusCode: number; isAuthError: boolean } | null>(null)
  const [visible, setVisible] = useState(false)
  const router = useRouter()
  const { logout } = useAuth()

  useEffect(() => {
    const handleApiError = (event: Event) => {
      const customEvent = event as CustomEvent
      setError(customEvent.detail)
      setVisible(true)

      // Verificar se o dispositivo está online
      const isOnline = navigator.onLine

      // Se for um erro relacionado ao client_id e estiver online, forçar logout e redirecionar para login
      if (
        isOnline &&
        (customEvent.detail.message.includes("ID do Cliente") || customEvent.detail.message.includes("Client ID"))
      ) {
        // Forçar logout
        logout()

        // Limpar o client_id armazenado
        localStorage.removeItem("client_id")

        // Redirecionar para login após um breve atraso
        setTimeout(() => {
          router.push("/login")
        }, 1500)
      }
      // Se estiver offline, apenas mostrar o erro sem redirecionar
      else if (!isOnline && customEvent.detail.isAuthError) {
        // Marcar para verificar o client_id quando voltar online
        localStorage.setItem("check_client_id_on_reconnect", "true")

        // Auto-hide após 5 segundos
        setTimeout(() => {
          setVisible(false)
        }, 5000)
      }
      // Auto-hide non-auth errors after 5 seconds
      else if (!customEvent.detail.isAuthError) {
        setTimeout(() => {
          setVisible(false)
        }, 5000)
      }
    }

    window.addEventListener("api-error", handleApiError)

    return () => {
      window.removeEventListener("api-error", handleApiError)
    }
  }, [logout, router])

  const handleClose = () => {
    setVisible(false)
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
    setVisible(false)
  }

  if (!error || !visible) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
      <Alert variant={error.isAuthError ? "destructive" : "default"}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{error.isAuthError ? "Erro de Autenticação" : "Erro"}</AlertTitle>
        <AlertDescription className="flex-1">{error.message}</AlertDescription>
        <div className="flex gap-2 ml-2">
          {error.isAuthError && (
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              Fazer Login
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    </div>
  )
}
