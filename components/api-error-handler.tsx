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

      // Auto-hide non-auth errors after 5 seconds
      if (!customEvent.detail.isAuthError) {
        setTimeout(() => {
          setVisible(false)
        }, 5000)
      }
    }

    window.addEventListener("api-error", handleApiError)

    return () => {
      window.removeEventListener("api-error", handleApiError)
    }
  }, [])

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
