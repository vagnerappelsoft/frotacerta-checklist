"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useGeolocation } from "@/hooks/use-geolocation"

interface LocationPermissionProps {
  onLocationCaptured: (location: any) => void
  onCancel: () => void
}

export function LocationPermission({ onLocationCaptured, onCancel }: LocationPermissionProps) {
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "unavailable">("prompt")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const geolocation = useGeolocation({
    onSuccess: (position) => {
      setIsLoading(false)
      onLocationCaptured({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
        address: null, // Será preenchido posteriormente
      })
    },
    onError: (error) => {
      setIsLoading(false)
      setError(getGeolocationErrorMessage(error))
    },
  })

  // Verificar o estado da permissão de geolocalização
  useEffect(() => {
    const checkPermission = async () => {
      try {
        // Verificar se a API de permissões está disponível
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: "geolocation" as PermissionName })
          setPermissionState(result.state as "prompt" | "granted" | "denied")

          // Adicionar listener para mudanças no estado da permissão
          result.addEventListener("change", () => {
            setPermissionState(result.state as "prompt" | "granted" | "denied")
          })
        } else {
          // Se a API de permissões não estiver disponível, verificar se a geolocalização está disponível
          if (navigator.geolocation) {
            setPermissionState("prompt")
          } else {
            setPermissionState("unavailable")
          }
        }
      } catch (error) {
        console.error("Erro ao verificar permissão de geolocalização:", error)
        setPermissionState("unavailable")
      }
    }

    checkPermission()
  }, [])

  const handleRequestLocation = () => {
    setIsLoading(true)
    setError(null)
    geolocation.getCurrentPosition()
  }

  const handleSkipLocation = () => {
    onCancel()
  }

  const handleRetry = () => {
    setError(null)
    handleRequestLocation()
  }

  const getGeolocationErrorMessage = (error: GeolocationPositionError): string => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return "Permissão para acessar a localização foi negada. Por favor, permita o acesso à localização nas configurações do seu navegador."
      case error.POSITION_UNAVAILABLE:
        return "Informações de localização não estão disponíveis no momento. Verifique se o GPS está ativado."
      case error.TIMEOUT:
        return "A solicitação para obter a localização expirou. Por favor, tente novamente."
      default:
        return `Ocorreu um erro desconhecido ao obter a localização. (Código: ${error.code})`
    }
  }

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-blue-500" />
          Localização
        </CardTitle>
        <CardDescription>Precisamos da sua localização para registrar onde o checklist foi realizado.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {permissionState === "unavailable" && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Indisponível</AlertTitle>
            <AlertDescription>A geolocalização não está disponível no seu dispositivo ou navegador.</AlertDescription>
          </Alert>
        )}

        {permissionState === "denied" && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Permissão Negada</AlertTitle>
            <AlertDescription>
              Você negou a permissão para acessar sua localização. Por favor, altere as configurações do seu navegador
              para permitir o acesso à localização.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-lg">
          <MapPin className="h-16 w-16 text-blue-500 mb-4" />
          <p className="text-center mb-4">
            {permissionState === "prompt" &&
              "Sua localização será usada apenas para registrar onde o checklist foi realizado."}
            {permissionState === "granted" && "Obrigado por permitir o acesso à sua localização."}
            {permissionState === "denied" &&
              "Sem acesso à sua localização, não podemos registrar onde o checklist foi realizado."}
            {permissionState === "unavailable" &&
              "Sem acesso à geolocalização, não podemos registrar onde o checklist foi realizado."}
          </p>

          {isLoading && (
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
              <span>Obtendo sua localização...</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button
          className="w-full bg-blue-500 hover:bg-blue-600"
          onClick={handleRequestLocation}
          disabled={isLoading || permissionState === "unavailable" || permissionState === "denied"}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Obtendo localização...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 mr-2" />
              {error ? "Tentar novamente" : "Compartilhar localização"}
            </>
          )}
        </Button>
        <Button variant="outline" className="w-full" onClick={handleSkipLocation}>
          Pular localização
        </Button>
      </CardFooter>
    </Card>
  )
}
