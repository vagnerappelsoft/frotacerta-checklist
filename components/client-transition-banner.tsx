import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ClientTransitionBannerProps {
  previousClientId: string | null
  currentClientId: string | null
  isVisible: boolean
}

export function ClientTransitionBanner({ previousClientId, currentClientId, isVisible }: ClientTransitionBannerProps) {
  if (!isVisible || !previousClientId || !currentClientId || previousClientId === currentClientId) {
    return null
  }

  return (
    <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800 mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Mudança de Cliente Detectada</AlertTitle>
      <AlertDescription>
        Você mudou do cliente <strong>{previousClientId}</strong> para <strong>{currentClientId}</strong>. Todos os
        dados do cliente anterior foram removidos para garantir a segurança.
      </AlertDescription>
    </Alert>
  )
}
